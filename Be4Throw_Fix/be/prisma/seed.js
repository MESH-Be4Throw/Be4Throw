require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { dataAturan, keBarisAturan } = require('./dataAturan');
const { dataFaktor } = require('./dataFaktor');
const { dataKomposisi } = require('./dataKomposisi');

const prisma = new PrismaClient();

// Estimasi berat (kg) = perkiraan awal, nanti bisa dikoreksi admin.
// Material barang = nama kategori (keputusan tim 11 Okt), diisi otomatis di main().
const dataKategori = [
  {
    nama: 'Elektronik',
    deskripsi: 'Perangkat listrik dan elektronik',
    barang: [
      { nama: 'Smartphone', estimasiBerat: 0.2 },
      { nama: 'Laptop', estimasiBerat: 2.0 },
      { nama: 'Kipas Angin', estimasiBerat: 3.0 },
    ],
  },
  {
    nama: 'Pakaian',
    deskripsi: 'Pakaian dan tekstil',
    barang: [
      { nama: 'Kaos', estimasiBerat: 0.2 },
      { nama: 'Celana Jeans', estimasiBerat: 0.6 },
      { nama: 'Jaket', estimasiBerat: 0.8 },
    ],
  },
  {
    nama: 'Plastik',
    deskripsi: 'Barang berbahan plastik',
    barang: [
      { nama: 'Botol Plastik', estimasiBerat: 0.03 },
      { nama: 'Wadah Makanan Plastik', estimasiBerat: 0.15 },
      { nama: 'Ember Plastik', estimasiBerat: 0.5 },
    ],
  },
  {
    nama: 'Furnitur',
    deskripsi: 'Perabot rumah tangga',
    barang: [
      { nama: 'Kursi Kayu', estimasiBerat: 5.0 },
      { nama: 'Meja Belajar', estimasiBerat: 15.0 },
      { nama: 'Lemari Kecil', estimasiBerat: 25.0 },
    ],
  },
];

// ==================== PERTANYAAN (FR-07) ====================
// Kode inti (fungsi_utama, kondisi_fisik, usia_tahun, kelengkapan,
// mengandung_bahaya, jenis_bahaya) dipetakan ke kolom KondisiBarang.
// Teks & opsi boleh diubah, KODE JANGAN diganti.

const opsiFungsi = [
  { nilai: 'berfungsi_penuh', label: 'Berfungsi Penuh' },
  { nilai: 'berfungsi_sebagian', label: 'Berfungsi Sebagian' },
  { nilai: 'tidak_berfungsi', label: 'Tidak Berfungsi' },
];

const opsiBahaya = [
  { nilai: 'ya', label: 'Ya, Mengandung Bahaya' },
  { nilai: 'tidak', label: 'Tidak, Aman' },
];

// Opsi eksklusif: kalau dipilih, opsi kondisi fisik lain tidak boleh ikut dipilih
const opsiTidakAdaKerusakan = { nilai: 'tidak_ada', label: 'Tidak Ada Kerusakan' };

