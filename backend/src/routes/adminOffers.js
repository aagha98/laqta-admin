import { Router } from 'express';
import Offer from '../models/Offer.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { containsContactInfo } from '../constants/moderation.js';

const router = Router();

// Every offer on the platform, newest first, with a `flagged` marker when
// the description looks like it tries to route the deal off-platform.
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status, flagged } = req.query;
    const filter = {};
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) filter.status = status;

    const offers = await Offer.find(filter)
      .sort({ createdAt: -1 })
      .limit(300)
      .populate('request', 'title subtitle city category status')
      .populate('supplier', 'fullName phoneNumber supplier.shopName supplier.city');

    let payload = offers.map((offer) => {
      const plain = offer.toObject();
      plain.flagged = containsContactInfo(plain.conditionDescription);
      return plain;
    });
    if (flagged === 'true') payload = payload.filter((o) => o.flagged);

    res.json({ offers: payload });
  }),
);

export default router;
