
import { useEffect, useState } from "react";
import "./AdminDashboard.css";
import KelolaData from "./KelolaData";
import AuditSistem from "./AuditSistem";
import ProfilAdmin from "./ProfilAdmin";
import { apiRequest } from "./services/api";
import { useNavigate } from "react-router-dom";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "kategori", label: "Kategori", icon: "▤" },
  { id: "barang", label: "Barang", icon: "♻" },
  { id: "pertanyaan", label: "Pertanyaan", icon: "?" },
  { id: "audit", label: "Audit Sistem", icon: "≡" },
];


const defaultStats = [
  { title: "Total Data Barang", value: "—", icon: "▣", color: "gray" },
  { title: "Total Kategori", value: "—", icon: "▤", color: "gray" },
  { title: "Catatan Audit", value: "—", icon: "≡", color: "orange" },
];



export default function AdminDashboard() {
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [period, setPeriod] = useState("Minggu");
  const [stats, setStats] = useState(defaultStats);
  const [recentLogs, setRecentLogs] = useState([]);
  const [dashboardError, setDashboardError] = useState("");
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);

  function handleMenuClick(menuId) {
    setActiveMenu(menuId);

    if (menuId !== "dashboard") {
      window.dispatchEvent(
        new CustomEvent("admin-menu-change", {
          detail: { menu: menuId },
        })
      );
    }
  }

