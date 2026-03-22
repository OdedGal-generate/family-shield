import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPushToUsers } from '../services/push.js';

const router = Router();

function getValidInvite(token) {
  return db.prepare(`
    SELECT gi.*, g.name as group_name,
      (SELECT COUNT(*) FROM group_members WHERE group_id = gi.group_id) as member_count
    FROM group_invites gi
    JOIN groups g ON g.id = gi.group_id
    WHERE gi.token = ?
      AND (gi.expires_at IS NULL OR gi.expires_at > datetime('now'))
      AND (gi.max_uses IS NULL OR gi.use_count < gi.max_uses)
  `).get(token);
}

// Public: get invite info
router.get('/:token', (req, res) => {
  const invite = getValidInvite(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });
  res.json({ groupName: invite.group_name, memberCount: invite.member_count, groupId: invite.group_id });
});

// Request to join
router.post('/:token', requireAuth, (req, res) => {
  const invite = getValidInvite(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });

  // Check if already a member
  const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(invite.group_id, req.user.id);
  if (existing) return res.status(400).json({ error: 'Already a member of this group' });

  // Check if already has a pending request
  const pendingReq = db.prepare("SELECT * FROM join_requests WHERE group_id = ? AND user_id = ? AND status = 'pending'").get(invite.group_id, req.user.id);
  if (pendingReq) return res.json({ request: pendingReq, alreadyPending: true });

  const result = db.prepare('INSERT INTO join_requests (group_id, user_id, invite_id) VALUES (?, ?, ?)').run(invite.group_id, req.user.id, invite.id);
  const request = db.prepare('SELECT * FROM join_requests WHERE id = ?').get(result.lastInsertRowid);

  // Notify admins and owner
  const admins = db.prepare("SELECT user_id FROM group_members WHERE group_id = ? AND role IN ('owner','admin')").all(invite.group_id);
  const adminIds = admins.map(a => a.user_id);
  sendPushToUsers(adminIds, {
    title: 'New Join Request',
    body: `${req.user.name} wants to join the group`,
    data: { groupId: invite.group_id }
  }).catch(() => {});

  res.status(201).json({ request });
});

// Check join request status
router.get('/:token/status', requireAuth, (req, res) => {
  const invite = getValidInvite(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });
  const request = db.prepare("SELECT * FROM join_requests WHERE group_id = ? AND user_id = ? ORDER BY requested_at DESC LIMIT 1").get(invite.group_id, req.user.id);
  if (!request) return res.status(404).json({ error: 'No join request found' });
  res.json({ request });
});

export default router;
