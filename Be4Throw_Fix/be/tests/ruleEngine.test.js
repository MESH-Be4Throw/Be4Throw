// Unit test rule engine (FR-10, NFR-09)
const { jalankanAnalisis, cocokAturan, hitungSkor, SKOR_AWAL } = require('../logic/ruleEngine');
const { dataAturan, keBarisAturan } = require('../prisma/dataAturan');

// Kondisi dasar: barang aman, berfungsi penuh, mulus
const kondisiDasar = {
  fungsiUtama: 'berfungsi_penuh',
  kondisiFisik: ['tidak_ada'],
  usiaTahun: 1,
  kelengkapan: 100,
  mengandungBahaya: false,
  jenisBahaya: [],
};

// Bikin aturan palsu (seperti hasil query BasisPengetahuan)
let idBerikut = 1;
const aturan = (kondisi, tindakan, bobot, extra = {}) => ({
  id: idBerikut++,
  versi: 1,
  kondisi,
  tindakan,
  bobot,
  eliminasi: false,
  alasan: `alasan ${tindakan} ${bobot}`,
  ...extra,
});

const ambil = (hasil, tindakan) => hasil.skor.find((s) => s.tindakan === tindakan);

describe('cocokAturan', () => {
  test('nilai sama persis', () => {
    expect(cocokAturan(kondisiDasar, { fungsiUtama: 'berfungsi_penuh' })).toBe(true);
    expect(cocokAturan(kondisiDasar, { fungsiUtama: 'tidak_berfungsi' })).toBe(false);
  });

  test('daftar pilihan → salah satu cocok', () => {
    expect(cocokAturan(kondisiDasar, { fungsiUtama: ['berfungsi_penuh', 'berfungsi_sebagian'] })).toBe(true);
  });

  test('kolom daftar (kondisiFisik) → cukup salah satu ada', () => {
    const k = { ...kondisiDasar, kondisiFisik: ['tergores', 'retak'] };
    expect(cocokAturan(k, { kondisiFisik: ['retak', 'penyok'] })).toBe(true);
    expect(cocokAturan(k, { kondisiFisik: 'penyok' })).toBe(false);
  });

  test('rentang angka min/max inklusif', () => {
    expect(cocokAturan({ ...kondisiDasar, usiaTahun: 5 }, { usiaTahun: { min: 5 } })).toBe(true);
    expect(cocokAturan({ ...kondisiDasar, usiaTahun: 4.9 }, { usiaTahun: { min: 5 } })).toBe(false);
    expect(cocokAturan({ ...kondisiDasar, kelengkapan: 49 }, { kelengkapan: { max: 49 } })).toBe(true);
  });

  test('"tidak tahu" (null) hanya cocok dengan syarat null', () => {
    const k = { ...kondisiDasar, usiaTahun: null };
    expect(cocokAturan(k, { usiaTahun: { min: 5 } })).toBe(false);
    expect(cocokAturan(k, { usiaTahun: null })).toBe(true);
  });

  test('semua syarat harus cocok (AND)', () => {
    expect(cocokAturan(kondisiDasar, { fungsiUtama: 'berfungsi_penuh', usiaTahun: { min: 5 } })).toBe(false);
  });

  test('kondisi kosong {} selalu cocok', () => {
    expect(cocokAturan(kondisiDasar, {})).toBe(true);
  });

  test('format rusak atau kolom tidak dikenal → tidak cocok', () => {
    expect(cocokAturan(kondisiDasar, null)).toBe(false);
    expect(cocokAturan(kondisiDasar, 'fungsiUtama=rusak')).toBe(false);
    expect(cocokAturan(kondisiDasar, [])).toBe(false);
    expect(cocokAturan(kondisiDasar, { warna: 'merah' })).toBe(false);
  });
});

describe('hitungSkor', () => {
  test('skor = 50 + jumlah bobot, dibatasi 0–100', () => {
    const hasil = hitungSkor(
      [
        aturan({}, 'jual', 40),
        aturan({}, 'jual', 30), // 50 + 70 = 120 → 100
        aturan({}, 'daur_ulang', -80), // 50 - 80 = -30 → 0
      ],
      []
    );
    expect(hasil.find((s) => s.tindakan === 'jual').skor).toBe(100);
    expect(hasil.find((s) => s.tindakan === 'daur_ulang').skor).toBe(0);
    expect(hasil.find((s) => s.tindakan === 'perbaiki').skor).toBe(SKOR_AWAL);
  });

  test('tindakan tidak aman skornya 0 dan ditaruh paling bawah', () => {
    const hasil = hitungSkor([aturan({}, 'jual', 40)], ['jual']);
    const jual = hasil.find((s) => s.tindakan === 'jual');
    expect(jual.aman).toBe(false);
    expect(jual.skor).toBe(0);
    expect(jual.peringkat).toBe(5);
  });

  test('skor sama → urutan hierarki (gunakan kembali dulu)', () => {
    const hasil = hitungSkor([], []);
    expect(hasil.map((s) => s.tindakan)).toEqual([
      'gunakan_kembali',
      'perbaiki',
      'jual',
      'donasikan',
      'daur_ulang',
    ]);
    expect(hasil.map((s) => s.peringkat)).toEqual([1, 2, 3, 4, 5]);
  });

  test('alasan hanya dari aturan yang menaikkan skor, terkuat dulu', () => {
    const hasil = hitungSkor(
      [aturan({}, 'perbaiki', 10), aturan({}, 'perbaiki', 25), aturan({}, 'perbaiki', -5)],
      []
    );
    expect(hasil.find((s) => s.tindakan === 'perbaiki').alasan).toEqual([
      'alasan perbaiki 25',
      'alasan perbaiki 10',
    ]);
  });
});

