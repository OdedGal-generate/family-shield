import { Router } from 'express';
import Joi from 'joi';
import crypto from 'crypto';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireGroupMember, requireGroupAdmin, canInvite } from '../middleware/groupAuth.js';
import { validate } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

// Create invite
const createSchema = Joi.object({
  maxUses: Joi.number().integer().min(1).optional(),
  expiresInHours: Joi.number().integer().min(1).max(720).optional()
});

router.post('/', requireAuth, requireGroupMember, canInvite, validate(createSchema), (req, res) => {
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = req.body.expiresInHours
    ? new Date(Date.now() + req.body.expiresInHours * 3600000).toISOString()
    : null;

  db.prepare('INSERT INTO group_invites (group_id, token, created_by, max_uses, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, token, req.user.id, req.body.maxUses || null, expiresAt);

  const url = `${process.env.APP_URL}/join/${token}`;
  res.status(201).json({ token, url });
});

// List active invites
router.get('/', requireAuth, requireGroupMember, requireGroupAdmin, (req, res) => {
  const invites = db.prepare(`
    SELECT gi.*, u.name as created_by_name
    FROM group_invites gi
    JOIN users u ON u.id = gi.created_by
    WHERE gi.group_id = ?
      AND (gi.expires_at IS NULL OR gi.expires_at > datetime('now'))
      AND (gi.max_uses IS NULL OR gi.use_count < gi.max_uses)
    ORDER BY gi.created_at DESC
  `).all(req.params.id);
  res.json({ invites });
});

// Revoke invite
router.delete('/:inviteId', requireAuth, requireGroupMember, requireGroupAdmin, (req, res) => {
  db.prepare('DELETE FROM group_invites WHERE id = ? AND group_id = ?').run(req.params.inviteId, req.params.id);
  res.json({ success: true });
});

export default router;
