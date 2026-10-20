
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./UserAnalyzing.css";

const tahapan = [
  "Evaluasi Kondisi",
  "Pemeriksaan Keselamatan",
  "Perhitungan Skor Solusi",
];

const prosesBerjalan = new Map();

function prosesAnalisis(analisisId, headers) {
  if (!prosesBerjalan.has(analisisId)) {
    const request = apiRequest(`/analisis/${analisisId}/proses`, {
      method: "POST",
      headers,
    }).finally(() => prosesBerjalan.delete(analisisId));

    prosesBerjalan.set(analisisId, request);
  }

  return prosesBerjalan.get(analisisId);
}

async function prosesSatuAnalisis(item) {
  const headers = item.kodeAkses
    ? { "X-Kode-Akses": item.kodeAkses }
    : {};

  try {
    const response = await prosesAnalisis(item.id, headers);
    return response.data;
  } catch (err) {
    if (err.status !== 409) throw err;

    const response = await apiRequest(`/analisis/${item.id}`, {
      headers,
    });

    return response.data;
  }
}

export default function UserAnalyzing() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tahapAktif, setTahapAktif] = useState(0);
  const [dibatalkan, setDibatalkan] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let aktif = true;
    const timer = setInterval(() => {
      setTahapAktif((t) => Math.min(t + 1, tahapan.length - 1));
    }, 900);

    async function prosesSemua() {
      const daftar = location.state?.analyses ?? [];

      if (!daftar.length) {
        setError(
          "Data analisis tidak ditemukan. Silakan ulangi identifikasi."
        );
        return;
      }

      try {
        const hasilSemua = [];

        for (const item of daftar) {
          if (!item?.id) {
            throw new Error("ID analisis salah satu barang tidak ditemukan.");
          }

          const hasil = await prosesSatuAnalisis(item);

          hasilSemua.push({
            ...item,
            analisis: hasil,
          });
        }

        if (aktif) {
          navigate("/user/rekomendasi", {
            replace: true,
            state: {
              ...location.state,
              analyses: hasilSemua,
              analisis: hasilSemua[0]?.analisis ?? {},
              analisisId: hasilSemua[0]?.id,
              kodeAkses: hasilSemua[0]?.kodeAkses ?? null,
              kondisiBarang: hasilSemua[0]?.kondisiBarang ?? {},
            },
          });
        }
      } catch (err) {
        if (aktif) {
          setError(
            err.errors?.map((item) => item.message).join(" ") ||
              err.message ||
              "Analisis gagal diproses."
          );
        }
      }
    }

    prosesSemua();

    return () => {
      aktif = false;
      clearInterval(timer);
    };
  }, [dibatalkan, location.state, navigate]);

  function handleCancel() {
    setDibatalkan(true);

    navigate("/user/identifikasi", {
      state: {
        selectedItems: location.state?.selectedItems ?? [],
      },
    });
  }

  const persentase = Math.round(
    ((tahapAktif + 1) / tahapan.length) * 100
  );

  return (
    <main className="analyzing-page">
      <header className="analyzing-header">
        <span className="analyzing-brand">Be4Throw</span>
      </header>

      <section className="analyzing-content">
        {error && (
          <div
            role="alert"
            style={{
              padding: "16px",
              marginBottom: "16px",
              borderRadius: "10px",
              background: "#fff0f0",
              color: "#8a1c1c",
            }}
          >
            <strong>Analisis belum berhasil</strong>
            <p>{error}</p>
            <button
              type="button"
              onClick={() =>
                navigate("/user/identifikasi", {
                  state: {
                    selectedItems: location.state?.selectedItems || [],
                  },
                })
              }
            >
              Kembali ke Identifikasi
            </button>
          </div>
        )}

        <div className="analyzing-animation" aria-hidden="true">
          <svg
            viewBox="0 0 64 64"
            width="42"
            height="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M49 23A19 19 0 0 0 15 19" />
            <path d="M15 10v9h9" />
            <path d="M15 41a19 19 0 0 0 34 6" />
            <path d="M49 54v-8h-8" />
          </svg>
        </div>

        <h1>Sedang Menganalisis Barangmu</h1>

        <p className="analyzing-description">
          Mohon tunggu sebentar, sistem sedang memproses data.
        </p>

        <div
          className="analyzing-progress"
          role="progressbar"
          aria-label="Progres analisis"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={persentase}
        >
          <div
            className="analyzing-progress-fill"
            style={{ width: `${persentase}%` }}
          />
        </div>

        <div className="analyzing-steps">
          {tahapan.map((tahap, index) => {
            const selesai = index < tahapAktif;
            const aktifTahap = index === tahapAktif;

            return (
              <div className="analyzing-step" key={tahap}>
                <div className="analyzing-step-top">
                  <span>
                    {index + 1}. {tahap}
                  </span>

                  <span
                    className={
                      selesai
                        ? "analyzing-status done"
                        : aktifTahap
                          ? "analyzing-status active"
                          : "analyzing-status waiting"
                    }
                  >
                    {selesai
                      ? "Selesai ✓"
                      : aktifTahap
                        ? "Memproses..."
                        : "Menunggu"}
                  </span>
                </div>

                <div className="analyzing-step-track">
                  <div
                    className="analyzing-step-fill"
                    style={{
                      width: selesai
                        ? "100%"
                        : aktifTahap
                          ? "65%"
                          : "0%",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="analyzing-note">
          Tahapan di atas hanya penanda progres tampilan. Hasil
          akhir dihitung oleh server.
        </p>
      </section>

      <footer className="analyzing-footer">
        <button
          type="button"
          className="analyzing-cancel"
          onClick={handleCancel}
        >
          <span aria-hidden="true">⊗</span>
          Batalkan Proses
        </button>
      </footer>
    </main>
  );
}
