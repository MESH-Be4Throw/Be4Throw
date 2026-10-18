
import { useEffect, useState } from "react";
import "./AdminDashboard.css";
import KelolaData from "./KelolaData";
import AuditSistem from "./AuditSistem";
import ProfilAdmin from "./ProfilAdmin";
import { API_ORIGIN, apiGetAllPages, apiRequest } from "./services/api";
import { useNavigate } from "react-router-dom";

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "kategori", label: "Kategori", icon: "▤" },
  { id: "barang", label: "Barang", icon: "♻" },
  { id: "pertanyaan", label: "Pertanyaan", icon: "?" },
  { id: "audit", label: "Audit Sistem", icon: "≡" },
];


const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const HARI_MS = 24 * 60 * 60 * 1000;

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("be4throw_user") || sessionStorage.getItem("be4throw_user") || "null");
  } catch {
    return null;
  }
}

// Hitung jumlah catatan audit per hari (7 hari terakhir) atau per minggu (4 minggu terakhir)
function hitungAktivitas(audit, period) {
  const jumlahTitik = period === "Minggu" ? 7 : 4;
  const lebarMs = period === "Minggu" ? HARI_MS : 7 * HARI_MS;
  const akhirHariIni = new Date();
  akhirHariIni.setHours(23, 59, 59, 999);
  const batasAkhir = akhirHariIni.getTime();

  const titik = Array.from({ length: jumlahTitik }, (_, index) => {
    const akhir = batasAkhir - (jumlahTitik - 1 - index) * lebarMs;
    return {
      akhir,
      label: period === "Minggu" ? NAMA_HARI[new Date(akhir).getDay()] : `Minggu ${index + 1}`,
      jumlah: 0,
    };
  });

  audit.forEach((item) => {
    const waktu = new Date(item.waktu).getTime();
    if (Number.isNaN(waktu)) return;
    const index = titik.findIndex((t) => waktu <= t.akhir && waktu > t.akhir - lebarMs);
    if (index >= 0) titik[index].jumlah += 1;
  });

  const tertinggi = Math.max(...titik.map((t) => t.jumlah), 0);
  const skalaMaks = Math.max(4, Math.ceil(tertinggi / 4) * 4);
  const koordinat = titik.map((t, index) => ({
    x: (index * 600) / (jumlahTitik - 1),
    y: 170 - (t.jumlah / skalaMaks) * 150,
  }));
  const garis = koordinat.map((c, index) => `${index === 0 ? "M" : "L"}${c.x} ${c.y}`).join(" ");

  return {
    labels: titik.map((t) => t.label),
    skala: [1, 0.75, 0.5, 0.25, 0].map((bagian) => Math.round(skalaMaks * bagian)),
    garis,
    area: `${garis} L600 180 L0 180 Z`,
  };
}

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
  const [auditAktivitas, setAuditAktivitas] = useState([]);
  const [serverAktif, setServerAktif] = useState(null);
  const adminUser = getStoredUser();
  const namaAdmin = adminUser?.nama || "Administrator";
  const inisialAdmin = namaAdmin.trim().charAt(0).toUpperCase() || "A";
  const navigate = useNavigate();

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
      apiGetAllPages("/admin/audit")
        .then((semua) => { if (active) setAuditAktivitas(semua); })
        .catch(() => {});
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
  const user = getStoredUser();
  if (!user || user.role !== "admin") {
    navigate("/login", { replace: true, state: { message: "Silakan masuk menggunakan akun admin." } });
  } else {
    loadDashboard();
  }
  return () => { active = false; };
}, [navigate]);

useEffect(() => {
  let active = true;
  fetch(`${API_ORIGIN}/`)
    .then((response) => { if (active) setServerAktif(response.ok); })
    .catch(() => { if (active) setServerAktif(false); });
  return () => { active = false; };
}, []);

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
          <div className="admin-avatar">{inisialAdmin}</div>
          <div>
            <strong>{namaAdmin}</strong>
            <span>{adminUser?.role === "admin" ? "Admin Sistem" : adminUser?.role}</span>
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
            {serverAktif === null ? "Memeriksa server..." : serverAktif ? "Server Aktif" : "Server Tidak Terhubung"}
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
  className="admin-profile-button"
  onClick={() => handleMenuClick("profil")}
  aria-label="Buka profil admin"
>
  {inisialAdmin}
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
            onClick={() => handleMenuClick("pertanyaan")}
          >
            <span className="admin-quick-icon purple">?</span>
            <span className="admin-quick-label">Pertanyaan</span>
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

          {(() => {
            const aktivitas = hitungAktivitas(auditAktivitas, period);
            return (
              <>
                <div className="admin-chart">
                  <div className="admin-chart-labels">
                    {aktivitas.skala.map((nilai, index) => (
                      <span key={index}>{nilai}</span>
                    ))}
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
                      aria-label={`Grafik jumlah perubahan data periode ${period}`}
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

                      <path d={aktivitas.area} fill="url(#admin-chart-fill)" />

                      <path
                        d={aktivitas.garis}
                        fill="none"
                        stroke="#28764d"
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                </div>

                <div className="admin-chart-days">
                  {aktivitas.labels.map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                  ))}
                </div>
              </>
            );
          })()}
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

