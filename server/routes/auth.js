import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, sanitize } from '../middleware/validate.js';
import rateLimit from 'express-rate-limit';

const router = Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function findOrCreateUserByEmail(email, name, avatarUrl) {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const result = db.prepare('INSERT INTO users (name, email, avatar_url) VALUES (?, ?, ?)').run(name, email, avatarUrl);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }
  return user;
}

function findOrCreateUserByPhone(phone) {
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    const name = phone.slice(-4);
    const result = db.prepare('INSERT INTO users (name, phone) VALUES (?, ?)').run(name, phone);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }
  return user;
}

// Google Sign-In
const googleSchema = Joi.object({
  idToken: Joi.string().required()
});

router.post('/google', validate(googleSchema), async (req, res) => {
  try {
    const { idToken } = req.body;
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    const payload = await response.json();
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Token not intended for this app' });
    }
    const user = findOrCreateUserByEmail(payload.email, payload.name, payload.picture);
    const token = generateToken(user.id);
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url, locale: user.locale }, token });
  } catch {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Phone OTP - Request
const phoneRequestSchema = Joi.object({
  phone: Joi.string().pattern(/^\+\d{10,15}$/).required()
});

const phoneOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body.phone || req.ip,
  message: { error: 'Too many OTP requests, try again later' }
});

router.post('/phone/request', phoneOtpLimiter, validate(phoneRequestSchema), (req, res) => {
  const { phone } = req.body;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO phone_otps (phone, code, expires_at) VALUES (?, ?, ?)').run(phone, code, expiresAt);

  const response = { success: true };
  if (process.env.NODE_ENV === 'development' || process.env.DEV_OTP === 'true') {
    response.code = code;
  }
  res.json(response);
});

// Phone OTP - Verify
const phoneVerifySchema = Joi.object({
  phone: Joi.string().pattern(/^\+\d{10,15}$/).required(),
  code: Joi.string().length(6).required()
});

router.post('/phone/verify', validate(phoneVerifySchema), (req, res) => {
  const { phone, code } = req.body;
  const otp = db.prepare(
    "SELECT * FROM phone_otps WHERE phone = ? AND code = ? AND used = 0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1"
  ).get(phone, code);

  if (!otp) {
    return res.status(401).json({ error: 'Invalid or expired code' });
  }

  db.prepare('UPDATE phone_otps SET used = 1 WHERE id = ?').run(otp.id);
  const user = findOrCreateUserByPhone(phone);
  const token = generateToken(user.id);
  res.json({ user: { id: user.id, name: user.name, phone: user.phone, locale: user.locale }, token });
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
  const user = db.prepare('SELECT id, name, email, phone, avatar_url, locale FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

export default router;
