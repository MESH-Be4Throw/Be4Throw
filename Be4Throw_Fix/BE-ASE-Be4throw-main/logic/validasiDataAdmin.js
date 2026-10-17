// Validasi data yang diisi admin (FR-14) yang tidak cukup dicek express-validator:
// format opsi pertanyaan, aturan khusus pertanyaan inti, dan format kondisi aturan.
// Fungsi murni (tanpa DB) supaya gampang di-unit test.
// Semua fungsi mengembalikan daftar error { field, message }; daftar kosong = valid.
const { KOLOM_KONDISI } = require('./ruleEngine');
const { ATURAN_BAHAYA } = require('./keselamatan');
const { TIDAK_TAHU } = require('./validasiJawaban');

const err = (field, message) => ({ field, message });

// Nilai opsi: huruf kecil, angka, garis bawah. Sama dengan gaya seed, mis. "kabel_terkelupas"
const POLA_NILAI = /^[a-z0-9_]+$/;

// 6 pertanyaan inti dipetakan ke kolom KondisiBarang (validasiJawaban.js → keKondisiBarang)
// dan dipakai rule engine + pemeriksaan keselamatan. Karena itu tipe, induk,
// dan sebagian nilai opsinya dikunci. Teks, label opsi, dan urutan tetap bebas diubah.
const PERTANYAAN_INTI = {
  // nilai harus sama dengan enum FungsiUtama di schema.prisma
  fungsi_utama: {
    tipe: 'pilihan_tunggal',
    nilai: ['berfungsi_penuh', 'berfungsi_sebagian', 'tidak_berfungsi'],
  },
  kondisi_fisik: { tipe: 'pilihan_ganda' },
  usia_tahun: { tipe: 'angka' },
  kelengkapan: { tipe: 'angka' },
  // "ya" → true, "tidak" → false (keKondisiBarang)
  mengandung_bahaya: { tipe: 'ya_tidak', nilai: ['ya', 'tidak'] },
  // Jenis bahaya baru harus ditambahkan dulu di logic/keselamatan.js (ATURAN_BAHAYA)
  jenis_bahaya: {
    tipe: 'pilihan_ganda',
    nilai: Object.keys(ATURAN_BAHAYA),
    induk: 'mengandung_bahaya',
    tampilJika: 'ya',
  },
};

// Tipe yang jawabannya satu nilai. Hanya tipe ini yang bisa jadi induk pertanyaan lanjutan,
// karena validasiJawaban membandingkan jawaban induk dengan tampilJika.jawaban (===).
const TIPE_BISA_JADI_INDUK = ['pilihan_tunggal', 'ya_tidak'];

const daftarNilai = (opsi) => (Array.isArray(opsi) ? opsi.map((o) => o?.nilai) : []);

// ==================== OPSI PERTANYAAN ====================
// pilihan_tunggal / pilihan_ganda / ya_tidak → [{ "nilai": "retak", "label": "Retak" }, ...]
// angka → { "min": 0, "max": 50, "satuan": "tahun" }
function validasiOpsi(tipe, opsi) {
  if (tipe === 'angka') {
    if (!opsi || typeof opsi !== 'object' || Array.isArray(opsi)) {
      return [err('opsi', 'Untuk tipe angka, opsi harus berupa objek { "min", "max", "satuan" }')];
    }
    const errors = [];
    const { min, max, satuan } = opsi;
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      errors.push(err('opsi', 'min dan max wajib diisi angka'));
    } else if (min >= max) {
      errors.push(err('opsi', 'min harus lebih kecil dari max'));
    }
    if (satuan !== undefined && (typeof satuan !== 'string' || satuan.length > 20)) {
      errors.push(err('opsi.satuan', 'Satuan harus berupa teks maksimal 20 karakter'));
    }
    return errors;
  }

  if (!Array.isArray(opsi) || opsi.length === 0) {
    return [err('opsi', 'Opsi harus berupa daftar pilihan dan tidak boleh kosong')];
  }

  const errors = [];
  if (tipe === 'ya_tidak' && opsi.length !== 2) {
    errors.push(err('opsi', 'Tipe ya_tidak harus punya tepat 2 opsi'));
  }
  if (tipe === 'pilihan_tunggal' && opsi.length < 2) {
    errors.push(err('opsi', 'Tipe pilihan_tunggal minimal punya 2 opsi'));
  }

  opsi.forEach((o, i) => {
    const field = `opsi[${i}]`;
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      errors.push(err(field, 'Setiap opsi harus berupa { "nilai", "label" }'));
      return;
    }
    if (typeof o.nilai !== 'string' || !POLA_NILAI.test(o.nilai) || o.nilai.length > 50) {
      errors.push(
        err(`${field}.nilai`, 'Nilai hanya boleh huruf kecil, angka, dan garis bawah (maks. 50 karakter)')
      );
    } else if (o.nilai === TIDAK_TAHU) {
      errors.push(
        err(`${field}.nilai`, 'Nilai "tidak_tahu" sudah disediakan sistem lewat pengaturan bolehTidakTahu')
      );
    }
    if (typeof o.label !== 'string' || !o.label.trim() || o.label.length > 150) {
      errors.push(err(`${field}.label`, 'Label wajib diisi (maks. 150 karakter)'));
    }
  });

  const nilai = daftarNilai(opsi);
  if (new Set(nilai).size !== nilai.length) {
    errors.push(err('opsi', 'Nilai opsi tidak boleh dobel'));
  }

  return errors;
}

