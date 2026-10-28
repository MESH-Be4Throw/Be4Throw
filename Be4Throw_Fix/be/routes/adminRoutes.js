const express = require('express');
const validate = require('../middlewares/validate');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const {
  idRules,
  listRules,
  auditRules,
  kategoriRules,
  barangRules,
  pertanyaanRules,
} = require('../middlewares/adminValidator');
const kategori = require('../controllers/adminKategoriController');
const barang = require('../controllers/adminBarangController');
const pertanyaan = require('../controllers/adminPertanyaanController');
const { listAudit } = require('../controllers/auditController');

const router = express.Router();

// Semua endpoint di file ini wajib login sebagai admin
router.use(requireAuth, requireAdmin);

// FR-14 Kelola data. POST = tambah (field wajib lengkap), PUT = ubah (boleh sebagian field)
router.get('/kategori', kategori.listKategori);
router.post('/kategori', kategoriRules(true), validate, kategori.tambahKategori);
router.get('/kategori/:id', idRules, validate, kategori.detailKategori);
router.put('/kategori/:id', idRules, kategoriRules(false), validate, kategori.ubahKategori);
router.delete('/kategori/:id', idRules, validate, kategori.hapusKategori);

router.get('/barang', listRules, validate, barang.listBarang);
router.post('/barang', barangRules(true), validate, barang.tambahBarang);
router.get('/barang/:id', idRules, validate, barang.detailBarang);
router.put('/barang/:id', idRules, barangRules(false), validate, barang.ubahBarang);
router.delete('/barang/:id', idRules, validate, barang.hapusBarang);

router.get('/pertanyaan', listRules, validate, pertanyaan.listPertanyaan);
router.post('/pertanyaan', pertanyaanRules(true), validate, pertanyaan.tambahPertanyaan);
router.get('/pertanyaan/:id', idRules, validate, pertanyaan.detailPertanyaan);
router.put('/pertanyaan/:id', idRules, pertanyaanRules(false), validate, pertanyaan.ubahPertanyaan);
router.delete('/pertanyaan/:id', idRules, validate, pertanyaan.hapusPertanyaan);

// FR-15 Catatan perubahan (hanya baca)
router.get('/audit', auditRules, validate, listAudit);

module.exports = router;
