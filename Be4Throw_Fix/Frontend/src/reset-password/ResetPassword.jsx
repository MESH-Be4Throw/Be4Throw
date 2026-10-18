import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordRequest } from "../services/authService";
import "../forgot-password/style.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Token reset tidak ditemukan. Silakan minta tautan pemulihan baru.");
      return;
    }
    if (password !== konfirmasiPassword) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPasswordRequest({ token, password, konfirmasiPassword });
      setMessage(result.message || "Kata sandi berhasil diubah.");
      setPassword("");
      setKonfirmasiPassword("");
      window.setTimeout(() => navigate("/login", {
        replace: true,
        state: { message: "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru." }
      }), 1200);
    } catch (err) {
      setError(err.errors?.map((item) => item.message).join(" ") || err.message || "Reset kata sandi gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="forgot-page">
      <div className="forgot-layout">
        <header className="forgot-brand">
          <div className="forgot-logo">
            <img src="/be4throw-logo.jpeg" alt="Logo Be4Throw"
              onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span className="forgot-logo-fallback">♻</span>
          </div>
          <h1>Be4Throw</h1>
          <p>Think Before You Throw</p>
        </header>

        <section className="forgot-card">
          <h2>Atur Ulang Kata Sandi</h2>
          <p className="forgot-description">
            Buat kata sandi baru untuk akun Be4Throw Anda. Kata sandi harus terdiri dari minimal 8 karakter, mengandung huruf dan angka.
          </p>

          {message && <div className="forgot-message" role="status">{message}</div>}
          {error && <div className="forgot-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="forgot-field">
              <label htmlFor="reset-password">Kata sandi baru</label>
              <div className="forgot-input-wrap">
                <span aria-hidden="true">●</span>
                <input id="reset-password" type="password" value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password" minLength={8} required />
              </div>
            </div>
            <div className="forgot-field">
              <label htmlFor="reset-confirm-password">Konfirmasi kata sandi</label>
              <div className="forgot-input-wrap">
                <span aria-hidden="true">●</span>
                <input id="reset-confirm-password" type="password" value={konfirmasiPassword}
                  onChange={(event) => setKonfirmasiPassword(event.target.value)}
                  autoComplete="new-password" minLength={8} required />
              </div>
            </div>
            <button type="submit" className="forgot-submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Ubah Kata Sandi"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="forgot-divider" />
          <p className="forgot-login">Ingat kata sandi? <Link to="/login">Masuk</Link></p>
        </section>

        <footer className="forgot-footer">
          <p>© 2026 Be4Throw Indonesia. Blueprint System.</p>
          <div className="forgot-home-indicator" />
        </footer>
      </div>
    </main>
  );
}
