const crypto = require('crypto');
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET belum diset di .env');
}

// Create a JWT. 30 days if "ingat saya" is checked, otherwise 1 day.
function createToken(user, rememberMe = false) {
  const expiresIn = rememberMe ? '30d' : '1d';
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
  return { token, expiresIn };
}

// Throws an error if the token is fake or expired
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
// Ubah token jadi hash SHA-256 (yang disimpan di DB cuma hash-nya)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Bikin token reset password acak (64 karakter) beserta hash-nya
function generateResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

module.exports = { createToken, verifyToken, generateResetToken, hashToken };