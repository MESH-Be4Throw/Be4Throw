// 5 tindakan sesuai enum Tindakan di schema.prisma.
// Urutan ini juga dipakai sebagai pemecah seri saat skor sama
// (mengikuti hierarki pengelolaan sampah: pakai lagi dulu, daur ulang terakhir).
const TINDAKAN = ['gunakan_kembali', 'perbaiki', 'jual', 'donasikan', 'daur_ulang'];

// Label untuk ditampilkan ke pengguna
const LABEL_TINDAKAN = {
  gunakan_kembali: 'Gunakan Kembali',
  perbaiki: 'Perbaiki',
  jual: 'Jual',
  donasikan: 'Donasikan',
  daur_ulang: 'Daur Ulang',
};

module.exports = { TINDAKAN, LABEL_TINDAKAN };
