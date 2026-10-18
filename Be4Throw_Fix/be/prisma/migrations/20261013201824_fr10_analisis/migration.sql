/*
  Warnings:

  - The `versiAturan` column on the `AnalisisBarang` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `versiFaktor` column on the `AnalisisBarang` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `jawabanLain` on the `KondisiBarang` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AnalisisBarang" DROP COLUMN "versiAturan",
ADD COLUMN     "versiAturan" JSONB,
DROP COLUMN "versiFaktor",
ADD COLUMN     "versiFaktor" JSONB;

-- AlterTable
ALTER TABLE "BasisPengetahuan" ALTER COLUMN "versi" SET DEFAULT 1,
ALTER COLUMN "status" SET DEFAULT 'aktif';

-- AlterTable
ALTER TABLE "FaktorDampak" ALTER COLUMN "versi" SET DEFAULT 1,
ALTER COLUMN "status" SET DEFAULT 'aktif';

-- AlterTable
ALTER TABLE "KondisiBarang" DROP COLUMN "jawabanLain";