// ==================== PERTANYAAN ====================
// data: pertanyaan SETELAH perubahan (data lama digabung data baru)
// induk: pertanyaan induk dari DB kalau data.indukId diisi (null kalau tidak ketemu)
// lanjutan: pertanyaan lanjutan milik pertanyaan ini (kosong untuk pertanyaan baru)
function validasiPertanyaan(data, induk = null, lanjutan = []) {
  const errors = [...validasiOpsi(data.tipe, data.opsi)];

  // 1. Pertanyaan lanjutan: induknya harus jelas dan tampilJika cocok dengan opsi induk
  if (data.indukId) {
    if (!induk || induk.kategoriId !== data.kategoriId) {
      errors.push(err('indukId', 'Pertanyaan induk tidak ditemukan di kategori yang sama'));
    } else if (induk.id === data.id) {
      errors.push(err('indukId', 'Pertanyaan tidak bisa menjadi induk dirinya sendiri'));
    } else if (induk.indukId) {
      errors.push(err('indukId', 'Pertanyaan lanjutan tidak bisa punya lanjutan lagi'));
    } else if (!TIPE_BISA_JADI_INDUK.includes(induk.tipe)) {
      errors.push(err('indukId', 'Pertanyaan induk harus bertipe pilihan_tunggal atau ya_tidak'));
    } else if (!daftarNilai(induk.opsi).includes(data.tampilJika?.jawaban)) {
      errors.push(
        err('tampilJika', 'tampilJika.jawaban harus salah satu nilai opsi pertanyaan induk, mis. { "jawaban": "ya" }')
      );
    }
  } else if (data.tampilJika) {
    errors.push(err('tampilJika', 'tampilJika hanya dipakai untuk pertanyaan lanjutan (isi indukId)'));
  }

  // 2. Pertanyaan yang punya lanjutan: opsinya tetap harus memuat nilai yang dipakai lanjutannya
  if (lanjutan.length) {
    if (data.indukId) {
      errors.push(err('indukId', 'Pertanyaan ini punya pertanyaan lanjutan, jadi tidak bisa dijadikan lanjutan'));
    }
    if (!TIPE_BISA_JADI_INDUK.includes(data.tipe)) {
      errors.push(err('tipe', 'Pertanyaan yang punya lanjutan harus bertipe pilihan_tunggal atau ya_tidak'));
    } else {
      const nilai = daftarNilai(data.opsi);
      for (const l of lanjutan) {
        if (!nilai.includes(l.tampilJika?.jawaban)) {
          errors.push(err('opsi', `Nilai "${l.tampilJika?.jawaban}" masih dipakai pertanyaan lanjutan "${l.kode}"`));
        }
      }
    }
  }

  // 3. Pertanyaan inti
  const inti = PERTANYAAN_INTI[data.kode];
  if (inti) {
    if (data.tipe !== inti.tipe) {
      errors.push(err('tipe', `Pertanyaan inti "${data.kode}" harus bertipe ${inti.tipe}`));
    }
    if (inti.nilai) {
      const asing = daftarNilai(data.opsi).filter((n) => !inti.nilai.includes(n));
      if (asing.length) {
        errors.push(
          err('opsi', `Nilai opsi "${data.kode}" hanya boleh: ${inti.nilai.join(', ')}. Label boleh diubah.`)
        );
      }
    }
    if ((data.indukId ? induk?.kode : null) !== (inti.induk ?? null)) {
      errors.push(
        err(
          'indukId',
          inti.induk
            ? `Pertanyaan inti "${data.kode}" harus menjadi lanjutan dari "${inti.induk}"`
            : `Pertanyaan inti "${data.kode}" tidak boleh menjadi pertanyaan lanjutan`
        )
      );
    }
    if (inti.tampilJika && data.tampilJika?.jawaban !== inti.tampilJika) {
      errors.push(err('tampilJika', `Pertanyaan inti "${data.kode}" harus tampil jika dijawab "${inti.tampilJika}"`));
    }
    if (data.status === 'nonaktif') {
      errors.push(
        err('status', 'Pertanyaan inti tidak bisa dinonaktifkan karena dipakai rule engine dan pemeriksaan keselamatan')
      );
    }
  }

  return errors;
}

