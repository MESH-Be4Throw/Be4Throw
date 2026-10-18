// Validasi jawaban Identifikasi Kondisi berdasarkan pertanyaan aktif dari DB (FR-07, NFR-09)
const TIDAK_TAHU = 'tidak_tahu';
const OPSI_EKSKLUSIF = 'tidak_ada';

function kosong(nilai) {
  return (
    nilai === undefined ||
    nilai === null ||
    nilai === '' ||
    (Array.isArray(nilai) && nilai.length === 0)
  );
}

// Cek satu jawaban sesuai tipe pertanyaan. Return pesan error, atau null kalau valid.
function cekNilai(p, nilai) {
  const daftarNilai = Array.isArray(p.opsi) ? p.opsi.map((o) => o.nilai) : [];

  switch (p.tipe) {
    case 'pilihan_tunggal':
    case 'ya_tidak':
      return daftarNilai.includes(nilai) ? null : 'Pilihan tidak valid';

    case 'pilihan_ganda':
      if (!Array.isArray(nilai) || !nilai.every((n) => daftarNilai.includes(n))) {
        return 'Pilihan tidak valid';
      }
      if (nilai.includes(OPSI_EKSKLUSIF) && nilai.length > 1) {
        return 'Pilihan "tidak ada" tidak bisa digabung dengan pilihan lain';
      }
      return null;

    case 'angka': {
      const { min = 0, max = Infinity } = p.opsi || {};
      if (typeof nilai !== 'number' || !Number.isFinite(nilai)) {
        return 'Jawaban harus berupa angka';
      }
      if (nilai < min || nilai > max) {
        return `Jawaban harus di antara ${min} dan ${max}`;
      }
      return null;
    }

    default:
      return 'Tipe pertanyaan tidak dikenal';
  }
}

// wajibLengkap = true saat tombol Lanjut ditekan (kirim: true)
function validasiJawaban(daftarPertanyaan, jawaban, wajibLengkap) {
  const errors = [];
  const bersih = {};
  const pertanyaanById = new Map(daftarPertanyaan.map((p) => [p.id, p]));
  const kodeDikenal = new Set(daftarPertanyaan.map((p) => p.kode));

  // Tolak jawaban untuk pertanyaan yang tidak ada / tidak aktif
  for (const kode of Object.keys(jawaban)) {
    if (!kodeDikenal.has(kode)) {
      errors.push({ field: `jawaban.${kode}`, message: 'Pertanyaan tidak dikenal' });
    }
  }

  for (const p of daftarPertanyaan) {
    // Pertanyaan lanjutan hanya berlaku kalau jawaban induknya sesuai tampilJika
    if (p.indukId) {
      const induk = pertanyaanById.get(p.indukId);
      const tampil = induk && jawaban[induk.kode] === p.tampilJika?.jawaban;
      if (!tampil) continue; // jawaban lanjutan yang tidak relevan dibuang
    }

    const nilai = jawaban[p.kode];
    const field = `jawaban.${p.kode}`;

    if (kosong(nilai)) {
      if (wajibLengkap && p.wajib) {
        errors.push({ field, message: 'Pertanyaan ini wajib dijawab' });
      }
      continue;
    }

    if (nilai === TIDAK_TAHU) {
      if (p.bolehTidakTahu) bersih[p.kode] = TIDAK_TAHU;
      else errors.push({ field, message: 'Pilihan "tidak tahu" tidak tersedia untuk pertanyaan ini' });
      continue;
    }

    const pesan = cekNilai(p, nilai);
    if (pesan) {
      errors.push({ field, message: pesan });
    } else {
      // Pilihan ganda: buang nilai dobel
      bersih[p.kode] = Array.isArray(nilai) ? [...new Set(nilai)] : nilai;
    }
  }

  return { errors, bersih };
}

// Ubah jawaban bersih ke kolom KondisiBarang (dipakai rule engine FR-08)
function keKondisiBarang(bersih) {
  const nilaiAtauNull = (v) => (v === undefined || v === TIDAK_TAHU ? null : v);
  const daftarAtauKosong = (v) => (Array.isArray(v) ? v : []);
  const kelengkapan = nilaiAtauNull(bersih.kelengkapan);
  const bahaya = bersih.mengandung_bahaya;

  return {
    fungsiUtama: nilaiAtauNull(bersih.fungsi_utama),
    kondisiFisik: daftarAtauKosong(bersih.kondisi_fisik),
    usiaTahun: nilaiAtauNull(bersih.usia_tahun),
    kelengkapan: kelengkapan === null ? null : Math.round(kelengkapan), // kolom Int
    mengandungBahaya: bahaya === 'ya' ? true : bahaya === 'tidak' ? false : null, // null = tidak tahu
    jenisBahaya: daftarAtauKosong(bersih.jenis_bahaya),
    jawaban: bersih,
  };
}

module.exports = { validasiJawaban, keKondisiBarang, TIDAK_TAHU };