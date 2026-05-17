// routes/slips.js — /api/slips/*
const router     = require('express').Router();
const db         = require('../config/db');
const requireAuth = require('../middleware/auth');

// All slip routes require authentication
router.use(requireAuth);

// ── GET /api/slips  — list all slips for current user ───────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, disease_name, confidence, symptoms, doctor_info, medicines,
              routine, diet, created_at
       FROM medical_slips
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    // Parse JSON columns
    const slips = rows.map(r => ({
      ...r,
      symptoms:    typeof r.symptoms    === 'string' ? JSON.parse(r.symptoms)    : r.symptoms,
      doctor_info: typeof r.doctor_info === 'string' ? JSON.parse(r.doctor_info) : r.doctor_info,
      medicines:   typeof r.medicines   === 'string' ? JSON.parse(r.medicines)   : r.medicines,
    }));
    res.json({ success: true, slips });
  } catch (err) {
    console.error('[GET /slips]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch slips' });
  }
});

// ── GET /api/slips/:id  — single slip ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM medical_slips WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Slip not found' });
    }
    const r = rows[0];
    res.json({
      success: true,
      slip: {
        ...r,
        symptoms:    typeof r.symptoms    === 'string' ? JSON.parse(r.symptoms)    : r.symptoms,
        doctor_info: typeof r.doctor_info === 'string' ? JSON.parse(r.doctor_info) : r.doctor_info,
        medicines:   typeof r.medicines   === 'string' ? JSON.parse(r.medicines)   : r.medicines,
      }
    });
  } catch (err) {
    console.error('[GET /slips/:id]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch slip' });
  }
});

// ── POST /api/slips  — save a new slip ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { id, disease_name, confidence, symptoms, doctor_info, medicines, routine, diet } = req.body;

    if (!id || !disease_name || !symptoms) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await db.query(
      `INSERT INTO medical_slips
         (id, user_id, disease_name, confidence, symptoms, doctor_info, medicines, routine, diet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        disease_name,
        confidence || 0,
        JSON.stringify(symptoms),
        JSON.stringify(doctor_info || {}),
        JSON.stringify(medicines  || []),
        routine || '',
        diet    || ''
      ]
    );

    // Log to analysis_logs for analytics
    await db.query(
      'INSERT INTO analysis_logs (user_id, symptoms, top_disease, confidence) VALUES (?, ?, ?, ?)',
      [req.user.id, JSON.stringify(symptoms), disease_name, confidence || 0]
    ).catch(() => {}); // non-critical

    res.status(201).json({ success: true, message: 'Slip saved', id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Slip with this ID already exists' });
    }
    console.error('[POST /slips]', err);
    res.status(500).json({ success: false, message: 'Failed to save slip' });
  }
});

// ── DELETE /api/slips/:id  — delete a slip ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM medical_slips WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Slip not found or unauthorized' });
    }
    res.json({ success: true, message: 'Slip deleted' });
  } catch (err) {
    console.error('[DELETE /slips/:id]', err);
    res.status(500).json({ success: false, message: 'Failed to delete slip' });
  }
});

module.exports = router;
