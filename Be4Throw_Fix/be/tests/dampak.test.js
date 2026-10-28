// Unit test kalkulator dampak lingkungan (FR-13)
const {
  hitungDampak,
  hitungDampakKomposisi,
  catatanDampak,
  pilihFaktor,
  satuanDidukung,
  PESAN_TANPA_REKOMENDASI,
  PESAN_TANPA_BERAT,
  PESAN_TANPA_FAKTOR,
  PESAN_SEBAGIAN_FAKTOR,
} = require('../logic/dampak');

// Faktor contoh. Angkanya hanya untuk test, BUKAN data asli.
const f = (id, tindakan, nilai, extra = {}) => ({
  id,
  versi: 1,
  material: 'Elektronik',
  tindakan,
  nilai,
  satuan: 'kgCO2e/kg',
  sumber: `Sumber uji ${id}`,
  tahun: 2022,
  ...extra,
});

const hitung = (beratKg, daftarTindakan, daftarFaktor) =>
  hitungDampak({ beratKg, material: 'Elektronik', daftarTindakan, daftarFaktor });

describe('hitungDampak', () => {
  test('faktor tersedia → emisi = berat × faktor, limbah = berat, sumber & tahun ikut', () => {
    const { rincian, versiFaktor } = hitung(2, ['perbaiki'], [f(1, 'perbaiki', 10)]);

    expect(rincian).toHaveLength(1);
    expect(rincian[0]).toMatchObject({
      tindakan: 'perbaiki',
      material: 'Elektronik',
      limbahDialihkanKg: 2,
      emisiDihindariKgCO2e: 20,
      sumber: 'Sumber uji 1',
      tahunFaktor: 2022,
    });
    expect(rincian[0].asumsi).toContain('2 kg');
    expect(rincian[0].asumsi).toContain('10 kg CO2e per kg');
    expect(versiFaktor).toEqual([{ id: 1, versi: 1 }]);
  });

  test('faktor tidak ada → emisi null (tidak dikarang), limbah tetap dari berat', () => {
    const { rincian, versiFaktor } = hitung(0.5, ['jual'], []);

    expect(rincian[0]).toMatchObject({
      limbahDialihkanKg: 0.5,
      emisiDihindariKgCO2e: null,
      sumber: null,
      tahunFaktor: null,
    });
    expect(rincian[0].asumsi).toContain('belum tersedia');
    expect(versiFaktor).toEqual([]);
  });

  test('faktor material lain, tindakan lain, atau satuan lain tidak dipakai', () => {
    const daftarFaktor = [
      f(1, 'daur_ulang', 5, { material: 'Plastik' }),
      f(2, 'jual', 5),
      f(3, 'daur_ulang', 5, { satuan: 'kgCO2e/unit' }),
    ];
    const { rincian, versiFaktor } = hitung(1, ['daur_ulang'], daftarFaktor);

    expect(rincian[0].emisiDihindariKgCO2e).toBeNull();
    expect(versiFaktor).toEqual([]);
  });

  test('tiap tindakan pakai faktornya sendiri, versi semua faktor yang dipakai tercatat', () => {
    const daftarFaktor = [f(7, 'daur_ulang', 1.5, { versi: 3 }), f(4, 'perbaiki', 12)];
    const { rincian, versiFaktor } = hitung(2, ['perbaiki', 'daur_ulang', 'donasikan'], daftarFaktor);

    expect(rincian.map((r) => [r.tindakan, r.emisiDihindariKgCO2e])).toEqual([
      ['perbaiki', 24],
      ['daur_ulang', 3],
      ['donasikan', null],
    ]);
    expect(versiFaktor).toEqual([
      { id: 4, versi: 1 },
      { id: 7, versi: 3 },
    ]);
  });

  test('berat belum diisi → limbah & emisi null, faktor tetap disebut di asumsi', () => {
    const { rincian, versiFaktor } = hitung(null, ['perbaiki'], [f(1, 'perbaiki', 10)]);

    expect(rincian[0].limbahDialihkanKg).toBeNull();
    expect(rincian[0].emisiDihindariKgCO2e).toBeNull();
    expect(rincian[0].asumsi).toContain(PESAN_TANPA_BERAT);
    expect(rincian[0].asumsi).toContain('10 kg CO2e per kg barang');
    expect(versiFaktor).toEqual([{ id: 1, versi: 1 }]);
  });

  test('hasil dibulatkan 3 angka di belakang koma', () => {
    const { rincian } = hitung(0.03, ['daur_ulang'], [f(1, 'daur_ulang', 1.234)]);
    expect(rincian[0].emisiDihindariKgCO2e).toBe(0.037); // 0.03 × 1.234 = 0.03702
  });

  test('tidak ada rekomendasi → rincian kosong', () => {
    expect(hitung(1, [], [f(1, 'perbaiki', 10)])).toEqual({ rincian: [], versiFaktor: [] });
  });
});

