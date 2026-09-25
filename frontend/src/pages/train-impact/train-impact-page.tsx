import {
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  Route,
  TrainFront,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Drawer } from "@/components/common/drawer";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchCoaAvailableWindows, fetchCoaLineOccupancy, fetchCoaSchedules, fetchCoaTrains } from "@/services/api/coa";
import { fetchCandidateWindows } from "@/services/api/candidates";
import { fetchOptimizationPlanTasks, fetchOptimizationPlans } from "@/services/api/optimization";
import type {
  CandidateWindow,
  CoaAvailableWindow,
  CoaLineOccupancy,
  CoaSchedule,
  Train,
} from "@/services/api/types";
import { formatDateTime, formatTime, overlaps, parseDate } from "@/utils/plan-chain";

interface AffectedTrain {
  key: string;
  kind: "OCCUPANCY" | "SCHEDULE";
  trainId: number | null;
  label: string;
  line: string;
  station: string;
  start: string;
  end: string | null;
  reason: string;
}

interface PlannedImpact {
  key: string;
  planCode: string;
  planId: number;
  taskId: number;
  windowId: number | null;
  station: string | null;
  line: string | null;
  start: string;
  end: string;
  affected: AffectedTrain[];
  status: "CONFLICT" | "CLEAR";
}

interface CandidateImpact {
  candidate: CandidateWindow;
  window: CoaAvailableWindow | null;
  station: string | null;
  line: string | null;
  affected: AffectedTrain[];
  status: "CONFLICT" | "CLEAR";
}

const computeAffected = (
  startIso: string,
  endIso: string,
  station: string | null,
  line: string | null,
  occupancy: CoaLineOccupancy[],
  schedules: CoaSchedule[],
  trainById: Map<number, Train>,
): AffectedTrain[] => {
  const affected: AffectedTrain[] = [];
  const plannedStart = parseDate(startIso);
  const plannedEnd = parseDate(endIso) ?? plannedStart;
  if (!plannedStart) return affected;

  for (const row of occupancy) {
    if (line && row.line_number !== line) continue;
    const occStart = parseDate(row.occupancy_start);
    if (!occStart || !overlaps(plannedStart, plannedEnd, occStart, parseDate(row.occupancy_end))) continue;
    const train = row.train_id != null ? trainById.get(row.train_id) ? trainById.get(row.train_id)! : null : null;
    affected.push({
      key: `occ-${row.id}`,
      kind: "OCCUPANCY",
      trainId: row.train_id,
      label: row.train_id != null ? (train?.train_number ?? `T-${row.train_id}`) : "Unassigned",
      line: row.line_number,
      station: row.station_code,
      start: row.occupancy_start,
      end: row.occupancy_end,
      reason: "Line held by this train during the block (line-occupancy record)",
    });
  }

  for (const row of schedules) {
    if (line && row.line_number && row.line_number !== line) continue;
    if (station && row.station_code !== station) continue;
    const sArr = parseDate(row.scheduled_arrival);
    const sDep = parseDate(row.scheduled_departure);
    const sRun = parseDate(row.scheduled_run_through);
    const windowStart = sArr ?? sRun ?? sDep;
    if (!windowStart || !overlaps(plannedStart, plannedEnd, windowStart, sDep ?? sRun)) continue;
    const train = row.train_id != null ? trainById.get(row.train_id) ?? null : null;
    affected.push({
      key: `sch-${row.id}`,
      kind: "SCHEDULE",
      trainId: row.train_id,
      label: row.train_id != null ? (train?.train_number ?? `T-${row.train_id}`) : "Unassigned",
      line: row.line_number ?? line ?? "—",
      station: row.station_code,
      start: row.scheduled_arrival ?? row.scheduled_run_through ?? row.scheduled_departure ?? "",
      end: row.scheduled_departure ?? row.scheduled_run_through,
      reason: "Source timetable entry overlaps the block window",
    });
  }

  return affected;
};

