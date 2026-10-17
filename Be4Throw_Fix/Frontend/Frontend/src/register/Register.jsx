
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../services/authService";
import "./style.css";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nama: "",
    email: "",
    password: "",
    konfirmasiPassword: "",
  });

  const [setuju, setSetuju] = useState(false);
  const [lihatPassword, setLihatPassword] = useState(false);
  const [lihatKonfirmasi, setLihatKonfirmasi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password) ||
        form.password.length < 8) {
      setFieldErrors({
        password: "Password minimal 8 karakter dan harus mengandung huruf serta angka.",
      });
      return;
    }

    if (form.password !== form.konfirmasiPassword) {
      setFieldErrors({
        konfirmasiPassword: "Konfirmasi kata sandi tidak cocok.",
      });
      return;
    }

    if (!setuju) {
      setError("Centang persetujuan Syarat & Ketentuan dan Kebijakan Privasi.");
      return;
    }

    try {
      setLoading(true);

      const result = await registerRequest({
        nama: form.nama.trim(),
        email: form.email.trim(),
        password: form.password,
        konfirmasiPassword: form.konfirmasiPassword,
      });

      navigate("/login", {
        replace: true,
        state: {
          message:
            result.message ||
            "Registrasi berhasil. Silakan masuk dengan akun baru Anda.",
        },
      });
    } catch (err) {
      if (Array.isArray(err.errors)) {
        const mapped = {};

        err.errors.forEach((item) => {
          if (item.field) mapped[item.field] = item.message;
        });

        setFieldErrors(mapped);
      }

      setError(err.message || "Registrasi gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-layout">
        <header className="register-header">
          <img
            className="register-logo"
            src="/be4throw-logo.jpeg"
            alt="Logo Be4Throw"
          />

          <h1>Be4Throw</h1>
          <p>Think Before You Throw</p>
        </header>

        <section className="register-card">
          <h2>Daftar Akun Baru</h2>

          <p className="register-description">
            Bergabung bersama gerakan sirkular dan kelola barangmu secara bijak.
          </p>

          {error && (
            <div className="register-alert" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="register-field">
              <label htmlFor="nama">Nama Lengkap</label>
              <div className="register-input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  id="nama"
                  name="nama"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={form.nama}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>
              {fieldErrors.nama && (
                <small className="register-field-error">{fieldErrors.nama}</small>
              )}
            </div>

            <div className="register-field">
              <label htmlFor="email">Email</label>
              <div className="register-input-wrap">
                <span aria-hidden="true">@</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Masukkan Email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
              {fieldErrors.email && (
                <small className="register-field-error">{fieldErrors.email}</small>
              )}
            </div>

            <div className="register-field">
              <label htmlFor="password">Kata Sandi</label>
              <div className="register-input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  id="password"
                  name="password"
                  type={lihatPassword ? "text" : "password"}
                  placeholder="Minimal 8 karakter"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button
                  className="register-eye"
                  type="button"
                  onClick={() => setLihatPassword((prev) => !prev)}
                  aria-label={lihatPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {lihatPassword ? "◉" : "◎"}
                </button>
              </div>
              {fieldErrors.password && (
                <small className="register-field-error">
                  {fieldErrors.password}
                </small>
              )}
            </div>

            <div className="register-field">
              <label htmlFor="konfirmasiPassword">Konfirmasi Kata Sandi</label>
              <div className="register-input-wrap">
                <span aria-hidden="true">♙</span>
                <input
                  id="konfirmasiPassword"
                  name="konfirmasiPassword"
                  type={lihatKonfirmasi ? "text" : "password"}
                  placeholder="Masukkan ulang kata sandi"
                  value={form.konfirmasiPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button
                  className="register-eye"
                  type="button"
                  onClick={() => setLihatKonfirmasi((prev) => !prev)}
                  aria-label={lihatKonfirmasi ? "Sembunyikan password" : "Lihat password"}
                >
                  {lihatKonfirmasi ? "◉" : "◎"}
                </button>
              </div>
              {fieldErrors.konfirmasiPassword && (
                <small className="register-field-error">
                  {fieldErrors.konfirmasiPassword}
                </small>
              )}
            </div>

            <label className="register-terms">
              <input
                type="checkbox"
                checked={setuju}
                onChange={(event) => setSetuju(event.target.checked)}
              />
              <span>
                Saya menyetujui <a href="#" onClick={(e) => e.preventDefault()}>Syarat &amp; Ketentuan</a>{" "}
                serta <a href="#" onClick={(e) => e.preventDefault()}>Kebijakan Privasi</a> Be4Throw.
              </span>
            </label>

            <button
              className="register-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Daftar Sekarang"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="register-divider" />

          <p className="register-login">
            Sudah punya akun? <Link to="/login">Masuk</Link>
          </p>
        </section>

        <footer className="register-footer">
          <p>© 2026 Be4Throw Indonesia. Blueprint System.</p>
          <nav aria-label="Tautan informasi">
            <a href="#" onClick={(e) => e.preventDefault()}>Kebijakan Privasi</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Syarat &amp; Ketentuan</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Bantuan</a>
          </nav>
          <div className="register-home-indicator" />
        </footer>
      </div>
    </main>
  );
}