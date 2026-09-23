import { Router } from 'express';
import User from '../models/User.js';
import { signUserToken } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { PhoneTokenError, verifiedPhoneFromToken } from '../firebasePhone.js';

const router = Router();

// Signing in with a phone number. Firebase proves the number belongs to
// whoever is holding the device; this exchanges that proof for our own
// session token, which is what identifies the user from here on.
router.post(
  '/phone',
  asyncHandler(async (req, res) => {
    let phoneNumber;
    try {
      phoneNumber = await verifiedPhoneFromToken(req.body?.idToken);
    } catch (error) {
      if (error instanceof PhoneTokenError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      throw error;
    }

    let user = await User.findOne({ phoneNumber, deletedAt: null });
    if (!user) {
      user = await User.create({ phoneNumber });
    }

    res.json({ token: signUserToken(user._id.toString()), user });
  }),
);

export default router;
