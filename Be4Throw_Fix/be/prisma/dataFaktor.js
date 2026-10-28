// Faktor emisi untuk dampak lingkungan (FR-13), kgCO2e yang dihindari per kg bahan.
// Material = bahan penyusun barang (lihat dataKomposisi.js). Admin tidak mengelola data ini lewat aplikasi.
//
// Sumber: EPA WARM Version 16 (Desember 2023), Exhibit 1-1 "Greenhouse Gas Emissions from Management
// Options Modeled in WARM (MTCO2E/Short Ton of Material)". Nilai WARM negatif = emisi dihindari, di sini
// ditulis positif, lalu dikonversi ke kgCO2e/kg (1 short ton = 907,185 kg).
//   - daur_ulang                                          → kolom "Net Recycling Emissions"
//   - gunakan_kembali, perbaiki, jual, donasikan          → kolom "Net Source Reduction Emissions for
//     Current Mix of Inputs". WARM memasukkan reuse dan perpanjangan umur pakai sebagai source reduction.
// Tekstil dan Baterai TIDAK ada di WARM v16, jadi sengaja tidak punya faktor: emisinya tidak dihitung
// dan ditampilkan kualitatif (SRS FR-13: angka tidak boleh dikarang). Tambahkan hanya dengan sumber nyata.
const TAHUN = 2023;
const KG_PER_SHORT_TON = 907.185;

// [nama baris WARM, source reduction (current mix), recycling] dalam MTCO2E/short ton (nilai absolut)
const warm = {
  Plastik: ['Mixed Plastics', 1.87, 0.93],
  Logam: ['Mixed Metals', 3.65, 4.39],
  Kaca: ['Glass', 0.53, 0.28],
  Kayu: ['Dimensional Lumber', 2.11, 1.66],
  'Komponen Elektronik': ['Mixed Electronics', 20.79, 0.9],
};

const PREFIX = { Plastik: 'PLS', Logam: 'LGM', Kaca: 'KCA', Kayu: 'KYU', 'Komponen Elektronik': 'ELK' };
const SINGKATAN = { gunakan_kembali: 'GK', perbaiki: 'PB', jual: 'JL', donasikan: 'DN', daur_ulang: 'DU' };
const TINDAKAN_SOURCE_REDUCTION = ['gunakan_kembali', 'perbaiki', 'jual', 'donasikan'];

const keKgPerKg = (mtPerShortTon) => Math.round((mtPerShortTon * 1000 * 1000) / KG_PER_SHORT_TON) / 1000;

// Baris FaktorDampak siap simpan (tanpa adminId)
const dataFaktor = Object.entries(warm).flatMap(([material, [barisWarm, sourceReduction, recycling]]) => {
  const buat = (tindakan, angka, kolom) => ({
    kode: `FD-${PREFIX[material]}-${SINGKATAN[tindakan]}`,
    material,
    tindakan,
    nilai: keKgPerKg(angka),
    satuan: 'kgCO2e/kg',
    sumber: `EPA WARM v16 (Des 2023), Exhibit 1-1, "${barisWarm}", ${kolom}; dikonversi dari ${angka} MTCO2E/short ton`,
    tahun: TAHUN,
  });

  return [
    ...TINDAKAN_SOURCE_REDUCTION.map((t) => buat(t, sourceReduction, 'Net Source Reduction (current mix)')),
    buat('daur_ulang', recycling, 'Net Recycling'),
  ];
});

module.exports = { dataFaktor };
