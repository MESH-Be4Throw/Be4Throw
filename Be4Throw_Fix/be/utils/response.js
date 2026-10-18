// Helper so every endpoint returns the same JSON shape

function success(res, status, message, data = null) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, status, message, errors = null) {
  return res.status(status).json({ success: false, message, errors });
}

module.exports = { success, fail };