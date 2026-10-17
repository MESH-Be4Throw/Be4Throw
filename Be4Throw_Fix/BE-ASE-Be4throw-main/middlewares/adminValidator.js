const { body, param, query } = require('express-validator');
const { TINDAKAN } = require('../logic/tindakan');
const { satuanDidukung, SATUAN_FAKTOR } = require('../logic/dampak');

// Aturan validasi kelola data admin (FR-14).
// wajib = true untuk tambah (POST); false untuk ubah (PUT, boleh kirim sebagian field).
// Cek yang butuh database (kategori ada, kode dobel, dll.) dan format opsi/kondisi
// dilakukan di controller + logic/validasiDataAdmin.js.

const STATUS = ['aktif', 'nonaktif']; // draft tidak dipakai (keputusan tim: tanpa draft/publikasi)
const TIPE_PERTANYAAN = ['pilihan_tunggal', 'pilihan_ganda', 'angka', 'ya_tidak'];
const JENIS_DATA = ['kategori', 'barang', 'pertanyaan', 'aturan', 'faktor_dampak'];
const JENIS_PERUBAHAN = ['tambah', 'ubah', 'hapus'];

// Field wajib di POST, opsional di PUT
const field = (nama, wajib) => (wajib ? body(nama) : body(nama).optional());

// Teks wajib, mis. nama/teks/alasan
const teks = (nama, label, max, wajib) =>
  field(nama, wajib)
    .isString().withMessage(`${label} harus berupa teks`).bail()
    .trim()
    .notEmpty().withMessage(`${label} wajib diisi`).bail()
    .isLength({ max }).withMessage(`${label} maksimal ${max} karakter`);

// Teks opsional yang boleh dikosongkan (null), mis. deskripsi/gambar
const teksBolehKosong = (nama, label, max) =>
  body(nama)
    .optional({ values: 'null' })
    .isString().withMessage(`${label} harus berupa teks`).bail()
    .trim()
    .isLength({ max }).withMessage(`${label} maksimal ${max} karakter`);

const status = () => body('status').optional().isIn(STATUS).withMessage('status harus aktif atau nonaktif');

const tindakan = (wajib) =>
  field('tindakan', wajib).isIn(TINDAKAN).withMessage(`tindakan harus salah satu dari: ${TINDAKAN.join(', ')}`);

// Kode aturan/faktor dampak, mis. "ELK-03-DU" (otomatis jadi huruf besar)
const kodeBesar = (wajib) =>
  field('kode', wajib)
    .isString().withMessage('Kode harus berupa teks').bail()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9_-]{1,30}$/)
    .withMessage('Kode hanya boleh huruf, angka, "-" dan "_" (maks. 30 karakter)');

// ==================== PARAM & QUERY ====================

const idRules = [param('id').isInt({ min: 1 }).withMessage('ID harus berupa angka')];

// Filter daftar. Cuma dicek di sini; nilainya dibaca ulang di controller
// (di Express 5, req.query tidak bisa diubah oleh sanitizer seperti .toInt())
const listRules = [
  query('kategoriId').optional().isInt({ min: 1 }).withMessage('kategoriId harus berupa angka'),
  query('status').optional().isIn(STATUS).withMessage('status harus aktif atau nonaktif'),
  query('tindakan').optional().isIn(TINDAKAN).withMessage('tindakan tidak dikenal'),
  query('q').optional().isString().isLength({ max: 100 }).withMessage('Kata kunci maksimal 100 karakter'),
  query('material').optional().isString().isLength({ max: 50 }).withMessage('material maksimal 50 karakter'),
];

