const { body } = require('express-validator');

// Validasi pengaturan akun (FR-06)

// Field opsional yang boleh dikosongkan: "" atau null → dilewati di sini, disimpan null di controller
const bolehKosong = (nama) => body(nama).optional({ values: 'falsy' });

const profilRules = [
  // Keputusan tim 11 Okt: email tidak bisa diedit
  body('email').not().exists().withMessage('Email tidak bisa diubah'),

  body('nama')
    .optional()
    .isString().withMessage('Nama harus berupa teks').bail()
    .trim()
    .notEmpty().withMessage('Nama wajib diisi').bail()
    .isLength({ max: 100 }).withMessage('Nama maksimal 100 karakter'),

  bolehKosong('username')
    .isString().withMessage('Username harus berupa teks').bail()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9_.]{3,30}$/)
    .withMessage('Username 3–30 karakter, hanya huruf kecil, angka, titik, dan garis bawah'),

  bolehKosong('noTelepon')
    .isString().withMessage('Nomor telepon harus berupa teks').bail()
    .customSanitizer((v) => v.replace(/[\s-]/g, '')) // "0812-3456 789" → "08123456789"
    .matches(/^(\+62|62|0)8\d{7,12}$/)
    .withMessage('Nomor telepon tidak valid, contoh: 081234567890'),

  bolehKosong('domisili')
    .isString().withMessage('Domisili harus berupa teks').bail()
    .trim()
    .isLength({ max: 100 }).withMessage('Domisili maksimal 100 karakter'),
];

const passwordRules = [
  body('passwordLama').notEmpty().withMessage('Password lama wajib diisi'),

  // Aturan sama dengan register (FR-01)
  body('passwordBaru')
    .notEmpty().withMessage('Password baru wajib diisi').bail()
    .isLength({ min: 8, max: 72 }).withMessage('Password harus 8–72 karakter').bail()
    .matches(/[A-Za-z]/).withMessage('Password harus mengandung huruf')
    .matches(/\d/).withMessage('Password harus mengandung angka'),

  body('konfirmasiPassword')
    .notEmpty().withMessage('Konfirmasi password wajib diisi').bail()
    .custom((value, { req }) => value === req.body.passwordBaru)
    .withMessage('Konfirmasi password tidak sama'),
];

module.exports = { profilRules, passwordRules };
