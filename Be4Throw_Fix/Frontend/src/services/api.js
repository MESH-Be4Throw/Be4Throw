
export const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const API_BASE_URL = `${API_ORIGIN}/api`;

// Path file dari BE (mis. "/uploads/profil/7-123.jpg") -> URL lengkap yang bisa dipakai <img>
export function fileUrl(path) {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${API_ORIGIN}${path}`;
}

export async function apiRequest(path, options = {}) {
  const token =
    localStorage.getItem("be4throw_token") ||
    sessionStorage.getItem("be4throw_token");

  // FormData (upload file) harus dikirim tanpa Content-Type manual supaya boundary diisi browser
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    ...(options.body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const result = response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem("be4throw_token");
      sessionStorage.removeItem("be4throw_token");
      localStorage.removeItem("be4throw_user");
      sessionStorage.removeItem("be4throw_user");
    }

    const error = new Error(
      result.message || "Terjadi kesalahan. Silakan coba lagi."
    );

    error.status = response.status;
    error.errors = Array.isArray(result.errors) ? result.errors : [];
    throw error;
  }

  return result;
}

// Ambil semua halaman dari endpoint berpagination BE ({ data: { items, pagination } }).
// BE membatasi limit maksimal 50 per halaman, jadi halaman diambil satu per satu.
export async function apiGetAllPages(path, { limit = 50, maxPages = 20 } = {}) {
  const pemisah = path.includes("?") ? "&" : "?";
  const semua = [];
  let totalPages = 1;

  for (let page = 1; page <= totalPages && page <= maxPages; page += 1) {
    const response = await apiRequest(`${path}${pemisah}page=${page}&limit=${limit}`);
    semua.push(...(response.data?.items || []));
    totalPages = response.data?.pagination?.totalPages || 1;
  }

  return semua;
}
