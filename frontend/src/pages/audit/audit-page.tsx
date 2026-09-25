import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  GitCommitHorizontal,
  RefreshCw,
  Route,
  ShieldCheck,
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
import { TimelineItem } from "@/components/common/timeline-item";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchCoaAvailableWindows } from "@/services/api/coa";
import { fetchCandidateWindows } from "@/services/api/candidates";
import {
  fetchExecutionOutcomes,
  fetchOptimizationDecisions,
  fetchOptimizationPlanTasks,
  fetchOptimizationPlans,
  fetchOptimizationRuns,
  fetchOptimizationValidations,
} from "@/services/api/optimization";
import { fetchPlanningPriorities, fetchPlanningTasks } from "@/services/api/planning";
import { fetchUnifiedBlockRequirements, fetchUnifiedMaintenance } from "@/services/api/unified";
import type {
  BlockPlanTask,
  CandidateWindow,
  ControllerDecision,
  ExecutionOutcome,
  OptimizationValidation,
  PlanningPriority,
  PlanningTask,
  UnifiedBlockRequirement,
  UnifiedMaintenance,
} from "@/services/api/types";
import { formatDateTime } from "@/utils/plan-chain";

interface ChainTrail {
  planId: number;
  planCode: string;
  optimizationRunId: number | null;
  task: PlanningTask | null;
  blockRequirement: UnifiedBlockRequirement | null;
  maintenanceAsk: UnifiedMaintenance | null;
  priority: PlanningPriority | null;
  planTask: BlockPlanTask | null;
  candidate: CandidateWindow | null;
  validation: OptimizationValidation[];
  decision: ControllerDecision | null;
  outcome: ExecutionOutcome | null;
}

