
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./UserEnvironmentalImpact.css";

// Ikon garis per bahan; bahan yang belum punya ikon memakai kotak umum
const IKON_BAHAN = {
  Plastik: <path d="M10 2h4M10 2v3l-2 3v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8l-2-3V2M8 12h8" />,
  Logam: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  Kaca: <path d="M7 3h10l-1 7a4 4 0 0 1-8 0L7 3ZM12 14v7M8 21h8" />,
  Kayu: <path d="M12 3v18M12 8l-5-3M12 12l5-3M12 16l-5-3" />,
  Tekstil: <path d="M8 3 3 7l3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 0 1-8 0Z" />,
  "Komponen Elektronik": (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  Baterai: <path d="M4 8h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM21 11v2" />,
};
const IKON_UMUM = <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12v9M12 12 4 7.5" />;

function IkonBahan({ nama }) {
  return (
    <span className="impact-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {IKON_BAHAN[nama] ?? IKON_UMUM}
      </svg>
    </span>
  );
}

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
  // Daftar bahan dipakai di kartu limbah dan kartu emisi; tanpa rincian, pakai satu baris material barang
  const daftarBahan = rincianBahan.length ? rincianBahan : [{ material: materialBarang, beratKg: totalDialihkan, emisiKgCO2e: emisiDihindari }];
  const tanggalHitung = analisis.diperbaruiPada
    ? new Date(analisis.diperbaruiPada).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "";
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
          <h2>
            {totalDialihkan == null ? "Belum tersedia" : (
              <>{formatAngka(totalDialihkan)} <small>kg</small></>
            )}
          </h2>

          {dampakUtama ? daftarBahan.map((bahan) => (
            <div className="impact-row" key={bahan.material}>
              <span className="impact-material">
                <IkonBahan nama={bahan.material} />
                {bahan.material}{bahan.persen != null ? ` (${formatAngka(bahan.persen)}%)` : ""}
              </span>
              <strong>{bahan.beratKg == null ? "Belum tersedia" : `${formatAngka(bahan.beratKg)} kg`}</strong>
            </div>
          )) : <p>Dampak lingkungan belum tersedia untuk analisis ini.</p>}
        </article>

        <article className="impact-card">
          <span className="impact-label">TOTAL EMISI YANG DIHINDARI</span>
          <h2>
            {emisiDihindari == null ? "Belum tersedia" : (
              <>{formatAngka(emisiDihindari)} <small>kg CO₂e</small></>
            )}
          </h2>

          {dampakUtama && daftarBahan.map((bahan) => (
            <div className="impact-row" key={bahan.material}>
              <span className="impact-material">
                <IkonBahan nama={bahan.material} />
                {bahan.material}
              </span>
              <strong>{bahan.emisiKgCO2e == null ? "Belum tersedia" : `${formatAngka(bahan.emisiKgCO2e)} kg CO₂e`}</strong>
            </div>
          ))}

          {emisiDihindari == null && dampakUtama?.manfaatKualitatif && <p>{dampakUtama.manfaatKualitatif}</p>}
        </article>

        <h2 className="impact-section-title">
          Metodologi & Parameter Perhitungan
        </h2>

        <article className="impact-info">
          <strong><span aria-hidden="true">ⓘ</span> Asumsi Dasar</strong>
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

        <article className="impact-info">
          <strong><span aria-hidden="true">◷</span> Periode Pengukuran</strong>
          <p>
            Estimasi untuk satu analisis
            {tanggalHitung ? `, dihitung pada ${tanggalHitung}` : ""}.
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
