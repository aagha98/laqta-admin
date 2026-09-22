import { Router } from 'express';
import mongoose from 'mongoose';
import Request, { MAX_REQUEST_PHOTOS, REQUEST_TTL_HOURS } from '../models/Request.js';
import Offer, { MAX_QUESTIONS_PER_OFFER, anonymizeOffer } from '../models/Offer.js';
import Dispute, { DISPUTE_REASONS } from '../models/Dispute.js';
import User, { publicSupplierProfile, supplierContact } from '../models/User.js';
import { requireUser } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { categoryForMake } from '../constants/categories.js';
import { containsContactInfo } from '../constants/moderation.js';
import { notify } from '../notifications.js';

const router = Router();

function cleanPhotoIds(photos, max) {
  return (Array.isArray(photos) ? photos : [])
    .filter((id) => mongoose.isValidObjectId(id))
    .slice(0, max);
}

function expiry() {
  return new Date(Date.now() + REQUEST_TTL_HOURS * 3600 * 1000);
}

// Suppliers who should hear about a request: approved, available, matching
// specialty, and either in the request's city or shipping to it (requests
// without a city go to everyone in the category).
async function matchingSupplierIds(request) {
  const suppliers = await User.find({
    role: 'supplier',
    'supplier.status': 'approved',
    'supplier.isAvailable': { $ne: false },
    'supplier.specialties': request.category,
    deletedAt: null,
  }).select('_id supplier.city supplier.serviceCities');
  return suppliers
    .filter((s) => !request.city || s.coversCity(request.city))
    .map((s) => s._id);
}

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
      category: categoryForMake(vehicleMake),
      photos: cleanPhotoIds(photos, MAX_REQUEST_PHOTOS),
      expiresAt: expiry(),
    });

    if (type === 'spareParts') {
      await notify(await matchingSupplierIds(created), 'newRequest', { request: created });
    }

    res.status(201).json({ request: created });
  }),
);

// Verifies the request belongs to the caller before touching it.
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

const EDITABLE = ['title', 'subtitle', 'details', 'vehicleMake', 'vehicleModel', 'vehicleYear', 'city'];

// Full edit is allowed only while no supplier has priced the request.
// Afterwards the buyer can append a clarification (see /clarify).
router.patch(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;
    if (!['submitted', 'underReview'].includes(request.status)) {
      return res.status(409).json({ error: 'This request is no longer open.' });
    }
    const offersCount = await Offer.countDocuments({ request: request._id, status: { $ne: 'withdrawn' } });
    if (offersCount > 0) {
      return res.status(409).json({
        error: 'Offers already arrived. Add a clarification instead of editing.',
        code: 'HAS_OFFERS',
      });
    }

    const body = req.body || {};
    for (const field of EDITABLE) {
      if (field in body) request[field] = body[field] ?? '';
    }
    if ('photos' in body) request.photos = cleanPhotoIds(body.photos, MAX_REQUEST_PHOTOS);
    if ('vehicleMake' in body) request.category = categoryForMake(body.vehicleMake);
    if (!request.title) return res.status(400).json({ error: 'A title is required.' });
    await request.save();

    res.json({ request });
  }),
);

router.post(
  '/:id/clarify',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;
    if (!['submitted', 'underReview'].includes(request.status)) {
      return res.status(409).json({ error: 'This request is no longer open.' });
    }
    const text = String(req.body?.text || '').trim().slice(0, 500);
    if (text.length < 3) return res.status(400).json({ error: 'Clarification text is required.' });
    if (containsContactInfo(text)) {
      return res.status(400).json({ error: 'Contact details are not allowed.' });
    }
    if (request.clarifications.length >= 5) {
      return res.status(409).json({ error: 'Maximum clarifications reached.' });
    }

    request.clarifications.push({ text });
    await request.save();

    const offers = await Offer.find({ request: request._id, supplier: { $ne: null } }).select('supplier');
    await notify(offers.map((o) => o.supplier), 'requestClarified', { request });

    res.json({ request });
  }),
);

// Reopen an expired or cancelled request for another window without
// retyping everything. Old offers stay attached as history.
router.post(
  '/:id/repost',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;
    if (!['expired', 'cancelled'].includes(request.status)) {
      return res.status(409).json({ error: 'Only expired or cancelled requests can be reposted.' });
    }
    if (request.repostCount >= 3) {
      return res.status(409).json({ error: 'This request was reposted too many times. Create a new one.' });
    }

    request.status = 'submitted';
    request.expiresAt = expiry();
    request.expiryWarningSentAt = undefined;
    request.repostCount += 1;
    await request.save();

    if (request.type === 'spareParts') {
      await notify(await matchingSupplierIds(request), 'newRequest', { request });
    }
    res.json({ request });
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
      delete plain.supplier;
      if (offer.status === 'accepted' && supplier) {
        plain.supplierContact = supplierContact(supplier);
        plain.supplierId = supplier._id;
      }
      return plain;
    });

    res.json({ offers: payload });
  }),
);

