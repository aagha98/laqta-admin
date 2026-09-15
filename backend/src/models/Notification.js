import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'newRequest', // supplier: a request matching your specialty was posted
  'newOffer', // buyer: a supplier sent an offer on your request
  'offerAccepted', // supplier: the buyer chose your offer
  'offerRejected', // supplier: the buyer chose another offer
  'supplierApproved', // supplier: your application was approved
  'supplierRejected', // supplier: your application was rejected
  'requestExpired', // buyer: no offers arrived within the window
];

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    readAt: { type: Date },
  },
  { timestamps: true },
);

NotificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
