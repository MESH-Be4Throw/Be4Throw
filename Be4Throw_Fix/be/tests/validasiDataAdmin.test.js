const {
  validasiOpsi,
  validasiPertanyaan,
  validasiKondisiAturan,
} = require('../logic/validasiDataAdmin');
const { fieldBerubah, cekFieldTerkunci } = require('../utils/dataAdmin');
const { dataAturan, keBarisAturan } = require('../prisma/dataAturan');

const fieldError = (errors) => errors.map((e) => e.field);

// Pertanyaan induk "mengandung_bahaya" seperti di seed
const indukBahaya = {
  id: 5,
  kategoriId: 1,
  kode: 'mengandung_bahaya',
  tipe: 'ya_tidak',
  indukId: null,
  opsi: [
    { nilai: 'ya', label: 'Ya' },
    { nilai: 'tidak', label: 'Tidak' },
  ],
};

describe('validasiOpsi', () => {
  test('opsi pilihan yang benar lolos', () => {
    const opsi = [
      { nilai: 'retak', label: 'Retak' },
      { nilai: 'penyok', label: 'Penyok' },
    ];
    expect(validasiOpsi('pilihan_ganda', opsi)).toEqual([]);
  });

  test('nilai dobel, nilai tidak_tahu, dan label kosong ditolak', () => {
    const opsi = [
      { nilai: 'retak', label: 'Retak' },
      { nilai: 'retak', label: '' },
      { nilai: 'tidak_tahu', label: 'Tidak tahu' },
    ];
    expect(fieldError(validasiOpsi('pilihan_ganda', opsi))).toEqual(
      expect.arrayContaining(['opsi', 'opsi[1].label', 'opsi[2].nilai'])
    );
  });

  test('nilai dengan huruf besar/spasi ditolak', () => {
    const errors = validasiOpsi('pilihan_tunggal', [
      { nilai: 'Layar Pecah', label: 'Layar Pecah' },
      { nilai: 'ok', label: 'OK' },
    ]);
    expect(fieldError(errors)).toContain('opsi[0].nilai');
  });

  test('ya_tidak harus tepat 2 opsi', () => {
    expect(validasiOpsi('ya_tidak', [{ nilai: 'ya', label: 'Ya' }])).not.toEqual([]);
  });

  test('angka: min harus lebih kecil dari max', () => {
    expect(validasiOpsi('angka', { min: 0, max: 50, satuan: 'tahun' })).toEqual([]);
    expect(validasiOpsi('angka', { min: 10, max: 5 })).not.toEqual([]);
    expect(validasiOpsi('angka', [{ nilai: 'a', label: 'A' }])).not.toEqual([]);
  });
});

describe('validasiPertanyaan', () => {
  const baru = {
    kategoriId: 1,
    kode: 'bau_menyengat',
    teks: 'Apakah barang berbau menyengat?',
    tipe: 'ya_tidak',
    opsi: [
      { nilai: 'ya', label: 'Ya' },
      { nilai: 'tidak', label: 'Tidak' },
    ],
  };

  test('pertanyaan biasa yang benar lolos', () => {
    expect(validasiPertanyaan(baru)).toEqual([]);
  });

  test('tampilJika tanpa indukId ditolak', () => {
    expect(fieldError(validasiPertanyaan({ ...baru, tampilJika: { jawaban: 'ya' } }))).toContain('tampilJika');
  });

  test('lanjutan: tampilJika harus salah satu nilai opsi induk', () => {
    const lanjutan = { ...baru, indukId: 5, tampilJika: { jawaban: 'mungkin' } };
    expect(fieldError(validasiPertanyaan(lanjutan, indukBahaya))).toContain('tampilJika');
    expect(validasiPertanyaan({ ...lanjutan, tampilJika: { jawaban: 'ya' } }, indukBahaya)).toEqual([]);
  });

  test('lanjutan dari kategori lain ditolak', () => {
    const lanjutan = { ...baru, kategoriId: 2, indukId: 5, tampilJika: { jawaban: 'ya' } };
    expect(fieldError(validasiPertanyaan(lanjutan, indukBahaya))).toContain('indukId');
  });

  test('pertanyaan inti: tipe dan nilai opsi dikunci, label boleh diubah', () => {
    const fungsi = {
      kategoriId: 1,
      kode: 'fungsi_utama',
      tipe: 'pilihan_tunggal',
      opsi: [
        { nilai: 'berfungsi_penuh', label: 'Masih Normal' },
        { nilai: 'tidak_berfungsi', label: 'Mati Total' },
      ],
    };
    expect(validasiPertanyaan(fungsi)).toEqual([]);

    const nilaiAsing = { ...fungsi, opsi: [...fungsi.opsi, { nilai: 'rusak', label: 'Rusak' }] };
    expect(fieldError(validasiPertanyaan(nilaiAsing))).toContain('opsi');

    expect(fieldError(validasiPertanyaan({ ...fungsi, tipe: 'pilihan_ganda' }))).toContain('tipe');
  });

  test('pertanyaan inti tidak bisa dinonaktifkan', () => {
    const usia = { kategoriId: 1, kode: 'usia_tahun', tipe: 'angka', opsi: { min: 0, max: 50 }, status: 'nonaktif' };
    expect(fieldError(validasiPertanyaan(usia))).toContain('status');
  });

  test('jenis_bahaya wajib jadi lanjutan mengandung_bahaya dengan tampilJika "ya"', () => {
    const jenis = {
      kategoriId: 1,
      kode: 'jenis_bahaya',
      tipe: 'pilihan_ganda',
      opsi: [{ nilai: 'baterai', label: 'Baterai' }],
    };
    expect(fieldError(validasiPertanyaan(jenis))).toContain('indukId');
    expect(validasiPertanyaan({ ...jenis, indukId: 5, tampilJika: { jawaban: 'ya' } }, indukBahaya)).toEqual([]);

    // Jenis bahaya yang belum ada aturannya di logic/keselamatan.js ditolak
    const gas = { ...jenis, indukId: 5, tampilJika: { jawaban: 'ya' }, opsi: [{ nilai: 'gas', label: 'Gas' }] };
    expect(fieldError(validasiPertanyaan(gas, indukBahaya))).toContain('opsi');
  });

  test('induk yang punya lanjutan tidak boleh membuang nilai yang dipakai tampilJika', () => {
    const lanjutan = [{ kode: 'jenis_bahaya', tampilJika: { jawaban: 'ya' } }];
    const tanpaYa = { ...indukBahaya, opsi: [{ nilai: 'tidak', label: 'Tidak' }, { nilai: 'mungkin', label: 'Mungkin' }] };
    expect(fieldError(validasiPertanyaan(tanpaYa, null, lanjutan))).toContain('opsi');
    expect(validasiPertanyaan(indukBahaya, null, lanjutan)).toEqual([]);
  });
});

