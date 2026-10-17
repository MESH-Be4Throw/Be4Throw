const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');
const { catatAudit } = require('../utils/audit');
const { ambilField, fieldBerubah, pesanMasihDipakai } = require('../utils/dataAdmin');

// Kelola kategori (FR-14). Setiap perubahan dicatat di AuditPerubahan (FR-15).

const FIELD = ['nama', 'deskripsi', 'status'];

// Jumlah data yang memakai kategori ini (dipakai di daftar & cek hapus)
const hitungPemakaian = { _count: { select: { barang: true, pertanyaan: true, aturan: true } } };
const denganJumlah = ({ _count, ...kategori }) => ({ ...kategori, jumlah: _count });

// GET /api/admin/kategori
async function listKategori(req, res, next) {
  try {
    const kategori = await prisma.kategori.findMany({ include: hitungPemakaian, orderBy: { id: 'asc' } });
    return success(res, 200, 'Daftar kategori berhasil diambil', kategori.map(denganJumlah));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/kategori/:id
async function detailKategori(req, res, next) {
  try {
    const kategori = await prisma.kategori.findUnique({
      where: { id: Number(req.params.id) },
      include: hitungPemakaian,
    });
    if (!kategori) return fail(res, 404, 'Kategori tidak ditemukan');

    return success(res, 200, 'Detail kategori berhasil diambil', denganJumlah(kategori));
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/kategori
async function tambahKategori(req, res, next) {
  try {
    const data = ambilField(req.body, FIELD);

    // Simpan data + catatan perubahan sekaligus (FR-15)
    const kategori = await prisma.$transaction(async (tx) => {
      const baru = await tx.kategori.create({ data });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'tambah', jenisData: 'kategori', sesudah: baru });
      return baru;
    });

    return success(res, 201, 'Kategori berhasil ditambahkan', kategori);
  } catch (err) {
    next(err); // nama dobel → 409 (P2002) di error handler
  }
}

// PUT /api/admin/kategori/:id
async function ubahKategori(req, res, next) {
  try {
    const id = Number(req.params.id);
    const sebelum = await prisma.kategori.findUnique({ where: { id } });
    if (!sebelum) return fail(res, 404, 'Kategori tidak ditemukan');

    const data = ambilField(req.body, FIELD);
    const berubah = fieldBerubah(sebelum, data);
    if (!berubah.length) return success(res, 200, 'Tidak ada perubahan', sebelum);

    const kategori = await prisma.$transaction(async (tx) => {
      const sesudah = await tx.kategori.update({ where: { id }, data });
      await catatAudit(tx, {
        adminId: req.user.id,
        jenisPerubahan: 'ubah',
        jenisData: 'kategori',
        sebelum,
        sesudah,
        berubah,
      });
      return sesudah;
    });

    return success(res, 200, 'Kategori berhasil diubah', kategori);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/kategori/:id
async function hapusKategori(req, res, next) {
  try {
    const id = Number(req.params.id);
    const kategori = await prisma.kategori.findUnique({ where: { id }, include: hitungPemakaian });
    if (!kategori) return fail(res, 404, 'Kategori tidak ditemukan');

    // Masih punya barang/pertanyaan/aturan → tolak (keputusan 14 Okt)
    const { _count, ...sebelum } = kategori;
    if (_count.barang || _count.pertanyaan || _count.aturan) {
      return fail(res, 409, pesanMasihDipakai('Kategori'), { dipakaiOleh: _count });
    }

    await prisma.$transaction(async (tx) => {
      await tx.kategori.delete({ where: { id } });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'hapus', jenisData: 'kategori', sebelum });
    });

    return success(res, 200, 'Kategori berhasil dihapus', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = { listKategori, detailKategori, tambahKategori, ubahKategori, hapusKategori };
