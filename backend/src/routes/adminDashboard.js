import { Router } from 'express';
import Request from '../models/Request.js';
import Offer from '../models/Offer.js';
import User from '../models/User.js';
import Dispute from '../models/Dispute.js';
import { requireAdmin } from '../auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { CATEGORIES } from '../constants/categories.js';

const router = Router();

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Everything the dashboard shows, in one round-trip. All numbers are
// computed from real collections — nothing is estimated.
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await Request.expireStale();

    const now = new Date();
    const today = startOfDay(now);
    const since30 = new Date(today.getTime() - 29 * DAY);
    const soon = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const staleMatched = new Date(now.getTime() - 2 * DAY);

    const [
      totalUsers,
      buyers,
      approvedSuppliers,
      pendingSuppliers,
      activeRequests,
      requestsToday,
      offersToday,
      completedDeals,
      byStatus,
      byCategory,
      requestSeries,
      offerSeries,
      firstOfferTimes,
      pendingSupplierList,
      expiringSoon,
      awaitingRating,
      recentRequests,
      recentOffers,
      openDisputes,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $ne: 'supplier' } }),
      User.countDocuments({ role: 'supplier', 'supplier.status': 'approved' }),
      User.countDocuments({ role: 'supplier', 'supplier.status': 'pending' }),
      Request.countDocuments({ status: { $in: ['submitted', 'underReview'] } }),
      Request.countDocuments({ createdAt: { $gte: today } }),
      Offer.countDocuments({ createdAt: { $gte: today } }),
      Request.countDocuments({ status: 'completed' }),
      Request.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Request.aggregate([
        { $match: { type: 'spareParts' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Request.aggregate([
        { $match: { createdAt: { $gte: since30 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Offer.aggregate([
        { $match: { createdAt: { $gte: since30 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      // Minutes from request creation to its first offer (last 30 days).
      Offer.aggregate([
        { $match: { createdAt: { $gte: since30 } } },
        { $sort: { createdAt: 1 } },
        { $group: { _id: '$request', firstOfferAt: { $first: '$createdAt' } } },
        {
          $lookup: {
            from: 'requests',
            localField: '_id',
            foreignField: '_id',
            as: 'request',
          },
        },
        { $unwind: '$request' },
        {
          $project: {
            minutes: {
              $divide: [{ $subtract: ['$firstOfferAt', '$request.createdAt'] }, 60000],
            },
          },
        },
      ]),
      User.find({ role: 'supplier', 'supplier.status': 'pending' })
        .sort({ 'supplier.appliedAt': 1 })
        .limit(5)
        .select('fullName phoneNumber supplier'),
      Request.find({
        status: 'submitted',
        expiresAt: { $gt: now, $lt: soon },
      })
        .sort({ expiresAt: 1 })
        .limit(5)
        .select('title subtitle city category expiresAt'),
      Request.find({ status: 'matched', updatedAt: { $lt: staleMatched } })
        .sort({ updatedAt: 1 })
        .limit(5)
        .select('title subtitle city updatedAt'),
      Request.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('title subtitle city category status createdAt'),
      Offer.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('price status supplierName createdAt request')
        .populate('request', 'title'),
      Dispute.find({ status: 'open' })
        .sort({ createdAt: 1 })
        .limit(5)
        .populate('request', 'title shortCode'),
    ]);

    const requestsByDay = new Map(requestSeries.map((r) => [r._id, r.count]));
    const offersByDay = new Map(offerSeries.map((o) => [o._id, o.count]));
    const series = [];
    for (let i = 0; i < 30; i += 1) {
      const key = dayKey(new Date(since30.getTime() + i * DAY));
      series.push({
        date: key,
        requests: requestsByDay.get(key) ?? 0,
        offers: offersByDay.get(key) ?? 0,
      });
    }

    const avgFirstOfferMinutes = firstOfferTimes.length
      ? Math.round(
          firstOfferTimes.reduce((sum, r) => sum + r.minutes, 0) / firstOfferTimes.length,
        )
      : null;

    const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
    const categoryCounts = Object.fromEntries(
      CATEGORIES.map((c) => [c, byCategory.find((b) => b._id === c)?.count ?? 0]),
    );

    const totalOffers = await Offer.countDocuments();
    const acceptedOffers = await Offer.countDocuments({ status: 'accepted' });

    res.json({
      kpis: {
        totalUsers,
        buyers,
        approvedSuppliers,
        pendingSuppliers,
        activeRequests,
        requestsToday,
        offersToday,
        completedDeals,
        avgFirstOfferMinutes,
        openDisputes: openDisputes.length,
        acceptanceRate: totalOffers ? Math.round((acceptedOffers / totalOffers) * 1000) / 10 : 0,
      },
      statusCounts,
      categoryCounts,
      series,
      attention: {
        pendingSuppliers: pendingSupplierList,
        expiringSoon,
        awaitingRating,
        openDisputes,
      },
      recent: {
        requests: recentRequests,
        offers: recentOffers,
      },
    });
  }),
);

export default router;
