import { Router } from 'express';
import Joi from 'joi';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, sanitize } from '../middleware/validate.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const status = db.prepare('SELECT * FROM user_status WHERE user_id = ?').get(req.user.id);
  res.json({ status: status || { user_id: req.user.id, text: '' } });
});

const updateSchema = Joi.object({
  text: Joi.string().max(100).allow('').required()
});

router.put('/', requireAuth, validate(updateSchema), (req, res) => {
  const text = sanitize(req.body.text);
  db.prepare(`INSERT INTO user_status (user_id, text, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET text = ?, updated_at = datetime('now')`).run(req.user.id, text, text);
  res.json({ status: { user_id: req.user.id, text } });
});

export default router;
