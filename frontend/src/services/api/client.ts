import axios, { type AxiosError } from "axios";

import { APP_CONFIG } from "@/config/app";
import type { ListParams } from "@/services/api/types";

/**
 * Centralized HTTP client.
 *
 * All backend calls go through this single instance. The base URL is taken
 * from VITE_API_BASE_URL (environment configuration) — never hardcode a
 * backend URL inside page/component code.
 */

export type { ListParams };

export const apiClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 8000,
  headers: {
    Accept: "application/json",
  },
});

/** Typed GET helper for JSON list/single resources. */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const response = await apiClient.get<T>(path, { params });
  return response.data;
}

/** Typed POST helper for JSON bodies. */
export async function apiPost<T>(
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const response = await apiClient.post<T>(path, body, { params });
  return response.data;
}

/** Typed PATCH helper for JSON bodies. */
export async function apiPatch<T>(
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const response = await apiClient.patch<T>(path, body, { params });
  return response.data;
}

export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/** Extract a human-readable message from a failed request. */
export function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return "Request timed out";
    if (!error.response) return "Network error — server unreachable";
    const detail = error.response.data as { detail?: string } | undefined;
    return detail?.detail ?? `HTTP ${error.response.status}`;
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}
