// Menyusun rekomendasi utama (FR-11) & alternatif (FR-12) dari hasil skor rule engine.
const { SKOR_AWAL } = require('./ruleEngine');
const { langkahUntuk } = require('./langkahPraktis');

// SRS FR-12: alternatif harus "aman dan layak". SRS/SDD tidak memberi angka,
// jadi batas ini keputusan tim (sementara 40, menunggu konfirmasi Shakira).
// Rekomendasi utama tidak kena batas ini: tetap tindakan aman dengan skor tertinggi.
const SKOR_MIN_LAYAK = 40;

const PESAN_HANYA_UTAMA_AMAN = 'Hanya rekomendasi utama yang memenuhi aturan keselamatan.';
const PESAN_ALTERNATIF_KURANG_LAYAK =
  'Tindakan lain masih aman, tetapi skornya terlalu rendah untuk direkomendasikan.';

// Alasan tertulis untuk satu tindakan
function alasanRekomendasi(s) {
  if (s.alasan.length) return s.alasan.join(' ');
  if (s.skor < SKOR_AWAL) {
    return 'Tindakan ini masih aman, tetapi skornya lebih rendah karena kondisi barang kurang mendukung.';
  }
  return 'Tindakan ini aman dilakukan, tetapi belum ada aturan khusus yang mendukungnya untuk kondisi barang ini.';
}

// skor: hasil jalankanAnalisis().skor (sudah urut, peringkat 1 dulu)
// keselamatan: hasil periksaKeselamatan() → peringatan & langkah khusus bahaya
// Return baris Rekomendasi siap simpan (tanpa analisisId). Kosong = tidak ada tindakan aman.
function susunRekomendasi(skor, namaKategori, keselamatan = {}) {
  const { peringatan = [], langkahPengganti = {} } = keselamatan;

  const aman = skor.filter((s) => s.aman && s.skor > 0);
  if (aman.length === 0) return [];

  const [utama, ...sisanya] = aman;
  const alternatif = sisanya.filter((s) => s.skor >= SKOR_MIN_LAYAK);

  return [utama, ...alternatif].map((s, i) => ({
    tindakan: s.tindakan,
    jenis: i === 0 ? 'utama' : 'alternatif',
    skor: s.skor,
    alasan: alasanRekomendasi(s),
    // Ada bahaya → pakai langkah khusus bahaya, bukan langkah biasa
    langkahPraktis: langkahPengganti[s.tindakan] ?? langkahUntuk(namaKategori, s.tindakan),
    // Peringatan keselamatan ditempel ke setiap rekomendasi supaya FE bisa menampilkannya di sampingnya
    peringatan,
  }));
}

// Pesan untuk bagian alternatif kalau kosong (SRS FR-12, skenario eksepsional).
// skorSolusi: baris SkorSolusi; tindakanDieliminasi: dari PemeriksaanKeselamatan
function pesanAlternatif(utama, jumlahAlternatif, skorSolusi, tindakanDieliminasi) {
  if (!utama || jumlahAlternatif > 0) return null;

  const adaAmanLain = skorSolusi.some(
    (s) => s.tindakan !== utama.tindakan && s.skor > 0 && !tindakanDieliminasi.includes(s.tindakan)
  );
  return adaAmanLain ? PESAN_ALTERNATIF_KURANG_LAYAK : PESAN_HANYA_UTAMA_AMAN;
}

module.exports = {
  susunRekomendasi,
  pesanAlternatif,
  alasanRekomendasi,
  SKOR_MIN_LAYAK,
  PESAN_HANYA_UTAMA_AMAN,
  PESAN_ALTERNATIF_KURANG_LAYAK,
};
