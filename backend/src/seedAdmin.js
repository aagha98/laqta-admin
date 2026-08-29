import bcrypt from 'bcryptjs';
import AdminUser from './models/AdminUser.js';

export async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@laqta.sa').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'change-me-now';
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Updated password for existing admin: ${email}`);
  } else {
    await AdminUser.create({ email, passwordHash, name: 'Admin' });
    console.log(`Created admin user: ${email}`);
  }
}
