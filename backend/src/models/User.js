import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true, index: true },
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
