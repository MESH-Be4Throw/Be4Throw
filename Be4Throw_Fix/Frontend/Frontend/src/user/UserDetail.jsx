import { useLocation, useNavigate } from "react-router-dom";
import "./UserDetail.css";

function IlustrasiBarang() {
  return (
    <svg
      viewBox="0 0 160 160"
      className="detail-illustration"
      role="img"
      aria-label="Ilustrasi barang"
    >
      <rect
        x="10"
        y="10"
        width="140"
        height="140"
        rx="12"
        fill="#F5F8F5"
      />
      <path
        d="M65 35h30v10l-5 8v53a8 8 0 0 1-8 8H78a8 8 0 0 1-8-8V53l-5-8V35Z"
        fill="#FFFFFF"
        stroke="#7BA88B"
        strokeWidth="2"
      />
      <path
        d="M65 35h30M70 53h20"
        stroke="#7BA88B"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="80"
        cy="79"
        r="14"
        fill="#EFF8EB"
        stroke="#B7D9A7"
        strokeDasharray="3 3"
      />
      <path
        d="m74 79 4 4 8-9"
        fill="none"
        stroke="#43865B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function UserDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedItems = location.state?.selectedItems ?? [];

  function lanjutIdentifikasi() {
    navigate("/user/identifikasi", {
      state: { selectedItems },
    });
  }

  if (selectedItems.length === 0) {
    return (
      <main className="detail-page">
        <header className="detail-header">
          <button
            type="button"
            className="detail-back"
            onClick={() => navigate("/user/katalog")}
            aria-label="Kembali ke katalog"
          >
            ←
          </button>
          <h1>Detail Barang</h1>
        </header>

        <section className="detail-empty">
          <h2>Belum ada barang dipilih</h2>
          <p>Pilih barang terlebih dahulu sebelum melanjutkan.</p>
          <button
            type="button"
            className="detail-primary-button"
            onClick={() => navigate("/user/katalog")}
          >
            Pilih Barang
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="detail-page">
      <header className="detail-header">
        <button
          type="button"
          className="detail-back"
          onClick={() => navigate("/user/katalog")}
          aria-label="Kembali ke katalog"
        >
          ←
        </button>
        <h1>Detail Barang</h1>
      </header>

      <section className="detail-content">
        {selectedItems.map((barang) => {
  const namaKategori =
    typeof barang.kategori === "object"
      ? barang.kategori?.nama
      : barang.kategori;

  const berat = barang.estimasiBerat != null
    ? `${barang.estimasiBerat} kg`
    : barang.deskripsi?.match(/\d+(?:[.,]\d+)?\s*kg/i)?.[0];

          return (
            <article className="detail-card" key={barang.id}>
              <div className="detail-image-wrap">
                <IlustrasiBarang />
                <span className="detail-image-caption">Visual referensi</span>
              </div>

              <div className="detail-field">
                <span className="detail-label">NAMA BARANG</span>
                <h2>{barang.nama}</h2>
              </div>

              <div className="detail-field">
                <span className="detail-label">KATEGORI</span>
                <span className="detail-category">
                  {namaKategori || "Belum ditentukan"}
                </span>
              </div>

              <div className="detail-field">
                <span className="detail-label">ESTIMASI BERAT</span>
                <strong className="detail-weight">
                  {berat || "Belum ditentukan"}
                </strong>
              </div>

              <p className="detail-note">
                <span aria-hidden="true">ⓘ</span>
                Pastikan barang dalam keadaan aman dan bersih sebelum
                melanjutkan proses analisis.
              </p>
            </article>
          );
        })}
      </section>

      <footer className="detail-actions">
        <button
          type="button"
          className="detail-primary-button"
          onClick={lanjutIdentifikasi}
        >
          Lanjut Identifikasi <span aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          className="detail-secondary-button"
          onClick={() => navigate("/user/katalog")}
        >
          Kembali
        </button>
      </footer>
    </main>
  );
}