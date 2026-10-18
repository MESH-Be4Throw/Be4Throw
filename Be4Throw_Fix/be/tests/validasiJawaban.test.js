// Unit test validasi jawaban Identifikasi Kondisi (FR-09, SDD Skema Pengujian)
const { validasiJawaban, keKondisiBarang, TIDAK_TAHU } = require('../logic/validasiJawaban');

// Pertanyaan contoh, bentuknya sama dengan hasil seed
const pertanyaan = [
  {
    id: 1, kode: 'fungsi_utama', tipe: 'pilihan_tunggal', wajib: true, bolehTidakTahu: false,
    opsi: [{ nilai: 'berfungsi_penuh' }, { nilai: 'berfungsi_sebagian' }, { nilai: 'tidak_berfungsi' }],
  },
  {
    id: 2, kode: 'kondisi_fisik', tipe: 'pilihan_ganda', wajib: true, bolehTidakTahu: false,
    opsi: [{ nilai: 'tergores' }, { nilai: 'retak' }, { nilai: 'tidak_ada' }],
  },
  { id: 3, kode: 'usia_tahun', tipe: 'angka', wajib: true, bolehTidakTahu: true, opsi: { min: 0, max: 50 } },
  { id: 4, kode: 'kelengkapan', tipe: 'angka', wajib: true, bolehTidakTahu: true, opsi: { min: 0, max: 100 } },
  {
    id: 5, kode: 'mengandung_bahaya', tipe: 'ya_tidak', wajib: true, bolehTidakTahu: true,
    opsi: [{ nilai: 'ya' }, { nilai: 'tidak' }],
  },
  {
    id: 6, kode: 'jenis_bahaya', tipe: 'pilihan_ganda', wajib: true, bolehTidakTahu: false,
    indukId: 5, tampilJika: { jawaban: 'ya' },
    opsi: [{ nilai: 'baterai' }, { nilai: 'benda_tajam' }],
  },
];

const lengkap = {
  fungsi_utama: 'berfungsi_sebagian',
  kondisi_fisik: ['tergores'],
  usia_tahun: 2,
  kelengkapan: 90,
  mengandung_bahaya: 'tidak',
};

const fields = (errors) => errors.map((e) => e.field);

describe('validasiJawaban', () => {
  test('jawaban lengkap & valid → tanpa error', () => {
    const { errors, bersih } = validasiJawaban(pertanyaan, lengkap, true);
    expect(errors).toEqual([]);
    expect(bersih).toEqual(lengkap);
  });

  test('kirim (wajib lengkap): pertanyaan wajib yang kosong ditolak', () => {
    const { errors } = validasiJawaban(pertanyaan, { fungsi_utama: 'berfungsi_penuh' }, true);
    expect(fields(errors)).toEqual([
      'jawaban.kondisi_fisik',
      'jawaban.usia_tahun',
      'jawaban.kelengkapan',
      'jawaban.mengandung_bahaya',
    ]);
  });

  test('simpan sementara: boleh belum lengkap', () => {
    const { errors } = validasiJawaban(pertanyaan, { fungsi_utama: 'berfungsi_penuh' }, false);
    expect(errors).toEqual([]);
  });

  test('pilihan di luar opsi ditolak', () => {
    const { errors } = validasiJawaban(pertanyaan, { ...lengkap, fungsi_utama: 'meledak' }, true);
    expect(errors).toEqual([{ field: 'jawaban.fungsi_utama', message: 'Pilihan tidak valid' }]);
  });

  test('pilihan ganda harus array & opsi "tidak_ada" tidak boleh digabung', () => {
    expect(fields(validasiJawaban(pertanyaan, { ...lengkap, kondisi_fisik: 'tergores' }, true).errors))
      .toEqual(['jawaban.kondisi_fisik']);
    const { errors } = validasiJawaban(pertanyaan, { ...lengkap, kondisi_fisik: ['tidak_ada', 'retak'] }, true);
    expect(errors[0].message).toContain('tidak ada');
  });

  test('pilihan ganda: nilai dobel dibuang', () => {
    const { bersih } = validasiJawaban(pertanyaan, { ...lengkap, kondisi_fisik: ['retak', 'retak'] }, true);
    expect(bersih.kondisi_fisik).toEqual(['retak']);
  });

  test('angka: harus number dan dalam rentang', () => {
    expect(validasiJawaban(pertanyaan, { ...lengkap, usia_tahun: '2' }, true).errors[0].message)
      .toBe('Jawaban harus berupa angka');
    expect(validasiJawaban(pertanyaan, { ...lengkap, usia_tahun: 51 }, true).errors[0].message)
      .toBe('Jawaban harus di antara 0 dan 50');
    expect(validasiJawaban(pertanyaan, { ...lengkap, usia_tahun: 0 }, true).errors).toEqual([]);
  });

  test('"tidak tahu" hanya untuk pertanyaan yang mengizinkan', () => {
    expect(validasiJawaban(pertanyaan, { ...lengkap, usia_tahun: TIDAK_TAHU }, true).errors).toEqual([]);
    const { errors } = validasiJawaban(pertanyaan, { ...lengkap, fungsi_utama: TIDAK_TAHU }, true);
    expect(fields(errors)).toEqual(['jawaban.fungsi_utama']);
  });

  test('pertanyaan tidak dikenal ditolak', () => {
    const { errors } = validasiJawaban(pertanyaan, { ...lengkap, warna: 'merah' }, true);
    expect(errors).toEqual([{ field: 'jawaban.warna', message: 'Pertanyaan tidak dikenal' }]);
  });

  test('pertanyaan lanjutan wajib dijawab kalau induknya "ya"', () => {
    const { errors } = validasiJawaban(pertanyaan, { ...lengkap, mengandung_bahaya: 'ya' }, true);
    expect(fields(errors)).toEqual(['jawaban.jenis_bahaya']);
  });

  test('jawaban lanjutan dibuang kalau induknya bukan "ya"', () => {
    const { errors, bersih } = validasiJawaban(pertanyaan, { ...lengkap, jenis_bahaya: ['baterai'] }, true);
    expect(errors).toEqual([]);
    expect(bersih.jenis_bahaya).toBeUndefined();
  });
});

describe('keKondisiBarang', () => {
  test('jawaban bersih dipetakan ke kolom KondisiBarang', () => {
    const kondisi = keKondisiBarang({ ...lengkap, mengandung_bahaya: 'ya', jenis_bahaya: ['baterai'], kelengkapan: 87.6 });
    expect(kondisi).toMatchObject({
      fungsiUtama: 'berfungsi_sebagian',
      kondisiFisik: ['tergores'],
      usiaTahun: 2,
      kelengkapan: 88, // kolom Int → dibulatkan
      mengandungBahaya: true,
      jenisBahaya: ['baterai'],
    });
  });

  test('"tidak tahu" jadi null (bahaya null = dianggap berisiko di FR-10)', () => {
    const kondisi = keKondisiBarang({ ...lengkap, usia_tahun: TIDAK_TAHU, kelengkapan: TIDAK_TAHU, mengandung_bahaya: TIDAK_TAHU });
    expect(kondisi).toMatchObject({ usiaTahun: null, kelengkapan: null, mengandungBahaya: null, jenisBahaya: [] });
  });
});
