
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, fileUrl } from "../services/api";
import "./UserCatalog.css";

function getNamaKategori(barang) {
  return typeof barang.kategori === "object"
    ? barang.kategori?.nama ?? "Lainnya"
    : barang.kategori ?? "Lainnya";
}

function getDeskripsi(barang) {
  const berat = barang.estimasiBerat;

  return berat != null
    ? `Estimasi berat ${berat} kg`
    : "Berat belum ditentukan";
}

// Gambar barang dari admin (Barang.gambar); ikon kategori dipakai kalau kosong atau gagal dimuat
function IkonBarang({ barang, kategori }) {
  const [gagal, setGagal] = useState(false);

  if (!barang.gambar || gagal) return getIkon(kategori);

  return (
    <img
      src={fileUrl(barang.gambar)}
      alt=""
      className="catalog-item-image"
      loading="lazy"
      onError={() => setGagal(true)}
    />
  );
}

function getIkon(kategori) {
  const nama = kategori.toLowerCase();

  if (nama.includes("elektronik")) return "▣";
  if (nama.includes("plastik")) return "♧";
  if (nama.includes("furnitur") || nama.includes("kayu")) return "▤";
  if (nama.includes("pakaian") || nama.includes("tekstil")) return "▱";

  return "♧";
}

export default function UserCatalog() {
  const navigate = useNavigate();

  const [daftarBarang, setDaftarBarang] = useState([]);
  const [pencarian, setPencarian] = useState("");
  const [kategoriAktif, setKategoriAktif] = useState("Semua");
  const [barangTerpilih, setBarangTerpilih] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let aktif = true;

    async function ambilBarang() {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest("/barang");
        const data = response.data ?? response;

        if (aktif) {
          setDaftarBarang(data.barang ?? []);
        }
      } catch (err) {
        if (aktif) {
          setError(err.message || "Gagal mengambil daftar barang.");
        }
      } finally {
        if (aktif) setLoading(false);
      }
    }

    ambilBarang();

    return () => {
      aktif = false;
    };
  }, []);

  const kategoriBarang = useMemo(() => {
    const kategori = daftarBarang.map(getNamaKategori);

    return ["Semua", ...new Set(kategori)];
  }, [daftarBarang]);

  const hasilFilter = useMemo(() => {
    return daftarBarang.filter((barang) => {
      const namaKategori = getNamaKategori(barang);

      const cocokKategori =
        kategoriAktif === "Semua" ||
        namaKategori === kategoriAktif;

      const cocokPencarian = barang.nama
        .toLowerCase()
        .includes(pencarian.trim().toLowerCase());

      return cocokKategori && cocokPencarian;
    });
  }, [daftarBarang, pencarian, kategoriAktif]);

  function toggleBarang(id) {
    setBarangTerpilih((sebelumnya) =>
      sebelumnya.includes(id) ? [] : [id]
    );
  }

  function lanjutKeDetail() {
    if (barangTerpilih.length === 0) return;

    const selectedItems = daftarBarang
      .filter((barang) => barangTerpilih.includes(barang.id))
      .map((barang) => ({
        ...barang,
        deskripsi: getDeskripsi(barang),
      }));

    navigate("/user/detail", {
      state: { selectedItems },
    });
  }

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <button
          type="button"
          className="catalog-back"
          onClick={() => navigate("/user")}
          aria-label="Kembali ke halaman utama"
        >
          ←
        </button>

        <h1>Pilih Barang</h1>
      </header>

      <section className="catalog-content">
        <div className="catalog-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Cari nama barang..."
            aria-label="Cari nama barang"
            value={pencarian}
            onChange={(event) => setPencarian(event.target.value)}
          />

          {pencarian && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => setPencarian("")}
            >
              ×
            </button>
          )}
        </div>

        {!loading && !error && daftarBarang.length > 0 && (
          <nav className="catalog-categories" aria-label="Kategori barang">
            {kategoriBarang.map((kategori) => (
              <button
                type="button"
                key={kategori}
                className={kategoriAktif === kategori ? "active" : ""}
                onClick={() => setKategoriAktif(kategori)}
              >
                {kategori}
              </button>
            ))}
          </nav>
        )}

        <div className="catalog-list">
          {loading ? (
            <div className="catalog-empty">
              <h2>Memuat daftar barang...</h2>
              <p>Sedang mengambil data dari database.</p>
            </div>
          ) : error ? (
            <div className="catalog-empty">
              <h2>Gagal memuat barang</h2>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Coba lagi
              </button>
            </div>
          ) : hasilFilter.length > 0 ? (
            hasilFilter.map((barang) => {
              const terpilih = barangTerpilih.includes(barang.id);
              const kategori = getNamaKategori(barang);

              return (
                <article
                  className={`catalog-item ${terpilih ? "selected" : ""}`}
                  key={barang.id}
                >
                  <div className="catalog-item-icon" aria-hidden="true">
                    <IkonBarang barang={barang} kategori={kategori} />
                  </div>

                  <div className="catalog-item-info">
                    <span className="catalog-item-category">
                      {kategori}
                    </span>
                    <h2>{barang.nama}</h2>
                    <p>{getDeskripsi(barang)}</p>
                  </div>

                  <button
                    type="button"
                    className={`catalog-select-button ${
                      terpilih ? "is-selected" : ""
                    }`}
                    onClick={() => toggleBarang(barang.id)}
                    aria-pressed={terpilih}
                  >
                    {terpilih ? "Batal" : "Pilih"}
                  </button>

                  {terpilih && <span className="catalog-check" aria-hidden="true" />}
                </article>
              );
            })
          ) : (
            <div className="catalog-empty">
              <span aria-hidden="true">⌕</span>
              <h2>
                {daftarBarang.length === 0
                  ? "Belum ada barang tersedia"
                  : "Barang tidak ditemukan"}
              </h2>
              <p>
                Coba kata kunci atau kategori lainnya.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPencarian("");
                  setKategoriAktif("Semua");
                }}
              >
                Reset pencarian
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="catalog-bottom">
        <div className="catalog-total">
          <span>TOTAL TERPILIH</span>
          <strong>
            {barangTerpilih.length} Barang
          </strong>
        </div>

        <button
          type="button"
          className="catalog-continue"
          disabled={barangTerpilih.length === 0 || loading || Boolean(error)}
          onClick={lanjutKeDetail}
        >
          Lanjut ke Detail <span aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  );
}
