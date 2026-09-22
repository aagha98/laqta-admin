import { Router } from 'express';
import User from '../models/User.js';
import Request from '../models/Request.js';
import Offer from '../models/Offer.js';
import Notification from '../models/Notification.js';
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

// Account deletion (Google Play requirement). Personal data is removed and
// the login identifiers are released; completed deals stay as anonymized
// history so other users' ratings and records remain consistent.
router.delete(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Request.updateMany(
      { user: user._id, status: { $in: ['submitted', 'underReview'] } },
      { status: 'cancelled' },
    );
    await Offer.updateMany(
      { supplier: user._id, status: 'pending' },
      { status: 'withdrawn', withdrawnAt: new Date() },
    );
    await Notification.deleteMany({ user: user._id });

    user.deletedAt = new Date();
    user.fullName = '';
    user.email = undefined;
    user.phoneNumber = undefined;
    user.googleId = undefined;
    user.carMake = '';
    user.carModel = '';
    user.carYear = '';
    user.carPlate = '';
    user.city = '';
    if (user.supplier) {
      user.supplier.status = 'rejected';
      user.supplier.isAvailable = false;
      user.supplier.licenseNumber = '';
      user.supplier.shopPhoto = undefined;
    }
    await user.save();

    res.json({ ok: true });
  }),
);

export default router;
