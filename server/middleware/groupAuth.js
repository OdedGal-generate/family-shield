import db from '../db/index.js';

export function requireGroupMember(req, res, next) {
  const groupId = req.params.id;
  const userId = req.user.id;
  const membership = db.prepare('SELECT role, notify_sos FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' });
  }
  req.membership = membership;
  next();
}

export function requireGroupAdmin(req, res, next) {
  if (req.membership.role !== 'admin' && req.membership.role !== 'owner') {
    return res.status(403).json({ error: 'Admin or owner role required' });
  }
  next();
}

export function requireGroupOwner(req, res, next) {
  if (req.membership.role !== 'owner') {
    return res.status(403).json({ error: 'Owner role required' });
  }
  next();
}

export function canInvite(req, res, next) {
  const groupId = req.params.id;
  const group = db.prepare('SELECT settings FROM groups WHERE id = ?').get(groupId);
  const settings = JSON.parse(group.settings);
  if (req.membership.role === 'owner' || req.membership.role === 'admin') {
    return next();
  }
  if (!settings.onlyAdminsCanInvite) {
    return next();
  }
  return res.status(403).json({ error: 'Only admins can create invites' });
}

export function canEditInfo(req, res, next) {
  const groupId = req.params.id;
  const group = db.prepare('SELECT settings FROM groups WHERE id = ?').get(groupId);
  const settings = JSON.parse(group.settings);
  if (req.membership.role === 'owner') {
    return next();
  }
  if (req.membership.role === 'admin' && !settings.onlyAdminsCanEditInfo) {
    return next();
  }
  if (req.membership.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Cannot edit group info' });
}
