import { Router } from 'express';
import mongoose from 'mongoose';
import Request, { REQUEST_TTL_HOURS } from '../models/Request.js';
import Offer, { anonymizeOffer } from '../models/Offer.js';
import User, { supplierContact } from '../models/User.js';
import { requireUser } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { categoryForMake } from '../constants/categories.js';
import { notify } from '../notifications.js';

const router = Router();

router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    await Request.expireStale();
    const requests = await Request.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ requests });
  }),
);

router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const {
      type,
      title,
      subtitle,
      details,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      city,
      photos,
    } = req.body || {};

    if (!type || !['spareParts', 'sellCar'].includes(type)) {
      return res.status(400).json({ error: 'A valid request type is required.' });
    }
    if (!title) {
      return res.status(400).json({ error: 'A title is required.' });
    }

    const photoIds = (Array.isArray(photos) ? photos : []).filter((id) =>
      mongoose.isValidObjectId(id),
    );
    const category = categoryForMake(vehicleMake);

    const created = await Request.create({
      user: req.userId,
      type,
      title,
      subtitle: subtitle || '',
      details: details || {},
      vehicleMake: vehicleMake || '',
      vehicleModel: vehicleModel || '',
      vehicleYear: vehicleYear || '',
      city: city || '',
      category,
      photos: photoIds,
      expiresAt: new Date(Date.now() + REQUEST_TTL_HOURS * 3600 * 1000),
    });

    if (type === 'spareParts') {
      const suppliers = await User.find({
        role: 'supplier',
        'supplier.status': 'approved',
        'supplier.specialties': category,
      }).select('_id');
      await notify(
        suppliers.map((s) => s._id),
        'newRequest',
        { request: created },
      );
    }

    res.status(201).json({ request: created });
  }),
);

// Verifies the request belongs to the caller before touching its offers.
async function loadOwnRequest(req, res) {
  const request = await Request.findOne({ _id: req.params.id, user: req.userId });
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return null;
  }
  return request;
}

router.get(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;

    let contact = null;
    if (request.acceptedOffer) {
      const accepted = await Offer.findById(request.acceptedOffer).populate('supplier');
      if (accepted?.supplier) contact = supplierContact(accepted.supplier);
    }
    res.json({ request, supplierContact: contact });
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

router.get(
  '/:id/offers',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;

    const offers = await Offer.find({ request: request._id })
      .populate('supplier')
      .sort({ recommended: -1, supplierRating: -1, price: 1 });

    const payload = offers.map((offer) => {
      const plain = anonymizeOffer(offer);
      const supplier = offer.supplier;
      // Always strip the populated user document; attach contact only for
      // the accepted offer.
      delete plain.supplier;
      if (offer.status === 'accepted' && supplier) {
        plain.supplierContact = supplierContact(supplier);
      }
      return plain;
    });

    res.json({ offers: payload });
  }),
);

router.patch(
  '/:id/offers/:offerId/accept',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;
    if (['cancelled', 'completed', 'expired'].includes(request.status)) {
      return res.status(409).json({ error: 'This request is no longer open.' });
    }
    if (request.acceptedOffer) {
      return res.status(409).json({ error: 'An offer was already accepted.' });
    }

    const accepted = await Offer.findOneAndUpdate(
      { _id: req.params.offerId, request: request._id, status: 'pending' },
      { status: 'accepted' },
      { new: true },
    ).populate('supplier');
    if (!accepted) return res.status(404).json({ error: 'Offer not found' });

    const rejected = await Offer.find({
      request: request._id,
      _id: { $ne: accepted._id },
      supplier: { $ne: null },
    }).select('supplier');
    await Offer.updateMany(
      { request: request._id, _id: { $ne: accepted._id } },
      { status: 'rejected' },
    );

    request.status = 'matched';
    request.acceptedOffer = accepted._id;
    await request.save();

    if (accepted.supplier) {
      await notify(accepted.supplier._id, 'offerAccepted', { request, offer: accepted });
    }
    await notify(
      rejected.map((o) => o.supplier),
      'offerRejected',
      { request },
    );

    const plain = anonymizeOffer(accepted);
    delete plain.supplier;
    plain.supplierContact = accepted.supplier ? supplierContact(accepted.supplier) : null;

    res.json({ offer: plain, request, supplierContact: plain.supplierContact });
  }),
);

// Rating the accepted supplier closes the deal: the request becomes
// `completed` and the supplier's public trust signals update.
router.post(
  '/:id/rate',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;

    const stars = Number(req.body?.stars);
    const comment = String(req.body?.comment || '').slice(0, 500);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    if (request.status !== 'matched' || !request.acceptedOffer) {
      return res.status(409).json({ error: 'Only matched requests can be rated.' });
    }

    const accepted = await Offer.findById(request.acceptedOffer);
    if (accepted?.supplier) {
      await User.updateOne(
        { _id: accepted.supplier },
        {
          $inc: {
            'supplier.ratingSum': stars,
            'supplier.ratingCount': 1,
            'supplier.completedDeals': 1,
          },
        },
      );
    }

    request.rating = { stars, comment, createdAt: new Date() };
    request.status = 'completed';
    await request.save();

    res.json({ request });
  }),
);

export default router;