// Opsi kondisi fisik & jenis bahaya yang berbeda per kategori
const dataPertanyaan = {
  Elektronik: {
    kondisiFisik: [
      { nilai: 'tergores', label: 'Tergores' },
      { nilai: 'penyok', label: 'Penyok' },
      { nilai: 'retak', label: 'Retak / Layar Pecah' },
      { nilai: 'berkarat', label: 'Berkarat' },
      { nilai: 'kabel_terkelupas', label: 'Kabel Terkelupas' },
      { nilai: 'bagian_hilang', label: 'Ada Bagian yang Hilang' },
    ],
    jenisBahaya: [
      { nilai: 'baterai', label: 'Baterai menggembung, bocor, atau terasa panas' },
      { nilai: 'limbah_elektronik', label: 'Komponen dalam terbuka, gosong, atau ada cairan bocor' },
      { nilai: 'benda_tajam', label: 'Ada kaca atau bagian tajam yang pecah' },
    ],
  },
  Pakaian: {
    kondisiFisik: [
      { nilai: 'sobek', label: 'Sobek / Berlubang' },
      { nilai: 'noda', label: 'Ada Noda' },
      { nilai: 'pudar', label: 'Warna Pudar' },
      { nilai: 'berjamur', label: 'Berjamur' },
      { nilai: 'bagian_hilang', label: 'Kancing / Resleting Hilang atau Rusak' },
    ],
    jenisBahaya: [
      { nilai: 'bahan_kimia', label: 'Terkena cat, oli, atau bahan kimia' },
      { nilai: 'benda_tajam', label: 'Ada peniti, jarum, atau aksesori tajam yang rusak' },
    ],
  },
  Plastik: {
    kondisiFisik: [
      { nilai: 'tergores', label: 'Tergores' },
      { nilai: 'retak', label: 'Retak / Pecah' },
      { nilai: 'berubah_bentuk', label: 'Berubah Bentuk / Melengkung' },
      { nilai: 'noda', label: 'Noda atau Bau yang Sulit Hilang' },
      { nilai: 'berjamur', label: 'Berjamur' },
    ],
    jenisBahaya: [
      { nilai: 'bahan_kimia', label: 'Bekas wadah bahan kimia, pestisida, atau oli' },
      { nilai: 'benda_tajam', label: 'Pecah dengan pinggiran tajam' },
    ],
  },
  Furnitur: {
    kondisiFisik: [
      { nilai: 'tergores', label: 'Tergores' },
      { nilai: 'patah', label: 'Patah / Goyang' },
      { nilai: 'lapuk', label: 'Lapuk / Dimakan Rayap' },
      { nilai: 'berjamur', label: 'Berjamur' },
      { nilai: 'berkarat', label: 'Bagian Logam Berkarat' },
      { nilai: 'bagian_hilang', label: 'Ada Bagian yang Hilang' },
    ],
    jenisBahaya: [
      { nilai: 'benda_tajam', label: 'Paku/sekrup mencuat, kaca pecah, atau serpihan tajam' },
      { nilai: 'bahan_kimia', label: 'Terkena cat, tiner, atau obat anti-rayap' },
    ],
  },
};

// Susun 5 pertanyaan utama + 1 pertanyaan lanjutan untuk satu kategori
function buatPertanyaan(data) {
  return [
    {
      kode: 'fungsi_utama',
      teks: 'Bagaimana fungsi utama barang ini?',
      tipe: 'pilihan_tunggal',
      opsi: opsiFungsi,
      urutan: 1,
    },
    {
      kode: 'kondisi_fisik',
      teks: 'Bagaimana kondisi fisik barang? (boleh pilih lebih dari satu)',
      tipe: 'pilihan_ganda',
      opsi: [...data.kondisiFisik, opsiTidakAdaKerusakan],
      urutan: 2,
    },
    {
      kode: 'usia_tahun',
      teks: 'Berapa perkiraan usia barang?',
      tipe: 'angka',
      opsi: { min: 0, max: 50, satuan: 'tahun' },
      bolehTidakTahu: true,
      urutan: 3,
    },
    {
      kode: 'kelengkapan',
      teks: 'Berapa persen kelengkapan barang (bagian dan aksesorinya)?',
      tipe: 'angka',
      opsi: { min: 0, max: 100, satuan: 'persen' },
      bolehTidakTahu: true,
      urutan: 4,
    },
    {
      kode: 'mengandung_bahaya',
      teks: 'Apakah barang ini mengandung bahaya?',
      tipe: 'ya_tidak',
      opsi: opsiBahaya,
      bolehTidakTahu: true,
      urutan: 5,
      // Pertanyaan lanjutan: hanya tampil kalau dijawab "ya"
      lanjutan: {
        kode: 'jenis_bahaya',
        teks: 'Bahaya apa yang ada pada barang? (boleh pilih lebih dari satu)',
        tipe: 'pilihan_ganda',
        opsi: data.jenisBahaya,
        tampilJika: { jawaban: 'ya' },
        urutan: 1,
      },
    },
  ];
}

// Upsert pakai kombinasi unik kategoriId + kode → aman dijalankan berulang
function upsertPertanyaan(kategoriId, pertanyaan) {
  return prisma.pertanyaan.upsert({
    where: { kategoriId_kode: { kategoriId, kode: pertanyaan.kode } },
    update: {}, // kalau sudah ada, jangan ditimpa (bisa jadi sudah diedit admin)
    create: { ...pertanyaan, kategoriId },
  });
}

