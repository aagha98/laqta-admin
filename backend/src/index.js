import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectToDatabase } from './db.js';
import { seedAdmin } from './seedAdmin.js';
import otpRoutes from './routes/otp.js';
import googleAuthRoutes from './routes/googleAuth.js';
import adminAuthRoutes from './routes/adminAuth.js';
import usersRoutes from './routes/users.js';
import requestsRoutes, { supplierProfileRouter } from './routes/requests.js';
import publicRoutes from './routes/public.js';
import adminDisputesRoutes from './routes/adminDisputes.js';
import { startJobs } from './jobs.js';
import supplierRoutes from './routes/supplier.js';
import photosRoutes from './routes/photos.js';
import notificationsRoutes from './routes/notifications.js';
import statsRoutes from './routes/stats.js';
import adminRequestsRoutes from './routes/adminRequests.js';
import adminUsersRoutes from './routes/adminUsers.js';
import adminSuppliersRoutes from './routes/adminSuppliers.js';
import adminDashboardRoutes from './routes/adminDashboard.js';
import adminOffersRoutes from './routes/adminOffers.js';

const app = express();
app.use(cors());
// Photos arrive as base64 JSON (1.5 MB cap + encoding overhead).
app.use(express.json({ limit: '3mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', otpRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/suppliers', supplierProfileRouter);
app.use('/api/public', publicRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin/requests', adminRequestsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/suppliers', adminSuppliersRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/offers', adminOffersRoutes);
app.use('/api/admin/disputes', adminDisputesRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
const MAX_RETRIES = 30;

async function connectWithRetry(attempt = 1) {
  try {
    await connectToDatabase();
    console.log('Connected to MongoDB.');
  } catch (error) {
    if (attempt >= MAX_RETRIES) throw error;
    console.log(`MongoDB not ready yet (attempt ${attempt}/${MAX_RETRIES}), retrying in 2s...`);
    mongoose.connection.removeAllListeners();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await connectWithRetry(attempt + 1);
  }
}

connectWithRetry()
  .then(() => seedAdmin())
  .then(() => {
    startJobs();
    app.listen(PORT, () => console.log(`Backend API listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error('Failed to start:', error);
    process.exit(1);
  });
