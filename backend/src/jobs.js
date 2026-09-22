import Request, { EXPIRY_WARNING_HOURS } from './models/Request.js';
import Offer from './models/Offer.js';
import { notify } from './notifications.js';

// Runs every few minutes: expires stale requests (and tells their owners),
// and warns buyers whose request is about to expire with no offers.
export async function runRequestLifecycle() {
  const expired = await Request.expireStale();
  for (const r of expired) {
    await notify(r.user, 'requestExpired', { request: r._id });
  }

  const soon = new Date(Date.now() + EXPIRY_WARNING_HOURS * 3600 * 1000);
  const candidates = await Request.find({
    status: 'submitted',
    expiresAt: { $gt: new Date(), $lt: soon },
    expiryWarningSentAt: null,
  }).select('_id user');
  for (const r of candidates) {
    const offers = await Offer.countDocuments({ request: r._id, status: 'pending' });
    if (offers > 0) continue;
    await notify(r.user, 'requestExpiringSoon', { request: r._id });
    await Request.updateOne({ _id: r._id }, { expiryWarningSentAt: new Date() });
  }
}

export function startJobs() {
  const tick = () =>
    runRequestLifecycle().catch((error) => console.error('lifecycle job failed', error));
  tick();
  setInterval(tick, 10 * 60 * 1000);
}
