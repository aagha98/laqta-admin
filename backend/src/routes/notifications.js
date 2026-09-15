import { Router } from 'express';
import Notification from '../models/Notification.js';
import { requireUser } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('request', 'title subtitle status')
        .populate('offer', 'price status'),
      Notification.countDocuments({ user: req.userId, readAt: null }),
    ]);
    res.json({ notifications, unreadCount });
  }),
);

router.post(
  '/read-all',
  requireUser,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.userId, readAt: null }, { readAt: new Date() });
    res.json({ ok: true });
  }),
);

export default router;