useEffect(() => {
  let active = true;
  const loadDashboard = async () => {
    try {
      const [barangRes, kategoriRes, auditRes] = await Promise.all([
        apiRequest("/admin/barang?limit=50"),
        apiRequest("/admin/kategori?limit=50"),
        apiRequest("/admin/audit?page=1&limit=5"),
      ]);
      if (!active) return;
      const barang = Array.isArray(barangRes.data) ? barangRes.data : (barangRes.data?.items || []);
      const kategori = Array.isArray(kategoriRes.data) ? kategoriRes.data : (kategoriRes.data?.items || []);
      const audit = auditRes.data?.items || [];
      setStats([
        { title: "Total Data Barang", value: String(barang.length), icon: "▣", color: "gray" },
        { title: "Total Kategori", value: String(kategori.length), icon: "▤", color: "gray" },
        { title: "Catatan Audit", value: String(auditRes.data?.pagination?.total ?? audit.length), icon: "≡", color: "orange" },
      ]);
      setRecentLogs(audit.map((item) => ({
        id: item.id,
        title: `${item.jenisPerubahan} ${item.jenisData}`,
        description: item.ringkasan || `Perubahan data ${item.jenisData}`,
        time: item.waktu ? new Date(item.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—",
      })));
    } catch (error) {
      if (active) setDashboardError(error.message || "Gagal memuat ringkasan backend.");
    }
  };
  const user = JSON.parse(localStorage.getItem("be4throw_user") || sessionStorage.getItem("be4throw_user") || "null");
  if (!user || user.role !== "admin") {
    navigate("/login", { replace: true, state: { message: "Silakan masuk menggunakan akun admin." } });
  } else {
    loadDashboard();
  }
  return () => { active = false; };
}, [navigate]);

useEffect(() => {
  function handleAdminMenuChange(event) {
    const menu = event.detail?.menu;

    if (menu) {
      setActiveMenu(menu);
    }
  }

  window.addEventListener(
    "admin-menu-change",
    handleAdminMenuChange
  );

  return () => {
    window.removeEventListener(
      "admin-menu-change",
      handleAdminMenuChange
    );
  };
}, []);

if (
  ["kategori", "barang", "pertanyaan"].includes(activeMenu)
) {
  const tabMap = {
    kategori: "Kategori",
    barang: "Barang",
    pertanyaan: "Pertanyaan",
  };

  return <KelolaData initialTab={tabMap[activeMenu]} />;
}

  return (
    
<div
  className={`admin-layout ${sidebarOpen ? "" : "sidebar-collapsed"}`}
>
  <aside className="admin-sidebar">

        <div className="admin-brand">
          <img
  src="/be4throw-logo.jpeg"
  alt="Logo Be4Throw"
  className="admin-sidebar-logo"
/>
          <div>
            <strong>Be4Throw</strong>
            <span>ADMIN PANEL</span>
          </div>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">A</div>
          <div>
            <strong>Administrator</strong>
            <span>Admin Sistem</span>
          </div>
        </div>

        <p className="admin-menu-heading">MENU UTAMA</p>

        <nav className="admin-navigation">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={
                activeMenu === item.id
                  ? "admin-nav-item active"
                  : "admin-nav-item"
              }
              onClick={() => handleMenuClick(item.id)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-status">
            <span className="status-dot" />
            Sistem Demo Aktif
          </div>

          <button
            className="admin-logout"
            onClick={() => {
              localStorage.removeItem("be4throw_user");
              sessionStorage.removeItem("be4throw_user");
              localStorage.removeItem("be4throw_token");
              sessionStorage.removeItem("be4throw_token");
              window.location.href = "/login";
            }}
          >
            ↪ Keluar
          </button>
        </div>
      </aside>

      
<main className="admin-main">
   <header className="admin-global-header">
  <div className="admin-global-brand">
    <button
      type="button"
      className="admin-menu-toggle"
      onClick={() => setSidebarOpen((open) => !open)}
      aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
      aria-expanded={sidebarOpen}
    >
      <span />
      <span />
      <span />
    </button>

    <strong>Be4Throw</strong>
    <span className="admin-global-label">ADMIN PANEL</span>
  </div>

  <div className="admin-header-actions">
    <button
      type="button"
      className="admin-notification-button"
      onClick={() => alert("Tidak ada notifikasi baru")}
      aria-label="Notifikasi"
    >
      <svg
        viewBox="0 0 24 24"
        width="21"
        height="21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      <span className="admin-notification-dot" />
    </button>

    <button
  type="button"
  className="admin-profile-button"
  onClick={() => handleMenuClick("profil")}
  aria-label="Buka profil admin"
>
  A
</button>
  </div>
</header>

  {activeMenu === "dashboard" ? (
    <>
      <header className="admin-topbar">
        <div>
          <p className="admin-breadcrumb">
            Be4Throw / Admin / Dashboard
          </p>
          <h1>Dashboard Admin</h1>
          <p className="admin-page-description">
            Ringkasan aktivitas sistem hari ini.
          </p>
        </div>
      </header>

      {dashboardError && <div className="admin-demo-notice" role="alert">{dashboardError}</div>}
      {showNotification && (
        <div className="admin-demo-notice">
          Memproses data demo...
        </div>
      )}

      <section className="admin-stats-grid">
        {stats.map((stat) => (
          <article className="admin-stat-card" key={stat.title}>
            <div className={`admin-stat-icon ${stat.color}`}>
              {stat.icon}
            </div>

            <div className="admin-stat-content">
              <p>{stat.title}</p>
              <h2>{stat.value}</h2>
            </div>

            <span className="admin-stat-arrow">›</span>
          </article>
        ))}
      </section>
            {/* AKSI CEPAT */}
      <section className="admin-panel admin-quick-actions">
        <div className="admin-panel-heading">
          <div>
            <h2>Aksi Cepat</h2>
            <p>Akses langsung ke fitur utama sistem</p>
          </div>
        </div>

        <div className="admin-quick-grid">
          <button
            type="button"
            className="admin-quick-button"
            onClick={() => handleMenuClick("barang")}
          >
            <span className="admin-quick-icon green">＋</span>
            <span className="admin-quick-label">Tambah Barang</span>
            <span className="admin-quick-arrow">→</span>
          </button>

          <button
            type="button"
            className="admin-quick-button"
            onClick={() =>
              window.alert(
                "FAQ Baru masih menggunakan data demo. Form FAQ akan dihubungkan saat fitur FAQ dibuat."
              )
            }
          >
            <span className="admin-quick-icon purple">?</span>
            <span className="admin-quick-label">FAQ Baru</span>
            <span className="admin-quick-arrow">→</span>
          </button>

          <button
            type="button"
            className="admin-quick-button"
            onClick={() => handleMenuClick("audit")}
          >
            <span className="admin-quick-icon orange">⌕</span>
            <span className="admin-quick-label">Audit Sistem</span>
            <span className="admin-quick-arrow">→</span>
          </button>
        </div>
      </section>

      <section className="admin-content-grid">
        <article className="admin-panel admin-activity-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Aktivitas & Perubahan</h2>
              <p>Ringkasan aktivitas sistem</p>
            </div>

            <div className="admin-period-switch">
              {["Minggu", "Bulan"].map((item) => (
                <button
                  key={item}
                  className={period === item ? "selected" : ""}
                  onClick={() => setPeriod(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-chart">
            <div className="admin-chart-labels">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>

            <div className="admin-chart-body">
              <div className="admin-chart-gridlines">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <svg
                className="admin-chart-svg"
                viewBox="0 0 600 180"
                preserveAspectRatio="none"
                role="img"
                aria-label={`Grafik aktivitas demo periode ${period}`}
              >
                <defs>
                  <linearGradient
                    id="admin-chart-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#2d8055"
                      stopOpacity="0.2"
                    />
                    <stop
                      offset="100%"
                      stopColor="#2d8055"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                <path
                  d={
                    period === "Minggu"
                      ? "M0 145 L100 112 L200 88 L300 55 L400 68 L500 35 L600 48 L600 180 L0 180 Z"
                      : "M0 150 L100 135 L200 90 L300 100 L400 60 L500 45 L600 20 L600 180 L0 180 Z"
                  }
                  fill="url(#admin-chart-fill)"
                />

                <path
                  d={
                    period === "Minggu"
                      ? "M0 145 L100 112 L200 88 L300 55 L400 68 L500 35 L600 48"
                      : "M0 150 L100 135 L200 90 L300 100 L400 60 L500 45 L600 20"
                  }
                  fill="none"
                  stroke="#28764d"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>

          <div className="admin-chart-days">
            {(period === "Minggu"
              ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
              : ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"]
            ).map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-panel admin-logs-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Log Audit Singkat</h2>
            <p>Aktivitas terbaru di sistem</p>
          </div>

          <button
            className="admin-text-button"
            onClick={() => handleMenuClick("audit")}
          >
            Lihat Audit →
          </button>
        </div>

        <div className="admin-log-list">
          {recentLogs.map((log) => (
            <div className="admin-log-item" key={log.id}>
              <div className="admin-log-marker">✓</div>

              <div className="admin-log-info">
                <strong>{log.title}</strong>
                <p>{log.description}</p>
              </div>

              <time>{log.time}</time>
            </div>
          ))}
          {recentLogs.length === 0 && <p className="admin-page-description">Belum ada catatan perubahan dari backend.</p>}
        </div>
      </section>

      <footer className="admin-footer">
        Be4Throw Blueprint System · Frontend Demo
      </footer>
    </>

) : activeMenu === "audit" ? (
  <AuditSistem />
) : activeMenu === "profil" ? (
  <ProfilAdmin />
) : (
  <KelolaData />
)}
</main>
    </div>
  );
}

