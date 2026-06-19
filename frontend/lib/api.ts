import type {
  UniversalContract,
  CreateReportRequest,
  CreateReportResponse,
  ReportCustomization,
} from "./types";
import type { ReportA2UIResponse } from "./a2ui-types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchReport(reportId: string): Promise<UniversalContract> {
  return apiFetch<UniversalContract>(`/api/reports/${reportId}`);
}

export async function fetchReportA2UI(
  reportId: string,
  raw = false
): Promise<ReportA2UIResponse> {
  const qs = raw ? "?raw=true" : "";
  return apiFetch<ReportA2UIResponse>(`/api/reports/${reportId}/a2ui${qs}`);
}

export async function createReport(
  body: CreateReportRequest
): Promise<CreateReportResponse> {
  return apiFetch<CreateReportResponse>("/api/reports/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function saveCustomization(
  reportId: string,
  body: ReportCustomization
): Promise<void> {
  await apiFetch<unknown>(`/api/reports/${reportId}/customize`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
