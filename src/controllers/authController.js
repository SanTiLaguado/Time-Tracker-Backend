// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

const MAX_ATTEMPTS = 2;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

const AuthController = {
  /**
   * POST /api/auth/login
   */
  login: async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check temporary lock
      if (
        user.failed_attempts >= MAX_ATTEMPTS &&
        Date.now() - new Date(user.last_failed_at).getTime() < LOCK_TIME
      ) {
        const remainingMs = LOCK_TIME - (Date.now() - new Date(user.last_failed_at).getTime());
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return res.status(403).json({
          message: 'Account temporarily locked. Try again later.',
          lockTimeRemaining: remainingMinutes
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        await userModel.incrementFailedAttempts(email);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Successful login: reset counters and update last login
      await userModel.resetFailedAttempts(email);
      await userModel.updateLastLogin(email);

      // Generate JWT
      const payload = { userId: user.id, email: user.email, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

      return res.json({ token });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * POST /api/auth/register
   * Private endpoint: requires x-secret-key header
   */
  register: async (req, res) => {
    const secretKey = req.headers['x-secret-key'];
    if (secretKey !== process.env.REGISTER_SECRET) {
      return res.status(403).json({ message: 'Not authorized to register users' });
    }

    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    try {
      const existing = await userModel.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const newUser = await userModel.createUser({ name, email, password: hashed, role });
      return res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (err) {
      console.error('Register error:', err);
      if (err.message.includes('already registered')) {
        return res.status(409).json({ message: 'User already exists' });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = AuthController;
