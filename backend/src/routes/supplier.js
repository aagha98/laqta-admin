import { Router } from 'express';
import mongoose from 'mongoose';
import Request from '../models/Request.js';
import Offer, { MAX_OFFER_PHOTOS } from '../models/Offer.js';
import User from '../models/User.js';
import { requireUser, requireApprovedSupplier } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { isValidCategory } from '../constants/categories.js';
import { notify } from '../notifications.js';
import { containsContactInfo } from '../constants/moderation.js';

const router = Router();

const CONDITION_LABELS = ['likeNew', 'excellent', 'average', 'refurbished'];

// Saudi commercial registration: 10 digits. The unified national number
// (2025 Commercial Register Law) starts with 7; legacy CRs start with a
// region code whose first digit is 1-5 (1010 Riyadh, 2050 Dammam, 4030 Jeddah...).
const CR_NUMBER_PATTERN = /^[1-57]\d{9}$/;

function cleanCities(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((c) => String(c).trim()).filter(Boolean))].slice(0, 10);
}

function supplierProfileResponse(user) {
  return {
    role: user.role,
    supplier: user.supplier
      ? {
          ...user.supplier.toObject(),
          rating: user.supplierRating,
        }
      : null,
  };
}

router.post(
  '/apply',
  requireUser,
  asyncHandler(async (req, res) => {
    const { fullName, shopName, city, specialties, licenseNumber, shopPhoto, serviceCities } =
      req.body || {};

    if (!shopName || String(shopName).trim().length < 2) {
      return res.status(400).json({ error: 'Shop name is required.' });
    }
    if (!city) return res.status(400).json({ error: 'City is required.' });
    const cr = String(licenseNumber || '').trim();
    if (!CR_NUMBER_PATTERN.test(cr)) {
      return res.status(400).json({
        error: 'Commercial registration must be 10 digits starting with 7 (unified number) or 1-5 (legacy).',
      });
    }
    const chosen = Array.isArray(specialties) ? specialties.filter(isValidCategory) : [];
    if (chosen.length === 0) {
      return res.status(400).json({ error: 'Choose at least one specialty.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.supplier?.status === 'approved') {
      return res.status(409).json({ error: 'Already an approved supplier.' });
    }

    if (fullName && !user.fullName) user.fullName = String(fullName).trim();
    user.role = 'supplier';
    user.supplier = {
      shopName: String(shopName).trim(),
      city,
      specialties: chosen,
      serviceCities: cleanCities(serviceCities).filter((c) => c !== city),
      isAvailable: true,
      licenseNumber: cr,
      shopPhoto: mongoose.isValidObjectId(shopPhoto) ? shopPhoto : undefined,
      status: 'pending',
      appliedAt: new Date(),
      // Preserve earned reputation if a rejected supplier re-applies.
      ratingSum: user.supplier?.ratingSum ?? 0,
      ratingCount: user.supplier?.ratingCount ?? 0,
      completedDeals: user.supplier?.completedDeals ?? 0,
    };
    await user.save();

    res.status(201).json({ user });
  }),
);

router.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(supplierProfileResponse(user));
  }),
);

// Availability toggle and service cities — the only supplier fields that
// change day to day and don't need re-approval.
router.patch(
  '/me',
  requireApprovedSupplier,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const body = req.body || {};
    if ('isAvailable' in body) user.supplier.isAvailable = Boolean(body.isAvailable);
    if ('serviceCities' in body) {
      user.supplier.serviceCities = cleanCities(body.serviceCities).filter((c) => c !== user.supplier.city);
    }
    await user.save();
    res.json({ user });
  }),
);

function requestSummary(request, myOffer, offersCount) {
  const plain = request.toObject();
  // Buyer identity is never exposed to suppliers before acceptance.
  delete plain.user;
  return { ...plain, offersCount, myOffer: myOffer || null };
}

router.get(
  '/requests',
  requireApprovedSupplier,
  asyncHandler(async (req, res) => {
    await Request.expireStale();
    const supplier = req.user;

    const requests = await Request.find({
      type: 'spareParts',
      status: { $in: ['submitted', 'underReview'] },
      category: { $in: supplier.supplier.specialties },
    })
      .sort({ createdAt: -1 })
      .limit(150);

    const ids = requests.map((r) => r._id);
    const [myOffers, counts] = await Promise.all([
      Offer.find({ request: { $in: ids }, supplier: supplier._id }),
      Offer.aggregate([
        { $match: { request: { $in: ids }, status: { $ne: 'withdrawn' } } },
        { $group: { _id: '$request', count: { $sum: 1 } } },
      ]),
    ]);
    const myByRequest = new Map(myOffers.map((o) => [String(o.request), o]));
    const countByRequest = new Map(counts.map((c) => [String(c._id), c.count]));

    // Requests in the yard's own city first, then in cities it ships to,
    // then everything else — newest first within each group.
    const rank = (r) => (r.city === supplier.supplier.city ? 0 : supplier.coversCity(r.city) ? 1 : 2);
    const sorted = [...requests].sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt);

    res.json({
      requests: sorted.map((r) =>
        requestSummary(r, myByRequest.get(String(r._id)), countByRequest.get(String(r._id)) ?? 0),
      ),
    });
  }),
);

router.get(
  '/requests/:id',
  requireApprovedSupplier,
  asyncHandler(async (req, res) => {
    const request = await Request.findById(req.params.id);
    if (!request || request.type !== 'spareParts') {
      return res.status(404).json({ error: 'Request not found' });
    }
    const [myOffer, offersCount] = await Promise.all([
      Offer.findOne({ request: request._id, supplier: req.user._id }),
      Offer.countDocuments({ request: request._id, status: { $ne: 'withdrawn' } }),
    ]);
    res.json({ request: requestSummary(request, myOffer, offersCount) });
  }),
);

