import Notification from './models/Notification.js';

// Single entry point for in-app notifications. When push (FCM) is wired
// up, send it from here so every event reaches both channels.
export async function notify(userIds, type, { request, offer } = {}) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String))];
  if (ids.length === 0) return;

  await Notification.insertMany(
    ids.map((user) => ({
      user,
      type,
      request: request?._id ?? request,
      offer: offer?._id ?? offer,
    })),
  );
}
