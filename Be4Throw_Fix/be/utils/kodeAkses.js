const crypto = require('crypto');

// Kode acak 32 karakter untuk tamu (analisis tanpa login)
function buatKodeAkses() {
  return crypto.randomBytes(16).toString('hex');
}

// Yang disimpan di DB cuma hash-nya, sama seperti token reset password
function hashKodeAkses(kode) {
  return crypto.createHash('sha256').update(kode).digest('hex');
}

module.exports = { buatKodeAkses, hashKodeAkses };