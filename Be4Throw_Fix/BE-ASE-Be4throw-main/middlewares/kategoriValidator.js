const { param } = require('express-validator');

const pertanyaanKategoriRules = [
  param('id').isInt({ min: 1 }).withMessage('ID kategori harus berupa angka'),
];

module.exports = { pertanyaanKategoriRules };