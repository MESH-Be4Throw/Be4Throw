import { useLocation, useNavigate } from "react-router-dom";
import "./UserRecommendation.css";

const rekomendasiDummy = {
  jenis: "Daur Ulang",
  skor: 85,
  alasan:
    "Material barang dapat diproses kembali melalui jalur daur ulang yang sesuai. Pastikan barang dalam keadaan bersih sebelum disalurkan.",
  langkah: [
    "Bersihkan barang dari sisa kotoran.",
    "Lepaskan bagian yang berbeda material jika memungkinkan.",
    "Pisahkan berdasarkan kategori material.",
    "Kumpulkan di tempat daur ulang yang sesuai.",
  ],
  alternatif: [
    { nama: "Perbaiki", deskripsi: "Pertimbangkan jika kerusakan masih dapat diperbaiki.", skor: 40 },
    { nama: "Gunakan Kembali", deskripsi: "Manfaatkan kembali jika barang masih layak digunakan.", skor: 20 },
  ],
};

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
  const namaTindakan = (nilai) => ({ gunakan_kembali: "Gunakan Kembali", perbaiki: "Perbaiki", daur_ulang: "Daur Ulang", donasikan: "Donasikan", jual: "Jual", buang_aman: "Penanganan Aman" }[nilai] || nilai || "Belum tersedia");


function handleSave() {
  navigate("/user/dampak-lingkungan", {
    state: {
      selectedItems,
      kondisiBarang,
      rekomendasi: utama ? { ...utama, jenis: utama.label, alternatif, dampak: hasil.dampak } : rekomendasiDummy,
      analisis,
      analisisId: analisis.id,
      kodeAkses: location.state?.kodeAkses,
      simulasi: !utama,
    },
  });
}

  return (
    <main className="recommendation-page">
      <header className="recommendation-header">
        <button
          type="button"
          className="recommendation-back"
          onClick={() => navigate("/user/analisis", {
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
          {utama ? "Hasil dihitung oleh backend Be4Throw berdasarkan kondisi barang yang kamu masukkan." : "Hasil analisis belum tersedia."}
        </p>

        <article className="recommendation-main-card">
          <div className="recommendation-card-top">
            <span className="recommendation-badge">
              ● REKOMENDASI UTAMA
            </span>
            <div className="recommendation-score">
              <span>SKOR KELAYAKAN</span>
              <strong>{utama?.skor ?? rekomendasiDummy.skor}<small>/100</small></strong>
            </div>
          </div>

          <h2>{utama ? utama.label : rekomendasiDummy.jenis}</h2>
          <p className="recommendation-tagline">
            Tindakan yang disarankan untuk {namaBarang}.
          </p>

          <div className="recommendation-divider" />

          <h3>ALASAN UTAMA</h3>
          <p>{utama?.alasan || rekomendasiDummy.alasan}</p>

          <h3>LANGKAH PRAKTIS</h3>
          <ol className="recommendation-steps">
            {(utama?.langkahPraktis?.length ? utama.langkahPraktis : rekomendasiDummy.langkah).map((langkah, index) => (
              <li key={langkah}>
                <span>{index + 1}</span>
                <p>{langkah}</p>
              </li>
            ))}
          </ol>

          <aside className="recommendation-warning">
            <strong>⚠ Perhatikan Keselamatan</strong>
            <p>
              Jangan menangani baterai, bahan kimia, atau komponen berbahaya
              tanpa prosedur yang sesuai.
            </p>
          </aside>
        </article>

        <section className="recommendation-alternatives">
          <div className="recommendation-alternative-heading">
            <h2>Opsi Alternatif</h2>
            <span>2 Pilihan Lain</span>
          </div>

          {(alternatif.length ? alternatif.map((item) => ({ nama: item.label, deskripsi: item.alasan, skor: item.skor })) : rekomendasiDummy.alternatif).map((opsi) => (
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

        {!utama && <p className="recommendation-demo-note">Backend belum mengembalikan rekomendasi utama untuk analisis ini.</p>}
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