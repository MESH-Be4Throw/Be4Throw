require('dotenv').config(); // load .env dulu, sebelum ada yang baca process.env

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

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware global: WAJIB sebelum semua route
app.use(helmet()); // header keamanan HTTP
app.use(cors({ origin: process.env.FRONTEND_URL })); // hanya izinkan front-end kita
app.use(express.json({ limit: '1mb' })); // baca body JSON, maks 1mb

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

// 4. Harus paling akhir: 404 lalu error handler
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});