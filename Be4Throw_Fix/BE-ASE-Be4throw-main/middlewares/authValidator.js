const { body } = require('express-validator');

// Aturan email, dipakai di register, login, dan lupa password
const emailRule = () =>
  body('email')
    .trim()
    .notEmpty().withMessage('Email wajib diisi').bail()
    .isEmail().withMessage('Format email tidak valid').bail()
    .toLowerCase();

// Aturan password baru + konfirmasinya, dipakai di register dan reset password
const newPasswordRules = () => [
  body('password')
    .notEmpty().withMessage('Password wajib diisi').bail()
    .isLength({ min: 8, max: 72 }).withMessage('Password harus 8–72 karakter').bail()
    .matches(/[A-Za-z]/).withMessage('Password harus mengandung huruf')
    .matches(/\d/).withMessage('Password harus mengandung angka'),

  body('konfirmasiPassword')
    .notEmpty().withMessage('Konfirmasi password wajib diisi').bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Konfirmasi password tidak sama'),
];

const registerRules = [
  body('nama')
    .trim()
    .notEmpty().withMessage('Nama wajib diisi')
    .isLength({ max: 100 }).withMessage('Nama maksimal 100 karakter'),
  emailRule(),
  ...newPasswordRules(),
];

const loginRules = [
  emailRule(),
  body('password').notEmpty().withMessage('Password wajib diisi'),
  body('ingatSaya')
    .optional()
    .isBoolean().withMessage('ingatSaya harus true atau false')
    .toBoolean(),
];

const forgotPasswordRules = [emailRule()];

const resetPasswordRules = [
  body('token').trim().notEmpty().withMessage('Token reset wajib diisi'),
  ...newPasswordRules(),
];

module.exports = { registerRules, loginRules, forgotPasswordRules, resetPasswordRules };