import { Router } from 'express';
import mongoose from 'mongoose';
import Request from '../models/Request.js';
import Offer from '../models/Offer.js';
import User from '../models/User.js';
import { requireUser, requireApprovedSupplier } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { isValidCategory } from '../constants/categories.js';
import { notify } from '../notifications.js';

const router = Router();

const CONDITION_LABELS = ['likeNew', 'excellent', 'average', 'refurbished'];

// Offers stay anonymous until accepted, so text fields must not leak a way
// to contact the supplier directly.
const CONTACT_PATTERNS = [
  /(?:\+?966|0)?5\d{8}/, // Saudi mobile
  /\d{3}[\s-]?\d{3}[\s-]?\d{4}/, // generic phone shapes
  /whats?app|واتس|وتس|snap|سناب|insta|انستا|تلقرام|telegram/i,
  /@[\w.]+/,
  /https?:\/\/|www\./i,
];

function containsContactInfo(text) {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(text || ''));
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
    const { fullName, shopName, city, specialties, licenseNumber, shopPhoto } = req.body || {};

    if (!shopName || String(shopName).trim().length < 2) {
      return res.status(400).json({ error: 'Shop name is required.' });
    }
    if (!city) return res.status(400).json({ error: 'City is required.' });
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
      licenseNumber: String(licenseNumber || '').trim(),
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
      .limit(100);

    const ids = requests.map((r) => r._id);
    const [myOffers, counts] = await Promise.all([
      Offer.find({ request: { $in: ids }, supplier: supplier._id }),
      Offer.aggregate([
        { $match: { request: { $in: ids } } },
        { $group: { _id: '$request', count: { $sum: 1 } } },
      ]),
    ]);
    const myByRequest = new Map(myOffers.map((o) => [String(o.request), o]));
    const countByRequest = new Map(counts.map((c) => [String(c._id), c.count]));

    // Same-city requests first, then newest.
    const sorted = [...requests].sort((a, b) => {
      const aLocal = a.city === supplier.supplier.city ? 0 : 1;
      const bLocal = b.city === supplier.supplier.city ? 0 : 1;
      return aLocal - bLocal || b.createdAt - a.createdAt;
    });

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
      Offer.countDocuments({ request: request._id }),
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

    const { price, conditionLabel, conditionDescription, warrantyDays, photos } = req.body || {};
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
    const photoIds = (Array.isArray(photos) ? photos : []).filter((id) =>
      mongoose.isValidObjectId(id),
    );
    if (photoIds.length === 0) {
      return res.status(400).json({ error: 'A photo of the part is required.' });
    }

    const existing = await Offer.findOne({ request: request._id, supplier: supplier._id });
    if (existing) {
      return res.status(409).json({ error: 'You already sent an offer on this request.' });
    }

    const offer = await Offer.create({
      request: request._id,
      supplier: supplier._id,
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
      photos: photoIds,
    });

    if (request.status === 'submitted') {
      request.status = 'underReview';
      await request.save();
    }
    await notify(request.user, 'newOffer', { request, offer });

    res.status(201).json({ offer });
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
