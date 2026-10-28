
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./UserEnvironmentalImpact.css";

export default function UserEnvironmentalImpact() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    selectedItems = [],
    kondisiBarang = {},
    rekomendasi = {},
    analisis: analisisAwal = {},
    analisisId,
    kodeAkses,
  } = location.state ?? {};

  const [analisis, setAnalisis] = useState(analisisAwal);
  const [menghitung, setMenghitung] = useState(false);
  const [pesanHitung, setPesanHitung] = useState("");

  const namaBarang =
    selectedItems[0]?.name ??
    selectedItems[0]?.nama ??
    "Barang pilihanmu";

  const rincianDampak = analisis.hasil?.dampak?.rincian ?? rekomendasi.dampak?.rincian ?? [];
  // Total hanya untuk rekomendasi utama; alternatif hanya pembanding, jadi tidak dijumlahkan
  const dampakUtama = rincianDampak.find((item) => item.jenis === "utama");
  const totalDialihkan = dampakUtama?.pengalihanLimbah?.nilai;
  const emisiDihindari = dampakUtama?.emisiDihindari?.nilai;
  const materialBarang = analisis.hasil?.dampak?.material ?? rekomendasi.dampak?.material ?? "Tidak diketahui";
  const rincianBahan = dampakUtama?.bahan ?? [];
  const formatAngka = (nilai) => nilai.toLocaleString("id-ID", { maximumFractionDigits: 3 });
  const belumDihitung =
    Boolean(analisisId) &&
    (analisis.hasil?.dampak ?? rekomendasi.dampak)?.status === "belum_dihitung";

  async function handleHitungUlang() {
    setMenghitung(true);
    setPesanHitung("");

    try {
      const headers = kodeAkses ? { "X-Kode-Akses": kodeAkses } : {};
      const response = await apiRequest(`/analisis/${analisisId}/dampak`, {
        method: "POST",
        headers,
      });
      setAnalisis(response.data);
    } catch (err) {
      setPesanHitung(err.message || "Dampak lingkungan belum bisa dihitung. Coba lagi.");
    } finally {
      setMenghitung(false);
    }
  }

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
          Estimasi dampak dari barang yang kamu analisis.
        </p>

        {belumDihitung && (
          <div className="impact-retry" role="status">
            <p>
              {analisis.hasil?.dampak?.catatan?.[0] ||
                "Dampak lingkungan belum berhasil dihitung."}
            </p>
            <button
              type="button"
              className="impact-retry-button"
              onClick={handleHitungUlang}
              disabled={menghitung}
            >
              {menghitung ? "Menghitung..." : "Coba Hitung Lagi"}
            </button>
            {pesanHitung && <p className="impact-retry-error">{pesanHitung}</p>}
          </div>
        )}

        <article className="impact-card">
          <span className="impact-label">TOTAL LIMBAH DIALIHKAN</span>
          <h2>{totalDialihkan == null ? "Belum tersedia" : `${formatAngka(totalDialihkan)} kg`}</h2>

          {dampakUtama ? (
            (dampakUtama.bahan?.length ? dampakUtama.bahan : [{ material: materialBarang, beratKg: totalDialihkan }]).map((bahan) => (
              <div className="impact-row" key={bahan.material}>
                <span>♻ {bahan.material}{bahan.persen != null ? ` (${formatAngka(bahan.persen)}%)` : ""}</span>
                <strong>{bahan.beratKg == null ? "Belum tersedia" : `${formatAngka(bahan.beratKg)} kg`}</strong>
              </div>
            ))
          ) : <p>Dampak lingkungan belum tersedia untuk analisis ini.</p>}
        </article>

        <article className="impact-card">
          <span className="impact-label">
            TOTAL EMISI YANG DIHINDARI
          </span>
          <h2>{emisiDihindari == null ? "Belum tersedia" : `${formatAngka(emisiDihindari)} kg CO₂e`}</h2>

          {rincianBahan.map((bahan) => (
            <div className="impact-row" key={bahan.material}>
              <span>♻ {bahan.material}</span>
              <strong>{bahan.emisiKgCO2e == null ? "Belum tersedia" : `${formatAngka(bahan.emisiKgCO2e)} kg CO₂e`}</strong>
            </div>
          ))}

          {emisiDihindari == null && <p>{dampakUtama?.manfaatKualitatif}</p>}
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
          {rincianBahan.some((bahan) => bahan.faktor != null) ? (
            <ul>
              {rincianBahan.map((bahan) => (
                <li key={bahan.material}>
                  {bahan.material}:{" "}
                  {bahan.faktor == null
                    ? "faktor belum tersedia."
                    : `${formatAngka(bahan.faktor)} ${bahan.satuan}, sumber: ${bahan.sumber} (${bahan.tahun}).`}
                </li>
              ))}
            </ul>
          ) : (
            <p>Faktor konversi emisi belum tersedia, jadi manfaat ditampilkan secara kualitatif.</p>
          )}
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
