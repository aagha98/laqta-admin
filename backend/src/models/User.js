import mongoose from 'mongoose';

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
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
