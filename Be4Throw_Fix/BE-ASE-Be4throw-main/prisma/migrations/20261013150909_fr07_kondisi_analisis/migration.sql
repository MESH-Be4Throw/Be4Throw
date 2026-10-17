/*
  Warnings:

  - A unique constraint covering the columns `[kodeAksesHash]` on the table `AnalisisBarang` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AnalisisBarang" ADD COLUMN     "beratKg" DOUBLE PRECISION,
ADD COLUMN     "kodeAksesHash" TEXT;

-- AlterTable
ALTER TABLE "KondisiBarang" ADD COLUMN     "jawaban" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "AnalisisBarang_kodeAksesHash_key" ON "AnalisisBarang"("kodeAksesHash");
