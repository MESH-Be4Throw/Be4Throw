
import { useLocation, useNavigate } from "react-router-dom";
import "./UserRecommendation.css";

export default function UserRecommendation() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedItems = location.state?.selectedItems ?? [];
  const daftarAnalisis = location.state?.analyses ?? [];

  // Kompatibilitas dengan format analisis tunggal sebelumnya.
  const hasilSemua =
    daftarAnalisis.length > 0
      ? daftarAnalisis.map((item) => ({
          ...item,
          analisis: item.analisis ?? item,
        }))
      : location.state?.analisis
        ? [
            {
              id: location.state.analisis.id,
              kodeAkses: location.state.kodeAkses,
              kondisiBarang: location.state.kondisiBarang ?? {},
              selectedItem: selectedItems[0],
              analisis: location.state.analisis,
            },
          ]
        : [];

  function handleSave() {
    const rekomendasiSemua = hasilSemua.map((item) => {
      const analisis = item.analisis ?? {};
      const hasil = analisis.hasil ?? {};
      const utama = hasil.rekomendasiUtama;

      return {
        barang: analisis.barang ?? item.selectedItem,
        kondisiBarang: item.kondisiBarang ?? {},
        rekomendasi: {
          ...utama,
          jenis: utama?.label,
          alternatif: hasil.alternatif ?? [],
          dampak: hasil.dampak,
        },
        analisis,
        analisisId: analisis.id ?? item.id,
        kodeAkses: item.kodeAkses ?? null,
      };
    });

    const pertama = rekomendasiSemua[0];

    navigate("/user/dampak-lingkungan", {
      state: {
        selectedItems,
        kondisiBarang: pertama?.kondisiBarang ?? {},
        rekomendasi: pertama?.rekomendasi ?? {},
        analisis: pertama?.analisis ?? {},
        analisisId: pertama?.analisisId,
        kodeAkses: pertama?.kodeAkses,
        rekomendasiSemua,
        analyses: hasilSemua,
      },
    });
  }

  return (
    <main className="recommendation-page">
      <header className="recommendation-header">
        <button
          type="button"
          className="recommendation-back"
          onClick={() =>
            navigate("/user/identifikasi", {
              state: { selectedItems },
            })
          }
          aria-label="Kembali"
        >
          ←
        </button>
        <span>Be4Throw</span>
      </header>

      <section className="recommendation-content">
        <h1>Hasil Rekomendasi</h1>
        <p className="recommendation-subtitle">
          {hasilSemua.length > 0
            ? "Hasil dihitung oleh backend Be4Throw berdasarkan kondisi barang yang kamu masukkan."
            : "Belum ada rekomendasi untuk analisis ini."}
        </p>

        {hasilSemua.map((item, index) => {
          const analisis = item.analisis ?? {};
          const hasil = analisis.hasil ?? {};
          const utama = hasil.rekomendasiUtama;
          const alternatif = hasil.alternatif ?? [];

          const namaBarang =
            analisis.barang?.nama ??
            item.selectedItem?.nama ??
            item.selectedItem?.name ??
            "Barang pilihanmu";

          const peringatan = [
            ...new Set([
              ...(utama?.peringatan ?? []),
              ...(hasil.keselamatan?.peringatan ?? []),
            ]),
          ];

          const langkahPraktis = utama?.langkahPraktis ?? [];

          return (
            <div key={analisis.id ?? item.id ?? index}>
              <article className="recommendation-main-card">
                <div className="recommendation-card-top">
                  <span className="recommendation-badge">
                    ● REKOMENDASI UTAMA
                  </span>
                  <div className="recommendation-score">
                    <span>SKOR KELAYAKAN</span>
                    <strong>
                      {utama ? utama.skor : "-"}
                      {utama && <small>/100</small>}
                    </strong>
                  </div>
                </div>

                <h2>{utama ? utama.label : "Belum ada rekomendasi"}</h2>
                <p className="recommendation-tagline">
                  {namaBarang}
                  {utama ? ` — Tindakan yang disarankan untuk ${namaBarang}.` : ""}
                </p>

                <div className="recommendation-divider" />

                <h3>ALASAN UTAMA</h3>
                <p>
                  {utama?.alasan ||
                    hasil.pesanKeterbatasan ||
                    "Hasil analisis belum tersedia."}
                </p>

                {langkahPraktis.length > 0 && (
                  <>
                    <h3>LANGKAH PRAKTIS</h3>
                    <ol className="recommendation-steps">
                      {langkahPraktis.map((langkah, langkahIndex) => (
                        <li key={langkah}>
                          <span>{langkahIndex + 1}</span>
                          <p>{langkah}</p>
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {peringatan.length > 0 && (
                  <aside className="recommendation-warning">
                    <strong>⚠ Perhatikan Keselamatan</strong>
                    {peringatan.map((pesan) => (
                      <p key={pesan}>{pesan}</p>
                    ))}
                  </aside>
                )}
              </article>

              {(alternatif.length > 0 || hasil.pesanAlternatif) && (
                <section className="recommendation-alternatives">
                  <div className="recommendation-alternative-heading">
                    <h2>Opsi Alternatif</h2>
                    <span>{alternatif.length} Pilihan Lain</span>
                  </div>

                  {alternatif.length === 0 && (
                    <p>{hasil.pesanAlternatif}</p>
                  )}

                  {alternatif.map((opsi) => (
                    <article
                      className="recommendation-option"
                      key={opsi.label}
                    >
                      <div
                        className="recommendation-option-icon"
                        aria-hidden="true"
                      >
                        ↔
                      </div>
                      <div className="recommendation-option-text">
                        <h3>{opsi.label}</h3>
                        <p>{opsi.alasan}</p>
                      </div>
                      <strong>
                        {opsi.skor}
                        <small>/100</small>
                      </strong>
                    </article>
                  ))}
                </section>
              )}
            </div>
          );
        })}
      </section>

      <footer className="recommendation-footer">
        <button
          type="button"
          className="recommendation-save"
          onClick={handleSave}
        >
          ▣ Simpan Rekomendasi
        </button>
      </footer>
    </main>
  );
}
