// routes/auth.js — /api/auth/*
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

// ── Helper: sign a JWT ───────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, age, gender, username, password } = req.body;

    // Basic validation
    if (!fullName || !age || !gender || !username || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
    }

    // Check duplicate username
    const [rows] = await db.query('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (rows.length) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (full_name, age, gender, username, password) VALUES (?, ?, ?, ?, ?)',
      [fullName.trim(), parseInt(age), gender, username.trim().toLowerCase(), hash]
    );

    const user = { id: result.insertId, full_name: fullName, username: username.toLowerCase() };
    const token = signToken(user);

    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({
      success: true,
      message: 'Account created',
      token,
      user: { id: user.id, name: fullName, username: user.username, age: parseInt(age), gender }
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = signToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.full_name, username: user.username, age: user.age, gender: user.gender }
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

// ── GET /api/auth/me  (verify token, return profile) ────────────────────────
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, age, gender, username, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const u = rows[0];
    res.json({ success: true, user: { id: u.id, name: u.full_name, username: u.username, age: u.age, gender: u.gender } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
