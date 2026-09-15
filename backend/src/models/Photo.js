import mongoose from 'mongoose';

// Photos live in MongoDB so they survive Render's ephemeral disk and work
// identically in Docker. Uploads are size-capped and compressed client-side;
// move to object storage (S3/Cloudinary) if volume grows.
export const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

const PhotoSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true },
);

export default mongoose.models.Photo || mongoose.model('Photo', PhotoSchema);
