// Pemeriksaan keselamatan (FR-10, SDD Skema Pengujian no. 2).
// Aturan dasar sengaja ditulis di kode, bukan di DB, supaya tidak bisa hilang
// kalau admin salah hapus/nonaktifkan aturan. Admin tetap bisa MENAMBAH aturan
// keselamatan lewat BasisPengetahuan (eliminasi = true), lihat ruleEngine.js.
const { TINDAKAN } = require('./tindakan');

// Per jenis bahaya:
// - eliminasi: tindakan yang dibuang
// - peringatan: ditampilkan ke pengguna
// - langkahPengganti: langkah praktis khusus bahaya, MENGGANTIKAN langkah biasa
//   untuk tindakan yang masih boleh (supaya tidak ada arahan yang bertentangan,
//   mis. "setor ke bank sampah" untuk barang bekas bahan kimia)
const ATURAN_BAHAYA = {
  baterai: {
    eliminasi: ['gunakan_kembali', 'jual', 'donasikan'],
    peringatan:
      'Baterai yang menggembung, bocor, atau panas berisiko terbakar. Jangan dicas atau dipakai, ' +
      'jauhkan dari sumber panas, dan jangan dibuang ke tempat sampah biasa. Perbaikan hanya di servis resmi.',
    langkahPengganti: {
      perbaiki: [
        'Jangan dicas atau dinyalakan lagi sebelum diperiksa.',
        'Bawa hanya ke servis resmi dan sampaikan bahwa baterainya bermasalah.',
        'Pastikan baterai lama dibuang lewat jalur limbah elektronik/B3 resmi.',
      ],
      daur_ulang: [
        'Jangan dicas, ditusuk, atau dibongkar.',
        'Simpan di tempat sejuk, jauh dari benda mudah terbakar, sampai diserahkan.',
        'Serahkan ke dropbox limbah elektronik/baterai atau pengelola limbah B3 resmi.',
      ],
    },
  },
  limbah_elektronik: {
    eliminasi: ['gunakan_kembali', 'jual', 'donasikan'],
    peringatan:
      'Komponen elektronik yang terbuka, gosong, atau bocor bisa melepaskan zat berbahaya. ' +
      'Jangan dibongkar sendiri; serahkan ke teknisi atau dropbox limbah elektronik resmi.',
    langkahPengganti: {
      perbaiki: [
        'Jangan dinyalakan sebelum diperiksa teknisi.',
        'Bawa ke servis resmi atau teknisi tepercaya.',
      ],
      daur_ulang: [
        'Jangan dibongkar sendiri dan hindari menyentuh cairan yang bocor.',
        'Masukkan ke wadah atau kantong tertutup.',
        'Serahkan ke dropbox limbah elektronik (e-waste) atau pengelola limbah elektronik resmi.',
      ],
    },
  },
  benda_tajam: {
    eliminasi: ['gunakan_kembali', 'jual', 'donasikan'],
    peringatan:
      'Ada bagian tajam yang bisa melukai. Bungkus bagian tajam dengan aman sebelum barang ' +
      'dipindahkan atau diserahkan ke pihak lain.',
    langkahPengganti: {
      perbaiki: [
        'Pakai sarung tangan saat memegang bagian yang tajam.',
        'Serahkan perbaikan ke teknisi atau tukang yang berpengalaman.',
      ],
      daur_ulang: [
        'Bungkus bagian tajam dengan kardus atau kain tebal, lalu beri tanda "tajam".',
        'Pisahkan dari sampah lain supaya petugas tidak terluka.',
        'Serahkan ke bank sampah atau pengelola sampah dan beri tahu ada bagian tajam.',
      ],
    },
  },
  bahan_kimia: {
    eliminasi: ['gunakan_kembali', 'perbaiki', 'jual', 'donasikan'],
    peringatan:
      'Barang terkontaminasi bahan kimia. Jangan dipakai untuk makanan/minuman atau diberikan ' +
      'ke orang lain; serahkan ke pengelola limbah B3.',
    langkahPengganti: {
      daur_ulang: [
        'Jangan dicuci atau dibuang ke saluran air.',
        'Tutup rapat dan beri tanda bekas bahan kimia.',
        'Serahkan ke pengelola limbah B3 atau tanyakan ke dinas lingkungan hidup setempat.',
      ],
    },
  },
};

// Pengguna jawab "tidak tahu" → anggap berisiko
const BAHAYA_TIDAK_DIKETAHUI = {
  eliminasi: ['jual', 'donasikan'],
  peringatan:
    'Kamu belum yakin apakah barang ini berbahaya. Pastikan dulu ke pihak yang kompeten ' +
    '(teknisi atau pengelola limbah) sebelum menyerahkannya ke orang lain.',
};

// kondisi: kolom KondisiBarang (mengandungBahaya, jenisBahaya)
// aturanEliminasiDb: aturan BasisPengetahuan dengan eliminasi = true yang cocok dengan kondisi
function periksaKeselamatan(kondisi, aturanEliminasiDb = []) {
  const dibuang = new Set();
  const peringatan = [];
  const langkahPengganti = {}; // { tindakan: [langkah...] }

  const terapkan = (aturan) => {
    aturan.eliminasi.forEach((t) => dibuang.add(t));
    peringatan.push(aturan.peringatan);

    // Beberapa bahaya sekaligus → langkahnya digabung, tanpa dobel
    for (const [tindakan, langkah] of Object.entries(aturan.langkahPengganti ?? {})) {
      langkahPengganti[tindakan] = [...new Set([...(langkahPengganti[tindakan] ?? []), ...langkah])];
    }
  };

  const { mengandungBahaya, jenisBahaya = [] } = kondisi;

  if (mengandungBahaya === null || mengandungBahaya === undefined) {
    terapkan(BAHAYA_TIDAK_DIKETAHUI);
  } else if (mengandungBahaya === true) {
    const dikenal = jenisBahaya.filter((j) => ATURAN_BAHAYA[j]);
    // Jaga-jaga: jawab "ya" tapi jenisnya kosong/tidak dikenal → perlakukan seperti "tidak tahu"
    if (dikenal.length === 0) terapkan(BAHAYA_TIDAK_DIKETAHUI);
    dikenal.forEach((j) => terapkan(ATURAN_BAHAYA[j]));
  }

  // Aturan keselamatan tambahan dari admin
  for (const aturan of aturanEliminasiDb) {
    dibuang.add(aturan.tindakan);
    peringatan.push(aturan.alasan);
  }

  // Pakai urutan TINDAKAN biar hasilnya selalu konsisten
  const tindakanDieliminasi = TINDAKAN.filter((t) => dibuang.has(t));

  // Langkah pengganti untuk tindakan yang sudah dibuang tidak perlu dikirim
  for (const t of tindakanDieliminasi) delete langkahPengganti[t];

  return {
    adaBahaya: tindakanDieliminasi.length > 0,
    tindakanDieliminasi,
    peringatan: [...new Set(peringatan)], // buang peringatan dobel
    langkahPengganti,
  };
}

module.exports = { periksaKeselamatan, ATURAN_BAHAYA };
