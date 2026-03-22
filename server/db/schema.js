import db from './index.js';

export function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      avatar_url TEXT,
      locale TEXT DEFAULT 'he',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'family' CHECK(type IN ('family','work','friends','other')),
      owner_id INTEGER NOT NULL REFERENCES users(id),
      settings TEXT DEFAULT '{"onlyAdminsCanInvite":true,"onlyAdminsCanEditInfo":true}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT DEFAULT 'member' CHECK(role IN ('owner','admin','member')),
      notify_sos INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS group_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      token TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      max_uses INTEGER,
      use_count INTEGER DEFAULT 0,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS join_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      invite_id INTEGER REFERENCES group_invites(id),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      requested_at TEXT DEFAULT (datetime('now')),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS safety_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      group_id INTEGER NOT NULL REFERENCES groups(id),
      status TEXT NOT NULL CHECK(status IN ('safe','waiting','sos')),
      lat REAL,
      lng REAL,
      address TEXT,
      message TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_status (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      text TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text' CHECK(type IN ('text','system')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS phone_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_safety_status_lookup ON safety_status(user_id, group_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_messages_group_created ON messages(group_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_join_requests_group_status ON join_requests(group_id, status);
  `);
}
