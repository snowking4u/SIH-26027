import { apiGet, apiPost, type ListParams } from "@/services/api/client";
import type {
  MaybePaginated,
  TdmsFailure,
  TdmsInspection,
  TdmsMaintenance,
  TdmsFailureCreate,
  TdmsInspectionCreate,
  TdmsMaintenanceCreate,
} from "@/services/api/types";
import { toList } from "@/services/api/types";

/** GET /api/tdms/failures — TDMS failure records. */
export async function fetchTdmsFailures(params?: ListParams): Promise<TdmsFailure[]> {
  return toList(await apiGet<MaybePaginated<TdmsFailure>>("/api/tdms/failures", params));
}

/** GET /api/tdms/inspections — TDMS inspection records. */
export async function fetchTdmsInspections(params?: ListParams): Promise<TdmsInspection[]> {
  return toList(await apiGet<MaybePaginated<TdmsInspection>>("/api/tdms/inspections", params));
}

/** GET /api/tdms/maintenance — TDMS maintenance action items. */
export async function fetchTdmsMaintenanceRecords(params?: ListParams): Promise<TdmsMaintenance[]> {
  return toList(await apiGet<MaybePaginated<TdmsMaintenance>>("/api/tdms/maintenance", params));
}

/** POST /api/tdms/failures — create a TDMS failure record. */
export async function createTdmsFailure(body: TdmsFailureCreate): Promise<TdmsFailure> {
  return await apiPost<TdmsFailure>("/api/tdms/failures", body);
}

/** POST /api/tdms/inspections — create a TDMS inspection record. */
export async function createTdmsInspection(body: TdmsInspectionCreate): Promise<TdmsInspection> {
  return await apiPost<TdmsInspection>("/api/tdms/inspections", body);
}

/** POST /api/tdms/maintenance — create a TDMS maintenance record. */
export async function createTdmsMaintenance(body: TdmsMaintenanceCreate): Promise<TdmsMaintenance> {
  return await apiPost<TdmsMaintenance>("/api/tdms/maintenance", body);
}