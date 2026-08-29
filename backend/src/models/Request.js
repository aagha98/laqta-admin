import mongoose from 'mongoose';

const RequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['spareParts', 'sellCar'], required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    details: { type: Map, of: String, default: {} },
    status: {
      type: String,
      enum: ['submitted', 'underReview', 'matched', 'completed', 'cancelled'],
      default: 'submitted',
    },
  },
  { timestamps: true },
);

export default mongoose.models.Request || mongoose.model('Request', RequestSchema);
