// Catatan perubahan oleh admin (FR-15).
// WAJIB dipanggil di dalam prisma.$transaction yang sama dengan perubahannya:
// kalau salah satu gagal, perubahan dan catatannya sama-sama dibatalkan.

const KATA_KERJA = { tambah: 'Menambah', ubah: 'Mengubah', hapus: 'Menghapus' };
const LABEL_DATA = {
  kategori: 'kategori',
  barang: 'barang',
  pertanyaan: 'pertanyaan',
  aturan: 'aturan',
  faktor_dampak: 'faktor dampak',
};

// Hasil Prisma (ada objek Date, dll.) → JSON biasa untuk kolom Json
const keJson = (data) => JSON.parse(JSON.stringify(data));

// tx: client transaksi dari prisma.$transaction(async (tx) => ...)
// sebelum: data sebelum diubah/dihapus (null kalau tambah)
// sesudah: data setelah ditambah/diubah (null kalau hapus)
// berubah: daftar field yang berubah (khusus "ubah"), ditulis di ringkasan
async function catatAudit(tx, { adminId, jenisPerubahan, jenisData, sebelum = null, sesudah = null, berubah = [] }) {
  const data = sesudah ?? sebelum;
  // Kategori & barang punya "nama"; pertanyaan, aturan & faktor dampak punya "kode"
  const nama = data.kode ?? data.nama;
  const detail = berubah.length ? ` (${berubah.join(', ')})` : '';

  return tx.auditPerubahan.create({
    data: {
      adminId,
      jenisPerubahan,
      jenisData,
      dataId: data.id,
      versi: data.versi ?? null, // hanya aturan & faktor dampak yang punya versi
      ringkasan: `${KATA_KERJA[jenisPerubahan]} ${LABEL_DATA[jenisData]} "${nama}"${detail}`,
      // undefined = kolom dibiarkan kosong (null) di database
      dataSebelum: sebelum ? keJson(sebelum) : undefined,
      dataSesudah: sesudah ? keJson(sesudah) : undefined,
    },
  });
}

module.exports = { catatAudit };
