import { Router } from 'express';
import Joi from 'joi';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireGroupMember } from '../middleware/groupAuth.js';
import { validate, sanitize } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

// Get messages (paginated, newest first)
router.get('/', requireAuth, requireGroupMember, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before ? parseInt(req.query.before) : null;

  let query = `
    SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.group_id = ?
  `;
  const params = [req.params.id];

  if (before) {
    query += ' AND m.id < ?';
    params.push(before);
  }

  query += ' ORDER BY m.id DESC LIMIT ?';
  params.push(limit);

  const messages = db.prepare(query).all(...params);
  res.json({ messages: messages.reverse() });
});

// Send message
const sendSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required()
});

router.post('/', requireAuth, requireGroupMember, validate(sendSchema), (req, res) => {
  const content = sanitize(req.body.content);
  const result = db.prepare("INSERT INTO messages (group_id, user_id, content, type) VALUES (?, ?, ?, 'text')").run(req.params.id, req.user.id, content);
  const message = db.prepare(`
    SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
    FROM messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json({ message });
});

export default router;
