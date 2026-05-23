// routes/auth.js — /api/auth/*
const router  = require('express').Router();

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { generateOTP, sendOTP } = require('../config/mailer');

// ── Helper: sign a JWT ───────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/// ─────────────────────────────────────────────────────────────
// SEND OTP
// POST /api/auth/send-otp
// ─────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Expiry time = 10 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Save OTP in database
    await db.query(
      `INSERT INTO otps (email, otp, expires_at)
       VALUES (?, ?, ?)`,
      [email, otp, expiresAt]
    );

    // Send email
    await sendOTP(email, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('Send OTP Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});


// ─────────────────────────────────────────────────────────────
// VERIFY OTP
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────────────────────

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, age, gender, username, password } = req.body;

    // Basic validation
    if (!fullName || !email || !age || !gender || !username || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Check duplicate username
    const [rows] = await db.query('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
    if (rows.length) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    // Check duplicate email
    const [emailRows] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (emailRows.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Generate and send OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 10 minutes

    // Save OTP to database
    await db.query(
      'INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)',
      [email.toLowerCase(), otp, expiresAt]
    );

    // Send OTP email
    await sendOTP(email, otp);

    // Hash password and store user data temporarily in OTP table
    const hash = await bcrypt.hash(password, 10);

    // Store pending user data in session-like way using OTP record
    await db.query(
      'UPDATE otps SET otp = ? WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
      [otp, email.toLowerCase()]
    );

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      pendingUser: {
        fullName, email: email.toLowerCase(),
        age, gender, username: username.toLowerCase(),
        password: hash
      }
    });

  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, pendingUser } = req.body;

    if (!email || !otp || !pendingUser) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check OTP
    console.log('Verifying OTP:', email.toLowerCase(), otp);
    const [otpRows] = await db.query(
      'SELECT * FROM otps WHERE email = ? AND otp = ? AND used = 0 AND expires_at > UTC_TIMESTAMP() ORDER BY created_at DESC LIMIT 1',
      [email.toLowerCase(), otp]
    );
    console.log('OTP rows found:', otpRows.length);

    if (!otpRows.length) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await db.query('UPDATE otps SET used = 1 WHERE id = ?', [otpRows[0].id]);

    // Create user account
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, age, gender, username, password) VALUES (?, ?, ?, ?, ?, ?)',
      [pendingUser.fullName.trim(), pendingUser.email, parseInt(pendingUser.age), pendingUser.gender, pendingUser.username, pendingUser.password]
    );

    const user = { id: result.insertId, full_name: pendingUser.fullName, username: pendingUser.username };
    const token = signToken(user);

    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: user.id, name: pendingUser.fullName, email: pendingUser.email, username: pendingUser.username, age: parseInt(pendingUser.age), gender: pendingUser.gender }
    });

  } catch (err) {
    console.error('[verify-otp]', err);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
});


// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

   const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.full_name, email: user.email, username: user.username, age: user.age, gender: user.gender }
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
      'SELECT id, full_name, email, age, gender, username, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const u = rows[0];
    res.json({ success: true, user: { id: u.id, name: u.full_name, email: u.email, username: u.username, age: u.age, gender: u.gender } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
