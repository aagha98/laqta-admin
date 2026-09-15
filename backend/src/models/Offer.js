import mongoose from 'mongoose';

const OfferSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    // Set when a supplier submits through the app. Admin-entered offers
    // (legacy flow) have no supplier and rely on the snapshot fields below.
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    supplierName: { type: String, required: true },
    supplierCity: { type: String, default: '' },
    supplierRating: { type: Number, default: 0 },
    supplierReviewCount: { type: Number, default: 0 },
    completedDeals: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    price: { type: Number, required: true },
    conditionLabel: { type: String, default: '' },
    conditionDescription: { type: String, default: '' },
    qualityScore: { type: Number, default: 0 },
    warrantyDays: { type: Number, default: 30 },
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
    recommended: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

// One offer per supplier per request; admin-entered offers have no supplier
// and are excluded by the sparse partial filter.
OfferSchema.index(
  { request: 1, supplier: 1 },
  { unique: true, partialFilterExpression: { supplier: { $type: 'objectId' } } },
);

const IDENTITY_FIELDS = ['supplierName', 'supplier'];

// The buyer-facing shape: trust signals stay, identity is stripped until the
// offer is accepted (at which point the contact card is attached separately).
export function anonymizeOffer(offer) {
  const plain = typeof offer.toObject === 'function' ? offer.toObject() : { ...offer };
  if (plain.status !== 'accepted') {
    for (const field of IDENTITY_FIELDS) delete plain[field];
  }
  return plain;
}

export default mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
