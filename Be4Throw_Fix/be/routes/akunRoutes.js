const express = require('express');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { profilRules, passwordRules } = require('../middlewares/akunValidator');
const { uploadFoto } = require('../middlewares/uploadFoto');
const { ubahProfil, ubahPassword, unggahFoto, hapusFoto } = require('../controllers/akunController');

// Pengaturan akun (FR-06), wajib login. Data akun: GET /api/auth/me
const router = express.Router();

router.use(requireAuth);

router.put('/profil', profilRules, validate, ubahProfil);
router.put('/password', passwordRules, validate, ubahPassword);
router.put('/foto', uploadFoto, unggahFoto);
router.delete('/foto', hapusFoto);

module.exports = router;
