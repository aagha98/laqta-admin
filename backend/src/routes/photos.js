import { Router } from 'express';
import mongoose from 'mongoose';
import Photo, { MAX_PHOTO_BYTES } from '../models/Photo.js';
import { requireUser } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';

const router = Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Body: { contentType, data } where data is base64. Kept as JSON (not
// multipart) so the mobile client reuses its single ApiClient.
router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const { contentType, data } = req.body || {};
    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.status(400).json({ error: 'Unsupported image type.' });
    }
    if (typeof data !== 'string' || data.length === 0) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    const buffer = Buffer.from(data, 'base64');
    if (buffer.length === 0) return res.status(400).json({ error: 'Image data is invalid.' });
    if (buffer.length > MAX_PHOTO_BYTES) {
      return res.status(413).json({ error: 'Image is too large (max 1.5 MB).' });
    }

    const photo = await Photo.create({
      owner: req.userId,
      contentType,
      size: buffer.length,
      data: buffer,
    });

    res.status(201).json({ id: photo._id, url: `/api/photos/${photo._id}` });
  }),
);

// Public read: part photos are not sensitive and the id is unguessable
// enough for v1. Long cache since photos are immutable.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    const photo = await Photo.findById(req.params.id).select('+data');
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    res.set('Content-Type', photo.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(photo.data);
  }),
);

export default router;
