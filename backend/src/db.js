import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/laqta';

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  return mongoose.connect(MONGODB_URI);
}
