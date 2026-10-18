const express = require('express');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { riwayatRules } = require('../middlewares/riwayatValidator');
const { ambilRiwayat } = require('../controllers/riwayatController');

const router = express.Router();

// FR-05: wajib login. Detail tiap riwayat pakai GET /api/analisis/:id (dengan token)
router.get('/', requireAuth, riwayatRules, validate, ambilRiwayat);

module.exports = router;
