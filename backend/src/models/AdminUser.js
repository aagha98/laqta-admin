import mongoose from 'mongoose';

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Admin' },
  },
  { timestamps: true },
);

export default mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);
