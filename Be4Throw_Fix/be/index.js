require('dotenv').config(); // load .env dulu, sebelum ada yang baca process.env

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { success } = require('./utils/response');

const authRoutes = require('./routes/authRoutes');
const kategoriRoutes = require('./routes/kategoriRoutes');
const barangRoutes = require('./routes/barangRoutes');
const analisisRoutes = require('./routes/analisisRoutes');
const riwayatRoutes = require('./routes/riwayatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const akunRoutes = require('./routes/akunRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware global: WAJIB sebelum semua route
app.use(helmet()); // header keamanan HTTP
app.use(cors({ origin: process.env.FRONTEND_URL })); // hanya izinkan front-end kita
app.use(express.json({ limit: '1mb' })); // baca body JSON, maks 1mb

// File foto profil (FR-06), mis. GET /uploads/profil/7-1729150000000.jpg
// Header CORP perlu supaya <img> dari FE (port 5173) boleh memuat foto dari BE (port 3000)
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

// 2. Health check
app.get('/', (req, res) => {
  return success(res, 200, 'Server Be4Throw berjalan');
});

// 3. Routes
app.use('/api/auth', authRoutes);
app.use('/api/kategori', kategoriRoutes);
app.use('/api/barang', barangRoutes);
app.use('/api/analisis', analisisRoutes);
app.use('/api/riwayat', riwayatRoutes); // FR-05
app.use('/api/admin', adminRoutes); // FR-14, FR-15 (wajib login admin)
app.use('/api/akun', akunRoutes); // FR-06 (wajib login)

// 4. Harus paling akhir: 404 lalu error handler
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
