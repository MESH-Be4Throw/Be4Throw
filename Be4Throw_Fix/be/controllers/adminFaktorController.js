const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');
const { catatAudit } = require('../utils/audit');
const { ambilField, fieldBerubah, cekFieldTerkunci, pesanMasihDipakai } = require('../utils/dataAdmin');

// Kelola faktor dampak lingkungan (FR-14). Setiap perubahan dicatat (FR-15).
// Versi: dibuat = 1, naik 1 setiap kali diubah (keputusan 14 Okt).

const FIELD = ['kode', 'material', 'tindakan', 'nilai', 'satuan', 'sumber', 'tahun', 'status'];

const includeFaktor = { admin: { select: { id: true, nama: true } } };

const ditolak = (res, errors) => fail(res, 422, 'Data yang dikirim tidak valid', errors);

// Material = salah satu nama kategori (keputusan tim 11 Okt). Return error atau null.
async function cekMaterial(material) {
  if (material === undefined) return null;
  const kategori = await prisma.kategori.findMany({ select: { nama: true }, orderBy: { id: 'asc' } });
  const daftar = kategori.map((k) => k.nama);
  if (daftar.includes(material)) return null;
  return { field: 'material', message: `Material harus sama dengan salah satu nama kategori: ${daftar.join(', ')}` };
}

// GET /api/admin/faktor-dampak?material=&tindakan=&status=
async function listFaktor(req, res, next) {
  try {
    const where = {};
    if (req.query.material) where.material = String(req.query.material);
    if (req.query.tindakan) where.tindakan = req.query.tindakan;
    if (req.query.status) where.status = req.query.status;

    const faktor = await prisma.faktorDampak.findMany({
      where,
      include: includeFaktor,
      orderBy: [{ material: 'asc' }, { tindakan: 'asc' }, { kode: 'asc' }],
    });
    const message = faktor.length ? 'Daftar faktor dampak berhasil diambil' : 'Belum ada faktor dampak';
    return success(res, 200, message, faktor);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/faktor-dampak/:id
async function detailFaktor(req, res, next) {
  try {
    const faktor = await prisma.faktorDampak.findUnique({
      where: { id: Number(req.params.id) },
      include: includeFaktor,
    });
    if (!faktor) return fail(res, 404, 'Faktor dampak tidak ditemukan');

    return success(res, 200, 'Detail faktor dampak berhasil diambil', faktor);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/faktor-dampak
async function tambahFaktor(req, res, next) {
  try {
    const data = ambilField(req.body, FIELD);

    const errorMaterial = await cekMaterial(data.material);
    if (errorMaterial) return ditolak(res, [errorMaterial]);

    const faktor = await prisma.$transaction(async (tx) => {
      const baru = await tx.faktorDampak.create({ data: { ...data, adminId: req.user.id } });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'tambah', jenisData: 'faktor_dampak', sesudah: baru });
      return baru;
    });

    return success(res, 201, 'Faktor dampak berhasil ditambahkan', faktor);
  } catch (err) {
    next(err); // kode dobel → 409 (P2002)
  }
}

// PUT /api/admin/faktor-dampak/:id
async function ubahFaktor(req, res, next) {
  try {
    const id = Number(req.params.id);
    const sebelum = await prisma.faktorDampak.findUnique({ where: { id } });
    if (!sebelum) return fail(res, 404, 'Faktor dampak tidak ditemukan');

    const terkunci = cekFieldTerkunci(req.body, sebelum, ['kode']);
    if (terkunci.length) return ditolak(res, terkunci);

    const data = ambilField(req.body, FIELD);
    const errorMaterial = await cekMaterial(data.material);
    if (errorMaterial) return ditolak(res, [errorMaterial]);

    const berubah = fieldBerubah(sebelum, data);
    if (!berubah.length) return success(res, 200, 'Tidak ada perubahan', sebelum);

    const faktor = await prisma.$transaction(async (tx) => {
      const sesudah = await tx.faktorDampak.update({
        where: { id },
        data: { ...data, versi: { increment: 1 }, adminId: req.user.id },
      });
      await catatAudit(tx, {
        adminId: req.user.id,
        jenisPerubahan: 'ubah',
        jenisData: 'faktor_dampak',
        sebelum,
        sesudah,
        berubah,
      });
      return sesudah;
    });

    return success(res, 200, `Faktor dampak berhasil diubah (versi ${faktor.versi})`, faktor);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/faktor-dampak/:id
async function hapusFaktor(req, res, next) {
  try {
    const id = Number(req.params.id);
    const sebelum = await prisma.faktorDampak.findUnique({ where: { id } });
    if (!sebelum) return fail(res, 404, 'Faktor dampak tidak ditemukan');

    // Sudah tercatat di versiFaktor suatu analisis (FR-13) → tolak
    const dipakai = await prisma.analisisBarang.count({
      where: { versiFaktor: { array_contains: [{ id }] } },
    });
    if (dipakai) {
      return fail(res, 409, pesanMasihDipakai('Faktor dampak'), { dipakaiOleh: { analisis: dipakai } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.faktorDampak.delete({ where: { id } });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'hapus', jenisData: 'faktor_dampak', sebelum });
    });

    return success(res, 200, 'Faktor dampak berhasil dihapus', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = { listFaktor, detailFaktor, tambahFaktor, ubahFaktor, hapusFaktor };
