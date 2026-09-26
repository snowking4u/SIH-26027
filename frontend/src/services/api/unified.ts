import { apiGet, apiPatch, apiPost } from "@/services/api/client";
import type { ListParams } from "@/services/api/types";
import type {
  DefectFailureUpdate,
  DepartmentMaintenanceRequestCreate,
  DepartmentMaintenanceRequestResponse,
  MaybePaginated,
  UnifiedBlockRequirement,
  UnifiedBlockRequirementCreate,
  UnifiedDefect,
  UnifiedMaintenance,
} from "@/services/api/types";
import { toList } from "@/services/api/types";

/** GET /api/unified/defects — merged defect/failure/alert view across TMS/TDMS/SMMS. */
export async function fetchUnifiedDefects(params?: ListParams): Promise<UnifiedDefect[]> {
  return toList(await apiGet<MaybePaginated<UnifiedDefect>>("/api/unified/defects", params));
}

/** PATCH /api/unified/defects/{id} — update defect status and remarks. */
export async function updateUnifiedDefect(
  defectId: number,
  body: DefectFailureUpdate,
): Promise<UnifiedDefect> {
  return apiPatch<UnifiedDefect>(`/api/unified/defects/${defectId}`, body);
}

/** GET /api/unified/maintenance — merged maintenance requirements. */
export async function fetchUnifiedMaintenance(params?: ListParams): Promise<UnifiedMaintenance[]> {
  return toList(await apiGet<MaybePaginated<UnifiedMaintenance>>("/api/unified/maintenance", params));
}

/** PATCH /api/unified/maintenance/{id} — update maintenance requirement status and remarks. */
export async function updateUnifiedMaintenance(
  maintenanceId: number,
  body: { status?: string; remarks?: string },
): Promise<UnifiedMaintenance> {
  return apiPatch<UnifiedMaintenance>(`/api/unified/maintenance/${maintenanceId}`, body);
}

/** GET /api/unified/block-requirements — block requirements derived from maintenance. */
export async function fetchUnifiedBlockRequirements(params?: ListParams): Promise<UnifiedBlockRequirement[]> {
  return toList(await apiGet<MaybePaginated<UnifiedBlockRequirement>>("/api/unified/block-requirements", params));
}

/**
 * POST /api/unified/block-requirements — transform a maintenance requirement
 * into a block requirement. Backend validates (422 on bad body). This is a
 * real mutation endpoint for REQUIREMENTS only.
 */
export async function createUnifiedBlockRequirement(
  body: UnifiedBlockRequirementCreate,
): Promise<UnifiedBlockRequirement> {
  return apiPost<UnifiedBlockRequirement>("/api/unified/block-requirements", body);
}

/**
 * POST /api/unified/maintenance-requests — full departmental request workflow:
 * Creates maintenance + block requirement + planning task + candidate window + proposed plan.
 */
export async function submitDepartmentMaintenanceRequest(
  body: DepartmentMaintenanceRequestCreate,
): Promise<DepartmentMaintenanceRequestResponse> {
  return apiPost<DepartmentMaintenanceRequestResponse>("/api/unified/maintenance-requests", body);
}