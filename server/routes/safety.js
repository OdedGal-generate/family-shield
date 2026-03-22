import { Router } from 'express';
import Joi from 'joi';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireGroupMember } from '../middleware/groupAuth.js';
import { validate, sanitize } from '../middleware/validate.js';
import { sendPushToUsers } from '../services/push.js';

const router = Router({ mergeParams: true });

// Post safety status
const safetySchema = Joi.object({
  status: Joi.string().valid('safe', 'waiting', 'sos').required(),
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  address: Joi.string().max(200).optional(),
  message: Joi.string().max(500).allow('').optional()
});

router.post('/', requireAuth, requireGroupMember, validate(safetySchema), async (req, res) => {
  const { status, lat, lng, address, message } = req.body;
  db.prepare('INSERT INTO safety_status (user_id, group_id, status, lat, lng, address, message) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, req.params.id, status, lat || null, lng || null, address ? sanitize(address) : null, message ? sanitize(message) : null);

  if (status === 'sos') {
    const sosTargets = db.prepare('SELECT user_id FROM group_members WHERE group_id = ? AND notify_sos = 1 AND user_id != ?')
      .all(req.params.id, req.user.id);
    const targetIds = sosTargets.map(t => t.user_id);
    if (targetIds.length > 0) {
      sendPushToUsers(targetIds, {
        title: '🆘 SOS Alert',
        body: `${req.user.name} needs help!`,
        data: { groupId: parseInt(req.params.id) }
      }).catch(() => {});
    }
  }

  res.json({ success: true });
});

// Get all members' latest safety status
router.get('/', requireAuth, requireGroupMember, (req, res) => {
  const statuses = db.prepare(`
    SELECT ss.*, u.name as user_name
    FROM safety_status ss
    JOIN users u ON u.id = ss.user_id
    WHERE ss.id IN (
      SELECT MAX(id) FROM safety_status WHERE group_id = ? GROUP BY user_id
    )
    ORDER BY ss.timestamp DESC
  `).all(req.params.id);
  res.json({ statuses });
});

export default router;
