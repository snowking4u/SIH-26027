import { apiGet, type ListParams } from "@/services/api/client";
import type {
  CoaAvailableWindow,
  CoaLineOccupancy,
  CoaMovement,
  CoaSchedule,
  OperationalEvent,
  Train,
} from "@/services/api/types";

/** GET /api/coa/trains — fleet roster for the schedule horizon. */
export async function fetchCoaTrains(params?: ListParams): Promise<Train[]> {
  const response = await apiGet<Train[] | { items: Train[] }>("/api/coa/trains", params);
  return Array.isArray(response) ? response : (response.items ?? []);
}

/** GET /api/coa/movements — live D/A/T events per train per station. */
export async function fetchCoaMovements(params?: ListParams): Promise<CoaMovement[]> {
  const response = await apiGet<CoaMovement[] | { items: CoaMovement[] }>("/api/coa/movements", params);
  return Array.isArray(response) ? response : (response.items ?? []);
}

/** GET /api/coa/schedules — source timetable entries per train/station. */
export async function fetchCoaSchedules(params?: ListParams): Promise<CoaSchedule[]> {
  const response = await apiGet<CoaSchedule[] | { items: CoaSchedule[] }>("/api/coa/schedules", params);
  return Array.isArray(response) ? response : (response.items ?? []);
}

/** GET /api/coa/line-occupancy — lines held by trains (occupancy_status filter). */
export async function fetchCoaLineOccupancy(params?: ListParams): Promise<CoaLineOccupancy[]> {
  const response = await apiGet<CoaLineOccupancy[] | { items: CoaLineOccupancy[] }>(
    "/api/coa/line-occupancy",
    params,
  );
  return Array.isArray(response) ? response : (response.items ?? []);
}

/** GET /api/coa/available-windows — operational gaps derived from COA. */
export async function fetchCoaAvailableWindows(params?: ListParams): Promise<CoaAvailableWindow[]> {
  const response = await apiGet<CoaAvailableWindow[] | { items: CoaAvailableWindow[] }>(
    "/api/coa/available-windows",
    params,
  );
  return Array.isArray(response) ? response : (response.items ?? []);
}

/** GET /api/coa/events — recorded operational events. */
export async function fetchCoaEvents(params?: ListParams): Promise<OperationalEvent[]> {
  const response = await apiGet<OperationalEvent[] | { items: OperationalEvent[] }>(
    "/api/coa/events",
    params,
  );
  return Array.isArray(response) ? response : (response.items ?? []);
}