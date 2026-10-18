const path = require('path');
const fs = require('fs/promises');
const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');
const { success, fail } = require('../utils/response');
const { toPublicUser } = require('./authController');
const { deteksiTipeGambar, URL_FOTO } = require('../utils/fotoProfil');

// Pengaturan akun (FR-06). Semua endpoint wajib login; data profil diambil lewat GET /api/auth/me.

const SALT_ROUNDS = 10;
const FIELD_PROFIL = ['nama', 'username', 'noTelepon', 'domisili'];
const BOLEH_KOSONG = ['username', 'noTelepon', 'domisili']; // "" / null → disimpan null
const DIR_FOTO = path.join(__dirname, '..', 'uploads', 'profil');

const ditolak = (res, errors) => fail(res, 422, 'Data yang dikirim tidak valid', errors);

// Hapus file foto lama. Gagal hapus (mis. file sudah tidak ada) tidak perlu menggagalkan request.
async function hapusFileFoto(fotoProfil) {
  if (!fotoProfil || !fotoProfil.startsWith(URL_FOTO)) return;
  try {
    await fs.unlink(path.join(DIR_FOTO, path.basename(fotoProfil)));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Gagal menghapus foto lama:', err.message);
  }
}

// PUT /api/akun/profil — body boleh sebagian: { nama, username, noTelepon, domisili }
async function ubahProfil(req, res, next) {
  try {
    const data = {};
    for (const field of FIELD_PROFIL) {
      if (req.body[field] === undefined) continue;
      data[field] = BOLEH_KOSONG.includes(field) ? req.body[field] || null : req.body[field];
    }

    if (Object.keys(data).length === 0) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      return success(res, 200, 'Tidak ada perubahan', toPublicUser(user));
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    return success(res, 200, 'Profil berhasil diperbarui', toPublicUser(user));
  } catch (err) {
    // P2002 = username sudah dipakai akun lain (username unik)
    if (err.code === 'P2002') {
      return fail(res, 409, 'Username sudah dipakai', [{ field: 'username', message: 'Username sudah dipakai akun lain' }]);
    }
    next(err);
  }
}

// PUT /api/akun/password — body { passwordLama, passwordBaru, konfirmasiPassword }
async function ubahPassword(req, res, next) {
  try {
    const { passwordLama, passwordBaru } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!(await bcrypt.compare(passwordLama, user.passwordHash))) {
      return ditolak(res, [{ field: 'passwordLama', message: 'Password lama salah' }]);
    }
    if (passwordLama === passwordBaru) {
      return ditolak(res, [{ field: 'passwordBaru', message: 'Password baru harus berbeda dari password lama' }]);
    }

    const passwordHash = await bcrypt.hash(passwordBaru, SALT_ROUNDS);

    // Ganti password + matikan link reset password yang belum dipakai
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    ]);

    return success(res, 200, 'Password berhasil diubah');
  } catch (err) {
    next(err);
  }
}

// PUT /api/akun/foto — multipart/form-data, field "foto" (JPG/PNG/WebP, maks 2 MB)
async function unggahFoto(req, res, next) {
  try {
    if (!req.file) return ditolak(res, [{ field: 'foto', message: 'Foto wajib dipilih' }]);

    const ext = deteksiTipeGambar(req.file.buffer);
    if (!ext) return ditolak(res, [{ field: 'foto', message: 'Format foto harus JPG, PNG, atau WebP' }]);

    // Nama file dibuat server (bukan dari nama file pengirim), jadi aman dari path aneh
    const namaFile = `${req.user.id}-${Date.now()}.${ext}`;
    await fs.mkdir(DIR_FOTO, { recursive: true });
    await fs.writeFile(path.join(DIR_FOTO, namaFile), req.file.buffer);

    const lama = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fotoProfil: true } });
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { fotoProfil: URL_FOTO + namaFile },
    });
    await hapusFileFoto(lama?.fotoProfil);

    return success(res, 200, 'Foto profil berhasil diperbarui', toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/akun/foto
async function hapusFoto(req, res, next) {
  try {
    const lama = await prisma.user.findUnique({ where: { id: req.user.id }, select: { fotoProfil: true } });
    if (!lama?.fotoProfil) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      return success(res, 200, 'Belum ada foto profil', toPublicUser(user));
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data: { fotoProfil: null } });
    await hapusFileFoto(lama.fotoProfil);

    return success(res, 200, 'Foto profil berhasil dihapus', toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

module.exports = { ubahProfil, ubahPassword, unggahFoto, hapusFoto };
