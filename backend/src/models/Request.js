import mongoose from 'mongoose';
import { CATEGORIES } from '../constants/categories.js';

export const REQUEST_STATUSES = [
  'submitted',
  'underReview',
  'matched',
  'completed',
  'cancelled',
  'expired',
];

// A request with no offers auto-expires after this window so suppliers'
// inboxes don't fill up with stale demand.
export const REQUEST_TTL_HOURS = 72;

const RequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['spareParts', 'sellCar'], required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    details: { type: Map, of: String, default: {} },
    vehicleMake: { type: String, default: '' },
    vehicleModel: { type: String, default: '' },
    vehicleYear: { type: String, default: '' },
    city: { type: String, default: '', index: true },
    category: { type: String, enum: CATEGORIES, default: 'other', index: true },
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
    status: { type: String, enum: REQUEST_STATUSES, default: 'submitted', index: true },
    expiresAt: { type: Date, index: true },
    acceptedOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    rating: {
      stars: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: '' },
      createdAt: { type: Date },
    },
  },
  { timestamps: true },
);

// Flips stale open requests to `expired`. Called lazily before listings
// instead of via a cron so it works identically on Render and in Docker.
RequestSchema.statics.expireStale = function expireStale() {
  return this.updateMany(
    { status: 'submitted', expiresAt: { $lt: new Date() } },
    { status: 'expired' },
  );
};

export default mongoose.models.Request || mongoose.model('Request', RequestSchema);
