// Kalkulator dampak lingkungan (FR-13).
// Fungsi murni (tanpa DB) supaya gampang di-unit test, sama seperti ruleEngine.js.
//
// Rumus untuk setiap tindakan yang direkomendasikan (utama + alternatif):
//   pengalihan limbah (kg)    = berat barang yang diisi pengguna
//                               (asumsi: seluruh barang tidak berakhir di TPA)
//   emisi dihindari (kg CO2e) = berat barang × faktor (kgCO2e/kg) dari tabel FaktorDampak
//
// Faktor tidak ada → emisi null + manfaat kualitatif. Angka TIDAK dikarang (SRS FR-13).
const { LABEL_TINDAKAN } = require('./tindakan');

// Satu-satunya satuan faktor yang bisa dihitung: kg CO2e per kg barang
const SATUAN_FAKTOR = 'kgCO2e/kg';

// Selalu ikut dikirim ke FE. Dipakai terutama saat faktor belum tersedia.
const MANFAAT_KUALITATIF = {
  gunakan_kembali: 'Barang tetap terpakai sehingga tidak menambah sampah dan mengurangi kebutuhan membeli barang baru.',
  perbaiki: 'Umur barang bertambah sehingga sampah berkurang dan bahan serta energi untuk membuat barang baru bisa dihemat.',
  jual: 'Barang dipakai lagi oleh orang lain sehingga tidak menjadi sampah dan mengurangi produksi barang baru.',
  donasikan: 'Barang tetap bermanfaat bagi orang lain dan tidak berakhir di tempat pembuangan sampah.',
  daur_ulang: 'Bahan barang diolah kembali sehingga sampah di TPA berkurang dan kebutuhan bahan baku baru bisa ditekan.',
};

// Dipakai di kalimat asumsi: "... tidak dibuang ke TPA karena <...>"
const KETERANGAN_TINDAKAN = {
  gunakan_kembali: 'tetap dipakai',
  perbaiki: 'diperbaiki lalu dipakai lagi',
  jual: 'dijual dan dipakai orang lain',
  donasikan: 'didonasikan dan dipakai orang lain',
  daur_ulang: 'diserahkan ke pendaur ulang',
};

// Pesan untuk skenario eksepsional SRS FR-13
const PESAN_BELUM_DIHITUNG =
  'Dampak lingkungan belum berhasil dihitung. Rekomendasi tetap bisa dipakai, dan perhitungan dampak bisa dicoba lagi.';
const PESAN_TANPA_REKOMENDASI =
  'Dampak lingkungan tidak dihitung karena belum ada tindakan yang aman untuk barang ini.';
const PESAN_TANPA_BERAT = 'Berat barang belum diisi, jadi jumlah limbah dan emisi belum bisa dihitung.';
const PESAN_TANPA_FAKTOR =
  'Faktor dampak untuk barang ini belum tersedia, jadi emisi yang dihindari belum bisa dihitung. ' +
  'Manfaatnya ditampilkan secara kualitatif.';
const PESAN_SEBAGIAN_FAKTOR =
  'Sebagian tindakan belum punya faktor dampak, jadi emisinya ditampilkan secara kualitatif.';
const pesanTahunBerbeda = (daftarTahun) =>
  `Faktor dampak berasal dari tahun yang berbeda (${daftarTahun.join(', ')}). ` +
  'Perhatikan sumber dan tahun di setiap tindakan.';

// 3 angka di belakang koma cukup untuk kg (mis. botol 0,03 kg)
const bulatkan = (x) => Math.round(x * 1000) / 1000;

// Format angka Indonesia untuk teks asumsi, mis. 0.2 → "0,2"
const angka = (x) => x.toLocaleString('id-ID', { maximumFractionDigits: 3 });

// "kgCO2e/kg", "kg CO2e / kg", "KGCO2E/KG" dianggap sama
function satuanDidukung(satuan) {
  return String(satuan ?? '').replace(/\s+/g, '').toLowerCase() === SATUAN_FAKTOR.toLowerCase();
}

// Pilih satu faktor untuk satu tindakan. Kalau ada lebih dari satu yang cocok,
// pakai yang tahunnya paling baru, lalu id terbesar (data yang paling akhir dibuat).
function pilihFaktor(daftarFaktor, material, tindakan) {
  const cocok = daftarFaktor.filter(
    (f) => f.material === material && f.tindakan === tindakan && satuanDidukung(f.satuan)
  );
  cocok.sort((a, b) => b.tahun - a.tahun || b.id - a.id);
  return cocok[0] ?? null;
}