describe('validasiKondisiAturan', () => {
  test('format yang dipakai ruleEngine lolos', () => {
    const kondisi = {
      fungsiUtama: ['berfungsi_penuh', 'berfungsi_sebagian'],
      kondisiFisik: 'tidak_ada',
      usiaTahun: { min: 5 },
      kelengkapan: { max: 49 },
      mengandungBahaya: null,
    };
    expect(validasiKondisiAturan(kondisi)).toEqual([]);
    expect(validasiKondisiAturan({})).toEqual([]);
  });

  test('semua aturan seed lolos validasi', () => {
    for (const data of Object.values(dataAturan)) {
      for (const aturan of data.aturan) {
        for (const baris of keBarisAturan(data.prefix, aturan)) {
          expect(validasiKondisiAturan(baris.kondisi)).toEqual([]);
        }
      }
    }
  });

  test('kolom tidak dikenal dan format salah ditolak', () => {
    const errors = validasiKondisiAturan({
      warna: 'merah',
      fungsiUtama: 'rusak',
      usiaTahun: { min: 10, max: 5 },
      mengandungBahaya: 'ya',
      kondisiFisik: [],
    });
    expect(fieldError(errors)).toEqual([
      'kondisi.warna',
      'kondisi.fungsiUtama',
      'kondisi.usiaTahun',
      'kondisi.mengandungBahaya',
      'kondisi.kondisiFisik',
    ]);
  });

  test('kondisi bukan objek ditolak', () => {
    expect(validasiKondisiAturan(null)).not.toEqual([]);
    expect(validasiKondisiAturan(['fungsiUtama'])).not.toEqual([]);
  });
});

describe('helper data admin', () => {
  test('fieldBerubah: urutan key JSON tidak dianggap perubahan', () => {
    const sebelum = { bobot: 10, kondisi: { usiaTahun: { min: 5 }, fungsiUtama: 'tidak_berfungsi' } };
    expect(fieldBerubah(sebelum, { kondisi: { fungsiUtama: 'tidak_berfungsi', usiaTahun: { min: 5 } } })).toEqual([]);
    expect(fieldBerubah(sebelum, { bobot: 20, kondisi: sebelum.kondisi })).toEqual(['bobot']);
  });

  test('cekFieldTerkunci: boleh dikirim ulang asal nilainya sama', () => {
    const sebelum = { kode: 'ELK-01-GK' };
    expect(cekFieldTerkunci({ kode: 'ELK-01-GK' }, sebelum, ['kode'])).toEqual([]);
    expect(fieldError(cekFieldTerkunci({ kode: 'ELK-99-GK' }, sebelum, ['kode']))).toEqual(['kode']);
  });
});
