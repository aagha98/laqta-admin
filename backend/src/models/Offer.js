import mongoose from 'mongoose';

const OfferSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    supplierName: { type: String, required: true },
    supplierCity: { type: String, default: '' },
    supplierRating: { type: Number, default: 0 },
    supplierReviewCount: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    price: { type: Number, required: true },
    conditionLabel: { type: String, default: '' },
    conditionDescription: { type: String, default: '' },
    qualityScore: { type: Number, default: 0 },
    warrantyDays: { type: Number, default: 30 },
    recommended: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

export default mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
