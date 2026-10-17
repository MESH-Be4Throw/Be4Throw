const express = require('express');
const validate = require('../middlewares/validate');
const { optionalAuth } = require('../middlewares/auth');
const {
  buatAnalisisRules,
  kondisiRules,
  idAnalisisRules,
  umpanBalikRules,
} = require('../middlewares/analisisValidator');
const {
  buatAnalisis,
  ambilAnalisis,
  updateKondisi,
  prosesAnalisis,
  hitungUlangDampak,
  kirimUmpanBalik,
} = require('../controllers/analisisController');

const router = express.Router();

// Boleh tamu (keputusan tim 11 Okt); tamu wajib kirim header X-Kode-Akses untuk GET/PUT/proses
router.post('/', optionalAuth, buatAnalisisRules, validate, buatAnalisis);
router.get('/:id', optionalAuth, idAnalisisRules, validate, ambilAnalisis);
router.put('/:id/kondisi', optionalAuth, idAnalisisRules, kondisiRules, validate, updateKondisi);
router.post('/:id/proses', optionalAuth, idAnalisisRules, validate, prosesAnalisis); // FR-10 (+ dampak FR-13)
router.post('/:id/dampak', optionalAuth, idAnalisisRules, validate, hitungUlangDampak); // FR-13 coba lagi
router.put('/:id/umpan-balik', optionalAuth, idAnalisisRules, umpanBalikRules, validate, kirimUmpanBalik); // FR-16

module.exports = router;