const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');
const { buatKodeAkses, hashKodeAkses } = require('../utils/kodeAkses');
const { validasiJawaban, keKondisiBarang } = require('../logic/validasiJawaban');
const { jalankanAnalisis } = require('../logic/ruleEngine');
const { susunRekomendasi, pesanAlternatif } = require('../logic/rekomendasi');
const { LABEL_TINDAKAN } = require('../logic/tindakan');
const {
  hitungDampakKomposisi,
  catatanDampak,
  MANFAAT_KUALITATIF,
  PESAN_BELUM_DIHITUNG,
} = require('../logic/dampak');

// Pesan untuk kondisi khusus FR-10 (SDD Use Case Analisis Barang, skenario eksepsional)
const PESAN_TANPA_ATURAN =
  'Aturan untuk kategori atau kondisi barang ini belum tersedia, jadi sistem belum bisa memberi rekomendasi. ' +
  'Saran aman: simpan barang dalam keadaan bersih dan kering, jangan dibakar atau dibuang sembarangan, ' +
  'lalu tanyakan cara penanganannya ke bank sampah atau pengelola sampah setempat.';
const PESAN_TANPA_TINDAKAN_AMAN =
  'Tidak ada tindakan yang aman dan layak untuk barang ini. Jangan dipakai, dijual, atau diberikan ke orang lain. ' +
  'Minta bantuan pihak kompeten, seperti teknisi resmi atau pengelola limbah B3/elektronik.';

const includeAnalisis = {
  kondisi: true,
  barang: {
    select: {
      id: true,
      nama: true,
      gambar: true,
      estimasiBerat: true,
      kategoriId: true,
      kategori: { select: { nama: true } },
    },
  },
  // Hasil analisis (FR-10 s/d FR-13), kosong selama masih draft
  pemeriksaanKeselamatan: true,
  skorSolusi: { orderBy: { peringkat: 'asc' } },
  rekomendasi: { include: { dampak: true } }, // dampak = DampakLingkungan (FR-13)
  umpanBalik: true, // FR-16
};

const pesanSimpan = (kirim) =>
  kirim ? 'Jawaban tersimpan dan siap dianalisis' : 'Jawaban sementara tersimpan';

// Satu rekomendasi untuk FE
function formatRekomendasi(r) {
  return {
    tindakan: r.tindakan,
    label: LABEL_TINDAKAN[r.tindakan],
    skor: r.skor,
    alasan: r.alasan,
    langkahPraktis: r.langkahPraktis,
    peringatan: r.peringatan,
  };
}

// Satu baris dampak untuk FE. Satuan ditulis jelas supaya FE tinggal menampilkan.
function formatRincianDampak(r) {
  const d = r.dampak;
  return {
    tindakan: r.tindakan,
    label: LABEL_TINDAKAN[r.tindakan],
    jenis: r.jenis, // utama / alternatif
    pengalihanLimbah: d.limbahDialihkanKg == null ? null : { nilai: d.limbahDialihkanKg, satuan: 'kg' },
    emisiDihindari: d.emisiDihindariKgCO2e == null ? null : { nilai: d.emisiDihindariKgCO2e, satuan: 'kg CO2e' },
    bahan: d.bahan ?? [], // rincian per bahan penyusun
    asumsi: d.asumsi,
    sumber: d.sumber, // null = faktor belum tersedia
    tahunFaktor: d.tahunFaktor,
    manfaatKualitatif: MANFAAT_KUALITATIF[r.tindakan],
  };
}

// Dampak lingkungan (FR-13). daftarRekomendasi sudah urut: utama dulu, lalu alternatif.
// versiFaktor null = dampak belum dihitung (gagal / analisis lama) → FE tampilkan tombol Coba Lagi.
function formatDampak(analisis, daftarRekomendasi) {
  const material = analisis.barang.kategori?.nama ?? null;

  if (analisis.versiFaktor === null) {
    return {
      status: 'belum_dihitung',
      beratKg: analisis.beratKg,
      material,
      rincian: [],
      catatan: [PESAN_BELUM_DIHITUNG],
    };
  }

  const denganDampak = daftarRekomendasi.filter((r) => r.dampak);
  return {
    status: 'selesai',
    beratKg: analisis.beratKg,
    material,
    rincian: denganDampak.map(formatRincianDampak),
    catatan: catatanDampak(denganDampak.map((r) => r.dampak), analisis.beratKg),
  };
}

