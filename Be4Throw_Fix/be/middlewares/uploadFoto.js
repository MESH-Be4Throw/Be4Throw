const multer = require('multer');
const { fail } = require('../utils/response');

// Upload foto profil (FR-06): 1 file, field "foto", maks 2 MB.
// Disimpan dulu di memori, supaya isi file bisa dicek (JPG/PNG/WebP) sebelum ditulis ke disk.
const UKURAN_MAKS = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UKURAN_MAKS, files: 1 },
}).single('foto');

const tolak = (res, message) =>
  fail(res, 422, 'Data yang dikirim tidak valid', [{ field: 'foto', message }]);

// Bungkus multer supaya error-nya jadi response 422 yang rapi, bukan 500
function uploadFoto(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return tolak(res, 'Ukuran foto maksimal 2 MB');
    if (err instanceof multer.MulterError) return tolak(res, 'Kirim satu file dengan nama field "foto"');
    next(err);
  });
}

module.exports = { uploadFoto, UKURAN_MAKS };
