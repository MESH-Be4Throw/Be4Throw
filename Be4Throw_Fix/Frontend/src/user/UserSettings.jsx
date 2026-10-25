
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserMenu from "../UserMenu";
import { apiRequest, fileUrl } from "../services/api";
import { useEffect } from "react";
import "./UserSettings.css";

export default function UserSettings() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [domisili, setDomisili] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [loading, setLoading] = useState(true);
  // Data yang tersimpan di server, pembanding untuk mengaktifkan "Simpan Perubahan"
  const [saved, setSaved] = useState({ name: "", username: "", domisili: "", noTelepon: "" });
  const [photo, setPhoto] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    apiRequest("/auth/me").then((response) => {
      const user = response.data || {};
      if (!active) return;
      setName(user.nama || ""); setUsername(user.username || ""); setEmail(user.email || "");
      setDomisili(user.domisili || ""); setNoTelepon(user.noTelepon || "");
      setSaved({ name: user.nama || "", username: user.username || "", domisili: user.domisili || "", noTelepon: user.noTelepon || "" });
      setPhoto(fileUrl(user.fotoProfil)); setStatus(user.status || "");
    }).catch((err) => { if (active) setMessage(err.message || "Gagal memuat profil."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function simpanUserLokal(user) {
    const stored = JSON.parse(localStorage.getItem("be4throw_user") || sessionStorage.getItem("be4throw_user") || "{}");
    const updated = { ...stored, ...user };
    if (localStorage.getItem("be4throw_token")) localStorage.setItem("be4throw_user", JSON.stringify(updated));
    else sessionStorage.setItem("be4throw_user", JSON.stringify(updated));
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Pilih file gambar yang valid.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Ukuran foto maksimal 2 MB.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("foto", file);
      const response = await apiRequest("/akun/foto", { method: "PUT", body: formData });
      const user = response.data || {};
      setPhoto(fileUrl(user.fotoProfil));
      simpanUserLokal(user);
      setMessage("Foto profil berhasil disimpan.");
    } catch (err) {
      setMessage(err.errors?.map((item) => item.message).join(" ") || err.message || "Foto gagal disimpan.");
    }
  }

  async function handleRemovePhoto() {
    try {
      const response = await apiRequest("/akun/foto", { method: "DELETE" });
      const user = response.data || {};
      setPhoto(fileUrl(user.fotoProfil));
      simpanUserLokal(user);
      setMessage(response.message || "Foto profil dihapus.");
    } catch (err) {
      setMessage(err.message || "Foto gagal dihapus.");
    }
  }

  const adaPerubahan =
    name !== saved.name ||
    username !== saved.username ||
    domisili !== saved.domisili ||
    noTelepon !== saved.noTelepon;

  async function handleSave(event) {
    event.preventDefault();
    if (!adaPerubahan) return;

    if (!name.trim() || !username.trim() || !email.trim()) {
      setMessage("Semua kolom wajib diisi.");
      return;
    }

    try {
      const response = await apiRequest("/akun/profil", { method: "PUT", body: JSON.stringify({ nama: name.trim(), username: username.trim() || null, domisili: domisili.trim() || null, noTelepon: noTelepon.trim() || null }) });
      const user = response.data || {};
      setName(user.nama || name); setUsername(user.username || ""); setEmail(user.email || email);
      setSaved({ name: user.nama || name, username: user.username || "", domisili: user.domisili || "", noTelepon: user.noTelepon || "" });
      setDomisili(user.domisili || ""); setNoTelepon(user.noTelepon || "");
      setMessage("Profil berhasil disimpan ke database.");
      simpanUserLokal(user);
    } catch (err) { setMessage(err.errors?.map((item) => item.message).join(" ") || err.message || "Profil gagal disimpan."); }
  }

  async function handlePasswordSave(event) {
    event.preventDefault();

    if (passwordBaru !== konfirmasiPassword) {
      setPasswordMessage("Konfirmasi password tidak sama.");
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await apiRequest("/akun/password", {
        method: "PUT",
        body: JSON.stringify({ passwordLama, passwordBaru, konfirmasiPassword }),
      });
      setPasswordLama(""); setPasswordBaru(""); setKonfirmasiPassword("");
      setPasswordMessage(response.message || "Password berhasil diubah.");
    } catch (err) {
      setPasswordMessage(err.errors?.map((item) => item.message).join(" ") || err.message || "Password gagal diubah.");
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleLogout() {
    const confirmed = window.confirm("Yakin ingin keluar dari akun?");

    if (confirmed) {
      localStorage.removeItem("be4throw_token"); localStorage.removeItem("be4throw_user");
      sessionStorage.removeItem("be4throw_token"); sessionStorage.removeItem("be4throw_user");
      navigate("/login");
    }
  }

  return (
    <main className="us-page">
      <header className="us-navbar">
        <Link to="/user" className="us-brand">Be4Throw</Link>

        <button
          type="button"
          className="us-menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Buka menu"
        >
          <span /><span /><span />
        </button>
      </header>

      <UserMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="us-content">
        <div className="us-eyebrow">⚙ &nbsp;Preferensi Akun</div>
        <h1>Pengaturan Akun</h1>
        <p className="us-intro">
          Kelola informasi akun dan data identitas Anda dengan aman
          dan rapi.
        </p>

        <section className="us-profile">
          <div className="us-avatar">
            {photo ? (
              <img src={photo} alt="Foto profil" />
            ) : (
              <span aria-hidden="true">
                {name.trim().charAt(0).toUpperCase() || "U"}
              </span>
            )}

            <label className="us-camera" title="Ganti foto">
              ◉
              <input
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                aria-label="Pilih foto profil"
              />
            </label>
          </div>

          <h2>{name || "Nama Pengguna"}</h2>
          <p>@{username || "username"} · Anggota {status === "nonaktif" ? "Nonaktif" : "Aktif"}</p>

          <div className="us-photo-actions">
            <label className="us-photo-button">
              ✎ Ganti Foto
              <input
                type="file"
                accept="image/*"
                onChange={handlePhoto}
              />
            </label>

            <button
              type="button"
              className="us-remove-photo"
              onClick={handleRemovePhoto}
            >
              ♧ Hapus
            </button>
          </div>
        </section>

        <form className="us-form" onSubmit={handleSave}>
          <label htmlFor="us-name">Nama Lengkap</label>
          <input
            id="us-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="us-username">Nama Pengguna (Username)</label>
          <input
            id="us-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <small>Digunakan sebagai identitas tampilan di komunitas Be4Throw.</small>

          <label htmlFor="us-email">Email</label>
          <input id="us-email" type="email" value={email} readOnly />
          <small>Email akun tidak dapat diubah dari halaman ini.</small>

          <label htmlFor="us-phone">Nomor Telepon</label>
          <input id="us-phone" type="tel" value={noTelepon} onChange={(event) => setNoTelepon(event.target.value)} />

          <label htmlFor="us-domicile">Domisili</label>
          <input id="us-domicile" type="text" value={domisili} onChange={(event) => setDomisili(event.target.value)} />

          <button type="submit" className="us-save-button" disabled={!adaPerubahan}>
            Simpan Perubahan
          </button>
        </form>

        {message && (
          <p className="us-message" role="status">{message}</p>
        )}

        <h2 className="us-password-heading">Ubah Password</h2>

        <form className="us-form us-password-form" onSubmit={handlePasswordSave}>
          <label htmlFor="us-password-old">Password Lama</label>
          <input
            id="us-password-old"
            type="password"
            value={passwordLama}
            onChange={(event) => { setPasswordLama(event.target.value); setPasswordMessage(""); }}
            autoComplete="current-password"
            required
          />

          <label htmlFor="us-password-new">Password Baru</label>
          <input
            id="us-password-new"
            type="password"
            value={passwordBaru}
            onChange={(event) => { setPasswordBaru(event.target.value); setPasswordMessage(""); }}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />
          <small>Minimal 8 karakter, mengandung huruf dan angka.</small>

          <label htmlFor="us-password-confirm">Konfirmasi Password Baru</label>
          <input
            id="us-password-confirm"
            type="password"
            value={konfirmasiPassword}
            onChange={(event) => { setKonfirmasiPassword(event.target.value); setPasswordMessage(""); }}
            autoComplete="new-password"
            required
          />

          <button type="submit" className="us-save-button" disabled={passwordLoading}>
            {passwordLoading ? "Menyimpan..." : "Ubah Password"}
          </button>
        </form>

        {passwordMessage && (
          <p className="us-message" role="status">{passwordMessage}</p>
        )}

        <button
          type="button"
          className="us-logout"
          onClick={handleLogout}
        >
          ⇥ &nbsp; Keluar Akun
        </button>
      </div>

      <footer className="us-footer">
        © 2026 Be4Throw · Think Before You Throw
      </footer>
    </main>
  );
}
