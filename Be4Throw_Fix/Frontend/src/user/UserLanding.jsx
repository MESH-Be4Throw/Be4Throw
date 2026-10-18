
import { useState } from "react";
import { Link } from "react-router-dom";
import UserMenu from "../UserMenu";
import "./UserLanding.css";

const steps = [
  {
    number: "1",
    title: "Detail Barang",
    description:
      "Identifikasi jenis barang yang ingin Anda kelola melalui sistem kami.",
  },
  {
    number: "2",
    title: "Kondisi Barang",
    description:
      "Berikan detail mengenai kondisi fisik dan fungsional barang saat ini.",
  },
  {
    number: "3",
    title: "Lihat Rekomendasi",
    description:
      "Dapatkan saran apakah barang perlu didaur ulang, diperbaiki, atau didonasikan.",
  },
];

export default function UserLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="user-landing">
      <header className="user-navbar">
        <Link to="/user" className="user-brand">
          Be4Throw
        </Link>

        <button
          className="user-menu-button"
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Buka menu navigasi"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <UserMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="user-content">
        <section className="user-hero">
          <h1>Temukan Solusi Terbaik untuk Barangmu</h1>

          <p className="user-hero-description">
            Kelola barang tak terpakai dengan mudah dari daur
            ulang hingga donasi.
          </p>

          <Link to="/user/katalog" className="user-primary-button">
            Mulai Analisis Sekarang
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section className="user-eco-card">
          <div className="user-eco-icon" aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M24 7 30 17H18L24 7Z" />
              <path d="m34 20 6 10H28l6-10Z" />
              <path d="m14 20 6 10H8l6-10Z" />
              <path d="M18 34h12" />
              <path d="m22 30-4 4 4 4" />
              <path d="m26 30 4 4-4 4" />
            </svg>
          </div>

          <span className="user-eco-badge">
            Efisien &amp; Berkelanjutan
          </span>

          <p>
            Pilah, perbaiki, salurkan, atau daur ulang sampah
            rumah tangga dengan panduan cerdas.
          </p>
        </section>

        <section className="user-how-it-works">
          <div className="user-section-heading">
            <h2>Cara Kerja</h2>
            <span>3 Langkah Cepat</span>
          </div>

          <div className="user-steps">
            {steps.map((step) => (
              <article className="user-step-card" key={step.number}>
                <span className="user-step-number">
                  {step.number}
                </span>

                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="user-footer">
          © 2026 Be4Throw · Think Before You Throw
        </footer>
      </div>
    </main>
  );
}