// Hasil analisis yang sudah tersimpan di DB (FR-10 s/d FR-13)
function formatHasil(analisis) {
  const pemeriksaan = analisis.pemeriksaanKeselamatan;
  const dieliminasi = pemeriksaan?.tindakanDieliminasi ?? [];

  // Urutkan alternatif sesuai peringkat skor (skor sama → urutan hierarki dari rule engine)
  const peringkat = new Map(analisis.skorSolusi.map((s) => [s.tindakan, s.peringkat]));
  const utama = analisis.rekomendasi.find((r) => r.jenis === 'utama') ?? null;
  const alternatif = analisis.rekomendasi
    .filter((r) => r.jenis === 'alternatif')
    .sort((a, b) => peringkat.get(a.tindakan) - peringkat.get(b.tindakan));

  return {
    keselamatan: {
      aman: pemeriksaan ? !pemeriksaan.adaBahaya : true,
      tindakanDieliminasi: dieliminasi,
      peringatan: pemeriksaan?.peringatan ?? [],
    },
    skor: analisis.skorSolusi.map((s) => ({
      tindakan: s.tindakan,
      label: LABEL_TINDAKAN[s.tindakan],
      skor: s.skor,
      peringkat: s.peringkat,
      aman: !dieliminasi.includes(s.tindakan),
    })),
    rekomendasiUtama: utama ? formatRekomendasi(utama) : null, // FR-11
    alternatif: alternatif.map(formatRekomendasi), // FR-12
    pesanAlternatif: pesanAlternatif(utama, alternatif.length, analisis.skorSolusi, dieliminasi),
    pesanKeterbatasan: analisis.pesanKeterbatasan,
    dampak: formatDampak(analisis, utama ? [utama, ...alternatif] : alternatif), // FR-13
  };
}

