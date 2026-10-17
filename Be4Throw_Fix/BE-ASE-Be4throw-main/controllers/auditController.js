const prisma = require('../utils/prisma');
const { success } = require('../utils/response');

// Catatan perubahan (FR-15). Hanya bisa dibaca: tidak ada endpoint ubah/hapus.

const LIMIT_DEFAULT = 20;

// Bentuk satu catatan untuk FE (nama kolom disamakan dengan istilah SDD seperlunya)
const formatAudit = (a) => ({
  id: a.id,
  waktu: a.createdAt, // waktuPerubahan (UTC)
  jenisPerubahan: a.jenisPerubahan, // tambah / ubah / hapus
  jenisData: a.jenisData,
  dataId: a.dataId,
  versi: a.versi,
  ringkasan: a.ringkasan,
  admin: a.admin,
  dataSebelum: a.dataSebelum,
  dataSesudah: a.dataSesudah,
});

// GET /api/admin/audit?jenisData=&dataId=&jenisPerubahan=&page=&limit=
async function listAudit(req, res, next) {
  try {
    // Angka dibaca ulang manual (req.query tidak diubah sanitizer di Express 5)
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || LIMIT_DEFAULT;

    const where = {};
    if (req.query.jenisData) where.jenisData = req.query.jenisData;
    if (req.query.jenisPerubahan) where.jenisPerubahan = req.query.jenisPerubahan;
    if (req.query.dataId) where.dataId = Number(req.query.dataId);

    const [total, daftar] = await prisma.$transaction([
      prisma.auditPerubahan.count({ where }),
      prisma.auditPerubahan.findMany({
        where,
        include: { admin: { select: { id: true, nama: true, email: true } } },
        orderBy: { id: 'desc' }, // terbaru dulu
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const message = total === 0 ? 'Belum ada catatan perubahan' : 'Catatan perubahan berhasil diambil';
    return success(res, 200, message, {
      items: daftar.map(formatAudit),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAudit };
