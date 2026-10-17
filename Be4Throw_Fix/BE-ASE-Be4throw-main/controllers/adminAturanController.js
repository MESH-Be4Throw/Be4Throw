const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');
const { catatAudit } = require('../utils/audit');
const { ambilField, fieldBerubah, cekFieldTerkunci, pesanMasihDipakai } = require('../utils/dataAdmin');
const { validasiKondisiAturan } = require('../logic/validasiDataAdmin');

// Kelola aturan keputusan / BasisPengetahuan (FR-14). Setiap perubahan dicatat (FR-15).
// Versi: dibuat = 1, naik 1 setiap kali diubah (keputusan 14 Okt). Analisis menyimpan
// [{ id, versi }] aturan yang dipakai, isi versi lamanya bisa dilihat di catatan perubahan.

const FIELD = ['kode', 'namaAturan', 'kategoriId', 'kondisi', 'tindakan', 'bobot', 'eliminasi', 'alasan', 'status'];

const includeAturan = {
  kategori: { select: { id: true, nama: true } }, // null = berlaku untuk semua kategori
  admin: { select: { id: true, nama: true } }, // admin terakhir yang membuat/mengubah
};

const ditolak = (res, errors) => fail(res, 422, 'Data yang dikirim tidak valid', errors);

// Kategori (kalau diisi) harus ada + format kondisi harus benar
async function cekAturan(data) {
  const errors = [];
  if (data.kategoriId) {
    const kategori = await prisma.kategori.findUnique({ where: { id: data.kategoriId } });
    if (!kategori) errors.push({ field: 'kategoriId', message: 'Kategori tidak ditemukan' });
  }
  if (data.kondisi !== undefined) errors.push(...validasiKondisiAturan(data.kondisi));
  return errors;
}

// GET /api/admin/aturan?kategoriId=&tindakan=&status=&q=
async function listAturan(req, res, next) {
  try {
    const where = {};
    if (req.query.kategoriId) where.kategoriId = Number(req.query.kategoriId);
    if (req.query.tindakan) where.tindakan = req.query.tindakan;
    if (req.query.status) where.status = req.query.status;
    if (req.query.q) {
      const q = String(req.query.q).trim();
      where.OR = [
        { kode: { contains: q, mode: 'insensitive' } },
        { namaAturan: { contains: q, mode: 'insensitive' } },
      ];
    }

    const aturan = await prisma.basisPengetahuan.findMany({ where, include: includeAturan, orderBy: { kode: 'asc' } });
    return success(res, 200, 'Daftar aturan berhasil diambil', aturan);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/aturan/:id
async function detailAturan(req, res, next) {
  try {
    const aturan = await prisma.basisPengetahuan.findUnique({
      where: { id: Number(req.params.id) },
      include: includeAturan,
    });
    if (!aturan) return fail(res, 404, 'Aturan tidak ditemukan');

    return success(res, 200, 'Detail aturan berhasil diambil', aturan);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/aturan
async function tambahAturan(req, res, next) {
  try {
    const data = ambilField(req.body, FIELD);

    const errors = await cekAturan(data);
    if (errors.length) return ditolak(res, errors);

    const aturan = await prisma.$transaction(async (tx) => {
      // versi otomatis 1 (default di schema)
      const baru = await tx.basisPengetahuan.create({ data: { ...data, adminId: req.user.id } });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'tambah', jenisData: 'aturan', sesudah: baru });
      return baru;
    });

    return success(res, 201, 'Aturan berhasil ditambahkan', aturan);
  } catch (err) {
    next(err); // kode dobel → 409 (P2002)
  }
}

// PUT /api/admin/aturan/:id
async function ubahAturan(req, res, next) {
  try {
    const id = Number(req.params.id);
    const sebelum = await prisma.basisPengetahuan.findUnique({ where: { id } });
    if (!sebelum) return fail(res, 404, 'Aturan tidak ditemukan');

    // Kode dikunci: dipakai seed untuk mengenali aturan yang sudah ada
    const terkunci = cekFieldTerkunci(req.body, sebelum, ['kode']);
    if (terkunci.length) return ditolak(res, terkunci);

    const data = ambilField(req.body, FIELD);
    const errors = await cekAturan(data);
    if (errors.length) return ditolak(res, errors);

    const berubah = fieldBerubah(sebelum, data);
    if (!berubah.length) return success(res, 200, 'Tidak ada perubahan', sebelum);

    const aturan = await prisma.$transaction(async (tx) => {
      const sesudah = await tx.basisPengetahuan.update({
        where: { id },
        data: { ...data, versi: { increment: 1 }, adminId: req.user.id },
      });
      await catatAudit(tx, {
        adminId: req.user.id,
        jenisPerubahan: 'ubah',
        jenisData: 'aturan',
        sebelum,
        sesudah,
        berubah,
      });
      return sesudah;
    });

    return success(res, 200, `Aturan berhasil diubah (versi ${aturan.versi})`, aturan);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/aturan/:id
async function hapusAturan(req, res, next) {
  try {
    const id = Number(req.params.id);
    const sebelum = await prisma.basisPengetahuan.findUnique({ where: { id } });
    if (!sebelum) return fail(res, 404, 'Aturan tidak ditemukan');

    // Sudah tercatat di versiAturan suatu analisis → tolak, supaya hasil lama tetap bisa ditelusuri
    const dipakai = await prisma.analisisBarang.count({
      where: { versiAturan: { array_contains: [{ id }] } },
    });
    if (dipakai) {
      return fail(res, 409, pesanMasihDipakai('Aturan'), { dipakaiOleh: { analisis: dipakai } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.basisPengetahuan.delete({ where: { id } });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'hapus', jenisData: 'aturan', sebelum });
    });

    return success(res, 200, 'Aturan berhasil dihapus', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAturan, detailAturan, tambahAturan, ubahAturan, hapusAturan };
