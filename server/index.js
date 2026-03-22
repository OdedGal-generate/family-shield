import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createTables } from './db/schema.js';
import { initPush } from './services/push.js';

import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import inviteRoutes from './routes/invites.js';
import joinRoutes from './routes/join.js';
import requestRoutes from './routes/requests.js';
import safetyRoutes from './routes/safety.js';
import userStatusRoutes from './routes/userStatus.js';
import messageRoutes from './routes/messages.js';
import pushRoutes from './routes/push.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize
createTables();
initPush();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.APP_URL || 'http://localhost:5173' }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups/:id/invites', inviteRoutes);
app.use('/api/groups/:id/requests', requestRoutes);
app.use('/api/groups/:id/safety', safetyRoutes);
app.use('/api/groups/:id/messages', messageRoutes);
app.use('/api/join', joinRoutes);
app.use('/api/status', userStatusRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve static client files
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
