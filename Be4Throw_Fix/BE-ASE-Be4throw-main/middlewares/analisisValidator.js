const { body, param } = require('express-validator');

const kondisiRules = [
  body('beratKg')
    .optional({ values: 'null' })
    .isFloat({ gt: 0, max: 1000 }).withMessage('Berat harus angka lebih dari 0 dan maksimal 1000 kg')
    .toFloat(),

  body('jawaban')
    .optional()
    .isObject().withMessage('jawaban harus berupa objek'),

  body('kirim')
    .optional()
    .isBoolean().withMessage('kirim harus true atau false')
    .toBoolean(),
];

const buatAnalisisRules = [
  body('barangId').isInt({ min: 1 }).withMessage('barangId harus berupa angka').toInt(),
  ...kondisiRules,
];

const idAnalisisRules = [
  param('id').isInt({ min: 1 }).withMessage('ID analisis harus berupa angka'),
];

// Umpan balik (FR-16): rating wajib 1–5, komentar opsional maks 500 karakter
const umpanBalikRules = [
  body('rating')
    .exists({ values: 'null' }).withMessage('Rating wajib diisi').bail()
    .isInt({ min: 1, max: 5 }).withMessage('Rating harus angka bulat 1 sampai 5')
    .toInt(),

  body('komentar')
    .optional({ values: 'null' })
    .isString().withMessage('Komentar harus berupa teks').bail()
    .trim()
    .isLength({ max: 500 }).withMessage('Komentar maksimal 500 karakter'),
];

module.exports = { buatAnalisisRules, kondisiRules, idAnalisisRules, umpanBalikRules };