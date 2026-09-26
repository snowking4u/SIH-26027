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
import {
  fetchOptimizationDecisions,
  fetchOptimizationPlans,
  fetchOptimizationPlanTasks,
} from "@/services/api/optimization";
import { fetchTdmsInspections } from "@/services/api/tdms";
import { fetchTmsInspections } from "@/services/api/tms";
import { fetchSmmsInspections } from "@/services/api/smms";
import type {
  Asset,
  BlockPlan,
  BlockPlanTask,
  ControllerDecision,
  Location,
  PlanningPriority,
  PlanningTask,
  SmmsInspection,
  TdmsInspection,
  TmsInspection,
  UnifiedBlockRequirement,
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

export const TDMS_GROUP: AssetType[] = ["TRACK", "BRIDGE", "LEVEL_CROSSING"];
export const TMS_GROUP: AssetType[] = ["TRACK", "BRIDGE"];
export const SMMS_GROUP: AssetType[] = ["SIGNAL", "TRACK_CIRCUIT", "POINT_MACHINE"];

export const TDMS_DEFINITION: DepartmentDefinition = {
  key: "tdms",
  title: "TDMS — Track Defect Management System",
  eyebrow: "Department Workspace · Structure & Rail Defects (TDMS)",
  description: "Track structure defects, ultrasonic testing, rail fracture logs, and block planning workflows.",
  assetTypes: TDMS_GROUP,
  windowFilter: "TRACK",
};

export const TMS_DEFINITION: DepartmentDefinition = {
  key: "tms",
  title: "TMS — Track Management System",
  eyebrow: "Department Workspace · Track Monitoring & Inspections (TMS)",
  description: "Track monitoring inspections, OMS records, geometry defect registers, and maintenance block requests.",
  assetTypes: TMS_GROUP,
  windowFilter: "TRACK",
};

export const SMMS_DEFINITION: DepartmentDefinition = {
  key: "smms",
  title: "SMMS — Signal & Telecom Maintenance Management System",
  eyebrow: "Department Workspace · Signal & Telecom Health (SMMS)",
  description: "Interlocking, track circuit alerts, point machine maintenance, and S&T traffic/power block requests.",
  assetTypes: SMMS_GROUP,
  windowFilter: "SIGNAL",
};

export interface ControllerStatusInfo {
  status: "APPROVED" | "REJECTED" | "AWAITING_REVIEW" | "REWORK_REQUIRED" | "UNPLANNED";
  label: string;
  badgeTone: "success" | "danger" | "warning" | "info" | "default";
  plan: BlockPlan | null;
  planTask: BlockPlanTask | null;
  decision: ControllerDecision | null;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export type InspectionRecord = TdmsInspection | TmsInspection | SmmsInspection;

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
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);
  const decisions = useAsyncResource(fetchOptimizationDecisions, []);

  // Department-specific inspections
  const inspections = useAsyncResource(async () => {
    if (definition.key === "tdms" || definition.key === "engineering") {
      return await fetchTdmsInspections({ limit: 500 });
    }
    if (definition.key === "tms") {
      return await fetchTmsInspections({ limit: 500 });
    }
    return await fetchSmmsInspections({ limit: 500 });
  }, [definition.key]);

  // Asset filtering: Use array.includes for reliable membership check
  const assetRows = useMemo<Asset[]>(() => {
    const allowed = new Set(definition.assetTypes.map((t) => t.toUpperCase()));
    return (assets.data ?? []).filter((asset) =>
      allowed.has((asset.asset_type ?? "").toUpperCase()),
    );
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

  const maintenanceIds = useMemo(
    () => new Set(departmentMaintenance.map((m) => m.id)),
    [departmentMaintenance],
  );

  const departmentBlockRequirements = useMemo(
    () =>
      (blockRequirements.data ?? []).filter((b) =>
        maintenanceIds.has(b.maintenance_requirement_id),
      ),
    [blockRequirements.data, maintenanceIds],
  );

  const blockRequirementIds = useMemo(
    () => new Set(departmentBlockRequirements.map((b) => b.id)),
    [departmentBlockRequirements],
  );

  const departmentTasks = useMemo(
    () =>
      (planningTasks.data ?? []).filter(
        (task) =>
          assetIds.has(task.asset_id) ||
          blockRequirementIds.has(task.block_requirement_id ?? -1) ||
          maintenanceIds.has(task.maintenance_requirement_id),
      ),
    [planningTasks.data, assetIds, blockRequirementIds, maintenanceIds],
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

  const blockReqById = useMemo(() => {
    const map = new Map<number, UnifiedBlockRequirement>();
    for (const b of departmentBlockRequirements) map.set(b.id, b);
    return map;
  }, [departmentBlockRequirements]);

  const priorityByMaintenanceId = useMemo(() => {
    const map = new Map<number, PlanningPriority>();
    for (const task of departmentTasks) {
      const priority = priorityByTask.get(task.id);
      if (priority) map.set(task.maintenance_requirement_id, priority);
    }
    return map;
  }, [departmentTasks, priorityByTask]);

  // Lookup maps for Controller decision propagation
  const planById = useMemo(() => {
    const map = new Map<number, BlockPlan>();
    for (const p of plans.data ?? []) map.set(p.id, p);
    return map;
  }, [plans.data]);

  const planTaskByTaskId = useMemo(() => {
    const map = new Map<number, BlockPlanTask>();
    for (const pt of planTasks.data ?? []) map.set(pt.planning_task_id, pt);
    return map;
  }, [planTasks.data]);

  const latestDecisionByPlanId = useMemo(() => {
    const map = new Map<number, ControllerDecision>();
    for (const d of decisions.data ?? []) {
      const existing = map.get(d.block_plan_id);
      if (!existing || new Date(d.decided_at).getTime() >= new Date(existing.decided_at).getTime()) {
        map.set(d.block_plan_id, d);
      }
    }
    return map;
  }, [decisions.data]);

  const taskByBlockReqId = useMemo(() => {
    const map = new Map<number, PlanningTask>();
    for (const t of departmentTasks) {
      if (t.block_requirement_id) map.set(t.block_requirement_id, t);
    }
    return map;
  }, [departmentTasks]);

  const blockReqByMaintId = useMemo(() => {
    const map = new Map<number, UnifiedBlockRequirement>();
    for (const b of departmentBlockRequirements) {
      map.set(b.maintenance_requirement_id, b);
    }
    return map;
  }, [departmentBlockRequirements]);

  /** Compute full Controller Decision status for a block requirement or planning task. */
  const getControllerStatusForBlock = (blockReqId: number): ControllerStatusInfo => {
    const task = taskByBlockReqId.get(blockReqId);
    if (!task) {
      return {
        status: "UNPLANNED",
        label: "Requirement Registered (Unscheduled)",
        badgeTone: "default",
        plan: null,
        planTask: null,
        decision: null,
      };
    }

    const planTask = planTaskByTaskId.get(task.id);
    if (!planTask) {
      return {
        status: "UNPLANNED",
        label: "Task Open (Awaiting Window / Plan)",
        badgeTone: "default",
        plan: null,
        planTask: null,
        decision: null,
      };
    }

    const plan = planById.get(planTask.block_plan_id) || null;
    const decision = plan ? latestDecisionByPlanId.get(plan.id) || null : null;

    if (decision?.decision === "APPROVED") {
      return {
        status: "APPROVED",
        label: `Approved (${decision.controller_code || "Section Controller"})`,
        badgeTone: "success",
        plan,
        planTask,
        decision,
      };
    }

    if (decision?.decision === "REJECTED" || plan?.status === "REWORK_REQUIRED") {
      return {
        status: "REWORK_REQUIRED",
        label: decision?.remarks ? `Rejected: ${decision.remarks}` : "Rework Required",
        badgeTone: "danger",
        plan,
        planTask,
        decision,
      };
    }

    if (plan && ["PROPOSED", "DRAFT", "VALIDATED", "SUBMITTED"].includes(plan.status)) {
      return {
        status: "AWAITING_REVIEW",
        label: `Awaiting Controller (${plan.plan_code})`,
        badgeTone: "info",
        plan,
        planTask,
        decision,
      };
    }

    return {
      status: (plan?.status as ControllerStatusInfo["status"]) || "UNPLANNED",
      label: plan?.plan_code ? `${plan.status} (${plan.plan_code})` : "Unplanned",
      badgeTone: "default",
      plan,
      planTask,
      decision,
    };
  };


  /** Inspections grouped by asset id */
  const inspectionsByAssetId = useMemo(() => {
    const map = new Map<number, InspectionRecord[]>();
    for (const item of (inspections.data ?? []) as InspectionRecord[]) {
      const list = map.get(item.asset_id) ?? [];
      list.push(item);
      map.set(item.asset_id, list);
    }
    return map;
  }, [inspections.data]);

  /** Defects grouped by asset id */
  const defectsByAssetId = useMemo(() => {
    const map = new Map<number, UnifiedDefect[]>();
    for (const d of departmentDefects) {
      const list = map.get(d.asset_id) ?? [];
      list.push(d);
      map.set(d.asset_id, list);
    }
    return map;
  }, [departmentDefects]);

  /** Maintenance grouped by asset id */
  const maintenanceByAssetId = useMemo(() => {
    const map = new Map<number, UnifiedMaintenance[]>();
    for (const m of departmentMaintenance) {
      const list = map.get(m.asset_id) ?? [];
      list.push(m);
      map.set(m.asset_id, list);
    }
    return map;
  }, [departmentMaintenance]);

  const retryAll = () => {
    assets.retry();
    locations.retry();
    defects.retry();
    maintenance.retry();
    blockRequirements.retry();
    planningTasks.retry();
    priorities.retry();
    plans.retry();
    planTasks.retry();
    decisions.retry();
    inspections.retry();
  };

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
    blockReqById,
    blockReqByMaintId,
    taskByBlockReqId,
    planById,
    planTaskByTaskId,
    latestDecisionByPlanId,
    priorityByTask,
    priorityByMaintenanceId,
    inspectionsByAssetId,
    defectsByAssetId,
    maintenanceByAssetId,
    getControllerStatusForBlock,
    retryAll,
    timeLabel,
    rows: {
      assets: assetRows,
      defects: departmentDefects,
      maintenance: departmentMaintenance,
      blockRequirements: departmentBlockRequirements,
      planningTasks: departmentTasks,
      priorities: departmentPriorities,
      locations: locations.data ?? [],
      inspections: (inspections.data ?? []) as InspectionRecord[],
      plans: plans.data ?? [],
      decisions: decisions.data ?? [],
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
      plans: { loading: plans.loading, error: plans.error, retry: plans.retry },
      decisions: { loading: decisions.loading, error: decisions.error, retry: decisions.retry },
      inspections: { loading: inspections.loading, error: inspections.error, retry: inspections.retry },
    },
  };
}