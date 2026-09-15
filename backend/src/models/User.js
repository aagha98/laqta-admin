import mongoose from 'mongoose';
import { CATEGORIES } from '../constants/categories.js';

export const SUPPLIER_STATUSES = ['pending', 'approved', 'rejected'];

const SupplierProfileSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    city: { type: String, required: true },
    specialties: { type: [String], enum: CATEGORIES, default: [] },
    licenseNumber: { type: String, default: '' },
    shopPhoto: { type: mongoose.Schema.Types.ObjectId, ref: 'Photo' },
    status: { type: String, enum: SUPPLIER_STATUSES, default: 'pending' },
    rejectionReason: { type: String, default: '' },
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedDeals: { type: Number, default: 0 },
    appliedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    // Optional/sparse-unique: phone-signup users always have one, but
    // Google-signup users may not add a phone number until later (or ever).
    phoneNumber: { type: String, unique: true, sparse: true, index: true },
    googleId: { type: String, unique: true, sparse: true, index: true },
    fullName: { type: String, default: '' },
    email: { type: String },
    carMake: { type: String, default: '' },
    carModel: { type: String, default: '' },
    carYear: { type: String, default: '' },
    carPlate: { type: String, default: '' },
    city: { type: String, default: '' },
    role: { type: String, enum: ['buyer', 'supplier'], default: 'buyer', index: true },
    supplier: { type: SupplierProfileSchema },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserSchema.virtual('supplierRating').get(function supplierRating() {
  const s = this.supplier;
  if (!s || !s.ratingCount) return 0;
  return Math.round((s.ratingSum / s.ratingCount) * 10) / 10;
});

UserSchema.methods.isApprovedSupplier = function isApprovedSupplier() {
  return this.role === 'supplier' && this.supplier?.status === 'approved';
};

// What a buyer is allowed to see about a supplier before accepting an offer:
// trust signals only, never the identity.
export function publicSupplierSummary(user) {
  if (!user?.supplier) return null;
  return {
    supplierCity: user.supplier.city,
    supplierRating: user.supplierRating ?? 0,
    supplierReviewCount: user.supplier.ratingCount,
    completedDeals: user.supplier.completedDeals,
    verified: user.supplier.status === 'approved',
  };
}

// Revealed only after the buyer accepts this supplier's offer.
export function supplierContact(user) {
  if (!user?.supplier) return null;
  return {
    shopName: user.supplier.shopName,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber || '',
    city: user.supplier.city,
  };
}

export default mongoose.models.User || mongoose.model('User', UserSchema);
