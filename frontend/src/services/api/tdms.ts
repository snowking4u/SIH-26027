import { apiGet, type ListParams } from "@/services/api/client";
import type {
  MaybePaginated,
  TdmsFailure,
  TdmsInspection,
  TdmsMaintenance,
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