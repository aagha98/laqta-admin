import { Router } from 'express';
import Request from '../models/Request.js';
import Offer from '../models/Offer.js';
import { requireUser } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const requests = await Request.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ requests });
  }),
);

router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const { type, title, subtitle, details } = req.body || {};

    if (!type || !['spareParts', 'sellCar'].includes(type)) {
      return res.status(400).json({ error: 'A valid request type is required.' });
    }
    if (!title) {
      return res.status(400).json({ error: 'A title is required.' });
    }

    const created = await Request.create({
      user: req.userId,
      type,
      title,
      subtitle: subtitle || '',
      details: details || {},
    });

    res.status(201).json({ request: created });
  }),
);

// Cancelling sets status rather than deleting, so the request stays in the
// admin dashboard's history/audit trail.
router.delete(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const updated = await Request.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { status: 'cancelled' },
      { new: true },
    );

    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json({ request: updated });
  }),
);

// Verifies the request belongs to the caller before touching its offers —
// used by both the list and accept routes below.
async function loadOwnRequest(req, res) {
  const request = await Request.findOne({ _id: req.params.id, user: req.userId });
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return null;
  }
  return request;
}

router.get(
  '/:id/offers',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;

    const offers = await Offer.find({ request: request._id }).sort({
      recommended: -1,
      qualityScore: -1,
      price: 1,
    });
    res.json({ offers });
  }),
);

router.patch(
  '/:id/offers/:offerId/accept',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;

    const accepted = await Offer.findOneAndUpdate(
      { _id: req.params.offerId, request: request._id },
      { status: 'accepted' },
      { new: true },
    );
    if (!accepted) return res.status(404).json({ error: 'Offer not found' });

    await Offer.updateMany(
      { request: request._id, _id: { $ne: accepted._id } },
      { status: 'rejected' },
    );
    request.status = 'matched';
    await request.save();

    res.json({ offer: accepted, request });
  }),
);

export default router;