describe('jalankanAnalisis', () => {
  test('tanpa aturan → keterbatasan, tidak mengarang skor', () => {
    const hasil = jalankanAnalisis(kondisiDasar, []);
    expect(hasil.keterbatasan).toBe(true);
    expect(hasil.skor).toEqual([]);
  });

  test('ada aturan tapi tidak ada yang cocok → keterbatasan', () => {
    const hasil = jalankanAnalisis(kondisiDasar, [aturan({ fungsiUtama: 'tidak_berfungsi' }, 'daur_ulang', 30)]);
    expect(hasil.keterbatasan).toBe(true);
  });

  test('pemeriksaan keselamatan tetap jalan walau keterbatasan', () => {
    const hasil = jalankanAnalisis({ ...kondisiDasar, mengandungBahaya: true, jenisBahaya: ['baterai'] }, []);
    expect(hasil.keterbatasan).toBe(true);
    expect(hasil.keselamatan.adaBahaya).toBe(true);
  });

  test('aturan eliminasi dari DB membuang tindakan', () => {
    const hasil = jalankanAnalisis(kondisiDasar, [
      aturan({}, 'jual', 30),
      aturan({ fungsiUtama: 'berfungsi_penuh' }, 'jual', 0, { eliminasi: true, alasan: 'Dilarang dijual.' }),
    ]);
    expect(ambil(hasil, 'jual').aman).toBe(false);
    expect(hasil.keselamatan.peringatan).toContain('Dilarang dijual.');
  });

  test('menyimpan versi semua aturan yang dievaluasi', () => {
    const daftar = [aturan({}, 'jual', 10, { id: 7, versi: 3 }), aturan({ usiaTahun: { min: 99 } }, 'perbaiki', 5, { id: 9, versi: 1 })];
    const hasil = jalankanAnalisis(kondisiDasar, daftar);
    expect(hasil.versiAturan).toEqual([
      { id: 7, versi: 3 },
      { id: 9, versi: 1 },
    ]);
  });
});

// Skenario memakai aturan draft di prisma/dataAturan.js (memastikan seed masuk akal)
describe('skenario dengan aturan draft seed', () => {
  const aturanKategori = (nama) =>
    dataAturan[nama].aturan
      .flatMap((a) => keBarisAturan(dataAturan[nama].prefix, a))
      .map((baris, i) => ({ id: i + 1, versi: 1, eliminasi: false, ...baris }));

  test('smartphone berfungsi penuh & mulus → utama gunakan kembali', () => {
    const hasil = jalankanAnalisis(kondisiDasar, aturanKategori('Elektronik'));
    expect(hasil.skor[0].tindakan).toBe('gunakan_kembali');
    expect(ambil(hasil, 'gunakan_kembali').skor).toBe(80);
  });

  test('elektronik berfungsi sebagian → utama perbaiki', () => {
    const k = { ...kondisiDasar, fungsiUtama: 'berfungsi_sebagian', kondisiFisik: ['tergores'], usiaTahun: 3, kelengkapan: 80 };
    const hasil = jalankanAnalisis(k, aturanKategori('Elektronik'));
    expect(hasil.skor[0].tindakan).toBe('perbaiki');
  });

  test('elektronik mati + baterai menggembung → utama daur ulang, jual/donasi dibuang', () => {
    const k = {
      ...kondisiDasar,
      fungsiUtama: 'tidak_berfungsi',
      kondisiFisik: ['retak'],
      mengandungBahaya: true,
      jenisBahaya: ['baterai'],
    };
    const hasil = jalankanAnalisis(k, aturanKategori('Elektronik'));
    expect(hasil.skor[0].tindakan).toBe('daur_ulang');
    expect(ambil(hasil, 'jual').aman).toBe(false);
    expect(ambil(hasil, 'donasikan').aman).toBe(false);
  });

  test('wadah plastik bekas bahan kimia → hanya daur ulang yang aman', () => {
    const k = { ...kondisiDasar, mengandungBahaya: true, jenisBahaya: ['bahan_kimia'] };
    const hasil = jalankanAnalisis(k, aturanKategori('Plastik'));
    expect(hasil.skor.filter((s) => s.aman).map((s) => s.tindakan)).toEqual(['daur_ulang']);
  });

  test('kaos sobek tapi masih bisa dipakai → perbaiki naik', () => {
    const k = { ...kondisiDasar, fungsiUtama: 'berfungsi_sebagian', kondisiFisik: ['sobek'] };
    const hasil = jalankanAnalisis(k, aturanKategori('Pakaian'));
    expect(hasil.skor[0].tindakan).toBe('perbaiki');
  });
});
