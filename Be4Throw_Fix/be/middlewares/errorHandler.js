const { fail } = require('../utils/response');

// Runs when no route matches the request
function notFound(req, res) {
  return fail(res, 404, 'Endpoint tidak ditemukan');
}

// Catches every error thrown/passed via next(err) in the app
function errorHandler(err, req, res, next) {
  // Invalid JSON body
  if (err.type === 'entity.parse.failed') {
    return fail(res, 400, 'Format JSON tidak valid');
  }
  // Body larger than the limit (1mb)
  if (err.type === 'entity.too.large') {
    return fail(res, 413, 'Ukuran data terlalu besar');
  }

  // Error Prisma yang sudah dikenal (kode P20xx)
  // P2002: nilai unik sudah dipakai, mis. nama kategori atau kode aturan dobel
  if (err.code === 'P2002') {
    const target = err.meta?.target;
    const fields = Array.isArray(target) ? target : [target ?? 'data'];
    return fail(
      res,
      409,
      'Data dengan nilai yang sama sudah ada',
      fields.map((field) => ({ field, message: 'Nilai ini sudah dipakai data lain' }))
    );
  }
  // P2003: masih dipakai data lain (foreign key)
  if (err.code === 'P2003') {
    return fail(res, 409, 'Data masih dipakai data lain sehingga tidak bisa diubah atau dihapus');
  }
  // P2025: data yang mau diubah/dihapus sudah tidak ada
  if (err.code === 'P2025') {
    return fail(res, 404, 'Data tidak ditemukan');
  }

  // Log full details on the server only, never send them to the client
  console.error(err);
  return fail(res, 500, 'Terjadi kesalahan pada server');
}

module.exports = { notFound, errorHandler };