// ==================== KONDISI ATURAN ====================
// Format lengkap: lihat komentar di logic/ruleEngine.js.
// Kondisi yang formatnya salah tidak akan pernah cocok di rule engine (diam-diam),
// jadi lebih baik ditolak saat admin menyimpan.
const NILAI_FUNGSI = PERTANYAAN_INTI.fungsi_utama.nilai;

const keDaftar = (s) => (Array.isArray(s) ? s : [s]);
const teksIsi = (s) => typeof s === 'string' && s.length > 0;
const rentangValid = (s) => {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  const kunci = Object.keys(s);
  if (!kunci.length || !kunci.every((k) => (k === 'min' || k === 'max') && Number.isFinite(s[k]))) {
    return false;
  }
  return !(s.min > s.max);
};

// Per kolom KondisiBarang: cara cek syarat + contoh yang ditampilkan kalau salah
const SYARAT_KOLOM = {
  fungsiUtama: {
    cek: (s) => s === null || (keDaftar(s).length > 0 && keDaftar(s).every((n) => NILAI_FUNGSI.includes(n))),
    contoh: `salah satu atau daftar dari ${NILAI_FUNGSI.join(', ')}; atau null (tidak tahu)`,
  },
  kondisiFisik: {
    cek: (s) => keDaftar(s).length > 0 && keDaftar(s).every(teksIsi),
    contoh: 'nilai opsi atau daftar nilai opsi, mis. ["retak", "penyok"]',
  },
  jenisBahaya: {
    cek: (s) => keDaftar(s).length > 0 && keDaftar(s).every(teksIsi),
    contoh: `nilai atau daftar nilai, mis. ["${Object.keys(ATURAN_BAHAYA)[0]}"]`,
  },
  usiaTahun: {
    cek: (s) => s === null || Number.isFinite(s) || rentangValid(s),
    contoh: 'angka, rentang { "min": 5, "max": 10 }, atau null (tidak tahu)',
  },
  kelengkapan: {
    cek: (s) => s === null || Number.isFinite(s) || rentangValid(s),
    contoh: 'angka, rentang { "min": 0, "max": 49 }, atau null (tidak tahu)',
  },
  mengandungBahaya: {
    cek: (s) => s === null || typeof s === 'boolean',
    contoh: 'true, false, atau null (tidak tahu)',
  },
};

function validasiKondisiAturan(kondisi) {
  if (!kondisi || typeof kondisi !== 'object' || Array.isArray(kondisi)) {
    return [
      err('kondisi', 'Kondisi harus berupa objek, mis. { "fungsiUtama": "tidak_berfungsi" }. Pakai {} untuk aturan yang selalu berlaku.'),
    ];
  }

  const errors = [];
  for (const [kolom, syarat] of Object.entries(kondisi)) {
    const aturan = SYARAT_KOLOM[kolom];
    if (!KOLOM_KONDISI.includes(kolom) || !aturan) {
      errors.push(err(`kondisi.${kolom}`, `Kolom tidak dikenal. Pilihan: ${KOLOM_KONDISI.join(', ')}`));
    } else if (!aturan.cek(syarat)) {
      errors.push(err(`kondisi.${kolom}`, `Format tidak valid. Isi dengan ${aturan.contoh}`));
    }
  }
  return errors;
}

module.exports = {
  validasiOpsi,
  validasiPertanyaan,
  validasiKondisiAturan,
  PERTANYAAN_INTI,
};
