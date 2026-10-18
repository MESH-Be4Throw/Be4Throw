
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./UserFeedback.css";

export default function UserFeedback() {
  const navigate = useNavigate();
  const location = useLocation();
  const analisisId = location.state?.analisisId || location.state?.analisis?.id;
  const kodeAkses = location.state?.kodeAkses;

  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [pesan, setPesan] = useState("");
  const [terkirim, setTerkirim] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (rating === 0) {
      setPesan("Pilih rating bintang terlebih dahulu, ya.");
      return;
    }

    if (!analisisId) {
      setPesan("ID analisis tidak ditemukan. Silakan lakukan analisis terlebih dahulu.");
      return;
    }
    try {
      const headers = kodeAkses ? { "X-Kode-Akses": kodeAkses } : {};
      await apiRequest(`/analisis/${analisisId}/umpan-balik`, {
        method: "PUT", headers,
        body: JSON.stringify({ rating, komentar: komentar.trim() }),
      });
      setPesan("Terima kasih! Umpan balik berhasil disimpan ke server.");
      setTerkirim(true);
    } catch (err) {
      setPesan(err.message || "Umpan balik belum bisa disimpan. Coba lagi.");
    }
  }

  function handleSkip() {
  navigate("/user/dampak-lingkungan", { state: location.state });
}

  function handleBack() {
  navigate("/user/dampak-lingkungan", { state: location.state });
}

  return (
    <main className="feedback-page">
      <header className="feedback-header">
        <button
          type="button"
          className="feedback-back"
          onClick={handleBack}
          aria-label="Kembali"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>

        <h1>Umpan Balik</h1>
      </header>

      <section className="feedback-content">
        <form className="feedback-card" onSubmit={handleSubmit}>
          <h2>Apakah rekomendasi ini membantu?</h2>

          <div
            className="feedback-stars"
            role="group"
            aria-label="Pilih rating dari satu sampai lima bintang"
          >
            {[1, 2, 3, 4, 5].map((nilai) => (
              <button
                key={nilai}
                type="button"
                className={`feedback-star ${
                  nilai <= rating ? "selected" : ""
                }`}
                onClick={() => {
                  if (!terkirim) {
                    setRating(nilai);
                    setPesan("");
                  }
                }}
                disabled={terkirim}
                aria-label={`${nilai} bintang`}
                aria-pressed={rating === nilai}
              >
                ★
              </button>
            ))}
          </div>

          <div className="feedback-divider" />

          <label
            className="feedback-label"
            htmlFor="feedback-comment"
          >
            Komentar Tambahan (Opsional)
          </label>

          <textarea
            id="feedback-comment"
            value={komentar}
            onChange={(event) => setKomentar(event.target.value)}
            placeholder="Masukkan komentar Anda di sini..."
            rows={4}
            maxLength={500}
            disabled={terkirim}
          />

          {pesan && (
            <p
              className={`feedback-message ${
                terkirim ? "success" : "error"
              }`}
              role="status"
            >
              {pesan}
            </p>
          )}

          {!terkirim ? (
            <>
              <button className="feedback-submit" type="submit">
                Kirim
              </button>

              <button
                className="feedback-skip"
                type="button"
                onClick={handleSkip}
              >
                Lewati
              </button>
            </>
          ) : (
            <button
              className="feedback-submit"
              type="button"
              onClick={() => navigate("/user")}
            >
              Kembali ke Home
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