export function TrainImpactPage() {
  const health = useHealth();
  const trains = useAsyncResource(() => fetchCoaTrains({ limit: 1000 }), []);
  const schedules = useAsyncResource(() => fetchCoaSchedules({ limit: 1000 }), []);
  const occupancy = useAsyncResource(() => fetchCoaLineOccupancy({ limit: 1000 }), []);
  const candidates = useAsyncResource(() => fetchCandidateWindows({ limit: 2000 }), []);
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 2000 }), []);
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);

  const [selected, setSelected] = useState<PlannedImpact | null>(null);

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    trains.retry();
    schedules.retry();
    occupancy.retry();
    candidates.retry();
    windows.retry();
    plans.retry();
    planTasks.retry();
  };

  const byTrainId = useMemo(() => new Map((trains.data ?? []).map((t) => [t.id, t])), [trains.data]);

  const plannedImpacts = useMemo<PlannedImpact[]>(() => {
    const candidateById = new Map((candidates.data ?? []).map((c) => [c.id, c]));
    const windowById = new Map((windows.data ?? []).map((w) => [w.id, w]));
    const planById = new Map((plans.data ?? []).map((p) => [p.id, p]));
    const result: PlannedImpact[] = [];
    for (const task of planTasks.data ?? []) {
      const candidate = task.candidate_block_window_id != null ? candidateById.get(task.candidate_block_window_id) ?? null : null;
      const window = candidate ? windowById.get(candidate.available_window_id) ?? null : null;
      const plan = planById.get(task.block_plan_id) ?? null;
      const station = window?.station_code ?? null;
      const line = window?.line_number ?? null;
      const affected = computeAffected(
        task.planned_start,
        task.planned_end,
        station,
        line,
        occupancy.data ?? [],
        schedules.data ?? [],
        byTrainId,
      );
      result.push({
        key: `${task.id}-${task.candidate_block_window_id ?? "?"}`,
        planCode: plan?.plan_code ?? `PLAN#${task.block_plan_id}`,
        planId: task.block_plan_id,
        taskId: task.planning_task_id,
        windowId: task.candidate_block_window_id,
        station,
        line,
        start: task.planned_start,
        end: task.planned_end,
        affected,
        status: affected.length > 0 ? "CONFLICT" : "CLEAR",
      });
    }
    return result;
  }, [planTasks.data, candidates.data, windows.data, plans.data, occupancy.data, schedules.data, byTrainId]);

  const candidateImpacts = useMemo<CandidateImpact[]>(() => {
    const windowById = new Map((windows.data ?? []).map((w) => [w.id, w]));
    const reviewed = (candidates.data ?? []).filter(
      (candidate) => candidate.feasible || candidate.feasibility_status === "REQUIRES_REVIEW",
    );
    return reviewed.map((candidate) => {
      const window = windowById.get(candidate.available_window_id) ?? null;
      const station = window?.station_code ?? null;
      const line = window?.line_number ?? null;
      const affected = computeAffected(
        candidate.candidate_start,
        candidate.candidate_end,
        station,
        line,
        occupancy.data ?? [],
        schedules.data ?? [],
        byTrainId,
      );
      return {
        candidate,
        window,
        station,
        line,
        affected,
        status: affected.length > 0 ? "CONFLICT" : "CLEAR",
      };
    });
  }, [candidates.data, windows.data, occupancy.data, schedules.data, byTrainId]);

  const conflictPlanned = plannedImpacts.filter((impact) => impact.status === "CONFLICT");
  const affectedTrains = new Set(plannedImpacts.flatMap((impact) => impact.affected).map((row) => row.label));

  const plannedColumns: DataTableColumn<PlannedImpact>[] = [
    {
      key: "plan",
      header: "Plan",
      render: (row) => <button type="button" onClick={() => setSelected(row)} className="font-mono text-xs font-semibold text-brand-700 hover:underline">{row.planCode}</button>,
    },
    {
      key: "window",
      header: "Block window",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {formatDateTime(row.start)} → {formatTime(row.end)}
        </span>
      ),
    },
    {
      key: "location",
      header: "Station / Line",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">{row.station ?? "—"}</span>
          <span className="font-mono text-2xs text-ink-faint">{row.line ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "affected",
      header: "Affected trains",
      render: (row) =>
        row.affected.length === 0 ? (
          <span className="text-xs text-ink-faint">None</span>
        ) : (
          <div className="flex max-w-[18rem] flex-wrap gap-1">
            {Array.from(new Set(row.affected.map((row) => row.label))).map((label) => (
              <Badge key={label} variant={row.status === "CONFLICT" ? "danger" : "outline"}>
                <TrainFront /> {label}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "status",
      header: "Impact",
      render: (row) => <StatusBadge status={row.status} tone={row.status === "CONFLICT" ? "danger" : "success"} />,
    },
  ];

  const candidateColumns: DataTableColumn<CandidateImpact>[] = [
    {
      key: "candidate",
      header: "Candidate",
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            const planned = plannedImpacts.find((p) => p.windowId === row.candidate.id) ?? null;
            if (planned) setSelected(planned);
          }}
          className="font-mono text-xs font-semibold text-brand-700 hover:underline disabled:cursor-default"
        >
          #{row.candidate.id}
        </button>
      ),
    },
    {
      key: "window",
      header: "Candidate window",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {formatDateTime(row.candidate.candidate_start)} → {formatTime(row.candidate.candidate_end)}
        </span>
      ),
    },
    { key: "line", header: "Station / Line", render: (row) => (row.window ? `${row.window.station_code} · ${row.window.line_number}` : "—") },
    {
      key: "feasibility",
      header: "Feasibility",
      render: (row) => <StatusBadge status={row.candidate.feasibility_status} />,
    },
    {
      key: "status",
      header: "Impact",
      render: (row) => <StatusBadge status={row.status} tone={row.status === "CONFLICT" ? "danger" : "success"} />,
    },
  ];

  const isLoading =
    plans.loading || planTasks.loading || candidates.loading || schedules.loading || occupancy.loading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Planning · Impact"
        title="Train Impact"
        description="Which trains are touched by each planned or candidate block. Every row is computed from real COA schedules and line-occupancy records overlapping the block window — no delays are invented."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Planned blocks" value={plannedImpacts.length} icon={CalendarClock} hint="Tasks placed into block plans" loading={isLoading} />
        <MetricCard label="Clean blocks" value={plannedImpacts.length - conflictPlanned.length} tone="success" icon={CheckCircle2} hint="No schedule/occupancy overlap" loading={isLoading} />
        <MetricCard label="Conflicting blocks" value={conflictPlanned.length} tone={conflictPlanned.length > 0 ? "danger" : "default"} icon={TriangleAlert} hint="Overlapping schedule or occupancy" loading={isLoading} />
        <MetricCard label="Affected train services" value={affectedTrains.size} tone="info" icon={TrainFront} hint="Unique trains crossing any planned block" loading={isLoading} />
      </section>

      {offline ? (
        <ErrorState title="Backend offline" message="The COA and planning APIs are unreachable." onRetry={refresh} />
      ) : isLoading ? (
        <LoadingState label="Computing train impact from COA records" />
      ) : (
        <div className="space-y-6">
          <section className="space-y-4">
            <SectionHeader
              icon={Route}
              title="Impact by planned block"
              description={`${plannedImpacts.length} planned block(s) across ${plans.data?.length ?? 0} plan(s) — derived from plan task → candidate → available window joined against COA records.`}
            />
            <DataTable<PlannedImpact>
              columns={plannedColumns}
              rows={plannedImpacts}
              keyField={(row) => row.key}
              emptyTitle="No planned blocks"
              emptyDescription="Planned blocks appear once planning places tasks into a plan. This list stays empty rather than inventing impact."
              toolbar={
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-ink-muted">Click a plan for the full per-train breakdown.</p>
                  {conflictPlanned.length > 0 ? <Badge variant="danger">Manual review recommended</Badge> : <Badge variant="success">No conflicts on record</Badge>}
                </div>
              }
            />
          </section>

          <section className="space-y-4">
            <SectionHeader
              icon={TrainFront}
              title="Impact by candidate window"
              description={`${candidateImpacts.length} feasible / review candidates — the same engine is used, so choosing any candidate shows its real impact up front.`}
            />
            <DataTable<CandidateImpact>
              columns={candidateColumns}
              rows={candidateImpacts}
              keyField={(row) => row.candidate.id}
              emptyTitle="No feasible candidates"
              emptyDescription="The candidate engine produced no feasible or review-worthy candidates so far."
            />
          </section>
        </div>
      )}

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? selected.planCode : "Block impact"}
        description={selected ? `Task #${selected.taskId} · ${formatDateTime(selected.start)} → ${formatTime(selected.end)}` : undefined}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-muted/40 px-3 py-2.5">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Impact status</p>
                <p className="text-sm font-semibold">
                  {selected.station ?? "—"} · {selected.line ?? "—"}
                </p>
              </div>
              <StatusBadge status={selected.status} tone={selected.status === "CONFLICT" ? "danger" : "success"} />
            </div>

            <section>
              <SectionHeader
                icon={TrainFront}
                title={`Affected trains (${selected.affected.length})`}
                description="Trains whose COA record overlaps this block window"
              />
              {selected.affected.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No COA schedule or occupancy record falls inside this block window — the line is CLEAR for the planned
                  period.
                </p>
              ) : (
                <div className="space-y-2">
                  {selected.affected.map((row) => (
                    <div key={row.key} className="flex items-start justify-between gap-3 rounded-lg border border-danger/25 bg-danger-light/40 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink">
                          {row.label} <span className="text-2xs font-medium text-ink-faint">({row.kind.toLowerCase()} record)</span>
                        </p>
                        <p className="mt-0.5 text-2xs text-ink-muted">{row.reason}</p>
                        <p className="mt-0.5 text-2xs text-ink-faint">
                          {row.station} · {row.line} · {formatTime(row.start)} → {formatTime(row.end)}
                        </p>
                      </div>
                      <StatusBadge status="CONFLICT" tone="danger" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="border-t border-line pt-3 text-2xs text-ink-faint">
              Impact is derived from COA <code>line-occupancy</code> and <code>schedules</code> overlap. It is a
              forecast aid for the controller — not a realtime delay measurement.
            </p>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}