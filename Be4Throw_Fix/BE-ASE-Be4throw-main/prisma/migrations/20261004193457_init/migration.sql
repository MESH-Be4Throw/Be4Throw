-- CreateEnum
CREATE TYPE "Role" AS ENUM ('pengguna', 'admin');

-- CreateEnum
CREATE TYPE "StatusAkun" AS ENUM ('aktif', 'nonaktif');

-- CreateEnum
CREATE TYPE "StatusKonten" AS ENUM ('draft', 'aktif', 'nonaktif');

-- CreateEnum
CREATE TYPE "Tindakan" AS ENUM ('gunakan_kembali', 'perbaiki', 'jual', 'donasikan', 'daur_ulang');

-- CreateEnum
CREATE TYPE "TipePertanyaan" AS ENUM ('pilihan_tunggal', 'pilihan_ganda', 'angka', 'ya_tidak');

-- CreateEnum
CREATE TYPE "FungsiUtama" AS ENUM ('berfungsi_penuh', 'berfungsi_sebagian', 'tidak_berfungsi');

-- CreateEnum
CREATE TYPE "StatusAnalisis" AS ENUM ('draft', 'selesai', 'gagal');

-- CreateEnum
CREATE TYPE "JenisRekomendasi" AS ENUM ('utama', 'alternatif');

-- CreateEnum
CREATE TYPE "JenisData" AS ENUM ('kategori', 'barang', 'pertanyaan', 'aturan', 'faktor_dampak');

