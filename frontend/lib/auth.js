import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// The frontend never issues tokens itself — it only verifies tokens the
// backend already signed (same shared JWT_SECRET), so it can gate pages
// without a network round-trip on every request.
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
