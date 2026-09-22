import { Router } from 'express';
import Request from '../models/Request.js';
import Offer from '../models/Offer.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

// Shareable request summary by short code. No buyer identity — safe to
// open from a WhatsApp link.
router.get(
  '/requests/:code',
  asyncHandler(async (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const request = await Request.findOne({ shortCode: code }).select(
      'shortCode title vehicleMake vehicleModel vehicleYear city category status photos expiresAt createdAt',
    );
    if (!request) return res.status(404).json({ error: 'Request not found' });
    const offersCount = await Offer.countDocuments({
      request: request._id,
      status: { $ne: 'withdrawn' },
    });
    res.json({ request, offersCount });
  }),
);

export default router;
