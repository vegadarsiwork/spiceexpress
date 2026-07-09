import jwt from 'jsonwebtoken';
import { serializeUser } from '../lib/serializers.js';
import { findUserById } from '../lib/repositories/usersRepository.js';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, jwtSecret);
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = serializeUser(user);
    next();
  } catch (err) {
    console.error('AUTH ERROR:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};


