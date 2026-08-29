import { Router } from 'express';
import User from '../models/User.js';
import { requireUser } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

router.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  }),
);

const EDITABLE_FIELDS = [
  'fullName',
  'email',
  'carMake',
  'carModel',
  'carYear',
  'carPlate',
  'city',
];

router.put(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in (req.body || {})) updates[field] = req.body[field];
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  }),
);

export default router;
