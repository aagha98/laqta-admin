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
export const EXPIRY_WARNING_HOURS = 6;
export const MAX_REQUEST_PHOTOS = 4;

// Short, human-readable code both parties can read out over the phone.
// Unambiguous alphabet (no 0/O, 1/I).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateShortCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

const ClarificationSchema = new mongoose.Schema(
  { text: { type: String, required: true }, createdAt: { type: Date, default: Date.now } },
  { _id: false },
);

const RequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shortCode: { type: String, unique: true, sparse: true, index: true },
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
    // Buyer additions after offers started arriving; the request itself is
    // frozen at that point so suppliers priced the same thing.
    clarifications: { type: [ClarificationSchema], default: [] },
    status: { type: String, enum: REQUEST_STATUSES, default: 'submitted', index: true },
    expiresAt: { type: Date, index: true },
    expiryWarningSentAt: { type: Date },
    repostCount: { type: Number, default: 0 },
    acceptedOffer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    rating: {
      stars: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: '' },
      createdAt: { type: Date },
    },
  },
  { timestamps: true },
);

RequestSchema.pre('validate', function assignShortCode(next) {
  if (!this.shortCode) this.shortCode = generateShortCode();
  next();
});

// Flips stale open requests to `expired`. Returns the ids it changed so the
// caller can notify their owners.
RequestSchema.statics.expireStale = async function expireStale() {
  const stale = await this.find({ status: 'submitted', expiresAt: { $lt: new Date() } })
    .select('_id user')
    .lean();
  if (stale.length === 0) return [];
  await this.updateMany({ _id: { $in: stale.map((r) => r._id) } }, { status: 'expired' });
  return stale;
};

export default mongoose.models.Request || mongoose.model('Request', RequestSchema);