// Buyer asks the supplier something about their offer. Anonymous both ways.
router.post(
  '/:id/offers/:offerId/questions',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;
    const offer = await Offer.findOne({ _id: req.params.offerId, request: request._id });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.status !== 'pending') {
      return res.status(409).json({ error: 'Questions are only possible on pending offers.' });
    }
    if (!offer.supplier) {
      return res.status(409).json({ error: 'This offer was entered manually and cannot be asked.' });
    }
    const text = String(req.body?.text || '').trim().slice(0, 300);
    if (text.length < 2) return res.status(400).json({ error: 'Question text is required.' });
    if (containsContactInfo(text)) {
      return res.status(400).json({ error: 'Contact details are not allowed.' });
    }
    const unanswered = offer.questions.filter((q) => !q.answer).length;
    if (unanswered >= 2 || offer.questions.length >= MAX_QUESTIONS_PER_OFFER) {
      return res.status(409).json({ error: 'Wait for the supplier to answer before asking more.' });
    }

    offer.questions.push({ text });
    await offer.save();
    await notify(offer.supplier, 'newQuestion', { request, offer });

    const plain = anonymizeOffer(offer);
    delete plain.supplier;
    res.status(201).json({ offer: plain });
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
    if (!accepted) return res.status(404).json({ error: 'Offer not found or no longer available' });

    const rejected = await Offer.find({
      request: request._id,
      _id: { $ne: accepted._id },
      status: 'pending',
      supplier: { $ne: null },
    }).select('supplier');
    await Offer.updateMany(
      { request: request._id, _id: { $ne: accepted._id }, status: 'pending' },
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
    plain.supplierId = accepted.supplier?._id;

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

// Buyer reports a problem with a matched deal. The request stays matched
// until an admin resolves it.
router.post(
  '/:id/dispute',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;
    if (!['matched', 'completed'].includes(request.status) || !request.acceptedOffer) {
      return res.status(409).json({ error: 'Only deals with an accepted offer can be reported.' });
    }
    const { reason, details, photos } = req.body || {};
    if (!DISPUTE_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'A valid reason is required.' });
    }
    const existing = await Dispute.findOne({ request: request._id, status: 'open' });
    if (existing) return res.status(409).json({ error: 'A report is already open for this request.' });

    const accepted = await Offer.findById(request.acceptedOffer);
    const dispute = await Dispute.create({
      request: request._id,
      offer: accepted?._id,
      buyer: req.userId,
      supplier: accepted?.supplier,
      reason,
      details: String(details || '').trim().slice(0, 1000),
      photos: cleanPhotoIds(photos, MAX_REQUEST_PHOTOS),
    });
    if (accepted?.supplier) {
      await notify(accepted.supplier, 'disputeOpened', { request, offer: accepted });
    }

    res.status(201).json({ dispute });
  }),
);

router.get(
  '/:id/dispute',
  requireUser,
  asyncHandler(async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request) return;
    const dispute = await Dispute.findOne({ request: request._id }).sort({ createdAt: -1 });
    res.json({ dispute });
  }),
);

export default router;

// Public profile of a supplier the buyer has dealt with (accepted offer),
// including anonymized reviews from completed requests.
export const supplierProfileRouter = Router();

supplierProfileRouter.get(
  '/:id',
  requireUser,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    const supplier = await User.findById(req.params.id);
    if (!supplier?.supplier || supplier.deletedAt) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const acceptedOffers = await Offer.find({ supplier: supplier._id, status: 'accepted' }).select('_id');
    const reviews = await Request.find({
      acceptedOffer: { $in: acceptedOffers.map((o) => o._id) },
      'rating.stars': { $exists: true },
    })
      .sort({ 'rating.createdAt': -1 })
      .limit(20)
      .select('title rating vehicleMake vehicleModel');

    res.json({
      profile: publicSupplierProfile(supplier),
      reviews: reviews.map((r) => ({
        stars: r.rating.stars,
        comment: r.rating.comment,
        createdAt: r.rating.createdAt,
        partTitle: r.title,
        vehicle: [r.vehicleMake, r.vehicleModel].filter(Boolean).join(' '),
      })),
    });
  }),
);
