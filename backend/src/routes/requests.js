import { Router } from 'express';
import Request from '../models/Request.js';
import { requireUser } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const requests = await Request.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ requests });
  }),
);

router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const { type, title, subtitle, details } = req.body || {};

    if (!type || !['spareParts', 'sellCar'].includes(type)) {
      return res.status(400).json({ error: 'A valid request type is required.' });
    }
    if (!title) {
      return res.status(400).json({ error: 'A title is required.' });
    }

    const created = await Request.create({
      user: req.userId,
      type,
      title,
      subtitle: subtitle || '',
      details: details || {},
    });

    res.status(201).json({ request: created });
  }),
);

// Cancelling sets status rather than deleting, so the request stays in the
// admin dashboard's history/audit trail.
router.delete(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const updated = await Request.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { status: 'cancelled' },
      { new: true },
    );

    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json({ request: updated });
  }),
);

export default router;
