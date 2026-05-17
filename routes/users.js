// routes/users.js — /api/users/*
const router     = require('express').Router();
const bcrypt     = require('bcryptjs');
const db         = require('../config/db');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

// ── GET /api/users/profile ───────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, age, gender, username, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const u = rows[0];
    res.json({
      success: true,
      user: { id: u.id, name: u.full_name, username: u.username, age: u.age, gender: u.gender, joined: u.created_at }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/users/profile — update name / age / gender ─────────────────────
router.put('/profile', async (req, res) => {
  try {
    const { fullName, age, gender } = req.body;
    await db.query(
      'UPDATE users SET full_name = ?, age = ?, gender = ? WHERE id = ?',
      [fullName, parseInt(age), gender, req.user.id]
    );
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ── PUT /api/users/password — change password ───────────────────────────────
router.put('/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const match = await bcrypt.compare(oldPassword, rows[0].password);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

// ── GET /api/users/stats — summary stats ────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM medical_slips WHERE user_id = ?', [req.user.id]
    );
    const [recent] = await db.query(
      'SELECT disease_name, confidence, created_at FROM medical_slips WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [req.user.id]
    );
    res.json({ success: true, stats: { totalSlips: total, recentDiagnoses: recent } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
