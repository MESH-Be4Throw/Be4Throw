import { useEffect, useState } from "react";
import { apiRequest, fileUrl } from "./services/api";
import "./ProfilAdmin.css";

export default function ProfilAdmin() {
    const [profil, setProfil] = useState({
        nama: "",
        username: "",
        email: "",
        telepon: "",
        domisili: "",
        jabatan: "Administrator",
    });

    const [pesan, setPesan] = useState("");
    const [formPassword, setFormPassword] = useState({
        passwordLama: "",
        passwordBaru: "",
        konfirmasiPassword: "",
    });
    const [pesanPassword, setPesanPassword] = useState(null);
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [fotoProfil, setFotoProfil] = useState("");
const [previewFoto, setPreviewFoto] = useState("");
const [fileFoto, setFileFoto] = useState(null);
const [loadingFoto, setLoadingFoto] = useState(false);


function sinkronkanDataAdmin(data) {
    if (!data) return;

    for (const storage of [localStorage, sessionStorage]) {
        const tersimpan = storage.getItem("be4throw_user");

        if (tersimpan) {
            try {
                const userLama = JSON.parse(tersimpan);
                storage.setItem(
                    "be4throw_user",
                    JSON.stringify({ ...userLama, ...data })
                );
            } catch (error) {
                console.error("Gagal memperbarui data admin:", error);
            }
        }
    }

    window.dispatchEvent(new Event("admin-profile-updated"));
}

function isiProfil(data) {
    setProfil((old) => ({
        ...old,
        nama: data.nama || "",
        username: data.username || "",
        email: data.email || "",
        telepon: data.noTelepon || "",
        domisili: data.domisili || "",
        jabatan: data.role === "admin" ? "Administrator" : "Pengguna",
    }));

    setFotoProfil(data.fotoProfil || "");
    setPreviewFoto(data.fotoProfil ? fileUrl(data.fotoProfil) : "");
    setFileFoto(null);
}

function handleFotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const tipeDiizinkan = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (!tipeDiizinkan.includes(file.type)) {
        setPesan("Foto harus berformat JPG, PNG, atau WebP.");
        event.target.value = "";
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        setPesan("Ukuran foto maksimal 2 MB.");
        event.target.value = "";
        return;
    }

    setFileFoto(file);
    setPreviewFoto(URL.createObjectURL(file));
    setPesan("");
}


    async function muatProfil() {
        try {
            const { data } = await apiRequest("/auth/me");
            isiProfil(data);
            return true;
        } catch (err) {
            setPesan(err.message || "Gagal mengambil profil dari backend.");
            return false;
        }
    }

    async function handleHapusFoto() {
    if (!fotoProfil) {
        setPesan("Belum ada foto profil yang tersimpan.");
        return;
    }

    try {
        setLoadingFoto(true);
        setPesan("");

        const response = await apiRequest("/akun/foto", {
            method: "DELETE",
        });

        isiProfil(response.data);
        sinkronkanDataAdmin(response.data);
        setPesan("Foto profil berhasil dihapus.");
    } catch (error) {
        setPesan(
            error.message || "Gagal menghapus foto profil."
        );
    } finally {
        setLoadingFoto(false);
    }
}

    async function handleUploadFoto() {
    if (!fileFoto) {
        setPesan("Pilih foto terlebih dahulu.");
        return;
    }

    try {
        setLoadingFoto(true);
        setPesan("");

        const formData = new FormData();
        formData.append("foto", fileFoto);

        const response = await apiRequest("/akun/foto", {
            method: "PUT",
            body: formData,
        });

        isiProfil(response.data);
        sinkronkanDataAdmin(response.data);
        setPesan("Foto profil berhasil diperbarui.");
    } catch (error) {
        setPesan(
            error.errors?.map((item) => item.message).join(" ") ||
            error.message ||
            "Gagal mengunggah foto profil."
        );
    } finally {
        setLoadingFoto(false);
    }
}

    useEffect(() => {
        muatProfil();
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;

        setProfil((data) => ({
            ...data,
            [name]: value,
        }));

        setPesan("");
    }

    function handlePasswordChange(event) {
        const { name, value } = event.target;

        setFormPassword((data) => ({ ...data, [name]: value }));
        setPesanPassword(null);
    }

    async function handlePasswordSubmit(event) {
        event.preventDefault();

        if (formPassword.passwordBaru !== formPassword.konfirmasiPassword) {
            setPesanPassword({ error: true, teks: "Konfirmasi password tidak sama." });
            return;
        }

        try {
            setLoadingPassword(true);
            const response = await apiRequest("/akun/password", {
                method: "PUT",
                body: JSON.stringify(formPassword),
            });

            setFormPassword({ passwordLama: "", passwordBaru: "", konfirmasiPassword: "" });
            setPesanPassword({ error: false, teks: response.message || "Password berhasil diubah." });
        } catch (err) {
            setPesanPassword({
                error: true,
                teks: err.errors?.map((item) => item.message).join(" ") || err.message || "Password gagal diubah.",
            });
        } finally {
            setLoadingPassword(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        try {
            const response = await apiRequest("/akun/profil", { method: "PUT", body: JSON.stringify({ nama: profil.nama, username: profil.username || null, noTelepon: profil.telepon || null, domisili: profil.domisili || null }) });
            const data = response.data || {};
            setProfil((old) => ({ ...old, nama: data.nama || old.nama, username: data.username || "", email: data.email || old.email, telepon: data.noTelepon || "", domisili: data.domisili || "" }));
            setPesan("Profil berhasil disimpan ke database.");
        } catch (err) { setPesan(err.errors?.map((item) => item.message).join(" ") || err.message || "Profil gagal disimpan."); }
    }

    return (
        <div className="profil-admin-page">
            <header className="profil-admin-header">
                <div className="profil-admin-brand">
                    <span className="profil-admin-logo">Be4Throw</span>
                    <span className="profil-admin-label">
                        ADMIN PANEL
                    </span>
                </div>
            </header>

            <main className="profil-admin-content">
                <div className="profil-admin-heading">
                    <span className="profil-admin-badge">
                        ⚙️ Pengaturan Administrator
                    </span>

                    <h1>Profil Admin</h1>

                    <p>
                        Kelola informasi profil dan data administrator
                        untuk menjaga akun Be4Throw tetap teratur.
                    </p>
                </div>

                <section className="profil-admin-card profil-admin-identity">
                    <div className="profil-admin-avatar">
  {previewFoto ? (
    <img
      src={previewFoto}
      alt="Foto profil administrator"
    />
  ) : (
    profil.nama
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((kata) => kata[0])
      .join("")
      .toUpperCase() || "AD"
  )}
</div>

<label className="profil-admin-photo-button">
  Pilih Foto
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleFotoChange}
  />
</label>

{fileFoto && (
  <button
    type="button"
    className="profil-admin-upload-button"
    onClick={handleUploadFoto}
    disabled={loadingFoto}
  >
    {loadingFoto ? "Mengunggah..." : "Simpan Foto"}
  </button>
)}
{fotoProfil && !fileFoto && (
    <button
        type="button"
        className="profil-admin-delete-button"
        onClick={handleHapusFoto}
        disabled={loadingFoto}
    >
        Hapus Foto
    </button>
)}

<small className="profil-admin-photo-hint">
  JPG, PNG, atau WebP. Maksimal 2 MB.
</small>

                    <h2>{profil.nama || "Administrator"}</h2>
                    <p className="profil-admin-username">
                        @{profil.username || "admin"}
                    </p>

                    <span className="profil-admin-status">
                        <span className="profil-admin-status-dot"></span>
                        Akun Administrator Aktif
                    </span>

                    <div className="profil-admin-role">
                        <span>🛡️</span>
                        <div>
                            <strong>{profil.jabatan}</strong>
                            <small>Hak akses administrator</small>
                        </div>
                    </div>
                </section>

                <form
                    className="profil-admin-form"
                    onSubmit={handleSubmit}
                >
                    <section className="profil-admin-card">
                        <div className="profil-admin-section-title">
                            <span className="profil-admin-section-icon">
                                👤
                            </span>

                            <div>
                                <h3>Informasi Pribadi</h3>
                                <p>
                                    Informasi dasar akun administrator.
                                </p>
                            </div>
                        </div>

                        <div className="profil-admin-fields">
                            <div className="profil-admin-field">
                                <label htmlFor="admin-nama">
                                    Nama Lengkap
                                </label>

                                <input
                                    id="admin-nama"
                                    name="nama"
                                    type="text"
                                    value={profil.nama}
                                    onChange={handleChange}
                                    placeholder="Masukkan nama lengkap"
                                    required
                                />
                            </div>

                            <div className="profil-admin-field">
                                <label htmlFor="admin-username">
                                    Nama Pengguna (Username)
                                </label>

                                <input
                                    id="admin-username"
                                    name="username"
                                    type="text"
                                    value={profil.username}
                                    onChange={handleChange}
                                    placeholder="Masukkan username"
                                    required
                                />

                                <small>
                                    Nama pengguna untuk identitas
                                    administrator.
                                </small>
                            </div>

                            <div className="profil-admin-field">
                                <label htmlFor="admin-email">
                                    Email Administrator
                                </label>

                                <input
                                    id="admin-email"
                                    name="email"
                                    type="email"
                                    value={profil.email}
                                    readOnly
                                    placeholder="admin@be4throw.com"
                                    required
                                />

                                <small>
                                    Email yang digunakan untuk akun admin.
                                </small>
                            </div>

                            <div className="profil-admin-field">
                                <label htmlFor="admin-telepon">
                                    Nomor Telepon
                                </label>

                                <input
                                    id="admin-telepon"
                                    name="telepon"
                                    type="tel"
                                    value={profil.telepon}
                                    onChange={handleChange}
                                    placeholder="Masukkan nomor telepon"
                                />
                            </div>

                            <div className="profil-admin-field">
                                <label htmlFor="admin-domisili">
                                    Domisili
                                </label>

                                <input
                                    id="admin-domisili"
                                    name="domisili"
                                    type="text"
                                    value={profil.domisili}
                                    onChange={handleChange}
                                    placeholder="Kota, Provinsi"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="profil-admin-card profil-admin-security">
                        <div className="profil-admin-section-title">
                            <span className="profil-admin-section-icon">
                                🔐
                            </span>

                            <div>
                                <h3>Keamanan Akun</h3>
                                <p>
                                    Informasi mengenai akses administrator.
                                </p>
                            </div>
                        </div>

                        <div className="profil-admin-security-row">
                            <div>
                                <strong>Role Akun</strong>
                                <p>Administrator</p>
                            </div>

                            <span className="profil-admin-role-badge">
                                ADMIN
                            </span>
                        </div>

                        <div className="profil-admin-security-row">
                            <div>
                                <strong>Status Akun</strong>
                                <p>Akun administrator aktif</p>
                            </div>

                            <span className="profil-admin-active-badge">
                                Aktif
                            </span>
                        </div>

                        <p className="profil-admin-security-note">
                            Data keamanan akun dikelola melalui sistem
                            autentikasi Be4Throw.
                        </p>
                    </section>

                    {pesan && (
                        <div
                            className="profil-admin-success"
                            role="status"
                        >
                            ✓ {pesan}
                        </div>
                    )}

                    <div className="profil-admin-actions">
                        <button
                            type="button"
                            className="profil-admin-reset"
                            onClick={async () => {
                                setPesan("");
                                if (await muatProfil()) setPesan("Form dikembalikan ke data tersimpan.");
                            }}
                        >
                            Reset Form
                        </button>

                        <button
                            type="submit"
                            className="profil-admin-save"
                        >
                            <span>✓</span>
                            Simpan Perubahan
                        </button>
                    </div>
                </form>

                <form
                    className="profil-admin-form profil-admin-password-form"
                    onSubmit={handlePasswordSubmit}
                >
                    <section className="profil-admin-card">
                        <div className="profil-admin-section-title">
                            <span className="profil-admin-section-icon">
                                🔑
                            </span>

                            <div>
                                <h3>Ubah Password</h3>
                                <p>
                                    Gunakan password baru minimal 8 karakter
                                    yang mengandung huruf dan angka.
                                </p>
                            </div>
                        </div>

                        <div className="profil-admin-fields">
                            <div className="profil-admin-field">
                                <label htmlFor="admin-password-lama">
                                    Password Lama
                                </label>

                                <input
                                    id="admin-password-lama"
                                    name="passwordLama"
                                    type="password"
                                    value={formPassword.passwordLama}
                                    onChange={handlePasswordChange}
                                    placeholder="Masukkan password lama"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>

                            <div className="profil-admin-field">
                                <label htmlFor="admin-password-baru">
                                    Password Baru
                                </label>

                                <input
                                    id="admin-password-baru"
                                    name="passwordBaru"
                                    type="password"
                                    value={formPassword.passwordBaru}
                                    onChange={handlePasswordChange}
                                    placeholder="Masukkan password baru"
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={72}
                                    required
                                />
                            </div>

                            <div className="profil-admin-field">
                                <label htmlFor="admin-password-konfirmasi">
                                    Konfirmasi Password Baru
                                </label>

                                <input
                                    id="admin-password-konfirmasi"
                                    name="konfirmasiPassword"
                                    type="password"
                                    value={formPassword.konfirmasiPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Ulangi password baru"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </div>

                        {pesanPassword && (
                            <div
                                className={
                                    pesanPassword.error
                                        ? "profil-admin-error"
                                        : "profil-admin-success"
                                }
                                role="status"
                                style={{ marginTop: 18, marginBottom: 0 }}
                            >
                                {pesanPassword.error ? "" : "✓ "}
                                {pesanPassword.teks}
                            </div>
                        )}

                        <div className="profil-admin-actions">
                            <button
                                type="submit"
                                className="profil-admin-save"
                                disabled={loadingPassword}
                            >
                                <span>✓</span>
                                {loadingPassword ? "Menyimpan..." : "Ubah Password"}
                            </button>
                        </div>
                    </section>
                </form>
            </main>

            <footer className="profil-admin-footer">
                © 2026 Be4Throw · Admin Panel
            </footer>
        </div>
    );
}