
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginRequest } from "../services/authService";
import "./style.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginRequest({
        email: email.trim(),
        password,
        ingatSaya: remember,
      });

      const { token, user } = result.data || {};

      if (!token || !user) {
        throw new Error("Respons login dari server tidak lengkap.");
      }

      localStorage.removeItem("be4throw_token");
      sessionStorage.removeItem("be4throw_token");
      localStorage.removeItem("be4throw_user");
      sessionStorage.removeItem("be4throw_user");

      const storage = remember ? localStorage : sessionStorage;

      storage.setItem("be4throw_token", token);
      storage.setItem("be4throw_user", JSON.stringify(user));

      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (user.role === "pengguna") {
        navigate("/user", { replace: true });
      } else {
        localStorage.removeItem("be4throw_token");
        sessionStorage.removeItem("be4throw_token");
        localStorage.removeItem("be4throw_user");
        sessionStorage.removeItem("be4throw_user");
        setError("Role akun tidak dikenali.");
      }
    } catch (err) {
      setError(
        err.errors?.map((item) => item.message).join(" ") ||
          err.message ||
          "Login gagal. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-container">
        <header className="login-header">
          <img
            src="/be4throw-logo.jpeg"
            alt="Logo Be4Throw"
            className="login-logo"
          />

          <h1>Be4Throw</h1>
          <p className="login-subtitle">Think Before You Throw</p>
        </header>

        <section className="login-card">
          <h2>Masuk</h2>

          <p className="login-description">
            Pilah, kelola, dan putuskan nasib barangmu secara bijak.
          </p>

          {location.state?.message && (
            <p className="login-success" role="status">
              {location.state.message}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email</label>

              <div className="login-input-wrapper">
                <span className="input-icon" aria-hidden="true">
                  @
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="Masukkan email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <div className="password-label-row">
                <label htmlFor="password">Kata Sandi</label>

                <Link className="forgot-password" to="/forgot-password">
                  Lupa kata sandi?
                </Link>
              </div>

              <div className="login-input-wrapper">
                <span className="input-icon" aria-hidden="true">
                  ♙
                </span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"
                  }
                >
                  {showPassword ? "◉" : "◎"}
                </button>
              </div>
            </div>

            <label className="remember-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Ingat saya</span>
            </label>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="login-divider" />

          <p className="login-help">
            Belum punya akun? <Link to="/register">Daftar sekarang</Link>
          </p>
        </section>

        <footer className="login-footer">
          <p>© 2026 Be4Throw Indonesia. Blueprint System.</p>

          <nav aria-label="Informasi">
            <a href="#kebijakan">Kebijakan Privasi</a>
            <span>•</span>
            <a href="#syarat">Syarat &amp; Ketentuan</a>
            <span>•</span>
            <a href="mailto:it@be4throw.org">Bantuan</a>
          </nav>

          <div className="login-home-indicator" />
        </footer>
      </section>
    </main>
  );
}
