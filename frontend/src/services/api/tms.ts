import { apiGet, type ListParams } from "@/services/api/client";
import type {
  MaybePaginated,
  TmsDefect,
  TmsInspection,
  TmsMaintenance,
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