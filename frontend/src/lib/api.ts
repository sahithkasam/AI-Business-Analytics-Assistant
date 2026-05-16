import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// Attach JWT to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — refresh token flow
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          Cookies.set("access_token", data.access_token, { secure: true, sameSite: "strict" });
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          window.location.href = "/auth/login";
        }
      }
    }

    const message = error.response?.data?.detail || error.message || "Request failed";
    if (error.response?.status !== 401) {
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refresh_token: refreshToken }),
  logout: () => api.post("/auth/logout"),
};

// ─── Query ────────────────────────────────────────────────────────────────────
export const queryApi = {
  ask: (question: string) => api.post("/query/ask", { question }),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  kpis: () => api.get("/dashboard/kpis"),
  revenueTrend: () => api.get("/dashboard/revenue-trend"),
  categoryBreakdown: () => api.get("/dashboard/category-breakdown"),
  topCustomers: (limit = 10) => api.get(`/dashboard/top-customers?limit=${limit}`),
};

// ─── History ─────────────────────────────────────────────────────────────────
export const historyApi = {
  list: (page = 1, pageSize = 20, favoritesOnly = false) =>
    api.get(`/history?page=${page}&page_size=${pageSize}&favorites_only=${favoritesOnly}`),
  get: (id: string) => api.get(`/history/${id}`),
  toggleFavorite: (id: string) => api.patch(`/history/${id}/favorite`),
  delete: (id: string) => api.delete(`/history/${id}`),
  clear: () => api.delete("/history"),
};

// ─── Export ──────────────────────────────────────────────────────────────────
export const exportApi = {
  csv: (data: { query_id?: string; sql?: string; title?: string }) =>
    api.post("/export/csv", { ...data, format: "csv" }, { responseType: "blob" }),
  pdf: (data: { query_id?: string; sql?: string; title?: string }) =>
    api.post("/export/pdf", { ...data, format: "pdf" }, { responseType: "blob" }),
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
