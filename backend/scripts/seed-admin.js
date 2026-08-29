import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/laqta';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@laqta.sa';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-now';

const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Admin' },
  },
  { timestamps: true },
);

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const email = ADMIN_EMAIL.toLowerCase().trim();

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Updated password for existing admin: ${email}`);
  } else {
    await AdminUser.create({ email, passwordHash, name: 'Admin' });
    console.log(`Created admin user: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
