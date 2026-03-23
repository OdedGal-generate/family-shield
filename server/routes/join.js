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

// Join via invite link — auto-approve (no admin approval needed)
router.post('/:token', requireAuth, (req, res) => {
  const invite = getValidInvite(req.params.token);
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });

  // Check if already a member
  const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(invite.group_id, req.user.id);
  if (existing) return res.json({ joined: true, groupId: invite.group_id });

  // Auto-approve: add directly to group
  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(invite.group_id, req.user.id, 'member');

  // Increment invite use count
  db.prepare('UPDATE group_invites SET use_count = use_count + 1 WHERE id = ?').run(invite.id);

  // Record in join_requests for history
  db.prepare("INSERT INTO join_requests (group_id, user_id, invite_id, status, reviewed_at) VALUES (?, ?, ?, 'approved', datetime('now'))").run(invite.group_id, req.user.id, invite.id);

  // Add system message
  db.prepare("INSERT INTO messages (group_id, user_id, content, type) VALUES (?, ?, ?, 'system')").run(
    invite.group_id, req.user.id, `${req.user.name} joined the group`
  );

  // Notify admins
  const admins = db.prepare("SELECT user_id FROM group_members WHERE group_id = ? AND role IN ('owner','admin')").all(invite.group_id);
  const adminIds = admins.map(a => a.user_id).filter(id => id !== req.user.id);
  sendPushToUsers(adminIds, {
    title: 'New Member',
    body: `${req.user.name} joined the group`,
    data: { groupId: invite.group_id }
  }).catch(() => {});

  res.status(201).json({ joined: true, groupId: invite.group_id });
});

export default router;
