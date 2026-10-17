
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./services/api";
import "./AuditSistem.css";

export default function AuditSistem() {
  const [showFilters, setShowFilters] = useState(false);
  const [adminFilter, setAdminFilter] = useState("Semua Admin");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selectedLog, setSelectedLog] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest("/admin/audit?page=1&limit=100").then((response) => {
      if (active) setAuditLogs((response.data?.items || []).map((item) => ({ ...item, admin: item.admin?.nama || item.admin?.email || "Admin", status: "Dipublikasikan", version: item.versi || "-", category: item.jenisData, title: `${item.jenisPerubahan} ${item.jenisData}`, date: item.waktu ? new Date(item.waktu).toLocaleString("id-ID") : "-", description: item.ringkasan || `${item.jenisPerubahan} data ${item.jenisData}` })));
    }).catch((err) => { if (active) setError(err.message || "Gagal mengambil audit."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesAdmin =
        adminFilter === "Semua Admin" || log.admin === adminFilter;

      const matchesStatus =
        statusFilter === "Semua Status" || log.status === statusFilter;

      return matchesAdmin && matchesStatus;
    });
  }, [auditLogs, adminFilter, statusFilter]);

  function handleExport() {
    const headers = [
      "Versi",
      "Kategori",
      "Judul",
      "Tanggal",
      "Admin",
      "Status",
      "Deskripsi",
    ];

    const rows = filteredLogs.map((log) => [
      log.version,
      log.category,
      log.title,
      log.date,
      log.admin,
      log.status,
      log.description,
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "audit-be4throw.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="audit-page">
      <header className="audit-page-header">
        <div>
          <p className="audit-breadcrumb">
            Be4Throw / Admin / Audit Sistem
          </p>

          <h1>Audit Perubahan</h1>

          <p className="audit-subtitle">
            Lacak seluruh aktivitas &amp; modifikasi data.
          </p>
        </div>

        <div className="audit-page-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
      </header>

      <div className="audit-actions">
        <button
          type="button"
          className="audit-export-button"
          onClick={handleExport}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 17v4h14v-4" />
          </svg>
          Eksport Log
        </button>
      </div>

      <button
        type="button"
        className="audit-filter-toggle"
        aria-expanded={showFilters}
        onClick={() => setShowFilters((previous) => !previous)}
      >
        <span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 6h16M7 12h10m-7 6h4" />
          </svg>
          Filter Data Audit
        </span>

        <svg
          className={showFilters ? "audit-chevron rotated" : "audit-chevron"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {showFilters && (
        <div className="audit-filter-panel">
          <div className="audit-filter-field">
            <label htmlFor="audit-admin-filter">
              Pengubah / Admin
            </label>

            <select
              id="audit-admin-filter"
              value={adminFilter}
              onChange={(event) => setAdminFilter(event.target.value)}
            >
              <option>Semua Admin</option>
              {[...new Set(auditLogs.map((log) => log.admin))].map(
                (admin) => (
                  <option key={admin}>{admin}</option>
                )
              )}
            </select>
          </div>

          <div className="audit-filter-field">
            <label htmlFor="audit-status-filter">
              Status Publikasi
            </label>

            <select
              id="audit-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option>Semua Status</option>
              <option>Dipublikasikan</option>
              <option>Diarsipkan</option>
              <option>Draft</option>
            </select>
          </div>

          <button
            type="button"
            className="audit-reset-button"
            onClick={() => {
              setAdminFilter("Semua Admin");
              setStatusFilter("Semua Status");
            }}
          >
            Reset Filter
          </button>
        </div>
      )}

      {loading && <p>Memuat catatan audit dari server...</p>}
      {error && <p role="alert">{error}</p>}
      <div className="audit-list">
        {!loading && filteredLogs.length === 0 ? (
          <div className="audit-empty">
            <h3>Data audit tidak ditemukan</h3>
            <p>Coba ubah filter yang dipilih.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <article className="audit-card" key={log.id}>
              <div className="audit-card-top">
                <span className="audit-version">{log.version}</span>
                <span className="audit-category">{log.category}</span>
                <time>{log.date}</time>
              </div>

              <h3>{log.title}</h3>
              <p className="audit-card-description">{log.description}</p>

              <div className="audit-card-bottom">
                <div className="audit-admin-info">
                  <small>Admin</small>
                  <strong>{log.admin}</strong>
                </div>

                <span
                  className={`audit-publication-status ${
                    log.status === "Dipublikasikan"
                      ? "published"
                      : log.status === "Diarsipkan"
                        ? "archived"
                        : "draft"
                  }`}
                >
                  {log.status}
                </span>
              </div>

              <button
                type="button"
                className="audit-detail-button"
                onClick={() => setSelectedLog(log)}
              >
                Lihat Detail
                <span aria-hidden="true">→</span>
              </button>
            </article>
          ))
        )}
      </div>

      <footer className="audit-page-footer">
        Be4Throw Blueprint System · Frontend Demo
      </footer>

      {selectedLog && (
        <div
          className="audit-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLog(null);
            }
          }}
        >
          <section
            className="audit-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
          >
            <div className="audit-modal-header">
              <div>
                <span className="audit-version">
                  {selectedLog.version}
                </span>
                <h2 id="audit-modal-title">Detail Audit Perubahan</h2>
              </div>

              <button
                type="button"
                className="audit-modal-close"
                onClick={() => setSelectedLog(null)}
                aria-label="Tutup detail"
              >
                ×
              </button>
            </div>

            <h3>{selectedLog.title}</h3>
            <p className="audit-modal-description">
              {selectedLog.description}
            </p>

            <dl className="audit-detail-list">
              <div>
                <dt>Kategori</dt>
                <dd>{selectedLog.category}</dd>
              </div>
              <div>
                <dt>Versi</dt>
                <dd>{selectedLog.version}</dd>
              </div>
              <div>
                <dt>Admin</dt>
                <dd>{selectedLog.admin}</dd>
              </div>
              <div>
                <dt>Waktu Perubahan</dt>
                <dd>{selectedLog.date}</dd>
              </div>
              <div>
                <dt>Status Publikasi</dt>
                <dd>{selectedLog.status}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="audit-export-button audit-modal-done"
              onClick={() => setSelectedLog(null)}
            >
              Tutup Detail
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
