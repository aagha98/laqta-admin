import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { signUserToken } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_WEB_CLIENT_ID);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      return res.status(500).json({ error: 'Google sign-in is not configured on the server.' });
    }

    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required.' });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_WEB_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'Invalid Google sign-in token.' });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const fullName = payload.name || '';

    let user = await User.findOne({ googleId });
    let isNewUser = false;

    // Link to an existing phone-signup account that shares the same email,
    // rather than creating a duplicate user.
    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        await user.save();
      }
    }

    if (!user) {
      isNewUser = true;
      user = await User.create({ googleId, email, fullName });
    }

    const token = signUserToken(user._id.toString());
    res.json({ token, user, isNewUser });
  }),
);

export default router;
