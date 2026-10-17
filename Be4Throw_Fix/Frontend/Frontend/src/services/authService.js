
import { apiRequest } from "./api";

export function loginRequest({ email, password, ingatSaya }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      ingatSaya,
    }),
  });
}

export function registerRequest(data) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function forgotPasswordRequest(email) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordRequest(data) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
