const { query } = require('express-validator');

// Cuma dicek di sini; angkanya dibaca ulang di controller
// (di Express 5, req.query tidak bisa diubah oleh sanitizer seperti .toInt())
const riwayatRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page harus angka minimal 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit harus angka antara 1 dan 50'),
];

module.exports = { riwayatRules };
