// server.js — Main Express server
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');

// ── Initialize DB (runs connection test on import) ───────────────────────────
require('./config/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,           // allow same-origin + any localhost port in dev
  credentials: true,      // needed for cookies
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/slips', require('./routes/slips'));
app.use('/api/users', require('./routes/users'));

// ── Serve Frontend ───────────────────────────────────────────────────────────
// Drop index.html into /public and it will be served at http://localhost:3000
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all: send index.html for any unmatched route (SPA behaviour)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Server running at http://localhost:${PORT}`);
  console.log(`📋  API base: http://localhost:${PORT}/api`);
  console.log(`🌐  Frontend: http://localhost:${PORT}\n`);
});
