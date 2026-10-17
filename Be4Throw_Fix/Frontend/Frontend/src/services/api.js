
const API_BASE_URL = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "")}/api`;

export async function apiRequest(path, options = {}) {
  const token =
    localStorage.getItem("be4throw_token") ||
    sessionStorage.getItem("be4throw_token");

  const headers = {
    ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
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
    error.errors = result.errors || [];
    throw error;
  }

  return result;
}
