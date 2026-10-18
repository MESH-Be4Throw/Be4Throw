// Helper kecil untuk controller kelola data admin (FR-14)

// Ambil hanya field yang diizinkan dan benar-benar dikirim (bukan undefined).
// Field lain di body diabaikan, supaya admin tidak bisa mengisi kolom seperti id/versi/adminId.
function ambilField(body, daftarField) {
  const data = {};
  for (const field of daftarField) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

// Urutkan key objek (termasuk yang bersarang) supaya { a, b } dianggap sama dengan { b, a }
function urutkanKey(nilai) {
  if (Array.isArray(nilai)) return nilai.map(urutkanKey);
  if (nilai && typeof nilai === 'object') {
    return Object.fromEntries(
      Object.keys(nilai)
        .sort()
        .map((k) => [k, urutkanKey(nilai[k])])
    );
  }
  return nilai;
}

const sama = (a, b) => JSON.stringify(urutkanKey(a ?? null)) === JSON.stringify(urutkanKey(b ?? null));

// Daftar field yang nilainya beda dari data lama.
// Kosong = tidak ada perubahan → tidak perlu simpan, versi tidak naik, tidak dicatat.
function fieldBerubah(sebelum, dataBaru) {
  return Object.keys(dataBaru).filter((field) => !sama(sebelum[field], dataBaru[field]));
}

// Field yang tidak boleh diganti setelah data dibuat (mis. kode).
// Boleh ikut dikirim asal nilainya sama, supaya FE bisa kirim ulang isi form utuh.
function cekFieldTerkunci(body, sebelum, daftarField) {
  return daftarField
    .filter((field) => body[field] !== undefined && !sama(body[field], sebelum[field]))
    .map((field) => ({ field, message: `${field} tidak bisa diubah setelah data dibuat` }));
}

const pesanMasihDipakai = (label) =>
  `${label} masih dipakai sehingga tidak bisa dihapus. Nonaktifkan saja dengan mengubah status menjadi "nonaktif".`;

module.exports = { ambilField, fieldBerubah, cekFieldTerkunci, pesanMasihDipakai };
