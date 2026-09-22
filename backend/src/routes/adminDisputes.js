import { Router } from 'express';
import Dispute from '../models/Dispute.js';
import Request from '../models/Request.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { notify } from '../notifications.js';

const router = Router();

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (['open', 'resolved'].includes(req.query.status)) filter.status = req.query.status;
    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('request', 'title shortCode city status')
      .populate('buyer', 'fullName phoneNumber')
      .populate('supplier', 'fullName phoneNumber supplier.shopName')
      .populate('offer', 'price');
    res.json({ disputes });
  }),
);

// Resolving records the admin's note, notifies both parties, and optionally
// sets the request's final status (completed or cancelled).
router.patch(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { resolution, requestStatus } = req.body || {};
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    if (dispute.status === 'resolved') return res.status(409).json({ error: 'Already resolved.' });

    dispute.status = 'resolved';
    dispute.resolution = String(resolution || '').trim().slice(0, 1000);
    dispute.resolvedAt = new Date();
    await dispute.save();

    if (['completed', 'cancelled'].includes(requestStatus)) {
      await Request.updateOne({ _id: dispute.request }, { status: requestStatus });
    }

    await notify([dispute.buyer, dispute.supplier].filter(Boolean), 'disputeResolved', {
      request: dispute.request,
      offer: dispute.offer,
    });

    res.json({ dispute });
  }),
);

export default router;
