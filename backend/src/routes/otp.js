import { Router } from 'express';
import User from '../models/User.js';
import { signUserToken } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

// Mock OTP send/verify — mirrors the mobile app's own simulated flow.
// Replace with a real SMS provider before production use.
router.post(
  '/otp/request',
  asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body || {};

    if (!phoneNumber || !/^5\d{8}$/.test(phoneNumber)) {
      return res
        .status(400)
        .json({ error: 'A valid Saudi mobile number is required (9 digits, starting with 5).' });
    }

    res.json({ ok: true });
  }),
);

router.post(
  '/otp/verify',
  asyncHandler(async (req, res) => {
    const { phoneNumber, code } = req.body || {};

    if (!phoneNumber || !/^5\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'A valid phone number is required.' });
    }
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
    }

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({ phoneNumber });
    }

    const token = signUserToken(user._id.toString());
    res.json({ token, user });
  }),
);

export default router;
