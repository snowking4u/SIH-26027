import { apiGet, apiPost, type ListParams } from "@/services/api/client";
import type {
  CandidateCheckRequest,
  CandidateCheckResponse,
  CandidateGenerationSummary,
  CandidateWindow,
  MaybePaginated,
} from "@/services/api/types";
import { toList } from "@/services/api/types";

/** GET /api/candidates/windows — candidate block windows (feasibility-checked). */
export async function fetchCandidateWindows(params?: ListParams): Promise<CandidateWindow[]> {
  return toList(await apiGet<MaybePaginated<CandidateWindow>>("/api/candidates/windows", params));
}

/**
 * POST /api/candidates/check — deterministically check one planning-task against
 * one available window. Returns feasibility verdict/reason from the backend.
 */
export async function checkCandidateWindow(body: CandidateCheckRequest): Promise<CandidateCheckResponse> {
  return apiPost<CandidateCheckResponse>("/api/candidates/check", body);
}

/**
 * POST /api/candidates/generate — derive candidate block windows for the open
 * block requirements. Real, deterministic, persists.
 */
export async function generateCandidateWindows(): Promise<CandidateGenerationSummary> {
  return apiPost<CandidateGenerationSummary>("/api/candidates/generate", {});
}