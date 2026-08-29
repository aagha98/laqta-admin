import { Router } from 'express';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

const VALID_STATUSES = ['submitted', 'underReview', 'matched', 'completed', 'cancelled'];

router.get(
  '/stats',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [totalUsers, totalRequests, submitted, underReview, matched, completed, cancelled] =
      await Promise.all([
        User.countDocuments(),
        Request.countDocuments(),
        Request.countDocuments({ status: 'submitted' }),
        Request.countDocuments({ status: 'underReview' }),
        Request.countDocuments({ status: 'matched' }),
        Request.countDocuments({ status: 'completed' }),
        Request.countDocuments({ status: 'cancelled' }),
      ]);

    res.json({ totalUsers, totalRequests, submitted, underReview, matched, completed, cancelled });
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
    if (!VALID_STATUSES.includes(status)) {
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

export default router;
