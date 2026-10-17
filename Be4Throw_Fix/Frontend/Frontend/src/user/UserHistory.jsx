
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import { Link } from "react-router-dom";
import UserMenu from "../UserMenu";
import "./UserHistory.css";

const initialHistory = [];



export default function UserHistory() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [selected, setSelected] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/riwayat?page=1&limit=100").then((response) => {
      if (active) setHistoryData((response.data?.items || []).map((item) => ({ id: item.id, category: item.barang?.kategori?.nama || "Lainnya", date: item.tanggal ? new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-", name: item.barang?.nama || "Barang", status: item.rekomendasiUtama?.label || (item.adaBahaya ? "Perlu penanganan aman" : "Analisis selesai"), detail: item })));
    }).catch((err) => { if (active) setError(err.message || "Gagal memuat riwayat."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filters = useMemo(() => ["Semua", ...new Set(historyData.map((item) => item.category))], [historyData]);

  const history = useMemo(
    () =>
      historyData.filter((item) => {
        const matchesCategory =
          filter === "Semua" || item.category === filter;
        const matchesSearch = item.name
          .toLowerCase()
          .includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
      }),
    [historyData, filter, search]
  );

  return (
    <main className="uh-page">
      <header className="uh-navbar">
        <Link to="/user" className="uh-brand">Be4Throw</Link>
        <button
          type="button"
          className="uh-menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Buka menu"
        >
          <span /><span /><span />
        </button>
      </header>

      <UserMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="uh-content">
        <div className="uh-eyebrow">◷ &nbsp;Riwayat Aktivitas</div>
        <h1>Riwayat Analisis Barang</h1>
        <p className="uh-intro">
          Pantau seluruh hasil evaluasi, status sirkular, dan
          rekomendasi barangmu sebelumnya.
        </p>

        <label className="uh-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari riwayat nama barang..."
            aria-label="Cari nama barang"
          />
        </label>

        <div className="uh-filters">
          {filters.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setFilter(item)}
              className={filter === item ? "active" : ""}
            >
              {item === "Semua"
                ? `Semua (${historyData.length})`
                : item}
            </button>
          ))}
        </div>

        <div className="uh-list">
          {loading && <p>Memuat riwayat dari server...</p>}
          {error && <p role="alert">{error}</p>}
          {!loading && !error && history.map((item) => (
            <article className="uh-card" key={item.id}>
              <div className="uh-card-top">
                <span className="uh-category">{item.category}</span>
                <span className="uh-date">{item.date}</span>
                <span
                  className={`uh-status ${
                    item.status === "Layak digunakan"
                      ? "good"
                      : "repair"
                  }`}
                >
                  <span className="uh-status-dot" />
                  {item.status}
                </span>
              </div>

              <h2>{item.name}</h2>

              <div className="uh-card-bottom">
                <p>
                  Status: <strong>{item.status}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                >
                  Lihat Detail →
                </button>
              </div>
            </article>
          ))}

          {history.length === 0 && (
            <div className="uh-empty">
              <h2>Riwayat tidak ditemukan</h2>
              <p>Coba kata kunci atau kategori lain.</p>
            </div>
          )}
        </div>
      </div>

      <footer className="uh-footer">
        © 2026 Be4Throw · Think Before You Throw
      </footer>

      {selected && (
        <div
          className="uh-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <section className="uh-modal" role="dialog" aria-modal="true">
            <button
              className="uh-modal-close"
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Tutup detail"
            >
              ×
            </button>
            <div className="uh-eyebrow">Detail Analisis</div>
            <h2>{selected.name}</h2>
            <p>Kategori: {selected.category}</p>
            <p>Tanggal analisis: {selected.date}</p>
            <p>Status: <strong>{selected.status}</strong></p>
            <p>ID Analisis: {selected.id}</p>
            <Link to="/user/katalog" className="uh-primary">
              Analisis Barang Lain
            </Link>
          </section>
        </div>
      )}
    </main>
  );
}
