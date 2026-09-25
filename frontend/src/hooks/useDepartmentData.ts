import { useMemo } from "react";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchAssets } from "@/services/api/assets";
import { fetchLocations } from "@/services/api/locations";
import { fetchPlanningPriorities, fetchPlanningTasks } from "@/services/api/planning";
import {
  fetchUnifiedBlockRequirements,
  fetchUnifiedDefects,
  fetchUnifiedMaintenance,
} from "@/services/api/unified";
import type {
  Location,
  PlanningPriority,
  PlanningTask,
  UnifiedDefect,
  UnifiedMaintenance,
} from "@/services/api/types";

export type AssetType =
  | "TRACK"
  | "BRIDGE"
  | "LEVEL_CROSSING"
  | "SIGNAL"
  | "TRACK_CIRCUIT"
  | "POINT_MACHINE"
  | "OCS";

export interface DepartmentDefinition {
  key: string;
  title: string;
  eyebrow: string;
  description: string;
  /** Asset types that belong to this department (matches backend asset_type). */
  assetTypes: AssetType[];
  /** Filter value used by the backend to slice available windows per dept. */
  windowFilter?: string;
}

export const ENGINEERING_GROUP: AssetType[] = ["TRACK", "BRIDGE", "LEVEL_CROSSING"];
export const SNT_GROUP: AssetType[] = ["SIGNAL", "TRACK_CIRCUIT", "POINT_MACHINE"];
export const TRACTION_GROUP: AssetType[] = ["OCS"];

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Loads every dataset a department workspace needs from the real backend and
 * filters to the department's asset types. Counts and rows are computed from
 * live responses — nothing is fabricated client-side.
 */
export function useDepartmentData(definition: DepartmentDefinition) {
  const assets = useAsyncResource(fetchAssets, []);
  const locations = useAsyncResource(fetchLocations, []);
  const defects = useAsyncResource(fetchUnifiedDefects, []);
  const maintenance = useAsyncResource(fetchUnifiedMaintenance, []);
  const blockRequirements = useAsyncResource(fetchUnifiedBlockRequirements, []);
  const planningTasks = useAsyncResource(fetchPlanningTasks, []);
  const priorities = useAsyncResource(fetchPlanningPriorities, []);

  const assetRows = useMemo(() => {
    const rows = (assets.data ?? []).filter((asset) =>
      (asset.asset_type ?? "").toUpperCase() in new Set(definition.assetTypes.map((t) => t.toUpperCase())),
    );
    return rows;
  }, [assets.data, definition.assetTypes]);

  const assetIds = useMemo(() => new Set(assetRows.map((asset) => asset.id)), [assetRows]);

  const locationById = useMemo(() => {
    const map = new Map<number, Location>();
    for (const location of locations.data ?? []) map.set(location.id, location);
    return map;
  }, [locations.data]);

  const departmentDefects = useMemo(
    () => (defects.data ?? []).filter((d) => assetIds.has(d.asset_id)),
    [defects.data, assetIds],
  );

  const departmentMaintenance = useMemo(
    () => (maintenance.data ?? []).filter((m) => assetIds.has(m.asset_id)),
    [maintenance.data, assetIds],
  );

  const maintenanceIds = useMemo(() => new Set(departmentMaintenance.map((m) => m.id)), [departmentMaintenance]);

  const departmentBlockRequirements = useMemo(
    () => (blockRequirements.data ?? []).filter((b) => maintenanceIds.has(b.maintenance_requirement_id)),
    [blockRequirements.data, maintenanceIds],
  );

  const blockRequirementIds = useMemo(
    () => new Set(departmentBlockRequirements.map((b) => b.id)),
    [departmentBlockRequirements],
  );

  const departmentTasks = useMemo(
    () =>
      (planningTasks.data ?? []).filter(
        (task) => assetIds.has(task.asset_id) || blockRequirementIds.has(task.block_requirement_id ?? -1),
      ),
    [planningTasks.data, assetIds, blockRequirementIds],
  );

  const taskIds = useMemo(() => new Set(departmentTasks.map((task) => task.id)), [departmentTasks]);

  const departmentPriorities = useMemo(
    () => (priorities.data ?? []).filter((p) => taskIds.has(p.planning_task_id)),
    [priorities.data, taskIds],
  );

  const priorityByTask = useMemo(() => {
    const map = new Map<number, PlanningPriority>();
    for (const p of departmentPriorities) map.set(p.planning_task_id, p);
    return map;
  }, [departmentPriorities]);

  const taskById = useMemo(() => {
    const map = new Map<number, PlanningTask>();
    for (const t of departmentTasks) map.set(t.id, t);
    return map;
  }, [departmentTasks]);

  const maintenanceById = useMemo(() => {
    const map = new Map<number, UnifiedMaintenance>();
    for (const m of departmentMaintenance) map.set(m.id, m);
    return map;
  }, [departmentMaintenance]);

  const defectById = useMemo(() => {
    const map = new Map<number, UnifiedDefect>();
    for (const d of departmentDefects) map.set(d.id, d);
    return map;
  }, [departmentDefects]);

  const priorityByMaintenanceId = useMemo(() => {
    const map = new Map<number, PlanningPriority>();
    for (const task of departmentTasks) {
      const priority = priorityByTask.get(task.id);
      if (priority) map.set(task.maintenance_requirement_id, priority);
    }
    return map;
  }, [departmentTasks, priorityByTask]);

  /** Simple window schedule strings derived purely from real task timings. */
  const timeLabel = (value: string | null | undefined): string => {
    if (!value) return "—";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value;
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const counts = {
    assets: assetRows.length,
    defects: departmentDefects.length,
    maintenance: departmentMaintenance.length,
    blockRequirements: departmentBlockRequirements.length,
    planningTasks: departmentTasks.length,
    prioritized: departmentPriorities.length,
  };

  return {
    counts,
    locationById,
    taskById,
    maintenanceById,
    defectById,
    priorityByTask,
    priorityByMaintenanceId,
    timeLabel,
    rows: {
      assets: assetRows,
      defects: departmentDefects,
      maintenance: departmentMaintenance,
      blockRequirements: departmentBlockRequirements,
      planningTasks: departmentTasks,
      priorities: departmentPriorities,
      locations: locations.data ?? [],
    },
    state: {
      assets: { loading: assets.loading, error: assets.error, retry: assets.retry },
      defects: { loading: defects.loading, error: defects.error, retry: defects.retry },
      maintenance: { loading: maintenance.loading, error: maintenance.error, retry: maintenance.retry },
      blockRequirements: {
        loading: blockRequirements.loading,
        error: blockRequirements.error,
        retry: blockRequirements.retry,
      },
      planningTasks: { loading: planningTasks.loading, error: planningTasks.error, retry: planningTasks.retry },
      priorities: { loading: priorities.loading, error: priorities.error, retry: priorities.retry },
    },
  };
}