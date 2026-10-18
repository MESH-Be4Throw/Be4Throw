const { query, param } = require('express-validator');

const listBarangRules = [
  query('q')
    .optional()
    .isString().withMessage('Kata kunci tidak valid').bail()
    .trim()
    .isLength({ max: 100 }).withMessage('Kata kunci maksimal 100 karakter'),

  query('kategoriId')
    .optional()
    .isInt({ min: 1 }).withMessage('kategoriId harus berupa angka'),
];

const detailBarangRules = [
  param('id').isInt({ min: 1 }).withMessage('ID barang harus berupa angka'),
];

module.exports = { listBarangRules, detailBarangRules };