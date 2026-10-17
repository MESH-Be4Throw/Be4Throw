
import { useState } from "react";
import { apiRequest } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import "./UserIdentify.css";

const kondisiFisik = [
  "Tergores/Lecet",
  "Penyok/Retak",
  "Berkarat/Korosi",
  "Kabel Terkelupas",
  "Bagian Hilang/Copot",
  "Berjamur/Kotor Berat",
];

export default function UserIdentify() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedItems = location.state?.selectedItems ?? [];

  const [fungsi, setFungsi] = useState("penuh");
  const [kondisi, setKondisi] = useState([]);
  const [usia, setUsia] = useState("");
  const [kelengkapan, setKelengkapan] = useState("80");
  const [bahaya, setBahaya] = useState("aman");
  const [error, setError] = useState("");
  const [beratKg, setBeratKg] = useState(String(selectedItems[0]?.estimasiBerat || ""));
  const [loading, setLoading] = useState(false);

  function toggleKondisi(item) {
    setKondisi((sebelumnya) =>
      sebelumnya.includes(item)
        ? sebelumnya.filter((nama) => nama !== item)
        : [...sebelumnya, item]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!selectedItems.length || !selectedItems[0]?.id) {
      setError("Pilih barang dari katalog terlebih dahulu.");
      return;
    }
    if (usia !== "" && (Number(usia) < 0 || Number(usia) > 50)) {
      setError("Usia barang harus antara 0 sampai 50 tahun.");
      return;
    }
    if (kelengkapan === "" || Number(kelengkapan) < 0 || Number(kelengkapan) > 100) {
      setError("Persentase kelengkapan harus antara 0 sampai 100.");
      return;
    }
    if (!beratKg || !Number.isFinite(Number(beratKg)) || Number(beratKg) <= 0 || Number(beratKg) > 1000) {
      setError("Masukkan berat barang lebih dari 0 sampai maksimal 1000 kg.");
      return;
    }

    const kategori = String(selectedItems[0]?.kategori?.nama || selectedItems[0]?.kategori || "").toLowerCase();
    const kondisiMap = kategori.includes("pakaian")
      ? { "Tergores/Lecet": "sobek", "Penyok/Retak": "sobek", "Berkarat/Korosi": "noda", "Kabel Terkelupas": "bagian_hilang", "Bagian Hilang/Copot": "bagian_hilang", "Berjamur/Kotor Berat": "berjamur" }
      : kategori.includes("plastik")
        ? { "Tergores/Lecet": "tergores", "Penyok/Retak": "retak", "Berkarat/Korosi": "berubah_bentuk", "Kabel Terkelupas": "noda", "Bagian Hilang/Copot": "berubah_bentuk", "Berjamur/Kotor Berat": "berjamur" }
        : kategori.includes("furnitur")
          ? { "Tergores/Lecet": "tergores", "Penyok/Retak": "patah", "Berkarat/Korosi": "berkarat", "Kabel Terkelupas": "bagian_hilang", "Bagian Hilang/Copot": "bagian_hilang", "Berjamur/Kotor Berat": "berjamur" }
          : { "Tergores/Lecet": "tergores", "Penyok/Retak": "retak", "Berkarat/Korosi": "berkarat", "Kabel Terkelupas": "kabel_terkelupas", "Bagian Hilang/Copot": "bagian_hilang" };
    const kondisiFisik = [...new Set(kondisi.map((item) => kondisiMap[item]).filter(Boolean))];
    const tipeBahaya = kategori.includes("elektronik") ? "baterai" : kategori.includes("pakaian") ? "bahan_kimia" : "benda_tajam";
    const jawaban = {
      fungsi_utama: fungsi === "penuh" ? "berfungsi_penuh" : fungsi === "sebagian" ? "berfungsi_sebagian" : "tidak_berfungsi",
      kondisi_fisik: kondisiFisik.length ? kondisiFisik : ["tidak_ada"],
      usia_tahun: usia === "" ? "tidak_tahu" : Number(usia),
      kelengkapan: Number(kelengkapan),
      mengandung_bahaya: bahaya === "berbahaya" ? "ya" : "tidak",
      ...(bahaya === "berbahaya" ? { jenis_bahaya: [tipeBahaya] } : {}),
    };

    setLoading(true);
    try {
      const response = await apiRequest("/analisis", {
        method: "POST",
        body: JSON.stringify({ barangId: Number(selectedItems[0].id), beratKg: Number(beratKg), jawaban, kirim: true }),
      });
      const analisis = response.data;
      navigate("/user/analisis", {
        state: { selectedItems, kondisiBarang: { fungsi, kondisiFisik: kondisi, usiaTahun: usia === "" ? null : Number(usia), persentaseKelengkapan: Number(kelengkapan), indikatorBahaya: bahaya }, analisisId: analisis.id, kodeAkses: analisis.kodeAkses || null },
      });
    } catch (err) {
      setError(err.errors?.map((item) => item.message).join(" ") || err.message || "Gagal menyimpan identifikasi ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="identify-page">
      <header className="identify-header">
        <button
          type="button"
          className="identify-back"
          onClick={() => navigate(-1)}
          aria-label="Kembali"
        >
          ←
        </button>

        <span className="identify-back-label">Batal</span>
        <h1>Identifikasi Kondisi</h1>
      </header>

      <form className="identify-content" onSubmit={handleSubmit}>
        <p className="identify-description">
          Berikan detail kondisi barang secara akurat untuk mempermudah
          proses evaluasi.
        </p>

        <section className="identify-section">
          <h2>Fungsi Utama</h2>
          <p className="identify-hint">
            Apakah barang masih dapat berfungsi?
          </p>

          <div className="identify-function-options">
            <label
              className={`identify-function-card ${
                fungsi === "penuh" ? "active" : ""
              }`}
            >
              <input
                type="radio"
                name="fungsi"
                value="penuh"
                checked={fungsi === "penuh"}
                onChange={() => setFungsi("penuh")}
              />
              <span className="identify-radio" />
              <span className="identify-option-text">
                <strong>Berfungsi Penuh</strong>
                <small>Barang beroperasi normal tanpa kendala.</small>
              </span>
            </label>

            <label
              className={`identify-function-card ${
                fungsi === "sebagian" ? "active" : ""
              }`}
            >
              <input
                type="radio"
                name="fungsi"
                value="sebagian"
                checked={fungsi === "sebagian"}
                onChange={() => setFungsi("sebagian")}
              />
              <span className="identify-radio" />
              <span className="identify-option-text">
                <strong>Berfungsi Sebagian</strong>
                <small>
                  Ada kerusakan ringan. Beberapa fungsi mungkin tidak
                  berjalan optimal.
                </small>
              </span>
            </label>

            <label
              className={`identify-function-card ${
                fungsi === "tidak" ? "active" : ""
              }`}
            >
              <input
                type="radio"
                name="fungsi"
                value="tidak"
                checked={fungsi === "tidak"}
                onChange={() => setFungsi("tidak")}
              />
              <span className="identify-radio" />
              <span className="identify-option-text">
                <strong>Tidak Berfungsi</strong>
                <small>
                  Barang tidak dapat menyala atau tidak berfungsi sama
                  sekali.
                </small>
              </span>
            </label>
          </div>
        </section>

        <section className="identify-section">
          <h2>Kondisi Fisik</h2>
          <p className="identify-hint">
            Pilih semua yang sesuai dengan kondisi fisik barang saat ini.
          </p>

          <div className="identify-checkbox-list">
            {kondisiFisik.map((item) => (
              <label className="identify-checkbox-card" key={item}>
                <input
                  type="checkbox"
                  checked={kondisi.includes(item)}
                  onChange={() => toggleKondisi(item)}
                />
                <span className="identify-custom-checkbox">
                  {kondisi.includes(item) ? "✓" : ""}
                </span>
                <span>{item}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="identify-section">
          <h2>Berat Barang</h2>
          <label className="identify-field">
            <span>Perkiraan berat barang (kg)</span>
            <input type="number" min="0.01" max="1000" step="0.01" placeholder="Misal: 1.5" value={beratKg} onChange={(event) => setBeratKg(event.target.value)} required />
          </label>
        </section>

        <section className="identify-section">
          <h2>Informasi Tambahan</h2>

          <label className="identify-field">
            <span>Perkiraan Usia Barang (Tahun)</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Misal: 3"
              value={usia}
              onChange={(event) => setUsia(event.target.value)}
            />
          </label>

          <label className="identify-field">
            <span>Persentase Kelengkapan (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Misal: 80"
              value={kelengkapan}
              onChange={(event) => setKelengkapan(event.target.value)}
            />
          </label>
        </section>

        <section className="identify-safety">
          <h2>
            <span aria-hidden="true">⚠</span> Indikator Bahaya (B3)
          </h2>
          <p>
            Apakah barang ini mengandung bahan kimia berbahaya, baterai
            rusak, atau cairan yang bocor?
          </p>

          <label
            className={`identify-safety-option ${
              bahaya === "berbahaya" ? "active danger" : ""
            }`}
          >
            <input
              type="radio"
              name="bahaya"
              value="berbahaya"
              checked={bahaya === "berbahaya"}
              onChange={() => setBahaya("berbahaya")}
            />
            <span className="identify-radio" />
            <span>Ya, Mengandung Bahaya</span>
          </label>

          <label
            className={`identify-safety-option ${
              bahaya === "aman" ? "active" : ""
            }`}
          >
            <input
              type="radio"
              name="bahaya"
              value="aman"
              checked={bahaya === "aman"}
              onChange={() => setBahaya("aman")}
            />
            <span className="identify-radio" />
            <span>Tidak, Aman</span>
          </label>
        </section>

        {error && (
          <p className="identify-error" role="alert">
            {error}
          </p>
        )}

        <footer className="identify-actions">
          <button
            type="button"
            className="identify-previous-button"
            onClick={() => navigate(-1)}
          >
            Sebelumnya
          </button>

          <button type="submit" className="identify-next-button" disabled={loading}>
            {loading ? "Menyimpan..." : <>Lanjut <span aria-hidden="true">→</span></>}
          </button>
        </footer>
      </form>
    </main>
  );
}