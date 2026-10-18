// Langkah praktis per kategori & tindakan (FR-11/FR-12, SDD: Rekomendasi.detailTindakan).
// DRAFT: isi dibuat developer, WAJIB divalidasi Shakira.
// Sementara di kode (bukan DB) → admin belum bisa mengedit lewat FR-14 (dilaporkan ke Shakira).
// Kategori tidak terdaftar → daftar kosong (jangan mengarang langkah).

const LANGKAH_PRAKTIS = {
  Elektronik: {
    gunakan_kembali: [
      'Bersihkan perangkat dan pastikan fungsi utamanya masih berjalan.',
      'Kalau akan dipakai untuk keperluan lain, hapus data lama atau lakukan reset.',
      'Manfaatkan sebagai perangkat cadangan, misalnya HP cadangan atau pemutar musik.',
    ],
    perbaiki: [
      'Catat kerusakan yang terjadi (apa yang tidak berfungsi dan sejak kapan).',
      'Bawa ke servis resmi atau teknisi tepercaya untuk cek kerusakan dan biayanya.',
      'Bandingkan biaya perbaikan dengan harga barang baru sebelum memutuskan.',
    ],
    jual: [
      'Backup data penting, lalu hapus semua data pribadi (reset pabrik).',
      'Foto barang dengan jelas dan tulis kondisinya apa adanya.',
      'Jual lewat marketplace atau toko barang bekas.',
    ],
    donasikan: [
      'Hapus semua data pribadi (reset pabrik).',
      'Pastikan barang masih berfungsi dan sertakan charger/kabelnya.',
      'Serahkan ke lembaga sosial, sekolah, atau komunitas yang menerima donasi elektronik.',
    ],
    daur_ulang: [
      'Hapus data pribadi kalau perangkat masih bisa diakses.',
      'Jangan dibongkar sendiri dan jangan dibuang ke tempat sampah biasa.',
      'Serahkan ke dropbox limbah elektronik (e-waste) atau pengelola limbah elektronik resmi.',
    ],
  },
  Pakaian: {
    gunakan_kembali: [
      'Cuci bersih pakaian sebelum dipakai lagi.',
      'Pakai lagi, atau ubah jadi barang lain seperti lap, tas kain, atau sarung bantal.',
    ],
    perbaiki: [
      'Jahit sobekan kecil atau ganti kancing/resleting, sendiri atau di penjahit.',
      'Cuci pakaian setelah diperbaiki sebelum dipakai lagi.',
    ],
    jual: [
      'Cuci dan setrika pakaian.',
      'Foto dengan cahaya terang, sebutkan ukuran dan cacatnya apa adanya.',
      'Jual di marketplace preloved atau toko thrift.',
    ],
    donasikan: [
      'Cuci bersih dan lipat rapi.',
      'Pisahkan pakaian yang masih layak pakai dari yang rusak.',
      'Serahkan ke panti, posko donasi, atau bank pakaian.',
    ],
    daur_ulang: [
      'Pisahkan pakaian yang sudah tidak layak pakai.',
      'Serahkan ke dropbox daur ulang tekstil atau bank sampah yang menerima kain.',
      'Kain perca juga bisa dipakai jadi lap atau isian bantal.',
    ],
  },
  Plastik: {
    gunakan_kembali: [
      'Cuci bersih dan keringkan.',
      'Pakai lagi sesuai fungsinya, atau jadikan wadah serbaguna (alat tulis, pot tanaman).',
      'Jangan pakai untuk makanan panas kalau plastik sudah berubah bentuk atau tergores dalam.',
    ],
    perbaiki: [
      'Retakan kecil pada ember atau wadah non-makanan bisa ditambal lem khusus plastik.',
      'Jangan memperbaiki wadah makanan; lebih aman didaur ulang.',
    ],
    jual: [
      'Cuci bersih barang.',
      'Jual barang yang masih bagus di marketplace.',
      'Botol atau wadah dalam jumlah banyak bisa dijual ke pengepul atau bank sampah.',
    ],
    donasikan: [
      'Cuci bersih dan pastikan tidak bau.',
      'Serahkan ke komunitas, sekolah, atau warga sekitar yang membutuhkan.',
    ],
    daur_ulang: [
      'Cuci, keringkan, dan lepaskan label atau tutup kalau bisa.',
      'Pisahkan dari sampah lain.',
      'Setor ke bank sampah atau pengepul plastik.',
    ],
  },
  Furnitur: {
    gunakan_kembali: [
      'Bersihkan dan kencangkan sekrup atau sambungan yang longgar.',
      'Pakai lagi atau pindahkan ke ruangan lain.',
      'Cat ulang kalau ingin tampil lebih baru.',
    ],
    perbaiki: [
      'Kencangkan sambungan, ganti sekrup, atau lem bagian yang lepas.',
      'Untuk kerusakan besar, panggil tukang kayu atau jasa reparasi furnitur.',
      'Amplas dan finishing ulang bagian yang tergores.',
    ],
    jual: [
      'Bersihkan dan foto dari beberapa sisi.',
      'Cantumkan ukuran dan kondisinya apa adanya.',
      'Jual di marketplace atau ke pengepul furnitur bekas.',
    ],
    donasikan: [
      'Pastikan furnitur masih kokoh dan aman dipakai.',
      'Hubungi panti, sekolah, atau tempat ibadah yang membutuhkan.',
      'Tanyakan apakah penerima bisa mengambil sendiri.',
    ],
    daur_ulang: [
      'Pisahkan bahan kayu, logam, dan kaca.',
      'Jual bagian logam ke pengepul.',
      'Kayu yang masih bagus bisa dipakai untuk kerajinan; sisanya serahkan ke pengelola sampah setempat.',
    ],
  },
};

function langkahUntuk(namaKategori, tindakan) {
  return LANGKAH_PRAKTIS[namaKategori]?.[tindakan] ?? [];
}

module.exports = { langkahUntuk, LANGKAH_PRAKTIS };
