// Unit test penyusunan rekomendasi utama & alternatif (FR-11, FR-12)
const {
  susunRekomendasi,
  pesanAlternatif,
  SKOR_MIN_LAYAK,
  PESAN_HANYA_UTAMA_AMAN,
  PESAN_ALTERNATIF_KURANG_LAYAK,
} = require('../logic/rekomendasi');
const { LANGKAH_PRAKTIS } = require('../logic/langkahPraktis');
const { TINDAKAN } = require('../logic/tindakan');
const { periksaKeselamatan, ATURAN_BAHAYA } = require('../logic/keselamatan');

// Bentuk sama seperti hasil jalankanAnalisis().skor (sudah urut)
const s = (tindakan, skor, aman = true, alasan = []) => ({ tindakan, skor, aman, alasan });

describe('susunRekomendasi', () => {
  test('peringkat 1 jadi utama, sisanya yang layak jadi alternatif', () => {
    const hasil = susunRekomendasi(
      [s('perbaiki', 75), s('gunakan_kembali', 55), s('daur_ulang', 50), s('jual', 40), s('donasikan', 35)],
      'Elektronik'
    );
    expect(hasil.map((r) => [r.tindakan, r.jenis])).toEqual([
      ['perbaiki', 'utama'],
      ['gunakan_kembali', 'alternatif'],
      ['daur_ulang', 'alternatif'],
      ['jual', 'alternatif'], // tepat di batas 40 → masih layak
    ]);
  });

  test(`alternatif di bawah ${SKOR_MIN_LAYAK} dibuang, utama tetap ada walau skornya rendah`, () => {
    const hasil = susunRekomendasi([s('daur_ulang', 30), s('perbaiki', 20)], 'Elektronik');
    expect(hasil).toHaveLength(1);
    expect(hasil[0]).toMatchObject({ tindakan: 'daur_ulang', jenis: 'utama', skor: 30 });
  });

  test('tindakan tidak aman tidak pernah direkomendasikan', () => {
    const hasil = susunRekomendasi(
      [s('daur_ulang', 90), s('perbaiki', 60), s('jual', 0, false), s('donasikan', 0, false)],
      'Elektronik'
    );
    expect(hasil.map((r) => r.tindakan)).toEqual(['daur_ulang', 'perbaiki']);
  });

  test('tidak ada tindakan aman → kosong', () => {
    expect(susunRekomendasi([s('jual', 0, false), s('donasikan', 0, false)], 'Elektronik')).toEqual([]);
  });

  test('langkah praktis diambil sesuai kategori & tindakan', () => {
    const [utama] = susunRekomendasi([s('daur_ulang', 90)], 'Elektronik');
    expect(utama.langkahPraktis).toEqual(LANGKAH_PRAKTIS.Elektronik.daur_ulang);
  });

  test('kategori tidak dikenal → langkah praktis kosong (tidak mengarang)', () => {
    const [utama] = susunRekomendasi([s('daur_ulang', 90)], 'Kategori Baru');
    expect(utama.langkahPraktis).toEqual([]);
  });

  test('alasan: gabungan alasan aturan, atau penjelasan skor rendah', () => {
    const hasil = susunRekomendasi(
      [s('perbaiki', 75, true, ['Alasan A.', 'Alasan B.']), s('jual', 45)],
      'Elektronik'
    );
    expect(hasil[0].alasan).toBe('Alasan A. Alasan B.');
    expect(hasil[1].alasan).toMatch(/skornya lebih rendah/);
  });

  test('ada bahaya → langkah khusus bahaya menggantikan langkah biasa + peringatan ikut ditempel', () => {
    // Botol plastik bekas bahan kimia: jangan sampai disuruh "setor ke bank sampah"
    const keselamatan = periksaKeselamatan({ mengandungBahaya: true, jenisBahaya: ['bahan_kimia'] });
    const [utama] = susunRekomendasi([s('daur_ulang', 30)], 'Plastik', keselamatan);

    expect(utama.langkahPraktis).toEqual(ATURAN_BAHAYA.bahan_kimia.langkahPengganti.daur_ulang);
    expect(utama.langkahPraktis.join(' ')).not.toMatch(/bank sampah/);
    expect(utama.peringatan).toEqual(keselamatan.peringatan);
  });

  test('tanpa bahaya → langkah biasa & peringatan kosong', () => {
    const keselamatan = periksaKeselamatan({ mengandungBahaya: false, jenisBahaya: [] });
    const [utama] = susunRekomendasi([s('daur_ulang', 60)], 'Plastik', keselamatan);
    expect(utama.langkahPraktis).toEqual(LANGKAH_PRAKTIS.Plastik.daur_ulang);
    expect(utama.peringatan).toEqual([]);
  });
});

describe('pesanAlternatif', () => {
  const utama = { tindakan: 'daur_ulang' };
  const skorSolusi = [
    { tindakan: 'daur_ulang', skor: 90 },
    { tindakan: 'perbaiki', skor: 20 },
    { tindakan: 'jual', skor: 0 },
  ];

  test('ada alternatif → tidak ada pesan', () => {
    expect(pesanAlternatif(utama, 1, skorSolusi, [])).toBeNull();
  });

  test('tidak ada utama (keterbatasan / tidak aman) → tidak ada pesan', () => {
    expect(pesanAlternatif(null, 0, skorSolusi, [])).toBeNull();
  });

  test('tindakan lain aman tapi skornya rendah → pesan kurang layak', () => {
    expect(pesanAlternatif(utama, 0, skorSolusi, ['jual'])).toBe(PESAN_ALTERNATIF_KURANG_LAYAK);
  });

  test('tindakan lain tidak aman semua → pesan hanya utama yang aman (SRS FR-12)', () => {
    expect(pesanAlternatif(utama, 0, skorSolusi, ['perbaiki', 'jual'])).toBe(PESAN_HANYA_UTAMA_AMAN);
  });
});

describe('LANGKAH_PRAKTIS', () => {
  test('setiap kategori punya langkah untuk ke-5 tindakan', () => {
    for (const kategori of Object.keys(LANGKAH_PRAKTIS)) {
      for (const tindakan of TINDAKAN) {
        expect(LANGKAH_PRAKTIS[kategori][tindakan].length).toBeGreaterThan(0);
      }
    }
  });
});
