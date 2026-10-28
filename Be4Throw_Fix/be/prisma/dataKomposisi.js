// Bahan penyusun tiap barang contoh (FR-13), dalam persen berat; total tiap barang = 100.
// Material harus sama dengan FaktorDampak.material (lihat dataFaktor.js).
// Kolom sumber menjelaskan asal angka. "Estimasi" = perkiraan tim, belum ada acuan terukur.
const ENEA = 'ENEA 2019, pembongkaran 20 ponsel bekas (rata-rata berbobot)';
const ACER =
  'Acer, kisaran bahan PC (titik tengah: plastik 25–50%, baja 20–25%, aluminium 10–15%, tembaga 7–10%); sisanya komponen elektronik';
const PAKAIAN = 'Label produk pakaian (katun/poliester); aksesori logam estimasi tim';
const ESTIMASI = 'Estimasi tim, belum ada acuan terukur';

const dataKomposisi = {
  Smartphone: [
    ['Plastik', 33, ENEA],
    ['Logam', 11, ENEA],
    ['Komponen Elektronik', 23, ENEA],
    ['Baterai', 24, ENEA],
    ['Kaca', 9, ENEA],
  ],
  Laptop: [
    ['Plastik', 37.5, ACER],
    ['Logam', 43.5, ACER],
    ['Komponen Elektronik', 19, ACER],
  ],
  'Kipas Angin': [
    ['Plastik', 60, ESTIMASI],
    ['Logam', 35, ESTIMASI],
    ['Komponen Elektronik', 5, ESTIMASI],
  ],
  Kaos: [['Tekstil', 100, PAKAIAN]],
  'Celana Jeans': [
    ['Tekstil', 97, PAKAIAN],
    ['Logam', 3, PAKAIAN],
  ],
  Jaket: [
    ['Tekstil', 98, PAKAIAN],
    ['Logam', 2, PAKAIAN],
  ],
  'Botol Plastik': [['Plastik', 100, 'Botol minum umumnya PET (satu jenis plastik)']],
  'Wadah Makanan Plastik': [['Plastik', 100, 'Wadah makanan umumnya polipropilena (satu jenis plastik)']],
  'Ember Plastik': [['Plastik', 100, 'Ember umumnya HDPE/PP (satu jenis plastik)']],
  'Kursi Kayu': [
    ['Kayu', 95, ESTIMASI],
    ['Logam', 5, ESTIMASI],
  ],
  'Meja Belajar': [
    ['Kayu', 90, ESTIMASI],
    ['Logam', 10, ESTIMASI],
  ],
  'Lemari Kecil': [
    ['Kayu', 93, ESTIMASI],
    ['Logam', 7, ESTIMASI],
  ],
};

module.exports = { dataKomposisi };