-- CreateEnum
CREATE TYPE "StatusAudit" AS ENUM ('dipublikasikan', 'disimpan', 'draf');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'pengguna',
    "status" "StatusAkun" NOT NULL DEFAULT 'aktif',
    "fotoProfil" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kategori" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "status" "StatusKonten" NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barang" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kategoriId" INTEGER NOT NULL,
    "gambar" TEXT,
    "estimasiBerat" DOUBLE PRECISION,
    "material" TEXT,
    "status" "StatusKonten" NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pertanyaan" (
    "id" SERIAL NOT NULL,
    "kategoriId" INTEGER NOT NULL,
    "kode" TEXT NOT NULL,
    "teks" TEXT NOT NULL,
    "tipe" "TipePertanyaan" NOT NULL,
    "opsi" JSONB,
    "wajib" BOOLEAN NOT NULL DEFAULT true,
    "bolehTidakTahu" BOOLEAN NOT NULL DEFAULT false,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "indukId" INTEGER,
    "tampilJika" JSONB,
    "status" "StatusKonten" NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pertanyaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalisisBarang" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "barangId" INTEGER NOT NULL,
    "status" "StatusAnalisis" NOT NULL DEFAULT 'draft',
    "versiAturan" INTEGER,
    "versiFaktor" INTEGER,
    "pesanKeterbatasan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalisisBarang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KondisiBarang" (
    "id" SERIAL NOT NULL,
    "analisisId" INTEGER NOT NULL,
    "fungsiUtama" "FungsiUtama",
    "kondisiFisik" TEXT[],
    "usiaTahun" DOUBLE PRECISION,
    "kelengkapan" INTEGER,
    "mengandungBahaya" BOOLEAN,
    "jenisBahaya" TEXT[],
    "jawabanLain" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KondisiBarang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PemeriksaanKeselamatan" (
    "id" SERIAL NOT NULL,
    "analisisId" INTEGER NOT NULL,
    "adaBahaya" BOOLEAN NOT NULL,
    "tindakanDieliminasi" "Tindakan"[],
    "peringatan" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PemeriksaanKeselamatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkorSolusi" (
    "id" SERIAL NOT NULL,
    "analisisId" INTEGER NOT NULL,
    "tindakan" "Tindakan" NOT NULL,
    "skor" INTEGER NOT NULL,
    "peringkat" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkorSolusi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rekomendasi" (
    "id" SERIAL NOT NULL,
    "analisisId" INTEGER NOT NULL,
    "tindakan" "Tindakan" NOT NULL,
    "jenis" "JenisRekomendasi" NOT NULL,
    "skor" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "langkahPraktis" TEXT[],
    "peringatan" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rekomendasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DampakLingkungan" (
    "id" SERIAL NOT NULL,
    "rekomendasiId" INTEGER NOT NULL,
    "material" TEXT NOT NULL,
    "limbahDialihkanKg" DOUBLE PRECISION,
    "emisiDihindariKgCO2e" DOUBLE PRECISION,
    "asumsi" TEXT,
    "sumber" TEXT,
    "tahunFaktor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DampakLingkungan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmpanBalik" (
    "id" SERIAL NOT NULL,
    "analisisId" INTEGER NOT NULL,
    "userId" INTEGER,
    "rating" INTEGER NOT NULL,
    "komentar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UmpanBalik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasisPengetahuan" (
    "id" SERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "namaAturan" TEXT NOT NULL,
    "kategoriId" INTEGER,
    "kondisi" JSONB NOT NULL,
    "tindakan" "Tindakan" NOT NULL,
    "bobot" INTEGER NOT NULL DEFAULT 0,
    "eliminasi" BOOLEAN NOT NULL DEFAULT false,
    "alasan" TEXT NOT NULL,
    "versi" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusKonten" NOT NULL DEFAULT 'draft',
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasisPengetahuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaktorDampak" (
    "id" SERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "tindakan" "Tindakan" NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL,
    "satuan" TEXT NOT NULL,
    "sumber" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "versi" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusKonten" NOT NULL DEFAULT 'draft',
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaktorDampak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPerubahan" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "jenisData" "JenisData" NOT NULL,
    "dataId" INTEGER NOT NULL,
    "aturanId" INTEGER,
    "versi" INTEGER,
    "status" "StatusAudit" NOT NULL,
    "ringkasan" TEXT NOT NULL,
    "dataSebelum" JSONB,
    "dataSesudah" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditPerubahan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Kategori_nama_key" ON "Kategori"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Barang_nama_kategoriId_key" ON "Barang"("nama", "kategoriId");

-- CreateIndex
CREATE UNIQUE INDEX "Pertanyaan_kategoriId_kode_key" ON "Pertanyaan"("kategoriId", "kode");

-- CreateIndex
CREATE INDEX "AnalisisBarang_userId_idx" ON "AnalisisBarang"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KondisiBarang_analisisId_key" ON "KondisiBarang"("analisisId");

-- CreateIndex
CREATE UNIQUE INDEX "PemeriksaanKeselamatan_analisisId_key" ON "PemeriksaanKeselamatan"("analisisId");

-- CreateIndex
CREATE UNIQUE INDEX "SkorSolusi_analisisId_tindakan_key" ON "SkorSolusi"("analisisId", "tindakan");

-- CreateIndex
CREATE UNIQUE INDEX "Rekomendasi_analisisId_tindakan_key" ON "Rekomendasi"("analisisId", "tindakan");

-- CreateIndex
CREATE UNIQUE INDEX "DampakLingkungan_rekomendasiId_key" ON "DampakLingkungan"("rekomendasiId");

-- CreateIndex
CREATE UNIQUE INDEX "UmpanBalik_analisisId_key" ON "UmpanBalik"("analisisId");

-- CreateIndex
CREATE INDEX "BasisPengetahuan_kode_idx" ON "BasisPengetahuan"("kode");

-- CreateIndex
CREATE INDEX "BasisPengetahuan_status_idx" ON "BasisPengetahuan"("status");

-- CreateIndex
CREATE INDEX "FaktorDampak_kode_idx" ON "FaktorDampak"("kode");

-- CreateIndex
CREATE INDEX "FaktorDampak_material_tindakan_status_idx" ON "FaktorDampak"("material", "tindakan", "status");

-- CreateIndex
CREATE INDEX "AuditPerubahan_jenisData_versi_idx" ON "AuditPerubahan"("jenisData", "versi");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barang" ADD CONSTRAINT "Barang_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pertanyaan" ADD CONSTRAINT "Pertanyaan_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pertanyaan" ADD CONSTRAINT "Pertanyaan_indukId_fkey" FOREIGN KEY ("indukId") REFERENCES "Pertanyaan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisBarang" ADD CONSTRAINT "AnalisisBarang_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisBarang" ADD CONSTRAINT "AnalisisBarang_barangId_fkey" FOREIGN KEY ("barangId") REFERENCES "Barang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KondisiBarang" ADD CONSTRAINT "KondisiBarang_analisisId_fkey" FOREIGN KEY ("analisisId") REFERENCES "AnalisisBarang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PemeriksaanKeselamatan" ADD CONSTRAINT "PemeriksaanKeselamatan_analisisId_fkey" FOREIGN KEY ("analisisId") REFERENCES "AnalisisBarang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkorSolusi" ADD CONSTRAINT "SkorSolusi_analisisId_fkey" FOREIGN KEY ("analisisId") REFERENCES "AnalisisBarang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rekomendasi" ADD CONSTRAINT "Rekomendasi_analisisId_fkey" FOREIGN KEY ("analisisId") REFERENCES "AnalisisBarang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DampakLingkungan" ADD CONSTRAINT "DampakLingkungan_rekomendasiId_fkey" FOREIGN KEY ("rekomendasiId") REFERENCES "Rekomendasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmpanBalik" ADD CONSTRAINT "UmpanBalik_analisisId_fkey" FOREIGN KEY ("analisisId") REFERENCES "AnalisisBarang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmpanBalik" ADD CONSTRAINT "UmpanBalik_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasisPengetahuan" ADD CONSTRAINT "BasisPengetahuan_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasisPengetahuan" ADD CONSTRAINT "BasisPengetahuan_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaktorDampak" ADD CONSTRAINT "FaktorDampak_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPerubahan" ADD CONSTRAINT "AuditPerubahan_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPerubahan" ADD CONSTRAINT "AuditPerubahan_aturanId_fkey" FOREIGN KEY ("aturanId") REFERENCES "BasisPengetahuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