async function seedPertanyaan() {
  for (const [namaKategori, data] of Object.entries(dataPertanyaan)) {
    const kategori = await prisma.kategori.findUnique({ where: { nama: namaKategori } });
    if (!kategori) continue; // jaga-jaga kalau kategori belum ada

    let jumlah = 0;
    // "lanjutan" dipisah dulu karena namanya bentrok dengan nama relasi di Prisma
    for (const { lanjutan, ...pertanyaan } of buatPertanyaan(data)) {
      const induk = await upsertPertanyaan(kategori.id, pertanyaan);
      jumlah++;

      if (lanjutan) {
        await upsertPertanyaan(kategori.id, { ...lanjutan, indukId: induk.id });
        jumlah++;
      }
    }
    console.log(`✔ Pertanyaan ${namaKategori}: ${jumlah}`);
  }
}

// ==================== ATURAN (FR-10) ====================
// Isi aturan ada di prisma/dataAturan.js.
// Aturan yang kodenya sudah ada tidak ditimpa (bisa jadi sudah diedit admin).
async function seedAturan(adminId) {
  for (const [namaKategori, data] of Object.entries(dataAturan)) {
    const kategori = await prisma.kategori.findUnique({ where: { nama: namaKategori } });
    if (!kategori) continue;

    let jumlahBaru = 0;
    for (const aturan of data.aturan) {
      for (const baris of keBarisAturan(data.prefix, aturan)) {
        const sudahAda = await prisma.basisPengetahuan.findFirst({ where: { kode: baris.kode } });
        if (sudahAda) continue;

        await prisma.basisPengetahuan.create({
          data: { ...baris, kategoriId: kategori.id, adminId, versi: 1, status: 'aktif' },
        });
        jumlahBaru++;
      }
    }
    console.log(`✔ Aturan ${namaKategori}: ${jumlahBaru} baru`);
  }
}

// ==================== KOMPOSISI BARANG (FR-13) ====================
// Isi komposisi ada di prisma/dataKomposisi.js. Barang yang sudah punya komposisi tidak ditimpa.
async function seedKomposisi() {
  let jumlahBarang = 0;
  for (const [nama, bahan] of Object.entries(dataKomposisi)) {
    const barang = await prisma.barang.findFirst({ where: { nama } });
    if (!barang) continue;
    if ((await prisma.komposisiBarang.count({ where: { barangId: barang.id } })) > 0) continue;

    await prisma.komposisiBarang.createMany({
      data: bahan.map(([material, persen, sumber]) => ({ barangId: barang.id, material, persen, sumber })),
    });
    jumlahBarang++;
  }
  console.log(`✔ Komposisi barang: ${jumlahBarang} barang baru`);
}

// ==================== FAKTOR DAMPAK (FR-13) ====================
// Isi faktor ada di prisma/dataFaktor.js. Kode yang sudah ada tidak ditimpa.
async function seedFaktor(adminId) {
  let jumlahBaru = 0;
  for (const faktor of dataFaktor) {
    const sudahAda = await prisma.faktorDampak.findUnique({ where: { kode: faktor.kode } });
    if (sudahAda) continue;

    await prisma.faktorDampak.create({ data: { ...faktor, adminId, versi: 1, status: 'aktif' } });
    jumlahBaru++;
  }
  console.log(`✔ Faktor dampak: ${jumlahBaru} baru`);
}

async function main() {
  // 1. Akun admin (kredensial dari .env, bukan hardcode)
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi di .env');
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {}, // kalau sudah ada, jangan diubah
    create: {
      nama: 'Admin Be4Throw',
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
    },
  });
  console.log(`✔ Admin: ${ADMIN_EMAIL}`);

  // 2. Kategori + barang contoh
  for (const k of dataKategori) {
    const kategori = await prisma.kategori.upsert({
      where: { nama: k.nama },
      update: {},
      create: { nama: k.nama, deskripsi: k.deskripsi },
    });

    for (const b of k.barang) {
      await prisma.barang.upsert({
        where: { nama_kategoriId: { nama: b.nama, kategoriId: kategori.id } },
        // Hanya material yang disamakan (FR-13); data lain yang mungkin sudah diedit admin tidak ditimpa
        update: { material: k.nama },
        create: { ...b, material: k.nama, kategoriId: kategori.id },
      });
    }
    console.log(`✔ Kategori ${k.nama} + ${k.barang.length} barang`);
  }

  // 3. Pertanyaan per kategori (FR-09)
  await seedPertanyaan();

  // 4. Aturan awal basis pengetahuan (FR-10) — DRAFT, divalidasi Shakira
  await seedAturan(admin.id);

  // 5. Faktor emisi awal (FR-13), supaya emisi langsung bisa dihitung
  await seedFaktor(admin.id);
  await seedKomposisi();
}

main()
  .catch(async (err) => {
    console.error('Seed gagal:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
