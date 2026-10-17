
import { useLocation, useNavigate } from "react-router-dom";
import "./UserEnvironmentalImpact.css";

export default function UserEnvironmentalImpact() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    selectedItems = [],
    kondisiBarang = {},
    rekomendasi = {},
    analisis = {},
    analisisId,
    kodeAkses,
  } = location.state ?? {};

  const namaBarang =
    selectedItems[0]?.name ??
    selectedItems[0]?.nama ??
    "Barang pilihanmu";

  const rincianDampak = analisis.hasil?.dampak?.rincian ?? rekomendasi.dampak?.rincian ?? [];
  const totalDialihkan = rincianDampak.reduce((total, item) => total + (item.pengalihanLimbah?.nilai || 0), 0);
  const emisiDihindari = rincianDampak.reduce((total, item) => total + (item.emisiDihindari?.nilai || 0), 0);

  return (
    <main className="impact-page">
      <header className="impact-header">
        <strong>Be4Throw</strong>
        <button
          type="button"
          onClick={() =>
            navigate("/user/rekomendasi", {
              state: { selectedItems, kondisiBarang },
            })
          }
        >
          ← Kembali ke Hasil
        </button>
      </header>

      <section className="impact-content">
        <h1>Dampak Lingkungan</h1>
        <p className="impact-subtitle">
          Laporan akumulatif dari efisiensi pengelolaan limbah.
        </p>

        <article className="impact-card">
          <span className="impact-label">TOTAL LIMBAH DIALIHKAN</span>
          <h2>{totalDialihkan.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</h2>

          {rincianDampak.length ? rincianDampak.map((item, index) => (
            <div className="impact-row" key={`${item.tindakan}-${index}`}>
              <span>♻ {item.label || item.tindakan}</span>
              <strong>{item.pengalihanLimbah?.nilai == null ? "Belum tersedia" : `${item.pengalihanLimbah.nilai.toLocaleString("id-ID")} kg`}</strong>
            </div>
          )) : <p>Dampak lingkungan belum tersedia untuk analisis ini.</p>}
        </article>

        <article className="impact-card">
          <span className="impact-label">
            TOTAL EMISI YANG DIHINDARI
          </span>
          <h2>{emisiDihindari.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg CO₂e</h2>
          <p>Estimasi berdasarkan faktor dampak lingkungan yang tersedia di backend.</p>
        </article>

        <h2 className="impact-section-title">
          Metodologi & Parameter Perhitungan
        </h2>

        <article className="impact-info">
          <strong>ⓘ Asumsi Dasar</strong>
          <p>
            Perhitungan dampak seharusnya menggunakan jenis dan berat
            material serta metode pengelolaan yang sesuai.
          </p>
        </article>

        <article className="impact-info">
          <strong>▤ Faktor Konversi Emisi</strong>
          <p>
            Nilai emisi perlu disesuaikan dengan faktor konversi
            yang digunakan oleh backend.
          </p>
        </article>

        <article className="impact-info">
          <strong>◷ Periode Pengukuran</strong>
          <p>
            Data diambil dari hasil analisis backend. Nilai yang tidak tersedia tidak akan dibuat-buat.
          </p>
        </article>

        <p className="impact-note">Barang: {analisis.barang?.nama || namaBarang}. Rekomendasi: {rekomendasi.jenis ?? "Belum tersedia"}. {analisis.hasil?.dampak?.catatan?.join(" ") || ""}</p>

        <button
          type="button"
          className="impact-primary-button"
          onClick={() => navigate("/user/umpan-balik", {
            state: { selectedItems, kondisiBarang, rekomendasi, analisis, analisisId, kodeAkses },
          })}
        >
          Selanjutnya →
        </button>
      </section>
    </main>
  );
}
