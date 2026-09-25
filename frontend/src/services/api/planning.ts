import { apiGet, apiPost, type ListParams } from "@/services/api/client";
import type {
  MaybePaginated,
  PlanningConstraint,
  PlanningDependency,
  PlanningPriority,
  PlanningResource,
  PlanningTask,
  PlanningTaskResource,
} from "@/services/api/types";
import { toList } from "@/services/api/types";

/**
 * Block-planning domain: open planning tasks, hard/soft constraints, resource
 * availability, allocations, task sequencing and deterministic priority bands.
 * Every record shown here is real backend data — nothing is synthesised in the
 * browser.
 */

export type PlanningTaskFilter = ListParams & {
  status?: string;
  task_type?: string;
  location_code?: string;
  asset_id?: number;
  skip?: number;
  limit?: number;
};

export async function fetchPlanningTasks(params?: PlanningTaskFilter): Promise<PlanningTask[]> {
  return toList(await apiGet<MaybePaginated<PlanningTask>>("/api/planning/tasks", params));
}

export async function fetchPlanningConstraints(params?: ListParams): Promise<PlanningConstraint[]> {
  return toList(await apiGet<MaybePaginated<PlanningConstraint>>("/api/planning/constraints", params));
}

export async function fetchPlanningResources(params?: ListParams): Promise<PlanningResource[]> {
  return toList(await apiGet<MaybePaginated<PlanningResource>>("/api/planning/resources", params));
}

export async function fetchPlanningTaskResources(params?: ListParams): Promise<PlanningTaskResource[]> {
  return toList(await apiGet<MaybePaginated<PlanningTaskResource>>("/api/planning/task-resources", params));
}

export async function fetchPlanningDependencies(params?: ListParams): Promise<PlanningDependency[]> {
  return toList(await apiGet<MaybePaginated<PlanningDependency>>("/api/planning/dependencies", params));
}

/** GET /api/planning/priority — deterministic priority assessments. */
export async function fetchPlanningPriorities(params?: ListParams): Promise<PlanningPriority[]> {
  return toList(await apiGet<MaybePaginated<PlanningPriority>>("/api/planning/priority", params));
}

/** POST /api/planning/priority/recalculate — deterministic recalc, idempotent. */
export async function recalculatePlanningPriorities(): Promise<{
  created: number;
  updated: number;
  processed: number;
}> {
  return apiPost<{ created: number; updated: number; processed: number }>(
    "/api/planning/priority/recalculate",
    {},
  );
}