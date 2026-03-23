import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import crypto from 'crypto';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, sanitize } from '../middleware/validate.js';

const router = Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// Simple password hashing with SHA-256 + salt
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  return hash === storedHash;
}

// Register
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9._\-@+]+$/).required()
    .messages({ 'string.pattern.base': 'Username can contain letters, numbers, dots, dashes, @, +' }),
  password: Joi.string().min(4).max(100).required(),
  name: Joi.string().min(1).max(50).required()
});

router.post('/register', validate(registerSchema), (req, res) => {
  const { username, password, name } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const { hash, salt } = hashPassword(password);
  const displayName = sanitize(name);

  const result = db.prepare(
    'INSERT INTO users (name, username, password, email, phone) VALUES (?, ?, ?, ?, ?)'
  ).run(displayName, username, `${salt}:${hash}`, null, null);

  const user = db.prepare('SELECT id, name, username, email, phone, avatar_url, locale FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = generateToken(user.id);
  res.json({ user: { id: user.id, name: user.name, username: user.username, locale: user.locale }, token });
});

// Login
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

router.post('/login', validate(loginSchema), (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const [salt, storedHash] = user.password.split(':');
  if (!verifyPassword(password, storedHash, salt)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user.id);
  res.json({
    user: { id: user.id, name: user.name, username: user.username, locale: user.locale },
    token
  });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Update current user
const updateMeSchema = Joi.object({
  name: Joi.string().min(1).max(50),
  locale: Joi.string().valid('he', 'en')
}).min(1);

router.patch('/me', requireAuth, validate(updateMeSchema), (req, res) => {
  const updates = [];
  const values = [];
  if (req.body.name) {
    updates.push('name = ?');
    values.push(sanitize(req.body.name));
  }
  if (req.body.locale) {
    updates.push('locale = ?');
    values.push(req.body.locale);
  }
  values.push(req.user.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const user = db.prepare('SELECT id, name, username, email, phone, avatar_url, locale FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

export default router;