// Teks dasar perhitungan yang ditampilkan ke pengguna (asumsi + faktor yang dipakai)
function susunAsumsi(beratKg, material, tindakan, faktor) {
  const label = LABEL_TINDAKAN[tindakan];
  const bagian = [];

  if (beratKg == null) {
    bagian.push(PESAN_TANPA_BERAT);
  } else {
    bagian.push(
      `Berat barang ${angka(beratKg)} kg sesuai isian pengguna, dan seluruh barang dianggap ` +
        `tidak dibuang ke TPA karena ${KETERANGAN_TINDAKAN[tindakan]}.`
    );
  }

  if (!faktor) {
    bagian.push(`Faktor emisi untuk ${material} dengan tindakan ${label} belum tersedia, jadi emisi tidak dihitung.`);
  } else if (beratKg == null) {
    bagian.push(`Faktor yang tersedia: ${angka(faktor.nilai)} kg CO2e per kg barang (${material}, ${label}).`);
  } else {
    bagian.push(`Emisi dihitung dari berat barang × faktor ${angka(faktor.nilai)} kg CO2e per kg (${material}, ${label}).`);
  }

  return bagian.join(' ');
}

// beratKg      : AnalisisBarang.beratKg (null = belum diisi)
// material     : nama kategori barang (keputusan tim 11 Okt)
// daftarTindakan: tindakan yang direkomendasikan, mis. ['perbaiki', 'jual']
// daftarFaktor : FaktorDampak aktif, minimal { id, versi, material, tindakan, nilai, satuan, sumber, tahun }
//
// Return:
//   rincian    : baris DampakLingkungan siap simpan (tanpa rekomendasiId), satu per tindakan
//   versiFaktor: [{ id, versi }] faktor yang dipakai (SDD Skema Pengujian no. 10)
function hitungDampak({ beratKg, material, daftarTindakan, daftarFaktor }) {
  const dipakai = new Map(); // id faktor → versi

  const rincian = daftarTindakan.map((tindakan) => {
    const faktor = pilihFaktor(daftarFaktor, material, tindakan);
    if (faktor) dipakai.set(faktor.id, faktor.versi);

    const adaBerat = beratKg != null;
    return {
      tindakan,
      material,
      limbahDialihkanKg: adaBerat ? bulatkan(beratKg) : null,
      emisiDihindariKgCO2e: adaBerat && faktor ? bulatkan(beratKg * faktor.nilai) : null,
      asumsi: susunAsumsi(beratKg, material, tindakan, faktor),
      sumber: faktor ? faktor.sumber : null,
      tahunFaktor: faktor ? faktor.tahun : null,
    };
  });

  const versiFaktor = [...dipakai]
    .map(([id, versi]) => ({ id, versi }))
    .sort((a, b) => a.id - b.id);

  return { rincian, versiFaktor };
}

// Catatan keterbatasan untuk FE, dihitung dari baris DampakLingkungan yang sudah tersimpan.
// tahunFaktor null = tindakan itu tidak punya faktor.
function catatanDampak(rincian, beratKg) {
  if (rincian.length === 0) return [PESAN_TANPA_REKOMENDASI];

  const catatan = [];
  if (beratKg == null) catatan.push(PESAN_TANPA_BERAT);

  const denganFaktor = rincian.filter((r) => r.tahunFaktor != null);
  if (denganFaktor.length === 0) catatan.push(PESAN_TANPA_FAKTOR);
  else if (denganFaktor.length < rincian.length) catatan.push(PESAN_SEBAGIAN_FAKTOR);

  const daftarTahun = [...new Set(denganFaktor.map((r) => r.tahunFaktor))].sort((a, b) => a - b);
  if (daftarTahun.length > 1) catatan.push(pesanTahunBerbeda(daftarTahun));

  return catatan;
}

module.exports = {
  hitungDampak,
  catatanDampak,
  pilihFaktor,
  satuanDidukung,
  SATUAN_FAKTOR,
  MANFAAT_KUALITATIF,
  PESAN_BELUM_DIHITUNG,
  PESAN_TANPA_REKOMENDASI,
  PESAN_TANPA_BERAT,
  PESAN_TANPA_FAKTOR,
  PESAN_SEBAGIAN_FAKTOR,
};
