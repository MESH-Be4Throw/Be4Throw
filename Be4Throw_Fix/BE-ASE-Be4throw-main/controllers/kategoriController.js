const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');

// GET /api/kategori
async function listKategori(req, res, next) {
  try {
    const kategori = await prisma.kategori.findMany({
      where: { status: 'aktif' },
      select: {
        id: true,
        nama: true,
        deskripsi: true,
        // Hitung jumlah barang aktif di tiap kategori
        _count: { select: { barang: { where: { status: 'aktif' } } } },
      },
      orderBy: { id: 'asc' }, // urutan sesuai seed: Elektronik, Pakaian, Plastik, Furnitur
    });

    // Ubah _count jadi field yang lebih enak dibaca front-end
    const data = kategori.map(({ _count, ...k }) => ({ ...k, jumlahBarang: _count.barang }));

    return success(res, 200, 'Daftar kategori berhasil diambil', data);
  } catch (err) {
    next(err);
  }
}

// Kolom pertanyaan yang dikirim ke front-end
const pertanyaanSelect = {
  id: true,
  kode: true,
  teks: true,
  tipe: true,
  opsi: true,
  wajib: true,
  bolehTidakTahu: true,
  urutan: true,
};

// GET /api/kategori/:id/pertanyaan
async function listPertanyaanKategori(req, res, next) {
  try {
    const id = Number(req.params.id);

    const kategori = await prisma.kategori.findFirst({
      where: { id, status: 'aktif' },
      select: { id: true, nama: true },
    });
    if (!kategori) {
      return fail(res, 404, 'Kategori tidak ditemukan');
    }

    // Ambil pertanyaan utama (tanpa induk), lanjutannya ditempel di dalamnya
    const pertanyaan = await prisma.pertanyaan.findMany({
      where: { kategoriId: id, status: 'aktif', indukId: null },
      select: {
        ...pertanyaanSelect,
        lanjutan: {
          where: { status: 'aktif' },
          select: { ...pertanyaanSelect, tampilJika: true },
          orderBy: { urutan: 'asc' },
        },
      },
      orderBy: { urutan: 'asc' },
    });

    // Jangan mengarang pertanyaan: kalau kosong, kirim apa adanya + pesan
    const message = pertanyaan.length
      ? 'Daftar pertanyaan berhasil diambil'
      : 'Pertanyaan untuk kategori ini belum tersedia';

    return success(res, 200, message, { kategori, pertanyaan });
  } catch (err) {
    next(err);
  }
}

module.exports = { listKategori, listPertanyaanKategori };