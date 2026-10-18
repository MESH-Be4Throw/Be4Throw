// Helper foto profil (FR-06)

// Cek tipe gambar dari byte awal file ("magic number"), bukan dari nama/mimetype
// yang bisa dipalsukan pengirim. Return 'jpg' | 'png' | 'webp' | null.
function deteksiTipeGambar(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => buffer[i] === b)) return 'png';

  // WebP: "RIFF" + 4 byte ukuran + "WEBP"
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';

  return null;
}

// Path yang disimpan di DB, mis. "/uploads/profil/7-1729150000000.jpg"
const URL_FOTO = '/uploads/profil/';

module.exports = { deteksiTipeGambar, URL_FOTO };
