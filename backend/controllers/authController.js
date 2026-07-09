import jwt from 'jsonwebtoken';
import {
  createUser,
  emailExists,
  findUserById,
  findUserForLogin,
  updateUser,
  verifyPassword,
} from '../lib/repositories/usersRepository.js';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}
const jwtExpiry = '7d';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (await emailExists(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await createUser({ name, email, password });
    return res.status(201).json({
      token: jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiry }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await findUserForLogin(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiry });
    return res.json({
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Fetch fresh user data from DB for up-to-date info
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Build absolute avatar URL if present
    let avatar = user.avatar;
    if (avatar && !avatar.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      avatar = `${protocol}://${host}${avatar}`;
    }
    return res.json({
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: user.company,
      address: user.address,
      avatar
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// PATCH /api/user/me
export const updateMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Allow updating all editable fields, including avatar
    const updateFields = {};
    const allowed = ['name', 'phone', 'company', 'address', 'avatar'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateFields[key] = req.body[key];
    }
    const user = await updateUser(req.user.id, updateFields);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Build absolute avatar URL if present
    let avatar = user.avatar;
    if (avatar && !avatar.startsWith('http')) {
      const protocol = req.protocol;
      const host = req.get('host');
      avatar = `${protocol}://${host}${avatar}`;
    }
    return res.json({
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: user.company,
      address: user.address,
      avatar
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};


