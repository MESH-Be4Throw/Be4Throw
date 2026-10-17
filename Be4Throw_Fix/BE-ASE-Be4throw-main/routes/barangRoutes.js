const express = require('express');
const validate = require('../middlewares/validate');
const { listBarangRules, detailBarangRules } = require('../middlewares/barangValidator');
const { listBarang, detailBarang } = require('../controllers/barangController');

const router = express.Router();

// Publik: analisis boleh tanpa login
router.get('/', listBarangRules, validate, listBarang);
router.get('/:id', detailBarangRules, validate, detailBarang);

module.exports = router;