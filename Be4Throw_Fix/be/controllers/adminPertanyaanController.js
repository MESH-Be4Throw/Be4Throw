const { Prisma } = require('@prisma/client');
const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');
const { catatAudit } = require('../utils/audit');
const { ambilField, fieldBerubah, cekFieldTerkunci, pesanMasihDipakai } = require('../utils/dataAdmin');
const { validasiPertanyaan, PERTANYAAN_INTI } = require('../logic/validasiDataAdmin');

// Kelola pertanyaan Identifikasi Kondisi (FR-14). Setiap perubahan dicatat (FR-15).

const FIELD = [
  'kategoriId',
  'kode',
  'teks',
  'tipe',
  'opsi',
  'wajib',
  'bolehTidakTahu',
  'urutan',
  'indukId',
  'tampilJika',
  'status',
];

// Kode & kategori dikunci setelah dibuat: kode jadi kunci jawaban yang tersimpan di analisis
const FIELD_TERKUNCI = ['kode', 'kategoriId'];

const includePertanyaan = {
  kategori: { select: { id: true, nama: true } },
  induk: { select: { id: true, kode: true } },
  lanjutan: { select: { id: true, kode: true, teks: true }, orderBy: { urutan: 'asc' } },
};

// inti = true → FE bisa mengunci field tipe/kode/status di form
const denganInti = (p) => ({ ...p, inti: Boolean(PERTANYAAN_INTI[p.kode]) });

const ditolak = (res, errors) => fail(res, 422, 'Data yang dikirim tidak valid', errors);

// Kolom Json yang dikosongkan harus diisi Prisma.DbNull, bukan null biasa
function siapSimpan(data) {
  const hasil = { ...data };
  if (hasil.tampilJika === null) hasil.tampilJika = Prisma.DbNull;
  return hasil;
}

// Pertanyaan induk (kalau ini pertanyaan lanjutan)
const cariInduk = (indukId) => (indukId ? prisma.pertanyaan.findUnique({ where: { id: indukId } }) : null);

// GET /api/admin/pertanyaan?kategoriId=&status=
async function listPertanyaan(req, res, next) {
  try {
    const where = {};
    if (req.query.kategoriId) where.kategoriId = Number(req.query.kategoriId);
    if (req.query.status) where.status = req.query.status;

    const pertanyaan = await prisma.pertanyaan.findMany({
      where,
      include: includePertanyaan,
      // Pertanyaan utama dulu (indukId kosong), lalu pertanyaan lanjutan
      orderBy: [{ kategoriId: 'asc' }, { indukId: { sort: 'asc', nulls: 'first' } }, { urutan: 'asc' }, { id: 'asc' }],
    });
    return success(res, 200, 'Daftar pertanyaan berhasil diambil', pertanyaan.map(denganInti));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/pertanyaan/:id
async function detailPertanyaan(req, res, next) {
  try {
    const pertanyaan = await prisma.pertanyaan.findUnique({
      where: { id: Number(req.params.id) },
      include: includePertanyaan,
    });
    if (!pertanyaan) return fail(res, 404, 'Pertanyaan tidak ditemukan');

    return success(res, 200, 'Detail pertanyaan berhasil diambil', denganInti(pertanyaan));
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/pertanyaan
async function tambahPertanyaan(req, res, next) {
  try {
    const data = ambilField(req.body, FIELD);

    const kategori = await prisma.kategori.findUnique({ where: { id: data.kategoriId } });
    if (!kategori) return ditolak(res, [{ field: 'kategoriId', message: 'Kategori tidak ditemukan' }]);

    // Cek format opsi, induk, dan aturan pertanyaan inti (logic/validasiDataAdmin.js)
    const errors = validasiPertanyaan(data, await cariInduk(data.indukId));
    if (errors.length) return ditolak(res, errors);

    const pertanyaan = await prisma.$transaction(async (tx) => {
      const baru = await tx.pertanyaan.create({ data: siapSimpan(data) });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'tambah', jenisData: 'pertanyaan', sesudah: baru });
      return baru;
    });

    return success(res, 201, 'Pertanyaan berhasil ditambahkan', denganInti(pertanyaan));
  } catch (err) {
    next(err); // kode dobel di kategori yang sama → 409 (P2002)
  }
}

// PUT /api/admin/pertanyaan/:id
async function ubahPertanyaan(req, res, next) {
  try {
    const id = Number(req.params.id);
    const sebelum = await prisma.pertanyaan.findUnique({ where: { id } });
    if (!sebelum) return fail(res, 404, 'Pertanyaan tidak ditemukan');

    const terkunci = cekFieldTerkunci(req.body, sebelum, FIELD_TERKUNCI);
    if (terkunci.length) return ditolak(res, terkunci);

    const data = ambilField(req.body, FIELD);

    // Validasi pakai gabungan data lama + perubahan
    const gabungan = { ...sebelum, ...data };
    const lanjutan = await prisma.pertanyaan.findMany({ where: { indukId: id } });
    const errors = validasiPertanyaan(gabungan, await cariInduk(gabungan.indukId), lanjutan);
    if (errors.length) return ditolak(res, errors);

    const berubah = fieldBerubah(sebelum, data);
    if (!berubah.length) return success(res, 200, 'Tidak ada perubahan', denganInti(sebelum));

    const pertanyaan = await prisma.$transaction(async (tx) => {
      const sesudah = await tx.pertanyaan.update({ where: { id }, data: siapSimpan(data) });
      await catatAudit(tx, {
        adminId: req.user.id,
        jenisPerubahan: 'ubah',
        jenisData: 'pertanyaan',
        sebelum,
        sesudah,
        berubah,
      });
      return sesudah;
    });

    return success(res, 200, 'Pertanyaan berhasil diubah', denganInti(pertanyaan));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/pertanyaan/:id
async function hapusPertanyaan(req, res, next) {
  try {
    const id = Number(req.params.id);
    const pertanyaan = await prisma.pertanyaan.findUnique({
      where: { id },
      include: { _count: { select: { lanjutan: true } } },
    });
    if (!pertanyaan) return fail(res, 404, 'Pertanyaan tidak ditemukan');

    const { _count, ...sebelum } = pertanyaan;

    // 6 pertanyaan inti dipakai rule engine & keselamatan → tidak boleh dihapus
    if (PERTANYAAN_INTI[sebelum.kode]) {
      return fail(res, 409, 'Pertanyaan inti tidak bisa dihapus. Teks, label opsi, dan urutannya tetap bisa diubah.');
    }

    // Masih punya lanjutan, atau sudah pernah dijawab di analisis → tolak
    const dijawab = await prisma.kondisiBarang.count({
      where: {
        analisis: { barang: { kategoriId: sebelum.kategoriId } },
        jawaban: { path: [sebelum.kode], not: Prisma.AnyNull }, // jawaban punya key = kode ini
      },
    });
    if (_count.lanjutan || dijawab) {
      return fail(res, 409, pesanMasihDipakai('Pertanyaan'), {
        dipakaiOleh: { lanjutan: _count.lanjutan, jawabanAnalisis: dijawab },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pertanyaan.delete({ where: { id } });
      await catatAudit(tx, { adminId: req.user.id, jenisPerubahan: 'hapus', jenisData: 'pertanyaan', sebelum });
    });

    return success(res, 200, 'Pertanyaan berhasil dihapus', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPertanyaan, detailPertanyaan, tambahPertanyaan, ubahPertanyaan, hapusPertanyaan };