export function AuditPage() {
  const health = useHealth();
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);
  const candidates = useAsyncResource(fetchCandidateWindows, []);
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 2000 }), []);
  const tasks = useAsyncResource(fetchPlanningTasks, []);
  const requirements = useAsyncResource(fetchUnifiedBlockRequirements, []);
  const maintenance = useAsyncResource(fetchUnifiedMaintenance, []);
  const priorities = useAsyncResource(fetchPlanningPriorities, []);
  const validations = useAsyncResource(fetchOptimizationValidations, []);
  const decisions = useAsyncResource(fetchOptimizationDecisions, []);
  const outcomes = useAsyncResource(fetchExecutionOutcomes, []);
  const runs = useAsyncResource(fetchOptimizationRuns, []);

  const [selected, setSelected] = useState<ChainTrail | null>(null);

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    plans.retry();
    planTasks.retry();
    candidates.retry();
    windows.retry();
    tasks.retry();
    requirements.retry();
    maintenance.retry();
    priorities.retry();
    validations.retry();
    decisions.retry();
    outcomes.retry();
    runs.retry();
  };

  const trails = useMemo<ChainTrail[]>(() => {
    const taskById = new Map((tasks.data ?? []).map((t) => [t.id, t]));
    const requirementById = new Map((requirements.data ?? []).map((r) => [r.id, r]));
    const maintenanceById = new Map((maintenance.data ?? []).map((m) => [m.id, m]));
    const priorityById = new Map((priorities.data ?? []).map((p) => [p.planning_task_id, p]));
    const candidateById = new Map((candidates.data ?? []).map((c) => [c.id, c]));
    const validationByPlan = new Map<number, OptimizationValidation[]>();
    for (const record of validations.data ?? []) {
      const list = validationByPlan.get(record.block_plan_id) ?? [];
      list.push(record);
      validationByPlan.set(record.block_plan_id, list);
    }
    const decisionByPlan = new Map<number, ControllerDecision>();
    for (const decision of decisions.data ?? []) {
      const current = decisionByPlan.get(decision.block_plan_id);
      if (!current || new Date(decision.decided_at).getTime() >= new Date(current.decided_at).getTime()) {
        decisionByPlan.set(decision.block_plan_id, decision);
      }
    }
    const outcomeByPlan = new Map<number, ExecutionOutcome>();
    for (const outcome of outcomes.data ?? []) {
      const current = outcomeByPlan.get(outcome.block_plan_id);
      if (!current || (outcome.recorded_at ?? "") >= (current.recorded_at ?? "")) {
        outcomeByPlan.set(outcome.block_plan_id, outcome);
      }
    }

    return (plans.data ?? []).map((plan) => {
      const planPlanTasks = (planTasks.data ?? []).filter((t) => t.block_plan_id === plan.id);
      const firstPlanTask = planPlanTasks[0] ?? null;
      const task = firstPlanTask ? taskById.get(firstPlanTask.planning_task_id) ?? null : null;
      const blockRequirement = task?.block_requirement_id != null ? requirementById.get(task.block_requirement_id) ?? null : null;
      const maintenanceAsk = task?.maintenance_requirement_id != null ? maintenanceById.get(task.maintenance_requirement_id) ?? null : null;
      const priority = task ? priorityById.get(task.id) ?? null : null;
      const candidate = firstPlanTask?.candidate_block_window_id != null ? candidateById.get(firstPlanTask.candidate_block_window_id) ?? null : null;

      return {
        planId: plan.id,
        planCode: plan.plan_code,
        optimizationRunId: plan.optimization_run_id,
        task,
        blockRequirement,
        maintenanceAsk,
        priority,
        planTask: firstPlanTask,
        candidate,
        validation: validationByPlan.get(plan.id) ?? [],
        decision: decisionByPlan.get(plan.id) ?? null,
        outcome: outcomeByPlan.get(plan.id) ?? null,
      };
    });
  }, [plans.data, planTasks.data, tasks.data, requirements.data, maintenance.data, priorities.data, candidates.data, validations.data, decisions.data, outcomes.data]);

  const decided = trails.filter((trail) => trail.decision).length;
  const approved = trails.filter((trail) => trail.decision?.decision === "APPROVED").length;
  const executed = trails.filter((trail) => trail.outcome).length;
  const recordedRecords =
    (plans.data?.length ?? 0) +
    (planTasks.data?.length ?? 0) +
    (validations.data?.length ?? 0) +
    (decisions.data?.length ?? 0) +
    (outcomes.data?.length ?? 0);

  const columns: DataTableColumn<ChainTrail>[] = [
    {
      key: "plan",
      header: "Plan",
      render: (row) => (
        <button type="button" onClick={() => setSelected(row)} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
          {row.planCode}
        </button>
      ),
    },
    {
      key: "source",
      header: "Source ask",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-xs">{row.maintenanceAsk?.maintenance_type ?? row.task?.task_type ?? "—"}</span>
          <span className="text-2xs text-ink-faint">maint #{row.maintenanceAsk?.id ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "requirement",
      header: "Block requirement",
      render: (row) =>
        row.blockRequirement ? (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{row.blockRequirement.block_type}</span>
            <span className="text-2xs text-ink-faint">{row.blockRequirement.power_block_required ? "Power" : ""}{row.blockRequirement.power_block_required && row.blockRequirement.traffic_block_required ? " + " : ""}{row.blockRequirement.traffic_block_required ? "Traffic" : ""}</span>
          </div>
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        ),
    },
    {
      key: "task",
      header: "Task",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">{row.task?.task_code ?? "—"}</span>
          {row.priority ? (
            <Badge variant={row.priority.priority_band === "CRITICAL" ? "danger" : row.priority.priority_band === "HIGH" ? "warning" : "outline"} className="mt-0.5 w-fit">
              {row.priority.priority_band} · {row.priority.priority_score}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "candidate",
      header: "Candidate / window",
      render: (row) => (row.candidate ? <span className="font-mono text-xs">#{row.candidate.id} → win #{row.candidate.available_window_id}</span> : <span className="text-xs text-ink-faint">—</span>),
    },
    {
      key: "validation",
      header: "Validation",
      render: (row) => {
        if (row.validation.length === 0) return <Badge variant="outline">Not run</Badge>;
        const failed = row.validation.filter((v) => v.validation_status === "FAILED").length;
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={failed > 0 ? "FAILED" : "PASSED"} />
            <span className="text-2xs text-ink-faint">{row.validation.length} checks</span>
          </div>
        );
      },
    },
    {
      key: "decision",
      header: "Controller",
      render: (row) =>
        row.decision ? (
          <StatusBadge status={row.decision.decision} tone={row.decision.decision === "APPROVED" ? "success" : row.decision.decision === "REJECTED" ? "danger" : "warning"} />
        ) : (
          <Badge variant="outline">Pending</Badge>
        ),
    },
    {
      key: "execution",
      header: "Execution",
      render: (row) => (row.outcome ? <StatusBadge status={row.outcome.execution_status} /> : <Badge variant="outline">Not executed</Badge>),
    },
  ];

  const isLoading = plans.loading || planTasks.loading || tasks.loading || candidates.loading || validations.loading || decisions.loading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Organisation · Traceability"
        title="Audit Trail"
        description="End-to-end provenance from initial maintenance ask to execution outcome. Every hop shown is a real backend record with its own timestamp — nothing is recreated in the browser."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Plans with a trail" value={trails.length} icon={Route} hint="Every plan row links source → decision" loading={isLoading} />
        <MetricCard label="Controller decisions" value={decided} tone="ai" icon={ShieldCheck} hint={`${approved} approved on record`} loading={isLoading} />
        <MetricCard label="Plans executed" value={executed} tone={executed > 0 ? "success" : "default"} icon={CheckCircle2} hint="With a persisted execution outcome" loading={isLoading} />
        <MetricCard label="Provenance records" value={recordedRecords} tone="info" icon={GitCommitHorizontal} hint="Plans + tasks + validations + decisions + outcomes" loading={isLoading} />
      </section>

      {offline ? (
        <ErrorState title="Backend offline" message="The API is unreachable." onRetry={refresh} />
      ) : isLoading ? (
        <LoadingState label="Assembling the audit trail" />
      ) : (
        <section className="space-y-4">
          <SectionHeader
            icon={FileSearch}
            title="Chain trails"
            description={`${trails.length} plan trail(s). Click any plan to open its hop-by-hop trail with timestamps.`}
          />
          <DataTable<ChainTrail>
            columns={columns}
            rows={trails}
            keyField={(row) => row.planId}
            emptyTitle="No plans on record"
            emptyDescription="The audit trail fills in as plans are created and decided."
          />
        </section>
      )}

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? selected.planCode : "Audit trail"}
        description={selected ? `Full provenance for plan #${selected.planId}` : undefined}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {selected.task ? <Badge variant="outline">{selected.task.task_code}</Badge> : null}
              {selected.priority ? <Badge variant={selected.priority.priority_band === "CRITICAL" ? "danger" : "warning"}>{selected.priority.priority_band}</Badge> : null}
              {selected.decision ? <StatusBadge status={selected.decision.decision} /> : <Badge variant="outline">Undecided</Badge>}
              {selected.outcome ? <StatusBadge status={selected.outcome.execution_status} /> : <Badge variant="outline">Not executed</Badge>}
            </div>

            <section className="space-y-1.5">
              <SectionHeader icon={GitCommitHorizontal} title="Hop-by-hop trail" description="Record → record transitions, each with its persisted timestamp." />
              <div className="rounded-lg border border-line bg-surface-muted/30 p-3">
                <TimelineItem
                  icon={Activity}
                  title="Source ask"
                  meta="Unified maintenance"
                  description={selected.maintenanceAsk ? `${selected.maintenanceAsk.maintenance_type} · ${selected.maintenanceAsk.required_duration_minutes ?? "?"}m · ${formatDateTime(selected.maintenanceAsk.planned_date) ?? "—"}` : "No maintenance record linked yet"}
                  connector
                />
                <TimelineItem
                  icon={ArrowRight}
                  title="Block requirement"
                  meta={`#${selected.blockRequirement?.id ?? "—"}`}
                  description={selected.blockRequirement ? `${selected.blockRequirement.block_type} · ${selected.blockRequirement.required_duration_minutes ?? "?"}m · ${selected.blockRequirement.status}` : "No block requirement record"}
                  connector
                />
                <TimelineItem
                  icon={Activity}
                  title="Planning task"
                  meta={selected.task ? `#${selected.task.id}` : "—"}
                  description={selected.task ? `${selected.task.task_code} · ${selected.task.task_type} · duration ${selected.task.duration_minutes}m · ${selected.task.location_code ?? "no location"}` : "No planning task record"}
                  connector
                />
                <TimelineItem
                  icon={GitCommitHorizontal}
                  title="Priority assessment"
                  meta={selected.priority ? `band ${selected.priority.priority_band}` : "—"}
                  description={
                    selected.priority
                      ? `score ${selected.priority.priority_score} · ${selected.priority.calculation_version} · ${formatDateTime(selected.priority.calculated_at)}`
                      : "No priority assessment yet"
                  }
                  connector
                />
                <TimelineItem
                  icon={Route}
                  title="Candidate window"
                  meta={selected.candidate ? `#${selected.candidate.id}` : "—"}
                  description={
                    selected.candidate
                      ? `${selected.candidate.feasibility_status} · ${formatDateTime(selected.candidate.candidate_start)} → ${formatDateTime(selected.candidate.candidate_end)}`
                      : "No candidate on record"
                  }
                  connector
                />
                <TimelineItem
                  icon={CalendarClock}
                  title="Plan placement"
                  meta={selected.planTask ? `${formatDateTime(selected.planTask.planned_start)} → ${formatDateTime(selected.planTask.planned_end)}` : "—"}
                  description={selected.planTask ? `${selected.planTask.planned_duration_minutes}m · ${selected.planTask.status}` : "No plan-task placement"}
                  connector
                />
                <TimelineItem
                  icon={CheckCircle2}
                  title="Validation"
                  meta={`${selected.validation.length} check(s)`}
                  description={
                    selected.validation.length === 0
                      ? "Validation not run"
                      : selected.validation
                          .map((v) => `${v.validation_type}: ${v.validation_status}`)
                          .slice(0, 3)
                          .join(" · ") + (selected.validation.length > 3 ? ` +${selected.validation.length - 3} more` : "")
                  }
                  connector
                />
                <TimelineItem
                  icon={ShieldCheck}
                  title="Controller decision"
                  meta={selected.decision ? formatDateTime(selected.decision.decided_at) : "—"}
                  description={selected.decision ? `${selected.decision.decision} · ${selected.decision.controller_code ?? "no controller code"} · ${selected.decision.remarks ?? "no remarks"}` : "No decision recorded — plan remains unapproved by the API by design"}
                  connector
                />
                <TimelineItem
                  icon={CheckCircle2}
                  title="Execution outcome"
                  meta={selected.outcome ? `${selected.outcome.execution_status}` : "Not executed"}
                  description={
                    selected.outcome
                      ? `${formatDateTime(selected.outcome.actual_start)} → ${formatDateTime(selected.outcome.actual_end)} · ${selected.outcome.actual_duration_minutes ?? "?"}m`
                      : "Outcomes are only recorded through the execution API when ground truth exists."
                  }
                />
              </div>
            </section>

            <section>
              <SectionHeader icon={GitCommitHorizontal} title="Optimization runs" description="Model versions used to produce the plan." />
              <div className="space-y-1.5">
                {(runs.data ?? [])
                  .filter((run) => run.id === selected.optimizationRunId)
                  .map((run) => (
                    <div key={run.id} className="flex items-center justify-between rounded-md border border-line bg-surface-muted/40 px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold">{run.run_code}</p>
                        <p className="text-2xs text-ink-muted">{run.model_name} · {run.model_version} · {run.run_type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={run.status} />
                        <span className="tabular-nums text-ink-faint">{formatDateTime(run.completed_at ?? run.started_at)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            <p className="border-t border-line pt-3 text-2xs text-ink-faint">
              Provenance relies on persisted <code>created_at</code> / <code>calculated_at</code> / <code>decided_at</code> /
              <code>recorded_at</code> timestamps on every hop — reviewable in the backend tables.
            </p>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}