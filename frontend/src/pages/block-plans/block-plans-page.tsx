import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GaugeCircle,
  RefreshCw,
  Route,
  ShieldAlert,
  TrainFront,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
import { fetchAssets } from "@/services/api/assets";
import { fetchCoaAvailableWindows, fetchCoaLineOccupancy, fetchCoaSchedules, fetchCoaTrains } from "@/services/api/coa";
import { fetchCandidateWindows } from "@/services/api/candidates";
import { fetchLocations } from "@/services/api/locations";
import {
  fetchOptimizationDecisions,
  fetchOptimizationPlanTasks,
  fetchOptimizationPlans,
  fetchOptimizationValidations,
} from "@/services/api/optimization";
import { fetchPlanningTasks } from "@/services/api/planning";
import { fetchUnifiedBlockRequirements } from "@/services/api/unified";
import {
  buildPlanSummaries,
  formatDateTime,
  formatTime,
  type PlanSummary,
} from "@/utils/plan-chain";

export function BlockPlansPage() {
  const health = useHealth();
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);
  const validations = useAsyncResource(fetchOptimizationValidations, []);
  const decisions = useAsyncResource(fetchOptimizationDecisions, []);
  const candidates = useAsyncResource(fetchCandidateWindows, []);
  const tasks = useAsyncResource(fetchPlanningTasks, []);
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 2000 }), []);
  const requirements = useAsyncResource(fetchUnifiedBlockRequirements, []);
  const trains = useAsyncResource(() => fetchCoaTrains({ limit: 500 }), []);
  const occupancy = useAsyncResource(() => fetchCoaLineOccupancy({ limit: 1000 }), []);
  const schedules = useAsyncResource(() => fetchCoaSchedules({ limit: 1000 }), []);
  const locations = useAsyncResource(() => fetchLocations({ limit: 500 }), []);
  const assets = useAsyncResource(fetchAssets, []);

  const [selected, setSelected] = useState<PlanSummary | null>(null);

  const summaries = useMemo(
    () =>
      buildPlanSummaries({
        plans: plans.data ?? [],
        planTasks: planTasks.data ?? [],
        candidates: candidates.data ?? [],
        planningTasks: tasks.data ?? [],
        windows: windows.data ?? [],
        requirements: requirements.data ?? [],
        validations: validations.data ?? [],
        decisions: decisions.data ?? [],
        trains: trains.data ?? [],
        occupancy: occupancy.data ?? [],
        schedules: schedules.data ?? [],
        locations: locations.data ?? [],
        assets: assets.data ?? [],
      }),
    [plans.data, planTasks.data, candidates.data, tasks.data, windows.data, requirements.data, validations.data, decisions.data, trains.data, occupancy.data, schedules.data, locations.data, assets.data],
  ).sort((a, b) => (b.plan.id ?? 0) - (a.plan.id ?? 0));

  const offline = health.api === "offline";

  const totalPlannedMinutes = summaries.reduce((sum, plan) => sum + (plan.durationMinutes ?? 0), 0);
  const validatedCount = summaries.filter((plan) => plan.validated).length;
  const approvedCount = summaries.filter((plan) => plan.latestDecision?.decision === "APPROVED").length;
  const conflictCount = summaries.filter((plan) => plan.impactStatus === "CONFLICT").length;

  const columns: DataTableColumn<PlanSummary>[] = [
    {
      key: "plan",
      header: "Plan",
      render: (row) => (
        <button type="button" onClick={() => setSelected(row)} className="group flex flex-col text-left">
          <span className="font-mono text-xs font-semibold text-brand-700 group-hover:underline">{row.plan.plan_code}</span>
          <span className="text-2xs text-ink-faint">#{row.plan.id}</span>
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.plan.status} />,
    },
    {
      key: "location",
      header: "Section / Line / Station",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">{row.section ?? "—"}</span>
          <span className="font-mono text-xs">{row.line ?? "—"}</span>
          <span className="text-2xs text-ink-faint">{row.station ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "block",
      header: "Block Window",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {row.start ? formatDateTime(row.start) : "—"} → {row.end ? formatTime(row.end) : "—"}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      render: (row) =>
        row.durationMinutes != null ? <span className="tabular-nums">{row.durationMinutes}m</span> : <span>—</span>,
    },
    {
      key: "tasks",
      header: "Tasks",
      align: "right",
      render: (row) => <span className="tabular-nums">{row.taskCount}</span>,
    },
    {
      key: "validation",
      header: "Validation",
      render: (row) => {
        if (!row.validated) return <Badge variant="outline">Not run</Badge>;
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.failedValidation > 0 ? "FAILED" : "PASSED"} />
            <span className="text-2xs text-ink-faint">
              {row.passedValidation}p / {row.warningValidation}w / {row.failedValidation}f
            </span>
          </div>
        );
      },
    },
    {
      key: "decision",
      header: "Controller",
      render: (row) =>
        row.latestDecision ? (
          <StatusBadge
            status={row.latestDecision.decision}
            tone={row.latestDecision.decision === "APPROVED" ? "success" : row.latestDecision.decision === "REJECTED" ? "danger" : "warning"}
          />
        ) : (
          <Badge variant="outline">Pending</Badge>
        ),
    },
    {
      key: "impact",
      header: "Train Impact",
      render: (row) => (
        <StatusBadge
          status={row.impactStatus === "CONFLICT" ? "CONFLICT" : row.impactStatus === "CLEAR" ? "CLEAR" : "UNKNOWN"}
          tone={row.impactStatus === "CONFLICT" ? "danger" : row.impactStatus === "CLEAR" ? "success" : "default"}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/controller?plan=${row.plan.id}`}>
              <ArrowRight /> Open in Controller
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const refresh = () => {
    health.retry();
    plans.retry();
    planTasks.retry();
    validations.retry();
    decisions.retry();
    candidates.retry();
    tasks.retry();
    windows.retry();
    requirements.retry();
    occupancy.retry();
  };

  const isLoading =
    plans.loading || planTasks.loading || validations.loading || decisions.loading || candidates.loading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Planning · Proposals"
        title="Block Plans"
        description="Proposed block plans with the tasks placed, the candidate windows chosen, and the deterministic validation checks that were run. Derived section/line/block-window values are joined client-side from backend records — nothing is fabricated."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Planned roster" value={summaries.length} icon={CalendarClock} hint="Block plans returned by the backend" />
        <MetricCard
          label="Validated"
          value={validatedCount}
          tone="success"
          icon={FileCheck2}
          hint="Plans with at least one validation record"
          loading={isLoading}
        />
        <MetricCard
          label="Controller approved"
          value={approvedCount}
          tone="ai"
          icon={CheckCircle2}
          hint="Real controller_decision records (APPROVED)"
          loading={isLoading}
        />
        <MetricCard
          label="Planned block hours"
          value={totalPlannedMinutes > 0 ? (totalPlannedMinutes / 60).toFixed(1) : null}
          unit="h"
          tone={conflictCount > 0 ? "warning" : "default"}
          icon={Clock3}
          hint={conflictCount > 0 ? `${conflictCount} plan(s) with conflicting train movement` : "Derived from planned task windows"}
          loading={isLoading}
        />
      </section>

      {offline ? (
        <ErrorState title="Backend offline" message="The block-planning API is unreachable." onRetry={refresh} />
      ) : isLoading && (!plans.data || !validations.data) ? (
        <LoadingState label="Loading block plans from the backend" />
      ) : (
        <section className="space-y-4">
          <DataTable<PlanSummary>
            columns={columns}
            rows={summaries}
            keyField={(row) => row.plan.id}
            loading={false}
            emptyTitle="No block plans yet"
            emptyDescription="Plans are produced by the planning pipeline. Until then, this screen stays empty — no dummy proposals are rendered."
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">Proposal roster</p>
                  <p className="text-xs text-ink-muted">
                    Each row joins plan → tasks → candidates → validation → controller decision from live API data.
                  </p>
                </div>
                {conflictCount > 0 ? (
                  <Badge variant="warning">
                    <TrainFront /> {conflictCount} with train impact
                  </Badge>
                ) : null}
              </div>
            }
          />
          <p className="text-xs text-ink-faint">
            Creating a plan never approves it — approval only happens through a controller decision in the Controller Workspace.
          </p>
        </section>
      )}

      <DetailDrawer summary={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function DetailDrawer({ summary, onClose }: { summary: PlanSummary | null; onClose: () => void }) {
  if (!summary) return null;
  const { plan, tasks, validation, impact, latestDecision } = summary;

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={plan.plan_code}
      description="Plan detail joined from backend records — pending/proposed values carry their real status."
    >
      <div className="space-y-5">
        <section className="space-y-2 rounded-lg border border-line bg-surface-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={plan.status} />
            <span className="text-2xs text-ink-faint">#{plan.id} · {formatDateTime(plan.plan_date)}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <dt className="text-ink-faint">Section</dt>
            <dd className="text-right font-mono">{summary.section ?? "—"}</dd>
            <dt className="text-ink-faint">Line</dt>
            <dd className="text-right font-mono">{summary.line ?? "—"}</dd>
            <dt className="text-ink-faint">Station</dt>
            <dd className="text-right font-mono">{summary.station ?? "—"}</dd>
            <dt className="text-ink-faint">Block window</dt>
            <dd className="text-right tabular-nums">
              {summary.start ? `${formatDateTime(summary.start)} → ${formatTime(summary.end)}` : "—"}
            </dd>
            <dt className="text-ink-faint">Duration</dt>
            <dd className="text-right tabular-nums">{summary.durationMinutes != null ? `${summary.durationMinutes} min` : "—"}</dd>
          </dl>
          {plan.description ? <p className="text-xs text-ink-muted">{plan.description}</p> : null}
        </section>

        <section className="space-y-3">
          <SectionHeader icon={GaugeCircle} title={`Tasks (${tasks.length})`} description="Planned placements inside this plan" />
          {tasks.length === 0 ? (
            <p className="text-xs text-ink-faint">No tasks in this plan.</p>
          ) : (
            tasks.map((task) => (
              <div key={task.blockPlanTask.id} className="rounded-lg border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">{task.planningTask?.task_code ?? `Task ${task.blockPlanTask.planning_task_id}`}</span>
                  <StatusBadge status={task.blockPlanTask.status} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <dt className="text-ink-faint">Asset</dt>
                  <dd className="text-right">{task.asset?.asset_name ?? "—"}</dd>
                  <dt className="text-ink-faint">Task type</dt>
                  <dd className="text-right">{task.planningTask?.task_type ?? "—"}</dd>
                  <dt className="text-ink-faint">Earliest → latest</dt>
                  <dd className="text-right tabular-nums">
                    {formatTime(task.planningTask?.earliest_start)} → {formatTime(task.planningTask?.latest_end)}
                  </dd>
                  <dt className="text-ink-faint">Candidate</dt>
                  <dd className="text-right font-mono">#{task.candidate?.id ?? "—"}</dd>
                  <dt className="text-ink-faint">Candidate window</dt>
                  <dd className="text-right tabular-nums">
                    {task.availableWindow ? `${formatTime(task.availableWindow.window_start)} → ${formatTime(task.availableWindow.window_end)}` : "—"}
                  </dd>
                  <dt className="text-ink-faint">Planned</dt>
                  <dd className="text-right tabular-nums">
                    {formatDateTime(task.blockPlanTask.planned_start)} → {formatTime(task.blockPlanTask.planned_end)}
                  </dd>
                </dl>
                {task.blockPlanTask.remarks ? <p className="mt-2 text-xs text-ink-muted">{task.blockPlanTask.remarks}</p> : null}
              </div>
            ))
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader icon={ShieldAlert} title={`Validation (${validation.length})`} description="Deterministic backend checks — pass/fail per check, no scoring" />
          {validation.length === 0 ? (
            <p className="text-xs text-ink-faint">Validation has not been run for this plan.</p>
          ) : (
            <div className="space-y-2">
              {validation.map((record) => (
                <div key={record.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{record.validation_type}</p>
                    <p className="truncate font-mono text-2xs text-ink-muted">{record.validation_message}</p>
                  </div>
                  <StatusBadge status={record.validation_status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader icon={TrainFront} title="Train impact" description="Derived from COA occupancy and timetable data" />
          {impact.length === 0 ? (
            <p className="text-xs text-ink-muted">
              No COA occupancy or schedule rows overlap the planned block windows — impact is CLEAR.
            </p>
          ) : (
            <div className="space-y-2">
              {impact.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-2 rounded-lg border border-danger/25 bg-danger-light/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">
                      {row.kind === "OCCUPANCY" ? "Line occupancy" : "Schedule"} · {row.trainIdLabel}
                    </p>
                    <p className="truncate text-2xs text-ink-muted">{row.reason}</p>
                  </div>
                  <StatusBadge status="CONFLICT" tone="danger" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader icon={Route} title="Controller decision" description="Real backend controller_decision record" />
          {latestDecision ? (
            <div className="space-y-1.5 rounded-lg border border-line px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge
                  status={latestDecision.decision}
                  tone={latestDecision.decision === "APPROVED" ? "success" : latestDecision.decision === "REJECTED" ? "danger" : "warning"}
                />
                <span className="tabular-nums text-ink-faint">{formatDateTime(latestDecision.decided_at)}</span>
              </div>
              <p>
                <span className="text-ink-faint">Controller:</span> {latestDecision.controller_code ?? "—"}
              </p>
              <p>
                <span className="text-ink-faint">Remarks:</span> {latestDecision.remarks ?? "—"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No controller decision recorded yet. Open in the Controller Workspace to decide.</p>
          )}
        </section>
      </div>
    </Drawer>
  );
}