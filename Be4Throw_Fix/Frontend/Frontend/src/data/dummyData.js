export const dummyAccounts = [
  {
    id: 1,
    name: "Pengguna Demo",
    email: "user@be4throw.org",
    password: "user123",
    role: "user",
  },
  {
    id: 2,
    name: "Admin Demo",
    email: "admin@be4throw.org",
    password: "admin123",
    role: "admin",
  },
];

export const dummyStats = {
  totalBarang: 128,
  barangDidaurUlang: 86,
  totalPengguna: 42,
};

export const dummyCategories = [
  {
    id: 1,
    code: "KAT-01",
    name: "Organik",
    description: "Sampah sisa makanan dan bahan alami.",
    status: "Aktif",
  },
  {
    id: 2,
    code: "KAT-02",
    name: "Anorganik",
    description: "Sampah plastik, kaca, dan logam.",
    status: "Aktif",
  },
  {
    id: 3,
    code: "KAT-03",
    name: "B3 (Bahan Berbahaya)",
    description: "Limbah yang memerlukan penanganan khusus.",
    status: "Nonaktif",
  },
  {
    id: 4,
    code: "KAT-04",
    name: "Kertas",
    description: "Kertas, kardus, dan produk turunannya.",
    status: "Aktif",
  },
];

export const dummyItems = [
  {
    id: 1,
    name: "Sisa makanan",
    category: "Organik",
    status: "Aktif",
  },
  {
    id: 2,
    name: "Botol plastik",
    category: "Anorganik",
    status: "Aktif",
  },
  {
    id: 3,
    name: "Baterai bekas",
    category: "B3 (Bahan Berbahaya)",
    status: "Aktif",
  },
  {
    id: 4,
    name: "Kardus",
    category: "Kertas",
    status: "Aktif",
  },
];
