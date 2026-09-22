import mongoose from 'mongoose';

export const DISPUTE_REASONS = [
  'notDelivered', // supplier never handed over the part
  'wrongPart', // part does not match the request
  'damaged', // part arrived broken / not as described
  'priceChanged', // supplier asked for more than the accepted offer
  'other',
];

export const DISPUTE_STATUSES = ['open', 'resolved'];

// A buyer's report on a matched deal. Admins review and close it; the
// resolution note is shown to both parties.
const DisputeSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    reason: { type: String, enum: DISPUTE_REASONS, required: true },
    details: { type: String, default: '' },
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
    status: { type: String, enum: DISPUTE_STATUSES, default: 'open', index: true },
    resolution: { type: String, default: '' },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

DisputeSchema.index({ request: 1, status: 1 });

export default mongoose.models.Dispute || mongoose.model('Dispute', DisputeSchema);
