const rateLimit = require('express-rate-limit');
const { fail } = require('../utils/response');

// Max 10 FAILED login attempts per IP every 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // successful logins don't count
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    fail(res, 429, 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.'),
});

// Max 5 requests per IP every 15 minutes (used in part 2)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    fail(res, 429, 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.'),
});

module.exports = { loginLimiter, forgotPasswordLimiter };