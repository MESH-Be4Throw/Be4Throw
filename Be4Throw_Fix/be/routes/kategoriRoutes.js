const express = require('express');
const validate = require('../middlewares/validate');
const { pertanyaanKategoriRules } = require('../middlewares/kategoriValidator');
const { listKategori, listPertanyaanKategori } = require('../controllers/kategoriController');

const router = express.Router();

// Publik: analisis boleh tanpa login
router.get('/', listKategori);
router.get('/:id/pertanyaan', pertanyaanKategoriRules, validate, listPertanyaanKategori);

module.exports = router;