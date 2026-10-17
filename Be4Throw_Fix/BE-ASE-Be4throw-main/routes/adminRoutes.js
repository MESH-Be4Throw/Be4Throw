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
  aturanRules,
  faktorRules,
} = require('../middlewares/adminValidator');
const kategori = require('../controllers/adminKategoriController');
const barang = require('../controllers/adminBarangController');
const pertanyaan = require('../controllers/adminPertanyaanController');
const aturan = require('../controllers/adminAturanController');
const faktor = require('../controllers/adminFaktorController');
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

router.get('/aturan', listRules, validate, aturan.listAturan);
router.post('/aturan', aturanRules(true), validate, aturan.tambahAturan);
router.get('/aturan/:id', idRules, validate, aturan.detailAturan);
router.put('/aturan/:id', idRules, aturanRules(false), validate, aturan.ubahAturan);
router.delete('/aturan/:id', idRules, validate, aturan.hapusAturan);

router.get('/faktor-dampak', listRules, validate, faktor.listFaktor);
router.post('/faktor-dampak', faktorRules(true), validate, faktor.tambahFaktor);
router.get('/faktor-dampak/:id', idRules, validate, faktor.detailFaktor);
router.put('/faktor-dampak/:id', idRules, faktorRules(false), validate, faktor.ubahFaktor);
router.delete('/faktor-dampak/:id', idRules, validate, faktor.hapusFaktor);

// FR-15 Catatan perubahan (hanya baca)
router.get('/audit', auditRules, validate, listAudit);

module.exports = router;
