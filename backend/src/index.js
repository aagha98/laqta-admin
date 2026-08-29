import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectToDatabase } from './db.js';
import { seedAdmin } from './seedAdmin.js';
import otpRoutes from './routes/otp.js';
import adminAuthRoutes from './routes/adminAuth.js';
import usersRoutes from './routes/users.js';
import requestsRoutes from './routes/requests.js';
import adminRequestsRoutes from './routes/adminRequests.js';
import adminUsersRoutes from './routes/adminUsers.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', otpRoutes);
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/admin/requests', adminRequestsRoutes);
app.use('/api/admin/users', adminUsersRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
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
    app.listen(PORT, () => console.log(`Backend API listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error('Failed to start:', error);
    process.exit(1);
  });
