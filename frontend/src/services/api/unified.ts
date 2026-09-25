import { apiGet, apiPost } from "@/services/api/client";
import type { ListParams } from "@/services/api/types";
import type {
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

/** GET /api/unified/maintenance — merged maintenance requirements. */
export async function fetchUnifiedMaintenance(params?: ListParams): Promise<UnifiedMaintenance[]> {
  return toList(await apiGet<MaybePaginated<UnifiedMaintenance>>("/api/unified/maintenance", params));
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