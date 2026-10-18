const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');
const { createToken, generateResetToken, hashToken } = require('../utils/token');
const { sendResetPasswordEmail } = require('../utils/email');
const { success, fail } = require('../utils/response');

const SALT_ROUNDS = 10;
const RESET_TOKEN_MINUTES = 30;

// Remove passwordHash before sending user data to the client
function toPublicUser(user) {
  const { passwordHash, ...publicData } = user;
  return publicData;
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { nama, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return fail(res, 409, 'Email sudah terdaftar. Gunakan email lain atau masuk dengan akun tersebut.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // role is NOT taken from req.body, so nobody can register as admin
    const user = await prisma.user.create({
      data: { nama, email, passwordHash },
    });

    return success(res, 201, 'Pendaftaran berhasil. Silakan masuk.', toPublicUser(user));
  } catch (err) {
    // P2002 = unique constraint failed (two people registering the same email at the same time)
    if (err.code === 'P2002') {
      return fail(res, 409, 'Email sudah terdaftar. Gunakan email lain atau masuk dengan akun tersebut.');
    }
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password, ingatSaya } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // Same message for "email not found" and "wrong password"
    if (!passwordOk) {
      return fail(res, 401, 'Email atau password salah');
    }

    if (user.status !== 'aktif') {
      return fail(res, 403, 'Akun sedang nonaktif. Hubungi admin.');
    }

    const { token, expiresIn } = createToken(user, ingatSaya);

    return success(res, 200, 'Berhasil masuk', {
      token,
      expiresIn,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return fail(res, 404, 'Akun tidak ditemukan');
    }
    return success(res, 200, 'Data akun berhasil diambil', toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res, next) {
  // Pesan selalu sama supaya orang tidak bisa mengecek email mana yang terdaftar
  const message = 'Jika email terdaftar, tautan untuk reset password sudah dikirim. Cek inbox atau folder spam.';

  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.status === 'aktif') {
      const { token, tokenHash } = generateResetToken();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

      await prisma.$transaction([
        // Hapus token lama yang belum dipakai, jadi cuma link terbaru yang berlaku
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
      ]);

      const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      //Khusus development: tampilkan link di terminal supaya bisa dites tanpa email
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV] Link reset password:', link);
      }

      // Sengaja tidak pakai await: respons tidak menunggu email terkirim,
      // jadi waktu respons email terdaftar dan tidak terdaftar sama cepatnya
      sendResetPasswordEmail(user.email, link).catch((err) => {
        console.error('Gagal mengirim email reset password:', err);
      });
    }

    return success(res, 200, message);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    const invalid =
      !resetToken ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt < new Date() ||
      resetToken.user.status !== 'aktif';

    if (invalid) {
      return fail(res, 400, 'Tautan reset password tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Ganti password dan tandai token terpakai sekaligus: berhasil semua atau gagal semua
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);

    return success(res, 200, 'Password berhasil diubah. Silakan masuk dengan password baru.');
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword, toPublicUser };
