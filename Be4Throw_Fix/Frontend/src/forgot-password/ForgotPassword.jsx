
import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordRequest } from "../services/authService";
import "./style.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await forgotPasswordRequest(email.trim());

      setMessage(
        result.message ||
          "Jika email terdaftar, tautan pemulihan akan dikirim ke email tersebut."
      );
    } catch (err) {
      setError(
        err.message || "Permintaan belum berhasil. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="forgot-page">
      <div className="forgot-layout">
        <header className="forgot-brand">
          <div className="forgot-logo">
            <img
              src="/be4throw-logo.jpeg"
              alt="Logo Be4Throw"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="forgot-logo-fallback">♻</span>
          </div>

          <h1>Be4Throw</h1>
          <p>Think Before You Throw</p>
        </header>

        <section className="forgot-card">
          <h2>Lupa Kata Sandi</h2>

          <p className="forgot-description">
            Masukkan email akun Be4Throw Anda untuk menerima tautan pemulihan
            kata sandi.
          </p>

          {message && (
            <div className="forgot-message" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="forgot-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="forgot-field">
              <label htmlFor="forgot-email">Email</label>

              <div className="forgot-input-wrap">
                <span aria-hidden="true">@</span>
                <input
                  id="forgot-email"
                  type="email"
                  name="email"
                  placeholder="Masukkan email terdaftar..."
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="forgot-submit"
              disabled={loading}
            >
              {loading ? "Mengirim..." : "Kirim Tautan Pemulihan"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="forgot-divider" />

          <p className="forgot-login">
            Sudah ingat kata sandi? <Link to="/login">Masuk</Link>
          </p>
        </section>

        <footer className="forgot-footer">
          <p>© 2026 Be4Throw Indonesia.</p>

          <nav aria-label="Tautan informasi">
            <a href="#" onClick={(event) => event.preventDefault()}>
              Kebijakan Privasi
            </a>
            <span>•</span>
            <a href="#" onClick={(event) => event.preventDefault()}>
              Syarat &amp; Ketentuan
            </a>
            <span>•</span>
            <a href="#" onClick={(event) => event.preventDefault()}>
              Bantuan
            </a>
          </nav>

          <div className="forgot-home-indicator" />
        </footer>
      </div>
    </main>
  );
}
