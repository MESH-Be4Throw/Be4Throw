const prisma = require('../utils/prisma');
const { verifyToken } = require('../utils/token');
const { fail } = require('../utils/response');

// Checks the "Authorization: Bearer <token>" header
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return fail(res, 401, 'Silakan masuk terlebih dahulu');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return fail(res, 401, 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.');
  }

  try {
    // Re-check the DB so deactivated accounts are rejected even with a valid token
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      return fail(res, 401, 'Akun tidak ditemukan. Silakan masuk kembali.');
    }
    if (user.status !== 'aktif') {
      return fail(res, 403, 'Akun sedang nonaktif. Hubungi admin.');
    }

    req.user = { id: user.id, role: user.role }; // available in the next handlers
    next();
  } catch (err) {
    next(err);
  }
}

// Must be placed AFTER requireAuth
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return fail(res, 403, 'Kamu tidak punya akses ke halaman ini');
  }
  next();
}

// Untuk endpoint yang boleh diakses tamu.
// Tanpa header Authorization → lanjut sebagai tamu (req.user kosong).
// Ada header → wajib valid, biar token kedaluwarsa tidak diam-diam jadi tamu.
function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return requireAuth(req, res, next);
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
