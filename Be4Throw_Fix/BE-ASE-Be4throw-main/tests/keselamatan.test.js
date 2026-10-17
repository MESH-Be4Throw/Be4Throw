// Unit test aturan keselamatan (FR-10, SDD Skema Pengujian no. 2)
const { periksaKeselamatan } = require('../logic/keselamatan');

const kondisi = (mengandungBahaya, jenisBahaya = []) => ({ mengandungBahaya, jenisBahaya });

describe('periksaKeselamatan', () => {
  test('barang aman → tidak ada tindakan yang dibuang', () => {
    const hasil = periksaKeselamatan(kondisi(false));
    expect(hasil.adaBahaya).toBe(false);
    expect(hasil.tindakanDieliminasi).toEqual([]);
    expect(hasil.peringatan).toEqual([]);
  });

  test('baterai → buang gunakan kembali, jual, donasikan', () => {
    const hasil = periksaKeselamatan(kondisi(true, ['baterai']));
    expect(hasil.adaBahaya).toBe(true);
    expect(hasil.tindakanDieliminasi).toEqual(['gunakan_kembali', 'jual', 'donasikan']);
    expect(hasil.peringatan[0]).toMatch(/Baterai/);
  });

  test('benda tajam → buang gunakan kembali, jual, donasikan', () => {
    const hasil = periksaKeselamatan(kondisi(true, ['benda_tajam']));
    expect(hasil.tindakanDieliminasi).toEqual(['gunakan_kembali', 'jual', 'donasikan']);
  });

  test('bahan kimia → perbaiki juga dibuang, sisa daur ulang', () => {
    const hasil = periksaKeselamatan(kondisi(true, ['bahan_kimia']));
    expect(hasil.tindakanDieliminasi).toEqual(['gunakan_kembali', 'perbaiki', 'jual', 'donasikan']);
  });

  test('limbah elektronik → buang gunakan kembali, jual, donasikan', () => {
    const hasil = periksaKeselamatan(kondisi(true, ['limbah_elektronik']));
    expect(hasil.tindakanDieliminasi).toEqual(['gunakan_kembali', 'jual', 'donasikan']);
  });

  test('beberapa bahaya → gabungan, tanpa dobel', () => {
    const hasil = periksaKeselamatan(kondisi(true, ['baterai', 'bahan_kimia']));
    expect(hasil.tindakanDieliminasi).toEqual(['gunakan_kembali', 'perbaiki', 'jual', 'donasikan']);
    expect(hasil.peringatan).toHaveLength(2);
  });

  test('bahaya "tidak tahu" (null) → anggap berisiko, buang jual & donasikan', () => {
    const hasil = periksaKeselamatan(kondisi(null));
    expect(hasil.adaBahaya).toBe(true);
    expect(hasil.tindakanDieliminasi).toEqual(['jual', 'donasikan']);
    expect(hasil.peringatan[0]).toMatch(/pihak yang kompeten/);
  });

  test('jawab "ya" tapi jenis bahaya kosong → diperlakukan seperti tidak tahu', () => {
    const hasil = periksaKeselamatan(kondisi(true, []));
    expect(hasil.tindakanDieliminasi).toEqual(['jual', 'donasikan']);
  });

  test('aturan eliminasi tambahan dari DB ikut dipakai', () => {
    const dariDb = [{ tindakan: 'perbaiki', alasan: 'Jangan diperbaiki sendiri.' }];
    const hasil = periksaKeselamatan(kondisi(false), dariDb);
    expect(hasil.adaBahaya).toBe(true);
    expect(hasil.tindakanDieliminasi).toEqual(['perbaiki']);
    expect(hasil.peringatan).toEqual(['Jangan diperbaiki sendiri.']);
  });

  test('langkah pengganti hanya untuk tindakan yang masih boleh', () => {
    const hasil = periksaKeselamatan(kondisi(true, ['bahan_kimia']));
    expect(Object.keys(hasil.langkahPengganti)).toEqual(['daur_ulang']);
  });

  test('beberapa bahaya → langkah pengganti digabung', () => {
    const hasil = periksaKeselamatan(kondisi(true, ['baterai', 'benda_tajam']));
    const daurUlang = hasil.langkahPengganti.daur_ulang;
    expect(daurUlang.some((l) => /baterai/.test(l))).toBe(true);
    expect(daurUlang.some((l) => /tajam/.test(l))).toBe(true);
  });

  test('perbaiki yang dibuang aturan DB tidak dapat langkah pengganti', () => {
    const dariDb = [{ tindakan: 'perbaiki', alasan: 'Jangan diperbaiki.' }];
    const hasil = periksaKeselamatan(kondisi(true, ['baterai']), dariDb);
    expect(hasil.langkahPengganti.perbaiki).toBeUndefined();
  });

  test('bahaya tidak tahu → tidak ada langkah pengganti', () => {
    expect(periksaKeselamatan(kondisi(null)).langkahPengganti).toEqual({});
  });
});
