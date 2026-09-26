import { apiGet, apiPost, type ListParams } from "@/services/api/client";
import type {
  MaybePaginated,
  TmsDefect,
  TmsInspection,
  TmsMaintenance,
  TmsDefectCreate,
  TmsInspectionCreate,
  TmsMaintenanceCreate,
} from "@/services/api/types";
import { toList } from "@/services/api/types";

/** GET /api/tms/defects — TMS defect records. */
export async function fetchTmsDefects(params?: ListParams): Promise<TmsDefect[]> {
  return toList(await apiGet<MaybePaginated<TmsDefect>>("/api/tms/defects", params));
}

/** GET /api/tms/inspections — TMS inspection records. */
export async function fetchTmsInspections(params?: ListParams): Promise<TmsInspection[]> {
  return toList(await apiGet<MaybePaginated<TmsInspection>>("/api/tms/inspections", params));
}

/** GET /api/tms/maintenance — TMS maintenance action items. */
export async function fetchTmsMaintenance(params?: ListParams): Promise<TmsMaintenance[]> {
  return toList(await apiGet<MaybePaginated<TmsMaintenance>>("/api/tms/maintenance", params));
}

/** POST /api/tms/defects — create a TMS defect record. */
export async function createTmsDefect(body: TmsDefectCreate): Promise<TmsDefect> {
  return await apiPost<TmsDefect>("/api/tms/defects", body);
}

/** POST /api/tms/inspections — create a TMS inspection record. */
export async function createTmsInspection(body: TmsInspectionCreate): Promise<TmsInspection> {
  return await apiPost<TmsInspection>("/api/tms/inspections", body);
}

/** POST /api/tms/maintenance — create a TMS maintenance record. */
export async function createTmsMaintenance(body: TmsMaintenanceCreate): Promise<TmsMaintenance> {
  return await apiPost<TmsMaintenance>("/api/tms/maintenance", body);
}