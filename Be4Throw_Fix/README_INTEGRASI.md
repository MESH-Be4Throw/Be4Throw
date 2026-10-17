# Be4Throw — Frontend + Backend Integration

Frontend React/Vite dan backend Express/Prisma disiapkan untuk berjalan sebagai satu aplikasi. Semua request API dari frontend melewati `src/services/api.js`; token login dikirim sebagai Bearer token, dan respons error ditampilkan ke UI.

## Integrasi yang tersedia

- **Autentikasi:** login, registrasi, lupa password, reset password, token, profil akun (`/api/auth`). Backend tidak menerima pembuatan akun admin melalui registrasi biasa.
- **Katalog user:** mengambil barang aktif dari database (`GET /api/barang`); barang yang diubah admin akan tampil setelah katalog dimuat ulang.
- **Identifikasi dan analisis:** mengirim barang/kondisi ke `/api/analisis`, memproses analisis, lalu menampilkan rekomendasi dan dampak yang dikembalikan backend.
- **Umpan balik dan riwayat:** umpan balik disimpan melalui endpoint analisis; riwayat dibaca dari `/api/riwayat`.
- **Pengaturan profil:** baca dan simpan nama, username, domisili, dan nomor telepon lewat `/api/auth/me`. Foto profil saat ini hanya preview lokal di halaman, belum disimpan ke server karena backend belum menyediakan endpoint unggah foto.
- **Dashboard admin:** total barang, kategori, dan jumlah catatan audit diambil dari API, bukan angka demo. Log terbaru diambil dari audit database.
- **Kelola kategori/barang:** daftar, tambah, edit, dan hapus menggunakan endpoint admin dan database. Barang mendukung URL gambar serta estimasi berat.
- **Kelola pertanyaan:** daftar dan CRUD menggunakan `/api/admin/pertanyaan`; form menyediakan tipe, opsi JSON, urutan, status, wajib, dan boleh-tidak-tahu. Backend tetap memvalidasi pertanyaan inti dan opsi.
- **Aturan analisis dan faktor dampak:** tersedia layar CRUD berbasis JSON untuk mengirim payload langsung ke endpoint backend `/api/admin/aturan` dan `/api/admin/faktor-dampak`. Format payload dan enum tetap divalidasi backend.
- **Audit sistem:** mengambil log perubahan dari `/api/admin/audit`; ekspor CSV memakai data hasil API.

## Persyaratan

- Node.js 20+ disarankan.
- PostgreSQL yang bisa diakses dari backend.
- Database harus punya skema migrasi dan data referensi awal agar analisis bekerja.

## 1. Konfigurasi dan jalankan backend

1. Buka terminal pada `BE-ASE-Be4throw-main`.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`.
4. Isi setidaknya:
   - `DATABASE_URL`: connection string PostgreSQL yang valid.
   - `JWT_SECRET`: string acak panjang dan rahasia.
   - `FRONTEND_URL=http://localhost:5173`.
   - `ADMIN_EMAIL` dan `ADMIN_PASSWORD` untuk akun admin seed.
   - `SMTP_USER` dan `SMTP_PASS` hanya jika ingin mengirim email reset password.
5. Terapkan migrasi dan generate Prisma Client:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
6. Jika database baru dan belum memiliki data referensi, tinjau seed, lalu jalankan:
   ```bash
   npx prisma db seed
   ```
7. Jalankan server:
   ```bash
   npm run dev
   ```
   Health check: `http://localhost:3000/`.

## 2. Konfigurasi dan jalankan frontend

1. Buka terminal kedua pada `Frontend/Frontend`.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env` jika perlu; nilai default API adalah `http://localhost:3000`.
4. Jalankan:
   ```bash
   npm run dev
   ```
5. Buka alamat Vite yang tercetak di terminal (umumnya `http://localhost:5173`).

## 3. Alur verifikasi manual

1. Pastikan backend hidup dan `GET http://localhost:3000/` merespons sukses.
2. Login sebagai admin yang dibuat melalui seed.
3. Tambah barang dari halaman admin, lalu refresh halaman dan pastikan barang tetap ada.
4. Keluar, login sebagai pengguna, lalu buka katalog dan pastikan barang aktif tadi muncul.
5. Coba edit/nonaktifkan barang dan cek katalog lagi.
6. Buat analisis, periksa rekomendasi, kirim umpan balik, lalu cek riwayat jika analisis dibuat saat login.
7. Periksa log audit setelah perubahan data admin.

## Catatan verifikasi

- Pemeriksaan sintaks JS/JSX berhasil untuk seluruh berkas frontend dan pemeriksaan sintaks Node berhasil untuk berkas backend.
- Build Vite dan suite Jest belum bisa dijalankan pada lingkungan penyusunan ini karena folder `node_modules` asal tidak cocok/tidak lengkap untuk Linux. Jalankan `npm install` di komputer lu, lalu `npm run build` dan `npm test` untuk verifikasi di lingkungan lokal.
- Endpoint admin memerlukan token dan role admin. Jika mendapat 401/403, cek akun yang sedang login dan `JWT_SECRET`.
- Jangan masukkan `.env` asli atau kredensial database ke ZIP atau repositori publik.