// Umpan balik (FR-16) untuk isi ulang form
function formatUmpanBalik(u) {
  return {
    rating: u.rating,
    komentar: u.komentar,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

// Bentuk data yang dikirim ke FE (hash kode akses tidak ikut dikirim)
function formatAnalisis(analisis, kodeAkses) {
  // Bentuk barang disamakan dengan GET /api/barang/:id → kategori: { id, nama }
  const { kategoriId, kategori, ...barang } = analisis.barang;
  return {
    id: analisis.id,
    status: analisis.status,
    barang: { ...barang, kategori: { id: kategoriId, nama: kategori?.nama ?? null } },
    beratKg: analisis.beratKg,
    diperbaruiPada: analisis.updatedAt, // waktu hasil (termasuk dampak) terakhir dihitung
    jawaban: analisis.kondisi?.jawaban ?? {},
    hasil: analisis.status === 'selesai' ? formatHasil(analisis) : null,
    umpanBalik: analisis.umpanBalik ? formatUmpanBalik(analisis.umpanBalik) : null, // FR-16
    ...(kodeAkses && { kodeAkses }), // hanya muncul sekali, saat tamu membuat analisis
  };
}

// Validasi berat + jawaban berdasarkan pertanyaan aktif kategori
async function olahJawaban(kategoriId, jawaban, beratKg, kirim) {
  const pertanyaan = await prisma.pertanyaan.findMany({
    where: { kategoriId, status: 'aktif' },
    orderBy: { urutan: 'asc' },
  });
  if (!pertanyaan.length) return { tanpaPertanyaan: true };

  const { errors, bersih } = validasiJawaban(pertanyaan, jawaban, kirim);
  if (kirim && beratKg == null) {
    errors.unshift({ field: 'beratKg', message: 'Berat barang wajib diisi' });
  }
  return { errors, kondisi: keKondisiBarang(bersih) };
}

// Ambil analisis kalau yang minta berhak: pemilik (login) atau tamu dengan kode akses cocok.
// Tidak berhak → null, supaya dibalas 404 (orang lain tidak tahu analisis itu ada).
async function cariAnalisis(req, id) {
  const analisis = await prisma.analisisBarang.findUnique({ where: { id }, include: includeAnalisis });
  if (!analisis) return null;

  if (analisis.userId) {
    return req.user?.id === analisis.userId ? analisis : null;
  }

  const kode = req.get('X-Kode-Akses');
  if (!kode || hashKodeAkses(kode) !== analisis.kodeAksesHash) return null;
  return analisis;
}

// POST /api/analisis
async function buatAnalisis(req, res, next) {
  try {
    const { barangId, beratKg = null, jawaban = {}, kirim = false } = req.body;

    const barang = await prisma.barang.findFirst({
      where: { id: barangId, status: 'aktif', kategori: { status: 'aktif' } },
      select: { id: true, kategoriId: true },
    });
    if (!barang) {
      return fail(res, 404, 'Barang tidak ditemukan atau sudah tidak tersedia');
    }

    const hasil = await olahJawaban(barang.kategoriId, jawaban, beratKg, kirim);
    if (hasil.tanpaPertanyaan) {
      return fail(res, 404, 'Pertanyaan untuk kategori ini belum tersedia');
    }
    if (hasil.errors.length) {
      return fail(res, 422, 'Jawaban belum lengkap atau tidak valid', hasil.errors);
    }

    // Tamu dapat kode akses; yang disimpan hanya hash-nya
    const kodeAkses = req.user ? null : buatKodeAkses();

    // Nested write: AnalisisBarang + KondisiBarang dibuat sekaligus
    const analisis = await prisma.analisisBarang.create({
      data: {
        barangId: barang.id,
        userId: req.user ? req.user.id : null,
        beratKg,
        kodeAksesHash: kodeAkses ? hashKodeAkses(kodeAkses) : null,
        kondisi: { create: hasil.kondisi },
      },
      include: includeAnalisis,
    });

    return success(res, 201, pesanSimpan(kirim), formatAnalisis(analisis, kodeAkses));
  } catch (err) {
    next(err);
  }
}

// GET /api/analisis/:id — kalau status selesai, ikut mengirim hasil (FR-11, FR-12)
async function ambilAnalisis(req, res, next) {
  try {
    const analisis = await cariAnalisis(req, Number(req.params.id));
    if (!analisis) return fail(res, 404, 'Analisis tidak ditemukan');

    return success(res, 200, 'Data analisis berhasil diambil', formatAnalisis(analisis));
  } catch (err) {
    next(err);
  }
}

// PUT /api/analisis/:id/kondisi
async function updateKondisi(req, res, next) {
  try {
    const analisis = await cariAnalisis(req, Number(req.params.id));
    if (!analisis) return fail(res, 404, 'Analisis tidak ditemukan');

    if (analisis.status === 'selesai') {
      return fail(res, 409, 'Analisis sudah selesai sehingga jawaban tidak bisa diubah');
    }

    const kirim = req.body.kirim ?? false;
    // Field yang tidak dikirim → pakai nilai yang sudah tersimpan
    const beratKg = req.body.beratKg !== undefined ? req.body.beratKg : analisis.beratKg;
    const jawaban = req.body.jawaban ?? analisis.kondisi?.jawaban ?? {};

    const hasil = await olahJawaban(analisis.barang.kategoriId, jawaban, beratKg, kirim);
    if (hasil.tanpaPertanyaan) {
      return fail(res, 404, 'Pertanyaan untuk kategori ini belum tersedia');
    }
    if (hasil.errors.length) {
      return fail(res, 422, 'Jawaban belum lengkap atau tidak valid', hasil.errors);
    }

    const diperbarui = await prisma.analisisBarang.update({
      where: { id: analisis.id },
      data: {
        beratKg,
        kondisi: { upsert: { create: hasil.kondisi, update: hasil.kondisi } },
      },
      include: includeAnalisis,
    });

    return success(res, 200, pesanSimpan(kirim), formatAnalisis(diperbarui));
  } catch (err) {
    next(err);
  }
}

// Kalau proses gagal, cukup tandai "gagal". Jawaban pengguna TIDAK dihapus (NFR-08).
// Analisis yang sudah selesai tidak boleh berubah jadi gagal.
async function tandaiGagal(id) {
  try {
    await prisma.analisisBarang.updateMany({
      where: { id, status: { not: 'selesai' } },
      data: { status: 'gagal' },
    });
  } catch (err) {
    console.error('Gagal menandai analisis gagal:', err.message);
  }
}

// Hitung & simpan dampak lingkungan untuk semua rekomendasi analisis ini (FR-13).
// Faktor diambil dari DB (yang aktif), dicari lewat NAMA KATEGORI barang,
// karena ganti nama kategori tidak ikut mengubah Barang.material.
async function simpanDampak(analisisId) {
  const analisis = await prisma.analisisBarang.findUnique({
    where: { id: analisisId },
    select: {
      beratKg: true,
      barang: {
        select: {
          kategori: { select: { nama: true } },
          komposisi: { select: { material: true, persen: true }, orderBy: { persen: 'desc' } },
        },
      },
      rekomendasi: { select: { id: true, tindakan: true } },
    },
  });

  const materialDasar = analisis.barang.kategori.nama;
  const komposisi = analisis.barang.komposisi;
  // Faktor dicari per bahan penyusun; barang tanpa komposisi memakai nama kategori
  const daftarMaterial = komposisi.length ? komposisi.map((k) => k.material) : [materialDasar];
  const daftarFaktor = await prisma.faktorDampak.findMany({
    where: { status: 'aktif', material: { in: daftarMaterial } },
    select: { id: true, versi: true, material: true, tindakan: true, nilai: true, satuan: true, sumber: true, tahun: true },
  });

  // Hitung di logic/dampak.js (fungsi murni, ada unit test-nya)
  const hasil = hitungDampakKomposisi({
    beratKg: analisis.beratKg,
    komposisi,
    materialDasar,
    daftarTindakan: analisis.rekomendasi.map((r) => r.tindakan),
    daftarFaktor,
  });

  const idRekomendasi = new Map(analisis.rekomendasi.map((r) => [r.tindakan, r.id]));

  // Hapus dulu dampak lama (kalau ada), lalu simpan yang baru + catat versi faktor yang dipakai.
  // versiFaktor terisi (boleh []) = tanda dampak sudah dihitung.
  await prisma.$transaction([
    prisma.dampakLingkungan.deleteMany({ where: { rekomendasiId: { in: [...idRekomendasi.values()] } } }),
    prisma.dampakLingkungan.createMany({
      data: hasil.rincian.map(({ tindakan, ...dampak }) => ({
        ...dampak,
        rekomendasiId: idRekomendasi.get(tindakan),
      })),
    }),
    prisma.analisisBarang.update({
      where: { id: analisisId },
      data: { versiFaktor: hasil.versiFaktor },
    }),
  ]);
}

// Dipakai setelah analisis selesai: kalau dampak gagal dihitung, rekomendasi tetap aman
// dan pengguna bisa mencoba lagi lewat POST /api/analisis/:id/dampak (SRS FR-13, skenario eksepsional).
async function cobaSimpanDampak(analisisId) {
  try {
    await simpanDampak(analisisId);
    return true;
  } catch (err) {
    console.error('Gagal menghitung dampak lingkungan:', err.message);
    return false;
  }
}

// POST /api/analisis/:id/proses (FR-10)
async function prosesAnalisis(req, res, next) {
  let analisis = null;
  try {
    analisis = await cariAnalisis(req, Number(req.params.id));
    if (!analisis) return fail(res, 404, 'Analisis tidak ditemukan');

    if (analisis.status === 'selesai') {
      return fail(res, 409, 'Analisis ini sudah selesai diproses');
    }

    // Tahap 1 – Evaluasi kondisi: jawaban harus lengkap & valid (aturan yang sama dengan FR-09)
    const kategoriId = analisis.barang.kategoriId;
    const cek = await olahJawaban(kategoriId, analisis.kondisi?.jawaban ?? {}, analisis.beratKg, true);
    if (cek.tanpaPertanyaan) {
      return fail(res, 404, 'Pertanyaan untuk kategori ini belum tersedia');
    }
    if (!analisis.kondisi || cek.errors.length) {
      return fail(
        res,
        422,
        'Jawaban kondisi belum lengkap atau tidak valid. Perbaiki dulu sebelum dianalisis.',
        cek.errors
      );
    }

    // Aturan aktif untuk kategori ini + aturan umum (kategoriId null). Diambil dari DB (NFR-09).
    const aturan = await prisma.basisPengetahuan.findMany({
      where: { status: 'aktif', OR: [{ kategoriId }, { kategoriId: null }] },
      select: { id: true, versi: true, kondisi: true, tindakan: true, bobot: true, eliminasi: true, alasan: true },
      orderBy: { id: 'asc' },
    });

    // Tahap 2 & 3 – Pemeriksaan keselamatan + hitung skor (logic/ruleEngine.js)
    const hasil = jalankanAnalisis(analisis.kondisi, aturan);

    // Rekomendasi utama + alternatif yang aman dan layak (logic/rekomendasi.js)
    const rekomendasi = susunRekomendasi(
      hasil.skor,
      analisis.barang.kategori?.nama,
      hasil.keselamatan
    ).map((r) => ({
      ...r,
      analisisId: analisis.id,
    }));

    let pesanKeterbatasan = null;
    if (hasil.keterbatasan) pesanKeterbatasan = PESAN_TANPA_ATURAN;
    else if (rekomendasi.length === 0) pesanKeterbatasan = PESAN_TANPA_TINDAKAN_AMAN;

    const where = { analisisId: analisis.id };

    // Simpan semua hasil sekaligus: kalau satu gagal, semuanya dibatalkan.
    // Hasil lama (dari percobaan sebelumnya) dihapus dulu supaya bisa dicoba ulang (NFR-08).
    await prisma.$transaction([
      prisma.rekomendasi.deleteMany({ where }),
      prisma.skorSolusi.deleteMany({ where }),
      prisma.pemeriksaanKeselamatan.deleteMany({ where }),
      prisma.pemeriksaanKeselamatan.create({
        data: {
          analisisId: analisis.id,
          adaBahaya: hasil.keselamatan.adaBahaya,
          tindakanDieliminasi: hasil.keselamatan.tindakanDieliminasi,
          peringatan: hasil.keselamatan.peringatan,
        },
      }),
      prisma.skorSolusi.createMany({
        data: hasil.skor.map((s) => ({
          analisisId: analisis.id,
          tindakan: s.tindakan,
          skor: s.skor,
          peringkat: s.peringkat,
        })),
      }),
      prisma.rekomendasi.createMany({ data: rekomendasi }),
      prisma.analisisBarang.update({
        where: { id: analisis.id },
        data: { status: 'selesai', versiAturan: hasil.versiAturan, pesanKeterbatasan },
      }),
    ]);

    // Tahap tambahan – Dampak lingkungan (FR-13). Gagal di sini tidak membatalkan hasil analisis.
    const dampakBerhasil = await cobaSimpanDampak(analisis.id);

    // Ambil ulang dari DB supaya bentuk response sama persis dengan GET /api/analisis/:id
    const selesai = await prisma.analisisBarang.findUnique({
      where: { id: analisis.id },
      include: includeAnalisis,
    });
    const message = dampakBerhasil
      ? 'Analisis selesai'
      : 'Analisis selesai, tetapi dampak lingkungan belum berhasil dihitung';
    return success(res, 200, message, formatAnalisis(selesai));
  } catch (err) {
    if (analisis) await tandaiGagal(analisis.id);
    next(err);
  }
}

// POST /api/analisis/:id/dampak (FR-13) — tombol "Coba Lagi" kalau dampak belum berhasil dihitung
async function hitungUlangDampak(req, res, next) {
  try {
    const analisis = await cariAnalisis(req, Number(req.params.id));
    if (!analisis) return fail(res, 404, 'Analisis tidak ditemukan');

    if (analisis.status !== 'selesai') {
      return fail(res, 409, 'Analisis belum selesai, jadi dampak lingkungan belum bisa dihitung');
    }
    // Sudah pernah dihitung → jangan dihitung ulang, supaya hasil tetap sesuai versi faktor yang tercatat
    if (analisis.versiFaktor !== null) {
      return fail(res, 409, 'Dampak lingkungan untuk analisis ini sudah dihitung');
    }

    await simpanDampak(analisis.id);

    const terbaru = await prisma.analisisBarang.findUnique({
      where: { id: analisis.id },
      include: includeAnalisis,
    });
    return success(res, 200, 'Dampak lingkungan berhasil dihitung', formatAnalisis(terbaru));
  } catch (err) {
    next(err);
  }
}

// PUT /api/analisis/:id/umpan-balik (FR-16)
// 1 umpan balik per analisis; kirim ulang = memperbarui. Tamu boleh (pakai X-Kode-Akses).
async function kirimUmpanBalik(req, res, next) {
  try {
    const analisis = await cariAnalisis(req, Number(req.params.id));
    if (!analisis) return fail(res, 404, 'Analisis tidak ditemukan');

    // Pre-kondisi SRS: rekomendasi sudah ditampilkan → analisis harus selesai
    if (analisis.status !== 'selesai') {
      return fail(res, 409, 'Umpan balik baru bisa diberikan setelah hasil rekomendasi keluar');
    }

    const data = {
      rating: req.body.rating,
      komentar: req.body.komentar || null, // tidak dikirim / string kosong → null
    };

    // upsert = update kalau sudah ada, create kalau belum (analisisId unik)
    const umpanBalik = await prisma.umpanBalik.upsert({
      where: { analisisId: analisis.id },
      create: { ...data, analisisId: analisis.id, userId: req.user ? req.user.id : null },
      update: data,
    });

    const baru = !analisis.umpanBalik;
    return success(
      res,
      baru ? 201 : 200,
      baru ? 'Terima kasih, umpan balik berhasil dikirim' : 'Umpan balik berhasil diperbarui',
      formatUmpanBalik(umpanBalik)
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  buatAnalisis,
  ambilAnalisis,
  updateKondisi,
  prosesAnalisis,
  hitungUlangDampak,
  kirimUmpanBalik,
};
