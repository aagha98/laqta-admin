import { Router } from 'express';
import Request, { REQUEST_STATUSES } from '../models/Request.js';
import User from '../models/User.js';
import Offer from '../models/Offer.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

router.get(
  '/stats',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [
      totalUsers,
      totalRequests,
      submitted,
      underReview,
      matched,
      completed,
      cancelled,
      expired,
      pendingSuppliers,
      approvedSuppliers,
    ] = await Promise.all([
      User.countDocuments(),
      Request.countDocuments(),
      Request.countDocuments({ status: 'submitted' }),
      Request.countDocuments({ status: 'underReview' }),
      Request.countDocuments({ status: 'matched' }),
      Request.countDocuments({ status: 'completed' }),
      Request.countDocuments({ status: 'cancelled' }),
      Request.countDocuments({ status: 'expired' }),
      User.countDocuments({ role: 'supplier', 'supplier.status': 'pending' }),
      User.countDocuments({ role: 'supplier', 'supplier.status': 'approved' }),
    ]);

    res.json({
      totalUsers,
      totalRequests,
      submitted,
      underReview,
      matched,
      completed,
      cancelled,
      expired,
      pendingSuppliers,
      approvedSuppliers,
    });
  }),
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const requests = await Request.find(filter)
      .populate('user', 'fullName phoneNumber city')
      .sort({ createdAt: -1 });

    res.json({ requests });
  }),
);

router.patch(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const updated = await Request.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate(
      'user',
      'fullName phoneNumber city',
    );
    if (!updated) return res.status(404).json({ error: 'Request not found' });

    res.json({ request: updated });
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await Request.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Request not found' });
    res.json({ ok: true });
  }),
);

// There's no separate supplier-facing app yet, so the admin dashboard is how
// offers get entered into the system on a supplier's behalf.
router.get(
  '/:id/offers',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const offers = await Offer.find({ request: req.params.id })
      .populate('supplier', 'fullName phoneNumber supplier.shopName')
      .sort({ createdAt: -1 });
    res.json({ offers });
  }),
);

router.post(
  '/:id/offers',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const {
      supplierName,
      supplierCity,
      supplierRating,
      supplierReviewCount,
      verified,
      price,
      conditionLabel,
      conditionDescription,
      qualityScore,
      warrantyDays,
      recommended,
    } = req.body || {};

    if (!supplierName || price == null) {
      return res.status(400).json({ error: 'supplierName and price are required.' });
    }

    const offer = await Offer.create({
      request: request._id,
      supplierName,
      supplierCity: supplierCity || '',
      supplierRating: supplierRating || 0,
      supplierReviewCount: supplierReviewCount || 0,
      verified: Boolean(verified),
      price,
      conditionLabel: conditionLabel || '',
      conditionDescription: conditionDescription || '',
      qualityScore: qualityScore || 0,
      warrantyDays: warrantyDays ?? 30,
      recommended: Boolean(recommended),
    });

    if (request.status === 'submitted') {
      request.status = 'underReview';
      await request.save();
    }

    res.status(201).json({ offer });
  }),
);

router.delete(
  '/:id/offers/:offerId',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await Offer.findOneAndDelete({ _id: req.params.offerId, request: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Offer not found' });
    res.json({ ok: true });
  }),
);

export default router;
