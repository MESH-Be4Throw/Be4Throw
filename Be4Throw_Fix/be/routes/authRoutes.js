const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validate');
const {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require('../middlewares/authValidator');
const { requireAuth } = require('../middlewares/auth');
const { loginLimiter, forgotPasswordLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Middleware dijalankan berurutan dari kiri ke kanan
router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginLimiter, loginRules, validate, authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordRules, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, authController.resetPassword);

module.exports = router;