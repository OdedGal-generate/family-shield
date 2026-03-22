import db from './index.js';
import { createTables } from './schema.js';

createTables();

const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, phone, locale) VALUES (?, ?, ?, ?)');
const insertGroup = db.prepare('INSERT OR IGNORE INTO groups (name, type, owner_id) VALUES (?, ?, ?)');
const insertMember = db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role, notify_sos) VALUES (?, ?, ?, ?)');

const seed = db.transaction(() => {
  insertUser.run('דני כהן', 'dani@example.com', '+972501111111', 'he');
  insertUser.run('שרה לוי', 'sarah@example.com', '+972502222222', 'he');
  insertUser.run('Mike Johnson', 'mike@example.com', '+972503333333', 'en');

  insertGroup.run('משפחת כהן', 'family', 1);

  insertMember.run(1, 1, 'owner', 1);
  insertMember.run(1, 2, 'admin', 1);
  insertMember.run(1, 3, 'member', 0);
});

seed();
console.log('Seed data inserted successfully.');
