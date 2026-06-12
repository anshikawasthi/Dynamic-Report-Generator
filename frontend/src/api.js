import axios from "axios";

// Dynamically determine API base URL from current location
function getApiBaseUrl() {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = hostname === "localhost" || hostname === "127.0.0.1" ? ":8000" : "";
  return `${protocol}//${hostname}${port}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

export function setToken(token) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export async function login(username) {
  const { data } = await api.post("/auth/login", { username });
  return data;
}

export async function fetchKpiCatalog(q) {
  const { data } = await api.get("/kpis/catalog", { params: { q } });
  return data.data;
}

export async function fetchUnified(params) {
  const { data } = await api.get("/data/unified", { params });
  return data;
}

export async function saveTemplate(payload) {
  const { data } = await api.post("/reports/templates", payload);
  return data;
}

export async function shareReport(payload) {
  const { data } = await api.post("/reports/share", payload);
  return data;
}

export async function exportReport(fmt, payload) {
  const response = await api.post(`/reports/export/${fmt}`, payload, {
    responseType: "blob",
  });
  return response.data;
}
