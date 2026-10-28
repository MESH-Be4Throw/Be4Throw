-- AlterTable
ALTER TABLE "DampakLingkungan" ADD COLUMN "bahan" JSONB;

-- CreateTable
CREATE TABLE "KomposisiBarang" (
    "id" SERIAL NOT NULL,
    "barangId" INTEGER NOT NULL,
    "material" TEXT NOT NULL,
    "persen" DOUBLE PRECISION NOT NULL,
    "sumber" TEXT,

    CONSTRAINT "KomposisiBarang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KomposisiBarang_barangId_material_key" ON "KomposisiBarang"("barangId", "material");

-- AddForeignKey
ALTER TABLE "KomposisiBarang" ADD CONSTRAINT "KomposisiBarang_barangId_fkey" FOREIGN KEY ("barangId") REFERENCES "Barang"("id") ON DELETE CASCADE ON UPDATE CASCADE;
