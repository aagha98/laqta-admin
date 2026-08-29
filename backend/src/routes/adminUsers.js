import { Router } from 'express';
import User from '../models/User.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  }),
);

export default router;
