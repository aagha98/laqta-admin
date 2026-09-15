import { Router } from 'express';
import User from '../models/User.js';
import Request from '../models/Request.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

// Public marketing numbers shown on the app's home screen. Cached briefly
// so the free-tier database isn't hit on every screen open.
let cache = { value: null, expiresAt: 0 };

router.get(
  '/public',
  asyncHandler(async (req, res) => {
    if (cache.value && cache.expiresAt > Date.now()) return res.json(cache.value);

    const [approvedSuppliers, completedDeals] = await Promise.all([
      User.countDocuments({ role: 'supplier', 'supplier.status': 'approved' }),
      Request.countDocuments({ status: 'completed' }),
    ]);

    cache = {
      value: { approvedSuppliers, completedDeals },
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    res.json(cache.value);
  }),
);

export default router;
