/*
  Warnings:

  - You are about to drop the column `aturanId` on the `AuditPerubahan` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `AuditPerubahan` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[kode]` on the table `BasisPengetahuan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[kode]` on the table `FaktorDampak` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jenisPerubahan` to the `AuditPerubahan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JenisPerubahan" AS ENUM ('tambah', 'ubah', 'hapus');

-- DropForeignKey
ALTER TABLE "AuditPerubahan" DROP CONSTRAINT "AuditPerubahan_aturanId_fkey";

-- DropIndex
DROP INDEX "AuditPerubahan_jenisData_versi_idx";

-- DropIndex
DROP INDEX "BasisPengetahuan_kode_idx";

-- DropIndex
DROP INDEX "FaktorDampak_kode_idx";

-- AlterTable
ALTER TABLE "AuditPerubahan" DROP COLUMN "aturanId",
DROP COLUMN "status",
ADD COLUMN     "jenisPerubahan" "JenisPerubahan" NOT NULL;

-- DropEnum
DROP TYPE "StatusAudit";

-- CreateIndex
CREATE INDEX "AuditPerubahan_jenisData_dataId_idx" ON "AuditPerubahan"("jenisData", "dataId");

-- CreateIndex
CREATE INDEX "AuditPerubahan_createdAt_idx" ON "AuditPerubahan"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BasisPengetahuan_kode_key" ON "BasisPengetahuan"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "FaktorDampak_kode_key" ON "FaktorDampak"("kode");
