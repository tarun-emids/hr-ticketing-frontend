// Notification cache — mirrors src/data/store.js: synchronous reads of a
// local cache, refreshNotifications(userId) pulls from the API and notifies
// subscribers, mutations re-read the server so the badge stays authoritative.
import * as api from "../api/client";

let items = [];
let unread = 0;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// newest first, already scoped to the acting user server-side
export function listNotifications() {
  return items;
}

export function getUnreadCount() {
  return unread;
}

export function refreshNotifications(userId, limit = 50) {
  return Promise.all([
    api.listNotifications({ userId, limit }),
    api.unreadCount(userId),
  ]).then(([fresh, count]) => {
    items = fresh;
    unread = count.unread;
    notify();
    return items;
  });
}

export function markNotificationRead(id, userId) {
  return api.markNotificationRead(id, userId)
    .then(() => refreshNotifications(userId));
}

export function markAllNotificationsRead(userId) {
  return api.markAllNotificationsRead(userId)
    .then(() => refreshNotifications(userId));
}
