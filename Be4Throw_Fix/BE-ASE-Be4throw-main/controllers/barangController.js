const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');

// Kolom barang yang dikirim ke front-end
const barangSelect = {
  id: true,
  nama: true,
  gambar: true,
  estimasiBerat: true,
  kategori: { select: { id: true, nama: true } },
};

// Barang hanya tampil kalau barang dan kategorinya sama-sama aktif
const barangAktif = { status: 'aktif', kategori: { status: 'aktif' } };

// Bikin filter "nama mengandung salah satu kata", mis. ["botol", "kaca"]
function namaMengandung(kata) {
  return kata.map((k) => ({ nama: { contains: k, mode: 'insensitive' } }));
}

// Saran kalau pencarian kosong (SRS: kategori terdekat, saran kata kunci, barang umum)
async function buatSaran(q) {
  // Pecah kata kunci per kata, abaikan kata yang terlalu pendek
  const kata = q.toLowerCase().split(' ').filter((k) => k.length >= 3);

  let kategoriTerdekat = [];
  let saranKataKunci = [];

  if (kata.length) {
    kategoriTerdekat = await prisma.kategori.findMany({
      where: { status: 'aktif', OR: namaMengandung(kata) },
      select: { id: true, nama: true },
    });

    const mirip = await prisma.barang.findMany({
      where: { ...barangAktif, OR: namaMengandung(kata) },
      select: { nama: true },
      orderBy: { nama: 'asc' },
      take: 5,
    });
    saranKataKunci = mirip.map((b) => b.nama);
  }

  // Barang umum sebagai pilihan cadangan
  const barangUmum = await prisma.barang.findMany({
    where: barangAktif,
    select: barangSelect,
    orderBy: { id: 'asc' },
    take: 6,
  });

  return { kategoriTerdekat, saranKataKunci, barangUmum };
}

// GET /api/barang?q=&kategoriId=
async function listBarang(req, res, next) {
  try {
    // Rapikan spasi: buang di ujung, spasi dobel/aneh jadi satu spasi biasa
    const q = req.query.q ? String(req.query.q).trim().replace(/\s+/g, ' ') : '';
    const kategoriId = req.query.kategoriId ? Number(req.query.kategoriId) : null;

    // Kategori yang diminta harus ada dan aktif
    if (kategoriId) {
      const kategori = await prisma.kategori.findFirst({
        where: { id: kategoriId, status: 'aktif' },
        select: { id: true },
      });
      if (!kategori) {
        return fail(res, 404, 'Kategori tidak ditemukan');
      }
    }

    // Susun filter: kondisi hanya ditambahkan kalau parameternya diisi
    const where = { ...barangAktif };
    if (kategoriId) {
      where.kategoriId = kategoriId;
    }
    if (q) {
      where.nama = { contains: q, mode: 'insensitive' };
    }

    const barang = await prisma.barang.findMany({
      where,
      select: barangSelect,
      orderBy: { nama: 'asc' },
    });

    // Saran hanya dibuat kalau user mencari kata kunci dan hasilnya kosong
    const saran = barang.length === 0 && q ? await buatSaran(q) : null;
    const message = barang.length ? 'Daftar barang berhasil diambil' : 'Barang tidak ditemukan';

    return success(res, 200, message, { barang, total: barang.length, saran });
  } catch (err) {
    next(err);
  }
}

// GET /api/barang/:id
async function detailBarang(req, res, next) {
  try {
    const id = Number(req.params.id);

    const barang = await prisma.barang.findUnique({
      where: { id },
      select: {
        ...barangSelect,
        status: true,
        kategori: { select: { id: true, nama: true, status: true } },
      },
    });

    if (!barang) {
      return fail(res, 404, 'Barang tidak ditemukan');
    }

    // Barang/kategori sudah dinonaktifkan admin → tawarkan barang lain di kategori yang sama
    if (barang.status !== 'aktif' || barang.kategori.status !== 'aktif') {
      const barangLain = await prisma.barang.findMany({
        where: { ...barangAktif, kategoriId: barang.kategori.id, id: { not: id } },
        select: barangSelect,
        orderBy: { nama: 'asc' },
        take: 6,
      });
      return fail(res, 404, 'Barang ini sudah tidak tersedia. Silakan pilih barang lain.', { barangLain });
    }

    // Buang field status sebelum dikirim
    const { status, kategori, ...data } = barang;
    return success(res, 200, 'Detail barang berhasil diambil', {
      ...data,
      kategori: { id: kategori.id, nama: kategori.nama },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listBarang, detailBarang };