import jwt from 'jsonwebtoken';

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

export function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.adminId = payload.sub;
  next();
}
