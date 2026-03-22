import { Router } from 'express';
import Joi from 'joi';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireGroupMember, requireGroupAdmin, requireGroupOwner, canEditInfo } from '../middleware/groupAuth.js';
import { validate, sanitize } from '../middleware/validate.js';

const router = Router();

// List my groups
router.get('/', requireAuth, (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, gm.role,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
      (SELECT status FROM safety_status WHERE user_id = ? AND group_id = g.id ORDER BY timestamp DESC LIMIT 1) as my_safety_status
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    ORDER BY g.created_at DESC
  `).all(req.user.id, req.user.id);

  const result = groups.map(g => {
    let pending_requests = 0;
    if (g.role === 'owner' || g.role === 'admin') {
      pending_requests = db.prepare("SELECT COUNT(*) as cnt FROM join_requests WHERE group_id = ? AND status = 'pending'").get(g.id).cnt;
    }
    return { ...g, pending_requests };
  });

  res.json({ groups: result });
});

// Create group
const createSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('family', 'work', 'friends', 'other').default('family')
});

router.post('/', requireAuth, validate(createSchema), (req, res) => {
  const { name, type } = req.body;
  const result = db.prepare('INSERT INTO groups (name, type, owner_id) VALUES (?, ?, ?)').run(sanitize(name), type, req.user.id);
  db.prepare('INSERT INTO group_members (group_id, user_id, role, notify_sos) VALUES (?, ?, ?, ?)').run(result.lastInsertRowid, req.user.id, 'owner', 1);
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ group });
});

// Get group detail
router.get('/:id', requireAuth, requireGroupMember, (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.avatar_url,
      gm.role, gm.notify_sos, gm.joined_at,
      ss.status as safety_status, ss.timestamp as safety_timestamp, ss.message as safety_message,
      us.text as user_status_text
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    LEFT JOIN user_status us ON us.user_id = u.id
    LEFT JOIN safety_status ss ON ss.id = (
      SELECT id FROM safety_status WHERE user_id = u.id AND group_id = ? ORDER BY timestamp DESC LIMIT 1
    )
    WHERE gm.group_id = ?
    ORDER BY
      CASE gm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
      gm.joined_at ASC
  `).all(req.params.id, req.params.id);

  res.json({ group, members, myRole: req.membership.role });
});

// Update group
const updateSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  type: Joi.string().valid('family', 'work', 'friends', 'other'),
  settings: Joi.object({
    onlyAdminsCanInvite: Joi.boolean(),
    onlyAdminsCanEditInfo: Joi.boolean()
  })
}).min(1);

router.patch('/:id', requireAuth, requireGroupMember, canEditInfo, validate(updateSchema), (req, res) => {
  const updates = [];
  const values = [];
  if (req.body.name) { updates.push('name = ?'); values.push(sanitize(req.body.name)); }
  if (req.body.type) { updates.push('type = ?'); values.push(req.body.type); }
  if (req.body.settings) {
    const current = JSON.parse(db.prepare('SELECT settings FROM groups WHERE id = ?').get(req.params.id).settings);
    const merged = { ...current, ...req.body.settings };
    updates.push('settings = ?');
    values.push(JSON.stringify(merged));
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  values.push(req.params.id);
  db.prepare(`UPDATE groups SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  res.json({ group });
});

// Delete group
router.delete('/:id', requireAuth, requireGroupMember, requireGroupOwner, (req, res) => {
  const groupId = req.params.id;
  db.prepare('DELETE FROM messages WHERE group_id = ?').run(groupId);
  db.prepare('DELETE FROM safety_status WHERE group_id = ?').run(groupId);
  db.prepare('DELETE FROM join_requests WHERE group_id = ?').run(groupId);
  db.prepare('DELETE FROM group_invites WHERE group_id = ?').run(groupId);
  db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
  db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
  res.json({ success: true });
});

// Leave group
router.post('/:id/leave', requireAuth, requireGroupMember, (req, res) => {
  if (req.membership.role === 'owner') {
    return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership or delete the group.' });
  }
  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  db.prepare("INSERT INTO messages (group_id, user_id, content, type) VALUES (?, ?, ?, 'system')").run(
    req.params.id, req.user.id, `${req.user.name} left the group`
  );
  res.json({ success: true });
});

// Change member role
const roleSchema = Joi.object({
  role: Joi.string().valid('admin', 'member').required()
});

router.patch('/:id/members/:userId/role', requireAuth, requireGroupMember, requireGroupOwner, validate(roleSchema), (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, targetUserId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (member.role === 'owner') return res.status(400).json({ error: 'Cannot change owner role' });
  db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').run(req.body.role, req.params.id, targetUserId);
  res.json({ success: true });
});

// Remove member
router.delete('/:id/members/:userId', requireAuth, requireGroupMember, requireGroupAdmin, (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  const member = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(req.params.id, targetUserId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (member.role === 'owner') return res.status(400).json({ error: 'Cannot remove owner' });
  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(req.params.id, targetUserId);
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(targetUserId);
  db.prepare("INSERT INTO messages (group_id, user_id, content, type) VALUES (?, ?, ?, 'system')").run(
    req.params.id, targetUserId, `${user.name} was removed from the group`
  );
  res.json({ success: true });
});

// Toggle SOS notify
const notifySchema = Joi.object({
  enabled: Joi.boolean().required()
});

router.patch('/:id/members/:userId/notify-sos', requireAuth, requireGroupMember, requireGroupAdmin, validate(notifySchema), (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  db.prepare('UPDATE group_members SET notify_sos = ? WHERE group_id = ? AND user_id = ?').run(req.body.enabled ? 1 : 0, req.params.id, targetUserId);
  res.json({ success: true });
});

export default router;
