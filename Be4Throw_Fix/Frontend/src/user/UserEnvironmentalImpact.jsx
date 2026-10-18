
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
  // Total hanya untuk rekomendasi utama; alternatif hanya pembanding, jadi tidak dijumlahkan
  const dampakUtama = rincianDampak.find((item) => item.jenis === "utama");
  const totalDialihkan = dampakUtama?.pengalihanLimbah?.nilai;
  const emisiDihindari = dampakUtama?.emisiDihindari?.nilai;
  const formatAngka = (nilai) => nilai.toLocaleString("id-ID", { maximumFractionDigits: 3 });

  return (
    <main className="impact-page">
      <header className="impact-header">
        <strong>Be4Throw</strong>
        <button
          type="button"
          onClick={() =>
            navigate("/user/rekomendasi", {
              state: { selectedItems, kondisiBarang, analisis, analisisId, kodeAkses },
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
          <h2>{totalDialihkan == null ? "Belum tersedia" : `${formatAngka(totalDialihkan)} kg`}</h2>

          {rincianDampak.length ? rincianDampak.map((item, index) => (
            <div className="impact-row" key={`${item.tindakan}-${index}`}>
              <span>♻ {item.label || item.tindakan}{item.jenis === "alternatif" ? " (alternatif)" : ""}</span>
              <strong>{item.pengalihanLimbah?.nilai == null ? "Belum tersedia" : `${formatAngka(item.pengalihanLimbah.nilai)} kg`}</strong>
            </div>
          )) : <p>Dampak lingkungan belum tersedia untuk analisis ini.</p>}
        </article>

        <article className="impact-card">
          <span className="impact-label">
            TOTAL EMISI YANG DIHINDARI
          </span>
          <h2>{emisiDihindari == null ? "Belum tersedia" : `${formatAngka(emisiDihindari)} kg CO₂e`}</h2>
          <p>{dampakUtama?.manfaatKualitatif || "Estimasi berdasarkan faktor dampak lingkungan yang tersedia di backend."}</p>
        </article>

        <h2 className="impact-section-title">
          Metodologi & Parameter Perhitungan
        </h2>

        <article className="impact-info">
          <strong>ⓘ Asumsi Dasar</strong>
          <p>{dampakUtama?.asumsi || "Asumsi perhitungan belum tersedia untuk analisis ini."}</p>
        </article>

        <article className="impact-info">
          <strong>▤ Faktor Konversi Emisi</strong>
          <p>
            {dampakUtama?.sumber
              ? `Sumber faktor: ${dampakUtama.sumber}${dampakUtama.tahunFaktor ? ` (${dampakUtama.tahunFaktor})` : ""}.`
              : "Faktor konversi emisi belum tersedia untuk analisis ini."}
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
