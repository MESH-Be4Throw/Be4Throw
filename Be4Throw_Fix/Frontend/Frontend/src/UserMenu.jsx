
import { Link, useLocation } from "react-router-dom";
import "./UserMenu.css";

const menuItems = [
  { label: "Home", path: "/user", icon: "⌂" },
  { label: "Riwayat Analisis Barang", path: "/user/riwayat", icon: "◷" },
  { label: "Pengaturan Akun", path: "/user/pengaturan", icon: "⚙" },
];

export default function UserMenu({ open, onClose }) {
  const location = useLocation();

  if (!open) return null;

  return (
    <div className="um-overlay" onMouseDown={onClose}>
      <aside
        className="um-sidebar"
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="Menu navigasi"
      >
        <div className="um-header">
          <Link to="/user" className="um-brand" onClick={onClose}>
            Be4Throw
          </Link>

          <button
            type="button"
            className="um-close"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            ×
          </button>
        </div>

        <nav className="um-nav">
          {menuItems.map((item) => {
            const active =
              item.path === "/user"
                ? location.pathname === "/user"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`um-link ${active ? "active" : ""}`}
              >
                <span className="um-link-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="um-footer">
          <span className="um-status-dot" />
          <span>BE4THROW V1.0</span>
        </div>
      </aside>
    </div>
  );
}
