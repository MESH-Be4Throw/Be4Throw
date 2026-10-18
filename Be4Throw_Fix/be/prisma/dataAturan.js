// ==================== ATURAN AWAL BASIS PENGETAHUAN (FR-10) ====================
// DRAFT: isi & angka bobot dibuat developer supaya FR-10 bisa dites.
// WAJIB divalidasi Shakira sebelum demo. Setelah ada FR-14, admin bisa mengubahnya.
//
// Cara baca: skor awal tiap tindakan = 50, lalu bobot dari aturan yang cocok ditambahkan.
// Format "kondisi" lihat komentar di logic/ruleEngine.js.
// Aturan keselamatan dasar (baterai, benda tajam, dll.) TIDAK di sini, tapi di logic/keselamatan.js.

// Singkatan untuk kode aturan, mis. "ELK-03-DU"
const SINGKATAN = {
  gunakan_kembali: 'GK',
  perbaiki: 'PB',
  jual: 'JL',
  donasikan: 'DN',
  daur_ulang: 'DU',
};

// Aturan yang sama untuk semua kategori. Bagian yang beda per kategori diisi lewat parameter.
function aturanUmum({ kerusakanBerat, usiaTua }) {
  return [
    {
      no: '01',
      nama: 'Berfungsi penuh',
      kondisi: { fungsiUtama: 'berfungsi_penuh' },
      alasan: 'Barang masih berfungsi penuh, jadi masih bisa dipakai sendiri atau dimanfaatkan orang lain.',
      bobot: { gunakan_kembali: 30, jual: 20, donasikan: 20, perbaiki: -30, daur_ulang: -30 },
    },
    {
      no: '02',
      nama: 'Berfungsi sebagian',
      kondisi: { fungsiUtama: 'berfungsi_sebagian' },
      alasan: 'Barang masih berfungsi sebagian, jadi perbaikan bisa memperpanjang umur pakainya.',
      // Alasan khusus kalau teks umum di atas tidak pas untuk tindakan tertentu
      alasanKhusus: {
        gunakan_kembali: 'Barang masih berfungsi sebagian, jadi masih bisa dipakai untuk fungsi yang masih berjalan.',
      },
      bobot: { perbaiki: 25, gunakan_kembali: 5, jual: -10, donasikan: -15 },
    },
    {
      no: '03',
      nama: 'Tidak berfungsi',
      kondisi: { fungsiUtama: 'tidak_berfungsi' },
      alasan:
        'Barang sudah tidak berfungsi, jadi lebih tepat didaur ulang, atau diperbaiki kalau kerusakannya masih bisa ditangani.',
      bobot: { daur_ulang: 30, perbaiki: 10, gunakan_kembali: -40, jual: -35, donasikan: -40 },
    },
    {
      no: '04',
      nama: 'Tanpa kerusakan fisik',
      kondisi: { kondisiFisik: 'tidak_ada' },
      alasan: 'Fisik barang masih mulus, jadi lebih layak dijual atau didonasikan.',
      bobot: { jual: 10, donasikan: 10 },
    },
    {
      no: '05',
      nama: 'Kerusakan fisik berat',
      kondisi: { kondisiFisik: kerusakanBerat },
      alasan: 'Kerusakan fisik yang berat membuat barang kurang layak dipakai orang lain, jadi daur ulang lebih tepat.',
      bobot: { jual: -20, donasikan: -20, daur_ulang: 10 },
    },
    {
      no: '06',
      nama: 'Kelengkapan rendah (di bawah 50%)',
      kondisi: { kelengkapan: { max: 49 } },
      alasan: 'Banyak bagian barang yang tidak lengkap, jadi sulit dipakai orang lain atau diperbaiki.',
      bobot: { jual: -15, donasikan: -15, perbaiki: -10, daur_ulang: 10 },
    },
    {
      no: '07',
      nama: `Usia ${usiaTua} tahun ke atas`,
      kondisi: { usiaTahun: { min: usiaTua } },
      alasan: 'Usia barang sudah cukup tua, jadi nilai jual dan peluang perbaikannya menurun.',
      bobot: { jual: -10, perbaiki: -10, daur_ulang: 10 },
    },
  ];
}

// Per kategori: kode singkat + aturan umum + aturan khusus
const dataAturan = {
  Elektronik: {
    prefix: 'ELK',
    aturan: aturanUmum({ kerusakanBerat: ['retak', 'kabel_terkelupas', 'bagian_hilang'], usiaTua: 5 }),
  },
  Pakaian: {
    prefix: 'PKN',
    aturan: [
      ...aturanUmum({ kerusakanBerat: ['sobek', 'berjamur'], usiaTua: 5 }),
      {
        no: '08',
        nama: 'Sobek atau kancing hilang tapi masih bisa dipakai',
        kondisi: {
          kondisiFisik: ['sobek', 'bagian_hilang'],
          fungsiUtama: ['berfungsi_penuh', 'berfungsi_sebagian'],
        },
        alasan: 'Sobekan kecil atau kancing/resleting yang rusak biasanya mudah dijahit atau diganti di penjahit.',
        bobot: { perbaiki: 15 },
      },
    ],
  },
  Plastik: {
    prefix: 'PLS',
    aturan: [
      ...aturanUmum({ kerusakanBerat: ['retak', 'berubah_bentuk', 'berjamur'], usiaTua: 3 }),
      {
        no: '08',
        nama: 'Dasar barang plastik',
        kondisi: {}, // selalu berlaku untuk kategori Plastik
        alasan: 'Barang plastik umumnya sulit diperbaiki, tapi mudah didaur ulang lewat bank sampah.',
        bobot: { perbaiki: -25, daur_ulang: 10 },
      },
    ],
  },
  Furnitur: {
    prefix: 'FRN',
    aturan: [
      ...aturanUmum({ kerusakanBerat: ['lapuk', 'berjamur'], usiaTua: 15 }),
      {
        no: '08',
        nama: 'Patah atau tergores tapi masih bisa dipakai',
        kondisi: {
          kondisiFisik: ['patah', 'tergores'],
          fungsiUtama: ['berfungsi_penuh', 'berfungsi_sebagian'],
        },
        alasan: 'Kerusakan furnitur seperti kaki goyang, patah, atau goresan umumnya bisa diperbaiki tukang kayu.',
        bobot: { perbaiki: 15 },
      },
    ],
  },
};

// Ubah 1 aturan (banyak tindakan) jadi beberapa baris BasisPengetahuan (1 baris = 1 tindakan)
function keBarisAturan(prefix, aturan) {
  return Object.entries(aturan.bobot).map(([tindakan, bobot]) => ({
    kode: `${prefix}-${aturan.no}-${SINGKATAN[tindakan]}`,
    namaAturan: aturan.nama,
    kondisi: aturan.kondisi,
    tindakan,
    bobot,
    alasan: aturan.alasanKhusus?.[tindakan] ?? aturan.alasan,
  }));
}

module.exports = { dataAturan, keBarisAturan };
