import { useEffect, useState } from "react";
import { fileUrl } from "./services/api";

function getStoredUser() {
  try {
    return JSON.parse(
      localStorage.getItem("be4throw_user") ||
        sessionStorage.getItem("be4throw_user") ||
        "null"
    );
  } catch {
    return null;
  }
}

// Foto profil admin dari data login; tampil `fallback` jika belum ada foto.
// Ikut berubah saat ProfilAdmin mengirim event "admin-profile-updated".
export default function AdminAvatar({ fallback }) {
  const [admin, setAdmin] = useState(() => getStoredUser());
  const [gagalMuat, setGagalMuat] = useState(false);

  useEffect(() => {
    function perbarui() {
      setAdmin(getStoredUser());
      setGagalMuat(false);
    }

    window.addEventListener("admin-profile-updated", perbarui);
    return () => window.removeEventListener("admin-profile-updated", perbarui);
  }, []);

  if (!admin?.fotoProfil || gagalMuat) return fallback;

  return (
    <img
      className="admin-avatar-img"
      src={fileUrl(admin.fotoProfil)}
      alt="Foto profil admin"
      onError={() => setGagalMuat(true)}
    />
  );
}
