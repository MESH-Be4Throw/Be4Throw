const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');
const { catatAudit } = require('../utils/audit');
const { ambilField, fieldBerubah, pesanMasihDipakai } = require('../utils/dataAdmin');

// Kelola barang (FR-14). Setiap perubahan dicatat di AuditPerubahan (FR-15).

// material tidak diisi admin: otomatis = nama kategori (keputusan tim 11 Okt)
const FIELD = ['nama', 'kategoriId', 'gambar', 'estimasiBerat', 'status'];

const includeBarang = {
  kategori: { select: { id: true, nama: true } },
  _count: { select: { analisis: true } },
};
const denganJumlah = ({ _count, ...barang }) => ({ ...barang, jumlahAnalisis: _count.analisis });

const errorKategori = [{ field: 'kategoriId', message: 'Kategori tidak ditemukan' }];

// GET /api/admin/barang?kategoriId=&q=&status=
async function listBarang(req, res, next) {
  try {
    // Admin melihat semua barang, termasuk yang nonaktif
    const where = {};
    if (req.query.kategoriId) where.kategoriId = Number(req.query.kategoriId);
    if (req.query.status) where.status = req.query.status;
    if (req.query.q) where.nama = { contains: String(req.query.q).trim(), mode: 'insensitive' };

    const barang = await prisma.barang.findMany({
      where,
      include: includeBarang,
      orderBy: [{ kategoriId: 'asc' }, { nama: 'asc' }],
    });
    return success(res, 200, 'Daftar barang berhasil diambil', barang.map(denganJumlah));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/barang/:id
async function detailBarang(req, res, next) {
  try {
    const barang = await prisma.barang.findUnique({
      where: { id: Number(req.params.id) },
      include: includeBarang,
    });
    if (!barang) return fail(res, 404, 'Barang tidak ditemukan');

    return success(res, 200, 'Detail barang berhasil diambil', denganJumlah(barang));
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/barang
async function tambahBarang(req, res, next) {
  try {
    const data = ambilField(req.body, FIELD);

    const kategori = await prisma.kategori.findUnique({ where: { id: data.kategoriId } });
    if (!kategori) return fail(res, 422, 'Data yang dikirim tidak valid', errorKategori);
    data.material = kategori.nama;

    const barang = await prisma.$transaction(async (tx) => {
      const baru = await tx.barang.create({ data });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'tambah', jenisData: 'barang', sesudah: baru });
      return baru;
    });

    return success(res, 201, 'Barang berhasil ditambahkan', barang);
  } catch (err) {
    next(err); // nama dobel di kategori yang sama → 409 (P2002)
  }
}

// PUT /api/admin/barang/:id
async function ubahBarang(req, res, next) {
  try {
    const id = Number(req.params.id);
    const sebelum = await prisma.barang.findUnique({ where: { id } });
    if (!sebelum) return fail(res, 404, 'Barang tidak ditemukan');

    const data = ambilField(req.body, FIELD);

    // Material selalu ikut nama kategori barang (kategori baru kalau dipindah)
    const kategori = await prisma.kategori.findUnique({ where: { id: data.kategoriId ?? sebelum.kategoriId } });
    if (!kategori) return fail(res, 422, 'Data yang dikirim tidak valid', errorKategori);
    data.material = kategori.nama;

    const berubah = fieldBerubah(sebelum, data);
    if (!berubah.length) return success(res, 200, 'Tidak ada perubahan', sebelum);

    const barang = await prisma.$transaction(async (tx) => {
      const sesudah = await tx.barang.update({ where: { id }, data });
      await catatAudit(tx, {
        adminId: req.user.id,
        jenisPerubahan: 'ubah',
        jenisData: 'barang',
        sebelum,
        sesudah,
        berubah,
      });
      return sesudah;
    });

    return success(res, 200, 'Barang berhasil diubah', barang);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/barang/:id
async function hapusBarang(req, res, next) {
  try {
    const id = Number(req.params.id);
    const barang = await prisma.barang.findUnique({ where: { id }, include: { _count: { select: { analisis: true } } } });
    if (!barang) return fail(res, 404, 'Barang tidak ditemukan');

    // Sudah pernah dianalisis → tolak, supaya riwayat & hasil analisis tetap utuh
    const { _count, ...sebelum } = barang;
    if (_count.analisis) {
      return fail(res, 409, pesanMasihDipakai('Barang'), { dipakaiOleh: { analisis: _count.analisis } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.barang.delete({ where: { id } });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'hapus', jenisData: 'barang', sebelum });
    });

    return success(res, 200, 'Barang berhasil dihapus', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = { listBarang, detailBarang, tambahBarang, ubahBarang, hapusBarang };
