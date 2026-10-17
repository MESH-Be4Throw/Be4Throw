
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./login/Login";
import AdminDashboard from "./AdminDashboard";
import UserLanding from "./user/UserLanding";
import UserCatalog from "./user/UserCatalog";
import UserDetail from "./user/UserDetail";
import UserIdentify from "./user/UserIdentify";
import UserAnalyzing from "./user/UserAnalyzing";
import UserRecommendation from "./user/UserRecommendation";
import UserEnvironmentalImpact from "./user/UserEnvironmentalImpact";
import UserFeedback from "./user/UserFeedback";
import UserHistory from "./user/UserHistory";
import UserSettings from "./user/UserSettings";


// Halaman autentikasi
import Register from "./register/Register";
import ForgotPassword from "./forgot-password/ForgotPassword";
import ResetPassword from "./reset-password/ResetPassword";

function UserDashboard() {
  return (
    <main>
      <h1>Dashboard User</h1>
      <p>Halaman sementara.</p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Halaman utama */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Autentikasi */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Dashboard */}
      <Route path="/user" element={<UserLanding />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/user/katalog" element={<UserCatalog />} />
      <Route path="/user/detail" element={<UserDetail />} />
      <Route path="/user/identifikasi" element={<UserIdentify />} />
      <Route path="/user/analisis" element={<UserAnalyzing />} />
      <Route path="/user/rekomendasi" element={<UserRecommendation />} />
      <Route path="/user/dampak-lingkungan" element={<UserEnvironmentalImpact />} />
      <Route path="/user/umpan-balik" element={<UserFeedback />} />
      <Route path="/user/riwayat" element={<UserHistory />} />
      <Route path="/user/pengaturan" element={<UserSettings />} />


      {/* Route tidak dikenal */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>

    
  );
}