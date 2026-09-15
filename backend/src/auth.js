import jwt from 'jsonwebtoken';
import User from './models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function signUserToken(userId) {
  return jwt.sign({ sub: userId, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });
}

export function signAdminToken(adminId) {
  return jwt.sign({ sub: adminId, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export function requireUser(req, res, next) {
  const token = getBearerToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'user') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = payload.sub;
  next();
}

// Loads the full user and rejects anyone who isn't an approved supplier.
// Pending/rejected suppliers get a 403 with their status so the app can
// route them to the right screen instead of a generic error.
export function requireApprovedSupplier(req, res, next) {
  requireUser(req, res, async () => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (!user.isApprovedSupplier()) {
        return res.status(403).json({
          error: 'Supplier account is not approved.',
          supplierStatus: user.supplier?.status ?? null,
        });
      }
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });
}

export function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.adminId = payload.sub;
  next();
}
