
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGetAllPages, apiRequest,} from "../services/api";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "../UserMenu";
import "./UserHistory.css";

export default function UserHistory() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
const [detailError, setDetailError] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();

  const muatRiwayat = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const items = await apiGetAllPages("/riwayat");

    setHistoryData(
      items.map((item) => ({
        id: item.id,
        lengkap: item.lengkap,
        category: item.barang?.kategori?.nama || "Lainnya",
        date: item.tanggal
          ? new Date(item.tanggal).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "-",
        name: item.barang?.nama || "Barang",
        status:
          item.rekomendasiUtama?.label ||
          (item.adaBahaya
            ? "Perlu penanganan aman"
            : "Analisis selesai"),
        baik:
          item.rekomendasiUtama?.tindakan === "gunakan_kembali",
        detail: item,
      }))
    );
  } catch (err) {
    setError(err.message || "Gagal memuat riwayat.");
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  muatRiwayat();
}, [muatRiwayat, location.key]);

useEffect(() => {
  const saatKembaliKeTab = () => {
    if (document.visibilityState === "visible") {
      muatRiwayat();
    }
  };

  document.addEventListener("visibilitychange", saatKembaliKeTab);

  return () => {
    document.removeEventListener("visibilitychange", saatKembaliKeTab);
  };
}, [muatRiwayat]);


const filters = useMemo(
  () => [
    "Semua",
    ...new Set(historyData.map((item) => item.category)),
  ],
  [historyData]
);

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

  
async function lihatDetail(item) {
  setSelected(item);
  setDetailLoading(true);
  setDetailError("");

  try {
    const response = await apiRequest(`/analisis/${item.id}`);

    setSelected({
      ...item,
      analisis: response.data,
    });
  } catch (err) {
    setDetailError(
      err.message || "Gagal mengambil detail analisis."
    );
  } finally {
    setDetailLoading(false);
  }
}


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
                    item.baik
                      ? "good"
                      : "repair"
                  }`}
                >
                  <span className="uh-status-dot" />
                  {item.status}
                </span>
              </div>

              <h2>{item.name}</h2>
              <p className="uh-completeness">
  Status data:{" "}
  <strong>
    {item.lengkap
      ? "Data lengkap"
      : "Data tidak lengkap"}
  </strong>
</p>

              <div className="uh-card-bottom">
                <p>
                  Status: <strong>{item.status}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => lihatDetail(item)}
                >
                  Lihat Detail →
                </button>
              </div>
            </article>
          ))}

          {!loading && !error && history.length === 0 && (
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

<p className="uh-completeness">
  Status data:{" "}
  <strong>
    {selected.lengkap
      ? "Data lengkap"
      : "Data tidak lengkap"}
  </strong>
</p>

<p>ID Analisis: {selected.id}</p>
            {detailLoading && (
  <p>Memuat detail analisis...</p>
)}

{detailError && (
  <p role="alert">{detailError}</p>
)}

{selected.analisis?.hasil && (
  <>
    <h3>Hasil Analisis</h3>

    <p>
      Rekomendasi utama:{" "}
      <strong>
        {selected.analisis.hasil.rekomendasiUtama?.label ||
          "Tidak tersedia"}
      </strong>
    </p>

    <p>
      Status keselamatan:{" "}
      <strong>
        {selected.analisis.hasil.keselamatan?.aman
          ? "Aman berdasarkan pemeriksaan"
          : "Perlu perhatian keselamatan"}
      </strong>
    </p>

    {selected.analisis.hasil.pesanKeterbatasan && (
      <p>
        Catatan:{" "}
        {selected.analisis.hasil.pesanKeterbatasan}
      </p>
    )}
  </>
)}
            <Link to="/user/katalog" className="uh-primary">
              Analisis Barang Lain
            </Link>
          </section>
        </div>
      )}
    </main>
  );
}
