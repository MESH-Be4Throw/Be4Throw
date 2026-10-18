// Rule engine Analisis Barang (FR-10, NFR-09).
// Alur: evaluasi kondisi → pemeriksaan keselamatan → hitung skor 0–100 → urutkan.
//
// Format kolom BasisPengetahuan.kondisi (JSON). SEMUA syarat harus cocok:
//   { "fungsiUtama": "tidak_berfungsi" }           → sama persis
//   { "fungsiUtama": ["berfungsi_penuh", "..."] }  → salah satu dari daftar
//   { "kondisiFisik": ["retak", "penyok"] }         → kolom daftar: cukup salah satu ada
//   { "usiaTahun": { "min": 5 } }                   → angka dalam rentang (min/max, inklusif)
//   { "mengandungBahaya": null }                    → pengguna jawab "tidak tahu"
//   {}                                              → selalu cocok (aturan dasar kategori)
//
// Satu baris aturan = satu tindakan. bobot ditambahkan ke skor awal tindakan itu.
// Aturan dengan eliminasi = true tidak menambah skor, tapi membuang tindakannya.
const { TINDAKAN } = require('./tindakan');
const { periksaKeselamatan } = require('./keselamatan');

const SKOR_AWAL = 50;

// Kolom KondisiBarang yang boleh dipakai di aturan
const KOLOM_KONDISI = [
  'fungsiUtama',
  'kondisiFisik',
  'usiaTahun',
  'kelengkapan',
  'mengandungBahaya',
  'jenisBahaya',
];

// Cek satu kolom kondisi terhadap satu syarat
function cocokSyarat(nilai, syarat) {
  if (syarat === null) return nilai === null || nilai === undefined;

  // Kolom berupa daftar (kondisiFisik, jenisBahaya): cukup salah satu nilai ada
  if (Array.isArray(nilai)) {
    const dicari = Array.isArray(syarat) ? syarat : [syarat];
    return dicari.some((s) => nilai.includes(s));
  }

  if (nilai === null || nilai === undefined) return false; // "tidak tahu" tidak cocok syarat apa pun selain null

  if (Array.isArray(syarat)) return syarat.includes(nilai);

  if (typeof syarat === 'object') {
    if (typeof nilai !== 'number') return false;
    const { min = -Infinity, max = Infinity } = syarat;
    return nilai >= min && nilai <= max;
  }

  return nilai === syarat;
}

// Aturan cocok kalau SEMUA syaratnya cocok. Format rusak / kolom tak dikenal → tidak cocok.
function cocokAturan(kondisi, syaratAturan) {
  if (!syaratAturan || typeof syaratAturan !== 'object' || Array.isArray(syaratAturan)) {
    return false;
  }
  return Object.entries(syaratAturan).every(
    ([kolom, syarat]) => KOLOM_KONDISI.includes(kolom) && cocokSyarat(kondisi[kolom], syarat)
  );
}

// Tahap 1: pisahkan aturan yang cocok jadi aturan skor dan aturan eliminasi
function evaluasiAturan(kondisi, daftarAturan) {
  const cocok = daftarAturan.filter((a) => cocokAturan(kondisi, a.kondisi));
  return {
    penilaian: cocok.filter((a) => !a.eliminasi),
    eliminasi: cocok.filter((a) => a.eliminasi),
  };
}

const batasi = (skor) => Math.max(0, Math.min(100, skor));

// Tahap 3: skor tiap tindakan, lalu urutkan (aman dulu, skor tertinggi dulu)
function hitungSkor(aturanPenilaian, tindakanDieliminasi) {
  const hasil = TINDAKAN.map((tindakan, urutan) => {
    const terkait = aturanPenilaian.filter((a) => a.tindakan === tindakan);
    const aman = !tindakanDieliminasi.includes(tindakan);
    const total = terkait.reduce((jumlah, a) => jumlah + a.bobot, SKOR_AWAL);

    // Alasan yang ditampilkan = alasan dari aturan yang MENAIKKAN skor, terkuat dulu
    const alasan = terkait
      .filter((a) => a.bobot > 0)
      .sort((a, b) => b.bobot - a.bobot)
      .map((a) => a.alasan);

    return {
      tindakan,
      aman,
      skor: aman ? batasi(total) : 0,
      alasan: [...new Set(alasan)],
      urutan,
    };
  });

  hasil.sort((a, b) => b.aman - a.aman || b.skor - a.skor || a.urutan - b.urutan);
  return hasil.map(({ urutan, ...h }, i) => ({ ...h, peringkat: i + 1 }));
}

// Jalankan seluruh analisis. Fungsi murni (tanpa DB) supaya gampang di-unit test.
// kondisi: kolom KondisiBarang; daftarAturan: BasisPengetahuan aktif untuk kategori barang
function jalankanAnalisis(kondisi, daftarAturan) {
  const { penilaian, eliminasi } = evaluasiAturan(kondisi, daftarAturan);
  const keselamatan = periksaKeselamatan(kondisi, eliminasi);

  // Simpan versi semua aturan yang dievaluasi (SDD Skema Pengujian no. 10)
  const versiAturan = daftarAturan.map((a) => ({ id: a.id, versi: a.versi }));

  // Tidak ada aturan skor yang cocok → jangan mengarang skor
  if (penilaian.length === 0) {
    return { keselamatan, versiAturan, keterbatasan: true, skor: [] };
  }

  const skor = hitungSkor(penilaian, keselamatan.tindakanDieliminasi);
  return { keselamatan, versiAturan, keterbatasan: false, skor };
}

module.exports = {
  jalankanAnalisis,
  evaluasiAturan,
  hitungSkor,
  cocokAturan,
  SKOR_AWAL,
  KOLOM_KONDISI,
};
