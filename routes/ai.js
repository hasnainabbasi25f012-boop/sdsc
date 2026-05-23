const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { analyzeSymptoms, chatWithAI } = require('../config/gemini');
const db = require('../config/db');

// POST /api/ai/analyze
router.post('/analyze', auth, async (req, res) => {
  try {
    const { symptoms } = req.body;
    const userId = req.user.id;

    if (!symptoms || !symptoms.length) {
      return res.status(400).json({ success: false, message: 'Please provide symptoms' });
    }

    // Get user age and gender for better diagnosis
    const [users] = await db.query('SELECT age, gender FROM users WHERE id = ?', [userId]);
    const { age, gender } = users[0];

    // Call Gemini AI
    const result = await analyzeSymptoms(symptoms, age, gender);

    // Save to analysis_logs
    await db.query(
      'INSERT INTO analysis_logs (user_id, symptoms, top_disease, confidence) VALUES (?, ?, ?, ?)',
      [userId, JSON.stringify(symptoms), result.disease, result.confidence]
    );

    res.json({ success: true, result });

  } catch (err) {
    console.error('[ai/analyze]', err);
    res.status(500).json({ success: false, message: 'AI analysis failed' });
  }
});

// POST /api/ai/chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, disease, history } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
const reply = await chatWithAI(message, disease, history);

    res.json({ success: true, reply });

  } catch (err) {
    console.error('[ai/chat]', err);
    res.status(500).json({ success: false, message: 'Chat failed' });
  }
});

module.exports = router;