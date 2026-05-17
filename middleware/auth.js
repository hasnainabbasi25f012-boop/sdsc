// middleware/auth.js — JWT verification middleware
const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  // Accept token from Authorization header OR cookie
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token — please sign in' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { id, username, name }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token expired or invalid — please sign in again' });
  }
};
