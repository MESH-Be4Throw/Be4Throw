const nodemailer = require('nodemailer');

// Koneksi ke server email Gmail, pakai App Password (bukan password Gmail biasa)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Kirim email berisi link reset password
async function sendResetPasswordEmail(to, link) {
  return transporter.sendMail({
    from: `"Be4Throw" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset Password Akun Be4Throw',
    text: `Kami menerima permintaan reset password untuk akun Be4Throw kamu.\n\nBuka tautan berikut untuk membuat password baru (berlaku 30 menit):\n${link}\n\nJika kamu tidak meminta reset password, abaikan email ini.`,
    html: `
      <p>Kami menerima permintaan reset password untuk akun Be4Throw kamu.</p>
      <p><a href="${link}">Klik di sini untuk membuat password baru</a> (berlaku 30 menit).</p>
      <p>Jika kamu tidak meminta reset password, abaikan email ini.</p>
    `,
  });
}

module.exports = { sendResetPasswordEmail };