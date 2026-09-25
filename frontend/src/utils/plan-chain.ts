/**
 * Plan-chain enrichment helpers.
 *
 * The `block_plan` table carries only horizon + code + status; every
 * operational detail (section, line, station, block start/end, duration,
 * validation outcome, controller decision, train impact) must be derived by
 * joining the plan against its own downstream records. All joins here are
 * performed client-side against the exact backend contracts — nothing is
 * fabricated.
 */
import type {
  Asset,
  BlockPlan,
  BlockPlanTask,
  CandidateWindow,
  CoaAvailableWindow,
  CoaLineOccupancy,
  CoaSchedule,
  ControllerDecision,
  Location,
  OptimizationValidation,
  PlanningTask,
  Train,
  UnifiedBlockRequirement,
} from "@/services/api/types";

export const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const formatDateTime = (value: string | null | undefined): string => {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTime = (value: string | null | undefined): string => {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

export const overlaps = (
  aStart: Date | null,
  aEnd: Date | null,
  bStart: Date | null,
  bEnd: Date | null,
): boolean => {
  if (!aStart || !bStart) return false;
  const a0 = aStart.getTime();
  const a1 = (aEnd ?? aStart).getTime();
  const b0 = bStart.getTime();
  const b1 = (bEnd ?? bStart).getTime();
  return a0 < b1 && b0 < a1;
};

export interface PlanTaskChain {
  blockPlanTask: BlockPlanTask;
  planningTask: PlanningTask | null;
  candidate: CandidateWindow | null;
  availableWindow: CoaAvailableWindow | null;
  blockRequirement: UnifiedBlockRequirement | null;
  asset: Asset | null;
  location: Location | null;
  section: string | null;
  line: string | null;
  station: string | null;
}

export interface TrainImpactRow {
  key: string;
  kind: "OCCUPANCY" | "SCHEDULE";
  train: Train | null;
  trainId: number | null;
  trainIdLabel: string;
  line: string | null;
  station: string | null;
  start: string;
  end: string | null;
  reason: string;
  conflict: boolean;
}

export interface PlanSummary {
  plan: BlockPlan;
  tasks: PlanTaskChain[];
  taskCount: number;
  section: string | null;
  line: string | null;
  station: string | null;
  start: string | null;
  end: string | null;
  durationMinutes: number | null;
  validation: OptimizationValidation[];
  passedValidation: number;
  failedValidation: number;
  warningValidation: number;
  validated: boolean;
  latestDecision: ControllerDecision | null;
  impact: TrainImpactRow[];
  impactStatus: "CONFLICT" | "CLEAR" | "UNKNOWN";
}

export interface PlanChainInput {
  plans: BlockPlan[];
  planTasks: BlockPlanTask[];
  candidates: CandidateWindow[];
  planningTasks: PlanningTask[];
  windows: CoaAvailableWindow[];
  requirements: UnifiedBlockRequirement[];
  validations: OptimizationValidation[];
  decisions: ControllerDecision[];
  trains: Train[];
  occupancy: CoaLineOccupancy[];
  schedules: CoaSchedule[];
  locations: Location[];
  assets: Asset[];
}

export function buildPlanSummaries(input: PlanChainInput): PlanSummary[] {
  const {
    plans,
    planTasks,
    candidates,
    planningTasks,
    windows,
    requirements,
    validations,
    decisions,
    trains,
    occupancy,
    schedules,
    locations,
    assets,
  } = input;

  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const taskById = new Map(planningTasks.map((t) => [t.id, t]));
  const windowById = new Map(windows.map((w) => [w.id, w]));
  const requirementById = new Map(requirements.map((r) => [r.id, r]));
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const trainById = new Map(trains.map((t) => [t.id, t]));

  const stationToLocation = new Map<string, Location>();
  for (const location of locations) {
    if (location.station_code) stationToLocation.set(location.station_code, location);
  }

  const validationByPlan = new Map<number, OptimizationValidation[]>();
  for (const record of validations) {
    const list = validationByPlan.get(record.block_plan_id) ?? [];
    list.push(record);
    validationByPlan.set(record.block_plan_id, list);
  }

  const decisionByPlan = new Map<number, ControllerDecision>();
  for (const decision of decisions) {
    const current = decisionByPlan.get(decision.block_plan_id);
    if (!current) {
      decisionByPlan.set(decision.block_plan_id, decision);
      continue;
    }
    const currentTs = parseDate(current.decided_at)?.getTime() ?? 0;
    const nextTs = parseDate(decision.decided_at)?.getTime() ?? 0;
    if (nextTs >= currentTs) decisionByPlan.set(decision.block_plan_id, decision);
  }

  const tasksByPlan = new Map<number, BlockPlanTask[]>();
  for (const task of planTasks) {
    const list = tasksByPlan.get(task.block_plan_id) ?? [];
    list.push(task);
    tasksByPlan.set(task.block_plan_id, list);
  }

  const chainTask = (task: BlockPlanTask): PlanTaskChain => {
    const planningTask = taskById.get(task.planning_task_id) ?? null;
    const candidate = task.candidate_block_window_id != null ? candidateById.get(task.candidate_block_window_id) ?? null : null;
    const availableWindow = candidate ? windowById.get(candidate.available_window_id) ?? null : null;
    const blockRequirement =
      planningTask?.block_requirement_id != null ? requirementById.get(planningTask.block_requirement_id) ?? null : null;
    const asset = planningTask ? assetById.get(planningTask.asset_id) ?? null : null;
    const station =
      availableWindow?.station_code ?? blockRequirement?.station_code ?? planningTask?.location_code ?? null;
    const location = station ? stationToLocation.get(station) ?? null : null;
    return {
      blockPlanTask: task,
      planningTask,
      candidate,
      availableWindow,
      blockRequirement,
      asset,
      location,
      section: location?.section_code ?? null,
      line: availableWindow?.line_number ?? (blockRequirement?.line_number ?? null),
      station,
    };
  };

  return plans.map((plan) => {
    const tasks = (tasksByPlan.get(plan.id) ?? []).map(chainTask);
    const validation = validationByPlan.get(plan.id) ?? [];

    const firstTask = tasks[0];
    const startTs = tasks
      .map((t) => parseDate(t.blockPlanTask.planned_start)?.getTime())
      .filter((t): t is number => t != null);
    const endTs = tasks
      .map((t) => parseDate(t.blockPlanTask.planned_end)?.getTime())
      .filter((t): t is number => t != null);

    const start = startTs.length ? new Date(Math.min(...startTs)).toISOString() : null;
    const end = endTs.length ? new Date(Math.max(...endTs)).toISOString() : null;
    const durationMinutes =
      start && end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000) : null;

    const impact: TrainImpactRow[] = [];
    for (const task of tasks) {
      const plannedStart = parseDate(task.blockPlanTask.planned_start);
      const plannedEnd = parseDate(task.blockPlanTask.planned_end) ?? plannedStart;
      if (!plannedStart) continue;

      for (const row of occupancy) {
        if (task.line && row.line_number !== task.line) continue;
        const occStart = parseDate(row.occupancy_start);
        if (!occStart) continue;
        if (!overlaps(plannedStart, plannedEnd, occStart, parseDate(row.occupancy_end))) continue;
        const train = row.train_id != null ? trainById.get(row.train_id) ?? null : null;
        impact.push({
          key: `occ-${row.id}-task-${task.blockPlanTask.id}`,
          kind: "OCCUPANCY",
          train,
          trainId: row.train_id,
          trainIdLabel: row.train_id != null ? `T-${row.train_id}` : "Unassigned",
          line: row.line_number ?? task.line,
          station: task.station,
          start: row.occupancy_start,
          end: row.occupancy_end,
          reason: `Line ${row.line_number ?? task.line} held by train during the planned block`,
          conflict: true,
        });
      }

      for (const row of schedules) {
        if (task.line && row.line_number && row.line_number !== task.line) continue;
        if (task.station && row.station_code !== task.station) continue;
        const sArr = parseDate(row.scheduled_arrival);
        const sDep = parseDate(row.scheduled_departure);
        const sRun = parseDate(row.scheduled_run_through);
        const windowStart = sArr ?? sRun ?? sDep;
        if (!windowStart) continue;
        if (!overlaps(plannedStart, plannedEnd, windowStart, sDep ?? sRun)) continue;
        const train = trainById.get(row.train_id) ?? null;
        impact.push({
          key: `sch-${row.id}-task-${task.blockPlanTask.id}`,
          kind: "SCHEDULE",
          train,
          trainId: row.train_id,
          trainIdLabel: row.train_id != null ? `T-${row.train_id}` : "Unassigned",
          line: row.line_number ?? task.line,
          station: row.station_code,
          start: row.scheduled_arrival ?? row.scheduled_run_through ?? row.scheduled_departure ?? "",
          end: row.scheduled_departure ?? row.scheduled_run_through,
          reason: "Source schedule overlaps the planned block window",
          conflict: true,
        });
      }
    }

    const hasConflict = impact.some((row) => row.conflict);

    return {
      plan,
      tasks,
      taskCount: tasks.length,
      section: firstTask?.section ?? null,
      line: firstTask?.line ?? null,
      station: firstTask?.station ?? null,
      start,
      end,
      durationMinutes,
      validation,
      passedValidation: validation.filter((v) => v.validation_status === "PASSED").length,
      failedValidation: validation.filter((v) => v.validation_status === "FAILED").length,
      warningValidation: validation.filter((v) => v.validation_status === "WARNING").length,
      validated: validation.length > 0,
      latestDecision: decisionByPlan.get(plan.id) ?? null,
      impact,
      impactStatus: tasks.length === 0 ? "UNKNOWN" : hasConflict ? "CONFLICT" : "CLEAR",
    };
  });
}

/** Highest decision precedence wins when a plan has multiple decisions. */
export function latestDecisionOf(plan: PlanSummary): ControllerDecision | null {
  return plan.latestDecision;
}