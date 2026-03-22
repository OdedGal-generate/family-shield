import webPush from 'web-push';
import db from '../db/index.js';

export function initPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
}

export async function sendPushToUser(userId, payload) {
  const subs = db.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?').all(userId);
  const body = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webPush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, body);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
      }
    }
  }
}

export async function sendPushToUsers(userIds, payload) {
  await Promise.allSettled(userIds.map(id => sendPushToUser(id, payload)));
}
