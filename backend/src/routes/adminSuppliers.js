import { Router } from 'express';
import User, { SUPPLIER_STATUSES } from '../models/User.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { notify } from '../notifications.js';

const router = Router();

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const filter = { role: 'supplier' };
    if (req.query.status && SUPPLIER_STATUSES.includes(req.query.status)) {
      filter['supplier.status'] = req.query.status;
    }
    const suppliers = await User.find(filter).sort({ 'supplier.appliedAt': -1 });
    res.json({ suppliers });
  }),
);

router.patch(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status, rejectionReason } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected.' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'supplier' || !user.supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    user.supplier.status = status;
    user.supplier.rejectionReason = status === 'rejected' ? String(rejectionReason || '') : '';
    user.supplier.reviewedAt = new Date();
    await user.save();

    await notify(user._id, status === 'approved' ? 'supplierApproved' : 'supplierRejected');

    res.json({ supplier: user });
  }),
);

export default router;
