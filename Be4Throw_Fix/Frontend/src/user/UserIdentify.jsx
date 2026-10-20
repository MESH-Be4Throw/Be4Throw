import { Fragment, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import "./UserIdentify.css";

// Kode pertanyaan inti yang punya bagian khusus di halaman ini (kode ditetapkan BE, lihat prisma/seed.js)
const KODE_INTI = ["fungsi_utama", "kondisi_fisik", "usia_tahun", "kelengkapan", "mengandung_bahaya"];

// Opsi "tidak ada" bersifat eksklusif di BE (logic/validasiJawaban.js)
const OPSI_EKSKLUSIF = "tidak_ada";

// BE hanya mengirim label opsi; keterangan singkat ini teks tampilan FE per nilai opsi
const KETERANGAN_OPSI = {
  berfungsi_penuh: "Barang beroperasi normal tanpa kendala.",
  berfungsi_sebagian:
    "Ada kerusakan ringan. Beberapa fungsi mungkin tidak berjalan optimal.",
  tidak_berfungsi: "Barang tidak dapat menyala atau tidak berfungsi sama sekali.",
};

const daftarOpsi = (pertanyaan) =>
  Array.isArray(pertanyaan.opsi) ? pertanyaan.opsi : [];

export default function UserIdentify() {
  const navigate = useNavigate();
  const location = useLocation();

const selectedItems = location.state?.selectedItems ?? [];

const [indeksBarang, setIndeksBarang] = useState(0);
const barang = selectedItems[indeksBarang];
const kategoriId = barang?.kategori?.id;

const [dataSemuaBarang, setDataSemuaBarang] = useState({});
const [analisisTersimpan, setAnalisisTersimpan] = useState({});

  const [pertanyaan, setPertanyaan] = useState([]);
  const [jawaban, setJawaban] = useState({});
  const [loadingPertanyaan, setLoadingPertanyaan] = useState(true);
  const [error, setError] = useState("");
  const [beratKg, setBeratKg] = useState(String(barang?.estimasiBerat || ""));
  const [loading, setLoading] = useState(false);

useEffect(() => {
  let aktif = true;

  setLoadingPertanyaan(true);
  setPertanyaan([]);
  setError("");

  if (!kategoriId) {
    setLoadingPertanyaan(false);
    setError("Pilih barang dari katalog terlebih dahulu.");
    return undefined;
  }

  apiRequest(`/kategori/${kategoriId}/pertanyaan`)
    .then((response) => {
      if (aktif) {
        setPertanyaan(response.data?.pertanyaan ?? []);
      }
    })
    .catch((err) => {
      if (aktif) {
        setError(
          err.message || "Gagal memuat pertanyaan dari server."
        );
      }
    })
    .finally(() => {
      if (aktif) setLoadingPertanyaan(false);
    });

  return () => {
    aktif = false;
  };
}, [kategoriId]);

  const cari = (kode) => pertanyaan.find((item) => item.kode === kode);
  const pFungsi = cari("fungsi_utama");
  const pKondisi = cari("kondisi_fisik");
  const pUsia = cari("usia_tahun");
  const pKelengkapan = cari("kelengkapan");
  const pBahaya = cari("mengandung_bahaya");

  // Pertanyaan lanjutan hanya tampil kalau jawaban induknya cocok dengan tampilJika (sama seperti BE)
  const lanjutanTampil = (induk) =>
    (induk?.lanjutan ?? []).filter(
      (item) => jawaban[induk.kode] === item.tampilJika?.jawaban
    );

  const lanjutanBahaya = lanjutanTampil(pBahaya);

  // Pertanyaan buatan admin (kode di luar pertanyaan inti) ditampilkan sebagai bagian tambahan
  const pertanyaanTambahan = pertanyaan
    .filter((item) => !KODE_INTI.includes(item.kode))
    .flatMap((item) => [item, ...lanjutanTampil(item)]);

  // Lanjutan milik pertanyaan inti selain bahaya juga ditampilkan sebagai bagian tambahan
  const lanjutanInti = pertanyaan
    .filter((item) => KODE_INTI.includes(item.kode) && item.kode !== "mengandung_bahaya")
    .flatMap(lanjutanTampil);

  const bagianTambahan = [...pertanyaanTambahan, ...lanjutanInti];
  const pertanyaanTampil = [
    ...pertanyaan.filter((item) => KODE_INTI.includes(item.kode)),
    ...lanjutanBahaya,
    ...bagianTambahan,
  ];

  function ubahJawaban(kode, nilai) {
    setJawaban((sebelumnya) => ({ ...sebelumnya, [kode]: nilai }));
  }

  function togglePilihan(kode, nilai) {
    setJawaban((sebelumnya) => {
      const lama = sebelumnya[kode] ?? [];
      let baru;

      if (lama.includes(nilai)) baru = lama.filter((item) => item !== nilai);
      else if (nilai === OPSI_EKSKLUSIF) baru = [OPSI_EKSKLUSIF];
      else baru = [...lama.filter((item) => item !== OPSI_EKSKLUSIF), nilai];

      return { ...sebelumnya, [kode]: baru };
    });
  }

  // Jawaban dikirim persis dalam format BE: { kode_pertanyaan: nilai }
  function susunJawaban() {
    const hasil = {};

    pertanyaanTampil.forEach((item) => {
      const nilai = jawaban[item.kode];

      if (item.tipe === "angka") {
        if (nilai === undefined || nilai === "") {
          if (item.bolehTidakTahu) hasil[item.kode] = "tidak_tahu";
        } else {
          hasil[item.kode] = Number(nilai);
        }
      } else if (item.tipe === "pilihan_ganda") {
        if (nilai?.length) hasil[item.kode] = nilai;
      } else if (nilai) {
        hasil[item.kode] = nilai;
      }
    });

    return hasil;
  }

  function pesanError(err) {
    if (!err.errors?.length) {
      return err.message || "Gagal menyimpan identifikasi ke server.";
    }

    const semuaPertanyaan = pertanyaan.flatMap((item) => [item, ...(item.lanjutan ?? [])]);

    return err.errors
      .map((item) => {
        const kode = String(item.field || "").replace(/^jawaban\./, "");
        const teks = semuaPertanyaan.find((p) => p.kode === kode)?.teks;
        return teks ? `${teks} ${item.message}.` : item.message;
      })
      .join(" ");
  }

  function handlePreviousItem() {
  if (indeksBarang === 0) {
    navigate(-1);
    return;
  }

  const indeksSebelumnya = indeksBarang - 1;
  const dataSebelumnya = dataSemuaBarang[indeksSebelumnya];

  setIndeksBarang(indeksSebelumnya);
  setJawaban(dataSebelumnya?.jawaban ?? {});
  setBeratKg(
    String(
      dataSebelumnya?.beratKg ??
      selectedItems[indeksSebelumnya]?.estimasiBerat ??
      ""
    )
  );
  setError("");
}

  async function handleSubmit(event) {
  event.preventDefault();
  setError("");

  if (!selectedItems.length || !barang?.id) {
    setError("Pilih barang dari katalog terlebih dahulu.");
    return;
  }

  if (beratKg === "" || !Number.isFinite(Number(beratKg)) ||
      Number(beratKg) <= 0 || Number(beratKg) > 1000) {
    setError("Masukkan berat barang yang valid.");
    return;
  }

  const dataSaatIni = {
    jawaban: susunJawaban(),
    beratKg: Number(beratKg),
  };

  const semuaData = {
    ...dataSemuaBarang,
    [indeksBarang]: dataSaatIni,
  };

  setDataSemuaBarang(semuaData);

  // Jika masih ada barang berikutnya, pindah tanpa mengirim analisis.
  if (indeksBarang < selectedItems.length - 1) {
    const indeksBerikutnya = indeksBarang + 1;
    const dataBerikutnya = semuaData[indeksBerikutnya];

    setIndeksBarang(indeksBerikutnya);
    setJawaban(dataBerikutnya?.jawaban ?? {});
    setBeratKg(
      String(
        dataBerikutnya?.beratKg ??
        selectedItems[indeksBerikutnya]?.estimasiBerat ??
        ""
      )
    );

    return;
  }

  setLoading(true);

  try {
    const semuaAnalisis = { ...analisisTersimpan };

    // Buat satu analisis untuk setiap barang yang belum berhasil dibuat.
    for (let i = 0; i < selectedItems.length; i++) {
      if (semuaAnalisis[i]) continue;

      const item = selectedItems[i];
      const data = semuaData[i];

      if (!data) {
        throw new Error(
          `Data identifikasi ${item.nama || "barang"} belum tersedia.`
        );
      }

      try {
        const response = await apiRequest("/analisis", {
          method: "POST",
          body: JSON.stringify({
            barangId: Number(item.id),
            beratKg: data.beratKg,
            jawaban: data.jawaban,
            kirim: true,
          }),
        });

        semuaAnalisis[i] = {
          ...response.data,
          kodeAkses: response.data?.kodeAkses || null,
          selectedItem: item,
          kondisiBarang: {
            jawaban: data.jawaban,
            beratKg: response.data?.beratKg ?? data.beratKg,
          },
        };

        setAnalisisTersimpan({ ...semuaAnalisis });
      } catch (err) {
        setIndeksBarang(i);
        setJawaban(data.jawaban);
        setBeratKg(String(data.beratKg));

        throw err;
      }
    }

    const daftarAnalisis = selectedItems.map((item, i) => ({
      ...semuaAnalisis[i],
      selectedItem: item,
    }));

    navigate("/user/analisis", {
      state: {
        selectedItems,
        analyses: daftarAnalisis,
      },
    });
  } catch (err) {
    setError(pesanError(err));
  } finally {
    setLoading(false);
  }
}
  function renderPilihanTunggal(item, gaya) {
    return daftarOpsi(item).map((opsi) => {
      const aktif = jawaban[item.kode] === opsi.nilai;

      if (gaya === "bahaya") {
        return (
          <label
            key={opsi.nilai}
            className={`identify-safety-option ${
              aktif ? `active ${opsi.nilai === "ya" ? "danger" : ""}` : ""
            }`}
          >
            <input
              type="radio"
              name={item.kode}
              value={opsi.nilai}
              checked={aktif}
              onChange={() => ubahJawaban(item.kode, opsi.nilai)}
            />
            <span className="identify-radio" />
            <span>{opsi.label}</span>
          </label>
        );
      }

      return (
        <label
          key={opsi.nilai}
          className={`identify-function-card ${aktif ? "active" : ""}`}
        >
          <input
            type="radio"
            name={item.kode}
            value={opsi.nilai}
            checked={aktif}
            onChange={() => ubahJawaban(item.kode, opsi.nilai)}
          />
          <span className="identify-radio" />
          <span className="identify-option-text">
            <strong>{opsi.label}</strong>
            {KETERANGAN_OPSI[opsi.nilai] && (
              <small>{KETERANGAN_OPSI[opsi.nilai]}</small>
            )}
          </span>
        </label>
      );
    });
  }

  function renderPilihanGanda(item) {
    const terpilih = jawaban[item.kode] ?? [];

    return daftarOpsi(item).map((opsi) => (
      <label className="identify-checkbox-card" key={opsi.nilai}>
        <input
          type="checkbox"
          checked={terpilih.includes(opsi.nilai)}
          onChange={() => togglePilihan(item.kode, opsi.nilai)}
        />
        <span className="identify-custom-checkbox">
          {terpilih.includes(opsi.nilai) ? "✓" : ""}
        </span>
        <span>{opsi.label}</span>
      </label>
    ));
  }

  function renderAngka(item) {
    const { min, max, satuan } = item.opsi || {};
    const punyaRentang = min !== undefined && max !== undefined;

    return (
      <label className="identify-field" key={item.kode}>
        <span>
          {item.teks}
          {satuan ? ` (${satuan})` : ""}
        </span>
        <input
          type="number"
          min={min}
          max={max}
          step="1"
          placeholder={
            item.bolehTidakTahu
              ? "Kosongkan jika tidak tahu"
              : punyaRentang
                ? `${min} - ${max}`
                : ""
          }
          value={jawaban[item.kode] ?? ""}
          onChange={(event) => ubahJawaban(item.kode, event.target.value)}
        />
      </label>
    );
  }

  function renderTambahan(item) {
    if (item.tipe === "angka") {
      return (
        <section className="identify-section" key={item.kode}>
          {renderAngka(item)}
        </section>
      );
    }

    return (
      <section className="identify-section" key={item.kode}>
        <h2>{item.teks}</h2>
        {item.tipe === "pilihan_ganda" ? (
          <div className="identify-checkbox-list">{renderPilihanGanda(item)}</div>
        ) : (
          <div className="identify-function-options">
            {renderPilihanTunggal(item, "kartu")}
          </div>
        )}
      </section>
    );
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

        {loadingPertanyaan && (
          <p className="identify-hint">Memuat pertanyaan dari server...</p>
        )}

        {pFungsi && (
          <section className="identify-section">
            <h2>Fungsi Utama</h2>
            <p className="identify-hint">{pFungsi.teks}</p>

            <div className="identify-function-options">
              {renderPilihanTunggal(pFungsi, "kartu")}
            </div>
          </section>
        )}

        {pKondisi && (
          <section className="identify-section">
            <h2>Kondisi Fisik</h2>
            <p className="identify-hint">{pKondisi.teks}</p>

            <div className="identify-checkbox-list">
              {renderPilihanGanda(pKondisi)}
            </div>
          </section>
        )}

        <section className="identify-section">
          <h2>Berat Barang</h2>
          <label className="identify-field">
            <span>Perkiraan berat barang (kg)</span>
            <input type="number" min="0.01" max="1000" step="0.01" placeholder="Misal: 1.5" value={beratKg} onChange={(event) => setBeratKg(event.target.value)} required />
          </label>
        </section>

        {(pUsia || pKelengkapan) && (
          <section className="identify-section">
            <h2>Informasi Tambahan</h2>

            {pUsia && renderAngka(pUsia)}
            {pKelengkapan && renderAngka(pKelengkapan)}
          </section>
        )}

        {pBahaya && (
          <section className="identify-safety">
            <h2>
              <span aria-hidden="true">⚠</span> Indikator Bahaya (B3)
            </h2>
            <p>{pBahaya.teks}</p>

            {renderPilihanTunggal(pBahaya, "bahaya")}

            {lanjutanBahaya.map((item) => (
              <Fragment key={item.kode}>
                <p>{item.teks}</p>
                <div className="identify-checkbox-list">
                  {renderPilihanGanda(item)}
                </div>
              </Fragment>
            ))}
          </section>
        )}

        {bagianTambahan.map(renderTambahan)}

        {error && (
          <p className="identify-error" role="alert">
            {error}
          </p>
        )}

        <footer className="identify-actions">
          <button
            type="button"
           className="identify-previous-button"
           onClick={handlePreviousItem}
           > 
               Sebelumnya
              </button>

          <button
            type="submit"
            className="identify-next-button"
            disabled={loading || loadingPertanyaan}
          >
            {loading ? "Menyimpan..." : <>Lanjut <span aria-hidden="true">→</span></>}
          </button>
        </footer>
      </form>
    </main>
  );
}
