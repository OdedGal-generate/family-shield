import { Router } from 'express';
import Joi from 'joi';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const subscribeSchema = Joi.object({
  endpoint: Joi.string().uri().required(),
  keys: Joi.object({
    p256dh: Joi.string().required(),
    auth: Joi.string().required()
  }).required()
});

router.post('/subscribe', requireAuth, validate(subscribeSchema), (req, res) => {
  const { endpoint, keys } = req.body;
  const existing = db.prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').get(req.user.id, endpoint);
  if (!existing) {
    db.prepare('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)').run(req.user.id, endpoint, keys.p256dh, keys.auth);
  }
  res.json({ success: true });
});

router.delete('/subscribe', requireAuth, (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(req.user.id, endpoint);
  }
  res.json({ success: true });
});

export default router;
