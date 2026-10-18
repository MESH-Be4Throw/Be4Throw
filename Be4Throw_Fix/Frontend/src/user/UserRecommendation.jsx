import { useLocation, useNavigate } from "react-router-dom";
import "./UserRecommendation.css";

export default function UserRecommendation() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedItems = location.state?.selectedItems ?? [];
  const kondisiBarang = location.state?.kondisiBarang ?? {};
  const analisis = location.state?.analisis ?? {};
  const hasil = analisis.hasil ?? {};
  const utama = hasil.rekomendasiUtama;
  const alternatif = hasil.alternatif ?? [];

  const namaBarang = analisis.barang?.nama ?? selectedItems[0]?.nama ?? selectedItems[0]?.name ?? "Barang pilihanmu";
  const peringatan = [...new Set([...(utama?.peringatan ?? []), ...(hasil.keselamatan?.peringatan ?? [])])];
  const langkahPraktis = utama?.langkahPraktis ?? [];


function handleSave() {
  navigate("/user/dampak-lingkungan", {
    state: {
      selectedItems,
      kondisiBarang,
      rekomendasi: { ...utama, jenis: utama?.label, alternatif, dampak: hasil.dampak },
      analisis,
      analisisId: analisis.id,
      kodeAkses: location.state?.kodeAkses,
    },
  });
}

  return (
    <main className="recommendation-page">
      <header className="recommendation-header">
        <button
          type="button"
          className="recommendation-back"
          onClick={() => navigate("/user/identifikasi", {
            state: { selectedItems, kondisiBarang },
          })}
          aria-label="Kembali"
        >
          ←
        </button>
        <span>Be4Throw</span>
      </header>

      <section className="recommendation-content">
        <h1>Hasil Rekomendasi</h1>
        <p className="recommendation-subtitle">
          {utama ? "Hasil dihitung oleh backend Be4Throw berdasarkan kondisi barang yang kamu masukkan." : "Belum ada rekomendasi untuk analisis ini."}
        </p>

        <article className="recommendation-main-card">
          <div className="recommendation-card-top">
            <span className="recommendation-badge">
              ● REKOMENDASI UTAMA
            </span>
            <div className="recommendation-score">
              <span>SKOR KELAYAKAN</span>
              <strong>{utama ? utama.skor : "-"}{utama && <small>/100</small>}</strong>
            </div>
          </div>

          <h2>{utama ? utama.label : "Belum ada rekomendasi"}</h2>
          <p className="recommendation-tagline">
            {utama ? `Tindakan yang disarankan untuk ${namaBarang}.` : namaBarang}
          </p>

          <div className="recommendation-divider" />

          <h3>ALASAN UTAMA</h3>
          <p>{utama?.alasan || hasil.pesanKeterbatasan || "Hasil analisis belum tersedia."}</p>

          {langkahPraktis.length > 0 && (
            <>
              <h3>LANGKAH PRAKTIS</h3>
              <ol className="recommendation-steps">
                {langkahPraktis.map((langkah, index) => (
                  <li key={langkah}>
                    <span>{index + 1}</span>
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

          {alternatif.length === 0 && <p>{hasil.pesanAlternatif}</p>}

          {alternatif.map((item) => ({ nama: item.label, deskripsi: item.alasan, skor: item.skor })).map((opsi) => (
            <article className="recommendation-option" key={opsi.nama}>
              <div className="recommendation-option-icon" aria-hidden="true">
                ↔
              </div>
              <div className="recommendation-option-text">
                <h3>{opsi.nama}</h3>
                <p>{opsi.deskripsi}</p>
              </div>
              <strong>{opsi.skor}<small>/100</small></strong>
            </article>
          ))}
        </section>
        )}
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