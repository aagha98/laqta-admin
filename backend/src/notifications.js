import Notification from './models/Notification.js';
import { sendPush } from './push.js';

// Single entry point for in-app notifications. When push (FCM) is wired
// up, send it from here so every event reaches both channels.
export async function notify(userIds, type, { request, offer } = {}) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String))];
  if (ids.length === 0) return;

  const requestId = request?._id ?? request;
  const offerId = offer?._id ?? offer;

  await Notification.insertMany(
    ids.map((user) => ({ user, type, request: requestId, offer: offerId })),
  );

  // Fire-and-forget: a push failure must not fail the caller's request.
  sendPush(ids, type, { requestId, offerId }).catch(() => {});
}