const auditRules = [
  query('jenisData').optional().isIn(JENIS_DATA).withMessage(`jenisData harus salah satu dari: ${JENIS_DATA.join(', ')}`),
  query('jenisPerubahan').optional().isIn(JENIS_PERUBAHAN).withMessage('jenisPerubahan harus tambah, ubah, atau hapus'),
  query('dataId').optional().isInt({ min: 1 }).withMessage('dataId harus berupa angka'),
  query('page').optional().isInt({ min: 1 }).withMessage('page harus angka minimal 1'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit harus angka antara 1 dan 50'),
];

// ==================== BODY PER JENIS DATA ====================

const kategoriRules = (wajib) => [
  teks('nama', 'Nama kategori', 100, wajib),
  teksBolehKosong('deskripsi', 'Deskripsi', 500),
  status(),
];

const barangRules = (wajib) => [
  teks('nama', 'Nama barang', 100, wajib),
  field('kategoriId', wajib).isInt({ min: 1 }).withMessage('kategoriId harus berupa angka').toInt(),
  teksBolehKosong('gambar', 'Gambar', 255),
  body('estimasiBerat')
    .optional({ values: 'null' })
    .isFloat({ gt: 0, max: 1000 }).withMessage('Estimasi berat harus angka lebih dari 0 dan maksimal 1000 kg')
    .toFloat(),
  status(),
];

const pertanyaanRules = (wajib) => [
  field('kategoriId', wajib).isInt({ min: 1 }).withMessage('kategoriId harus berupa angka').toInt(),
  field('kode', wajib)
    .isString().withMessage('Kode harus berupa teks').bail()
    .trim()
    .toLowerCase()
    .matches(/^[a-z][a-z0-9_]{0,49}$/)
    .withMessage('Kode diawali huruf, lalu huruf kecil, angka, atau "_" (maks. 50 karakter), mis. "bau_menyengat"'),
  teks('teks', 'Teks pertanyaan', 255, wajib),
  field('tipe', wajib).isIn(TIPE_PERTANYAAN).withMessage(`tipe harus salah satu dari: ${TIPE_PERTANYAAN.join(', ')}`),
  // Format opsi dicek lengkap di logic/validasiDataAdmin.js (beda per tipe)
  field('opsi', wajib).exists({ values: 'null' }).withMessage('Opsi wajib diisi'),
  body('wajib').optional().isBoolean().withMessage('wajib harus true atau false').toBoolean(),
  body('bolehTidakTahu').optional().isBoolean().withMessage('bolehTidakTahu harus true atau false').toBoolean(),
  body('urutan').optional().isInt({ min: 0, max: 1000 }).withMessage('urutan harus angka 0–1000').toInt(),
  body('indukId').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('indukId harus berupa angka').toInt(),
  body('tampilJika')
    .optional({ values: 'null' })
    .isObject().withMessage('tampilJika harus berupa objek, mis. { "jawaban": "ya" }'),
  status(),
];

const aturanRules = (wajib) => [
  kodeBesar(wajib),
  teks('namaAturan', 'Nama aturan', 150, wajib),
  // null = berlaku untuk semua kategori
  body('kategoriId').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('kategoriId harus berupa angka').toInt(),
  // Format kondisi dicek lengkap di logic/validasiDataAdmin.js
  field('kondisi', wajib)
    .isObject().withMessage('Kondisi harus berupa objek, mis. { "fungsiUtama": "tidak_berfungsi" }'),
  tindakan(wajib),
  body('bobot').optional().isInt({ min: -100, max: 100 }).withMessage('bobot harus angka bulat -100 sampai 100').toInt(),
  body('eliminasi').optional().isBoolean().withMessage('eliminasi harus true atau false').toBoolean(),
  teks('alasan', 'Alasan', 500, wajib),
  status(),
];

const faktorRules = (wajib) => [
  kodeBesar(wajib),
  // Harus sama dengan salah satu nama kategori (keputusan 11 Okt), dicek di controller
  teks('material', 'Material', 50, wajib),
  tindakan(wajib),
  field('nilai', wajib).isFloat().withMessage('nilai harus berupa angka').toFloat(),
  // Kalkulator dampak (FR-13) hanya bisa menghitung faktor per kg barang
  teks('satuan', 'Satuan', 30, wajib)
    .custom(satuanDidukung)
    .withMessage(`Satuan harus "${SATUAN_FAKTOR}" (kg CO2e per kg barang)`),
  teks('sumber', 'Sumber', 255, wajib),
  field('tahun', wajib)
    .isInt({ min: 1990, max: new Date().getUTCFullYear() })
    .withMessage(`tahun harus antara 1990 dan ${new Date().getUTCFullYear()}`)
    .toInt(),
  status(),
];

module.exports = {
  idRules,
  listRules,
  auditRules,
  kategoriRules,
  barangRules,
  pertanyaanRules,
  aturanRules,
  faktorRules,
};