router.post(
  '/requests/:id/offers',
  requireApprovedSupplier,
  asyncHandler(async (req, res) => {
    const supplier = req.user;
    const request = await Request.findById(req.params.id);
    if (!request || request.type !== 'spareParts') {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (!['submitted', 'underReview'].includes(request.status)) {
      return res.status(409).json({ error: 'This request is no longer accepting offers.' });
    }
    if (!supplier.supplier.specialties.includes(request.category)) {
      return res.status(403).json({ error: 'This request is outside your specialties.' });
    }

    const {
      price,
      conditionLabel,
      conditionDescription,
      warrantyDays,
      photos,
      shippingAvailable,
      shippingCost,
    } = req.body || {};
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'A valid price is required.' });
    }
    if (!CONDITION_LABELS.includes(conditionLabel)) {
      return res.status(400).json({ error: 'A valid condition is required.' });
    }
    const description = String(conditionDescription || '').trim().slice(0, 500);
    if (containsContactInfo(description)) {
      return res
        .status(400)
        .json({ error: 'Contact details are not allowed in the offer description.' });
    }
    const photoIds = (Array.isArray(photos) ? photos : [])
      .filter((id) => mongoose.isValidObjectId(id))
      .slice(0, MAX_OFFER_PHOTOS);
    if (photoIds.length === 0) {
      return res.status(400).json({ error: 'A photo of the part is required.' });
    }
    const ships = Boolean(shippingAvailable);
    const shipCost = ships ? Math.max(0, Number(shippingCost) || 0) : 0;

    // A withdrawn offer can be replaced by a fresh one.
    const existing = await Offer.findOne({ request: request._id, supplier: supplier._id });
    if (existing && existing.status !== 'withdrawn') {
      return res.status(409).json({ error: 'You already sent an offer on this request.' });
    }

    const fields = {
      supplierName: supplier.supplier.shopName,
      supplierCity: supplier.supplier.city,
      supplierRating: supplier.supplierRating,
      supplierReviewCount: supplier.supplier.ratingCount,
      completedDeals: supplier.supplier.completedDeals,
      verified: true,
      price: numericPrice,
      conditionLabel,
      conditionDescription: description,
      warrantyDays: Number.isInteger(Number(warrantyDays)) ? Number(warrantyDays) : 30,
      shippingAvailable: ships,
      shippingCost: shipCost,
      photos: photoIds,
      status: 'pending',
      withdrawnAt: undefined,
      questions: [],
    };
    const offer = existing
      ? await Offer.findByIdAndUpdate(existing._id, fields, { new: true })
      : await Offer.create({ request: request._id, supplier: supplier._id, ...fields });

    if (request.status === 'submitted') {
      request.status = 'underReview';
      await request.save();
    }
    await notify(request.user, 'newOffer', { request, offer });

    res.status(201).json({ offer });
  }),
);

// Pull a pending offer (part sold elsewhere). The buyer is told; the
// request drops back to `submitted` if no other live offers remain.
router.delete(
  '/offers/:offerId',
  requireApprovedSupplier,
  asyncHandler(async (req, res) => {
    const offer = await Offer.findOne({ _id: req.params.offerId, supplier: req.user._id });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.status !== 'pending') {
      return res.status(409).json({ error: 'Only pending offers can be withdrawn.' });
    }

    offer.status = 'withdrawn';
    offer.withdrawnAt = new Date();
    await offer.save();

    const request = await Request.findById(offer.request);
    if (request) {
      const live = await Offer.countDocuments({ request: request._id, status: 'pending' });
      if (live === 0 && request.status === 'underReview') {
        request.status = 'submitted';
        await request.save();
      }
      await notify(request.user, 'offerWithdrawn', { request, offer });
    }

    res.json({ offer });
  }),
);

// Supplier answers a buyer question on their offer.
router.post(
  '/offers/:offerId/questions/:questionId/answer',
  requireApprovedSupplier,
  asyncHandler(async (req, res) => {
    const offer = await Offer.findOne({ _id: req.params.offerId, supplier: req.user._id });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    const question = offer.questions.id(req.params.questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.answer) return res.status(409).json({ error: 'Already answered.' });

    const text = String(req.body?.text || '').trim().slice(0, 300);
    if (text.length < 1) return res.status(400).json({ error: 'Answer text is required.' });
    if (containsContactInfo(text)) {
      return res.status(400).json({ error: 'Contact details are not allowed.' });
    }

    question.answer = text;
    question.answeredAt = new Date();
    await offer.save();

    const request = await Request.findById(offer.request);
    if (request) await notify(request.user, 'newAnswer', { request, offer });

    res.json({ offer });
  }),
);

router.get(
  '/offers',
  requireApprovedSupplier,
  asyncHandler(async (req, res) => {
    const offers = await Offer.find({ supplier: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'request', populate: { path: 'user', select: 'fullName phoneNumber' } });

    const payload = offers.map((offer) => {
      const plain = offer.toObject();
      const request = plain.request;
      if (request) {
        // Buyer contact is revealed to the supplier only once chosen.
        const buyer = request.user;
        delete request.user;
        if (offer.status === 'accepted' && buyer) {
          plain.buyerContact = { fullName: buyer.fullName, phoneNumber: buyer.phoneNumber || '' };
        }
      }
      return plain;
    });

    res.json({ offers: payload });
  }),
);

export default router;
