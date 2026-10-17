import { useEffect, useState } from "react";
import { apiRequest } from "./services/api";
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

    useEffect(() => {
        let active = true;
        apiRequest("/auth/me").then(({ data }) => {
            if (!active) return;
            setProfil((old) => ({ ...old, nama: data.nama || "", username: data.username || "", email: data.email || "", telepon: data.noTelepon || "", domisili: data.domisili || "", jabatan: data.role === "admin" ? "Administrator" : "Pengguna" }));
        }).catch((err) => { if (active) setPesan(err.message || "Gagal mengambil profil dari backend."); });
        return () => { active = false; };
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;

        setProfil((data) => ({
            ...data,
            [name]: value,
        }));

        setPesan("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        try {
            const response = await apiRequest("/auth/me", { method: "PUT", body: JSON.stringify({ nama: profil.nama, username: profil.username || null, noTelepon: profil.telepon || null, domisili: profil.domisili || null }) });
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
                        {profil.nama
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((kata) => kata[0])
                            .join("")
                            .toUpperCase()}
                    </div>

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
                                    onChange={handleChange}
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
                            onClick={() => {
                                setProfil({
                                    nama: "Administrator Be4Throw",
                                    username: "admin_be4throw",
                                    email: "admin@be4throw.com",
                                    telepon: "",
                                    domisili: "Bandung, Jawa Barat",
                                    jabatan: "Administrator",
                                });
                                setPesan("");
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
            </main>

            <footer className="profil-admin-footer">
                © 2026 Be4Throw · Admin Panel
            </footer>
        </div>
    );
}