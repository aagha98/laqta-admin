import { Router } from 'express';
import User from '../models/User.js';
import Request from '../models/Request.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    const counts = await Request.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]);
    const countByUser = new Map(counts.map((c) => [String(c._id), c.count]));
    res.json({
      users: users.map((u) => ({ ...u, requestsCount: countByUser.get(String(u._id)) ?? 0 })),
    });
  }),
);

export default router;
