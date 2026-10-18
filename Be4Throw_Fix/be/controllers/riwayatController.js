const prisma = require('../utils/prisma');
const { success } = require('../utils/response');
const { TINDAKAN, LABEL_TINDAKAN } = require('../logic/tindakan');

const LIMIT_DEFAULT = 10;

const ringkas = (r) => ({ tindakan: r.tindakan, label: LABEL_TINDAKAN[r.tindakan], skor: r.skor });

// Satu baris riwayat: cukup ringkasan. Detail lengkap → GET /api/analisis/:id
function formatRiwayat(a) {
  const utama = a.rekomendasi.find((r) => r.jenis === 'utama') ?? null;
  const alternatif = a.rekomendasi
    .filter((r) => r.jenis === 'alternatif')
    // skor tertinggi dulu; skor sama → urutan hierarki tindakan
    .sort((x, y) => y.skor - x.skor || TINDAKAN.indexOf(x.tindakan) - TINDAKAN.indexOf(y.tindakan));

  // SRS FR-05: "Data hasil lama tidak lagi lengkap" → kasih penanda ke FE.
  // Lengkap = ada pemeriksaan keselamatan, dan ada rekomendasi utama dengan langkah praktis
  // (atau memang hasilnya pesan keterbatasan).
  const lengkap = Boolean(a.pemeriksaanKeselamatan) &&
    (utama ? utama.langkahPraktis.length > 0 : Boolean(a.pesanKeterbatasan));

  return {
    id: a.id,
    tanggal: a.updatedAt, // waktu analisis selesai diproses (UTC)
    barang: {
      id: a.barang.id,
      nama: a.barang.nama,
      gambar: a.barang.gambar,
      kategori: a.barang.kategori, // { id, nama }, sama dengan GET /api/barang/:id
    },
    rekomendasiUtama: utama ? ringkas(utama) : null,
    alternatif: alternatif.map(ringkas),
    adaBahaya: a.pemeriksaanKeselamatan?.adaBahaya ?? false,
    pesanKeterbatasan: a.pesanKeterbatasan,
    lengkap,
  };
}

// GET /api/riwayat?page=1&limit=10 (FR-05) — wajib login (keputusan tim 11 Okt)
async function ambilRiwayat(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || LIMIT_DEFAULT;

    // Hanya analisis milik user ini yang sudah selesai (punya hasil)
    const where = { userId: req.user.id, status: 'selesai' };

    // count + findMany dijalankan bareng supaya total & isi halaman konsisten
    const [total, daftar] = await prisma.$transaction([
      prisma.analisisBarang.count({ where }),
      prisma.analisisBarang.findMany({
        where,
        orderBy: { updatedAt: 'desc' }, // terbaru dulu
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          updatedAt: true,
          pesanKeterbatasan: true,
          barang: {
            select: { id: true, nama: true, gambar: true, kategori: { select: { id: true, nama: true } } },
          },
          pemeriksaanKeselamatan: { select: { adaBahaya: true } },
          rekomendasi: { select: { tindakan: true, jenis: true, skor: true, langkahPraktis: true } },
        },
      }),
    ]);

    const message = total === 0 ? 'Belum ada riwayat analisis' : 'Riwayat analisis berhasil diambil';

    return success(res, 200, message, {
      items: daftar.map(formatRiwayat),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { ambilRiwayat };
