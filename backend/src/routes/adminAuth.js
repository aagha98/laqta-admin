import { Router } from 'express';
import bcrypt from 'bcryptjs';
import AdminUser from '../models/AdminUser.js';
import { signAdminToken } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signAdminToken(admin._id.toString());
    res.json({ token });
  }),
);

export default router;
