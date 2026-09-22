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

// Device tokens are per-install; the app registers on every launch and
// unregisters on sign-out so a shared phone never gets the wrong pushes.
router.post(
  '/me/device-token',
  requireUser,
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (token.length < 10) return res.status(400).json({ error: 'A device token is required.' });

    // The same token may have been registered by a previous account on
    // this device — move it rather than duplicating it.
    await User.updateMany({ deviceTokens: token }, { $pull: { deviceTokens: token } });
    await User.updateOne({ _id: req.userId }, { $addToSet: { deviceTokens: token } });
    res.json({ ok: true });
  }),
);

router.delete(
  '/me/device-token',
  requireUser,
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (token) await User.updateOne({ _id: req.userId }, { $pull: { deviceTokens: token } });
    res.json({ ok: true });
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

    user.deviceTokens = [];
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