describe('pilihFaktor', () => {
  test('lebih dari satu faktor cocok → tahun terbaru, lalu id terbesar', () => {
    const daftarFaktor = [
      f(1, 'perbaiki', 10, { tahun: 2023 }),
      f(2, 'perbaiki', 11, { tahun: 2020 }),
      f(3, 'perbaiki', 12, { tahun: 2023 }),
    ];
    expect(pilihFaktor(daftarFaktor, 'Elektronik', 'perbaiki').id).toBe(3);
  });

  test('tidak ada yang cocok → null', () => {
    expect(pilihFaktor([f(1, 'jual', 10)], 'Elektronik', 'perbaiki')).toBeNull();
  });
});

describe('satuanDidukung', () => {
  test.each(['kgCO2e/kg', 'kg CO2e / kg', 'KGCO2E/KG'])('"%s" didukung', (satuan) => {
    expect(satuanDidukung(satuan)).toBe(true);
  });

  test.each(['kgCO2e/unit', 'kg', '', null])('"%s" tidak didukung', (satuan) => {
    expect(satuanDidukung(satuan)).toBe(false);
  });
});

describe('catatanDampak', () => {
  const r = (tahunFaktor) => ({ tahunFaktor });

  test('tanpa rekomendasi → pesan tidak dihitung', () => {
    expect(catatanDampak([], 1)).toEqual([PESAN_TANPA_REKOMENDASI]);
  });

  test('semua punya faktor dari tahun yang sama → tidak ada catatan', () => {
    expect(catatanDampak([r(2022), r(2022)], 1)).toEqual([]);
  });

  test('tidak ada faktor sama sekali → manfaat kualitatif', () => {
    expect(catatanDampak([r(null), r(null)], 1)).toEqual([PESAN_TANPA_FAKTOR]);
  });

  test('sebagian punya faktor → catatan sebagian kualitatif', () => {
    expect(catatanDampak([r(2022), r(null)], 1)).toEqual([PESAN_SEBAGIAN_FAKTOR]);
  });

  test('faktor dari tahun berbeda → tahun disebut (urut)', () => {
    const [catatan] = catatanDampak([r(2023), r(2019)], 1);
    expect(catatan).toContain('2019, 2023');
  });

  test('berat belum diisi → disebut sebagai data yang kurang', () => {
    expect(catatanDampak([r(2022)], null)).toEqual([PESAN_TANPA_BERAT]);
  });
});

describe('hitungDampakKomposisi', () => {
  const komposisi = [
    { material: 'Plastik', persen: 60 },
    { material: 'Logam', persen: 40 },
  ];
  const fm = (id, material, nilai) => f(id, 'daur_ulang', nilai, { material });
  const hitungK = (daftarFaktor, beratKg = 2) =>
    hitungDampakKomposisi({ beratKg, komposisi, materialDasar: 'Elektronik', daftarTindakan: ['daur_ulang'], daftarFaktor });

  test('emisi = jumlah (berat × persen × faktor) tiap bahan, rincian bahan ikut', () => {
    const { rincian, versiFaktor } = hitungK([fm(1, 'Plastik', 1), fm(2, 'Logam', 4)]);

    expect(rincian[0].limbahDialihkanKg).toBe(2);
    expect(rincian[0].emisiDihindariKgCO2e).toBe(4.4); // 1,2 × 1 + 0,8 × 4
    expect(rincian[0].bahan).toEqual([
      { material: 'Plastik', persen: 60, beratKg: 1.2, emisiKgCO2e: 1.2, faktor: 1, satuan: 'kgCO2e/kg', sumber: 'Sumber uji 1', tahun: 2022 },
      { material: 'Logam', persen: 40, beratKg: 0.8, emisiKgCO2e: 3.2, faktor: 4, satuan: 'kgCO2e/kg', sumber: 'Sumber uji 2', tahun: 2022 },
    ]);
    expect(versiFaktor).toEqual([{ id: 1, versi: 1 }, { id: 2, versi: 1 }]);
  });

  test('satu bahan tanpa faktor → total null, bahan lain tetap dihitung', () => {
    const { rincian } = hitungK([fm(1, 'Plastik', 1)]);

    expect(rincian[0].emisiDihindariKgCO2e).toBeNull();
    expect(rincian[0].bahan[0].emisiKgCO2e).toBe(1.2);
    expect(rincian[0].bahan[1]).toMatchObject({ emisiKgCO2e: null, faktor: null, sumber: null, tahun: null });
    expect(rincian[0].asumsi).toContain('Logam');
  });

  test('tanpa berat → semua null; tanpa komposisi → hitung seperti biasa per material dasar', () => {
    expect(hitungK([fm(1, 'Plastik', 1), fm(2, 'Logam', 4)], null).rincian[0].emisiDihindariKgCO2e).toBeNull();

    const { rincian } = hitungDampakKomposisi({
      beratKg: 2,
      komposisi: [],
      materialDasar: 'Elektronik',
      daftarTindakan: ['daur_ulang'],
      daftarFaktor: [f(1, 'daur_ulang', 10)],
    });
    expect(rincian[0].emisiDihindariKgCO2e).toBe(20);
    expect(rincian[0].bahan).toBeUndefined();
  });
});
