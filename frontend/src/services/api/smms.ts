import { apiGet, apiPost, type ListParams } from "@/services/api/client";
import type {
  MaybePaginated,
  SmmsAlert,
  SmmsInspection,
  SmmsMaintenance,
  SmmsAlertCreate,
  SmmsInspectionCreate,
  SmmsMaintenanceCreate,
} from "@/services/api/types";
import { toList } from "@/services/api/types";

/** GET /api/smms/alerts — SMMS alert records linked to master assets. */
export async function fetchSmmsAlerts(params?: ListParams): Promise<SmmsAlert[]> {
  return toList(await apiGet<MaybePaginated<SmmsAlert>>("/api/smms/alerts", params));
}

/** GET /api/smms/inspections — SMMS inspection records. */
export async function fetchSmmsInspections(params?: ListParams): Promise<SmmsInspection[]> {
  return toList(await apiGet<MaybePaginated<SmmsInspection>>("/api/smms/inspections", params));
}

/** GET /api/smms/maintenance — SMMS maintenance action items. */
export async function fetchSmmsMaintenance(params?: ListParams): Promise<SmmsMaintenance[]> {
  return toList(await apiGet<MaybePaginated<SmmsMaintenance>>("/api/smms/maintenance", params));
}

/** POST /api/smms/alerts — create an SMMS alert record (source-level). */
export async function createSmmsAlert(body: SmmsAlertCreate): Promise<SmmsAlert> {
  return await apiPost<SmmsAlert>("/api/smms/alerts", body);
}

/** POST /api/smms/inspections — create an SMMS inspection record. */
export async function createSmmsInspection(body: SmmsInspectionCreate): Promise<SmmsInspection> {
  return await apiPost<SmmsInspection>("/api/smms/inspections", body);
}

/** POST /api/smms/maintenance — create an SMMS maintenance record (source-level). */
export async function createSmmsMaintenance(body: SmmsMaintenanceCreate): Promise<SmmsMaintenance> {
  return await apiPost<SmmsMaintenance>("/api/smms/maintenance", body);
}