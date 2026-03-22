import { Router } from 'express';
import Joi from 'joi';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireGroupMember, requireGroupAdmin } from '../middleware/groupAuth.js';
import { validate } from '../middleware/validate.js';
import { sendPushToUser } from '../services/push.js';

const router = Router({ mergeParams: true });

// List pending requests
router.get('/', requireAuth, requireGroupMember, requireGroupAdmin, (req, res) => {
  const requests = db.prepare(`
    SELECT jr.*, u.name as user_name, u.avatar_url as user_avatar, u.email as user_email
    FROM join_requests jr
    JOIN users u ON u.id = jr.user_id
    WHERE jr.group_id = ? AND jr.status = 'pending'
    ORDER BY jr.requested_at ASC
  `).all(req.params.id);
  res.json({ requests });
});

// Review request
const reviewSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required()
});

router.patch('/:requestId', requireAuth, requireGroupMember, requireGroupAdmin, validate(reviewSchema), (req, res) => {
  const request = db.prepare('SELECT * FROM join_requests WHERE id = ? AND group_id = ?').get(req.params.requestId, req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Request already reviewed' });

  const status = req.body.action === 'approve' ? 'approved' : 'rejected';
  db.prepare("UPDATE join_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?").run(status, req.user.id, request.id);

  if (status === 'approved') {
    db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(request.group_id, request.user_id, 'member');

    // Increment invite use count
    if (request.invite_id) {
      db.prepare('UPDATE group_invites SET use_count = use_count + 1 WHERE id = ?').run(request.invite_id);
    }

    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(request.user_id);
    db.prepare("INSERT INTO messages (group_id, user_id, content, type) VALUES (?, ?, ?, 'system')").run(
      request.group_id, request.user_id, `${user.name} joined the group`
    );

    sendPushToUser(request.user_id, {
      title: 'Request Approved!',
      body: 'You have been added to the group',
      data: { groupId: request.group_id }
    }).catch(() => {});
  }

  res.json({ success: true, status });
});

export default router;
