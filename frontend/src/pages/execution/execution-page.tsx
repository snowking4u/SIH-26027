import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hammer,
  ListChecks,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useMemo } from "react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import {
  fetchExecutionOutcomes,
  fetchOptimizationDecisions,
  fetchOptimizationPlanTasks,
  fetchOptimizationPlans,
} from "@/services/api/optimization";
import type { BlockPlan, BlockPlanTask, ExecutionOutcome } from "@/services/api/types";
import { formatDateTime, formatTime, parseDate } from "@/utils/plan-chain";

interface ApprovedPlan {
  plan: BlockPlan;
  tasks: BlockPlanTask[];
  approvedAt: string;
}

export function ExecutionPage() {
  const health = useHealth();
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);
  const decisions = useAsyncResource(fetchOptimizationDecisions, []);
  const outcomes = useAsyncResource(fetchExecutionOutcomes, []);

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    plans.retry();
    planTasks.retry();
    decisions.retry();
    outcomes.retry();
  };

  const tasksByPlan = useMemo(() => {
    const map = new Map<number, BlockPlanTask[]>();
    for (const task of planTasks.data ?? []) {
      const list = map.get(task.block_plan_id) ?? [];
      list.push(task);
      map.set(task.block_plan_id, list);
    }
    return map;
  }, [planTasks.data]);

  const approvedPlans = useMemo<ApprovedPlan[]>(() => {
    const approvedAt = new Map<number, string>();
    for (const decision of decisions.data ?? []) {
      if (decision.decision !== "APPROVED") continue;
      const current = approvedAt.get(decision.block_plan_id);
      if (!current || new Date(decision.decided_at).getTime() >= new Date(current).getTime()) {
        approvedAt.set(decision.block_plan_id, decision.decided_at);
      }
    }
    return (plans.data ?? [])
      .filter((plan) => approvedAt.has(plan.id))
      .map((plan) => ({
        plan,
        tasks: tasksByPlan.get(plan.id) ?? [],
        approvedAt: approvedAt.get(plan.id)!,
      }));
  }, [plans.data, decisions.data, tasksByPlan]);

  const taskCount = approvedPlans.reduce((sum, plan) => sum + plan.tasks.length, 0);

  const planColumns: DataTableColumn<ApprovedPlan>[] = [
    { key: "code", header: "Plan", render: (row) => <span className="font-mono text-xs font-semibold">{row.plan.plan_code}</span> },
    {
      key: "window",
      header: "Planned block window",
      render: (row) => {
        const start = Math.min(...row.tasks.map((t) => parseDate(t.planned_start)?.getTime() ?? Number.POSITIVE_INFINITY));
        const end = Math.max(...row.tasks.map((t) => parseDate(t.planned_end)?.getTime() ?? Number.NEGATIVE_INFINITY));
        if (!Number.isFinite(start)) return <span className="text-xs text-ink-faint">—</span>;
        return (
          <span className="tabular-nums text-xs">
            {formatDateTime(new Date(start).toISOString())} → {formatTime(new Date(end).toISOString())}
          </span>
        );
      },
    },
    { key: "tasks", header: "Tasks", align: "right", render: (row) => <span className="tabular-nums">{row.tasks.length}</span> },
    {
      key: "tasksstatus",
      header: "Task disposition",
      render: (row) => {
        const completed = row.tasks.filter((t) => t.status === "COMPLETED").length;
        const confirmed = row.tasks.filter((t) => t.status === "CONFIRMED").length;
        return (
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge status={row.plan.status} tone="success" />
            {completed > 0 ? <Badge variant="success">{completed} completed</Badge> : null}
            {confirmed > 0 ? <Badge variant="info">{confirmed} confirmed</Badge> : null}
          </div>
        );
      },
    },
    {
      key: "approved",
      header: "Approved",
      render: (row) => <span className="tabular-nums text-xs">{formatDateTime(row.approvedAt)}</span>,
    },
  ];

  const outcomeColumns: DataTableColumn<ExecutionOutcome>[] = [
    {
      key: "plan",
      header: "Plan",
      render: (row) => <span className="font-mono text-xs">#{row.block_plan_id}</span>,
    },
    {
      key: "task",
      header: "Plan task",
      render: (row) => <span className="font-mono text-xs">{row.block_plan_task_id ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Outcome",
      render: (row) => (
        <StatusBadge
          status={row.execution_status}
          tone={row.execution_status === "COMPLETED" ? "success" : row.execution_status === "FAILED" || row.execution_status === "CANCELLED" ? "danger" : row.execution_status === "STARTED" ? "warning" : "default"}
        />
      ),
    },
    {
      key: "actuals",
      header: "Actual start → end",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {row.actual_start ? formatDateTime(row.actual_start) : "—"} → {row.actual_end ? formatTime(row.actual_end) : "—"}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Actual duration",
      render: (row) => (row.actual_duration_minutes != null ? <span className="tabular-nums">{row.actual_duration_minutes}m</span> : <span className="text-ink-faint">—</span>),
    },
    { key: "remarks", header: "Remarks", render: (row) => <span className="max-w-[16rem] truncate text-xs">{row.remarks ?? "—"}</span> },
  ];

  const isLoading = plans.loading || planTasks.loading || decisions.loading || outcomes.loading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Organisation · Field"
        title="Execution"
        description="How approved blocks were executed and what actually happened, compared against what was planned. Outcomes are only ever real records from the backend — no outcomes are fabricated."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Approved plans" value={approvedPlans.length} tone="success" icon={CheckCircle2} hint="Controller decisions marked APPROVED" loading={isLoading} />
        <MetricCard label="Block tasks under approved plans" value={taskCount} tone="info" icon={ListChecks} hint="Each task is a planned block deployment" loading={isLoading} />
        <MetricCard label="Executions recorded" value={outcomes.data?.length ?? null} icon={Hammer} hint="Outcomes from GET /api/optimization/execution-outcomes" loading={outcomes.loading} />
        <MetricCard label="Completed tasks" value={approvedPlans.flatMap((p) => p.tasks).filter((t) => t.status === "COMPLETED").length} tone={approvedPlans.flatMap((p) => p.tasks).filter((t) => t.status === "COMPLETED").length > 0 ? "success" : "default"} icon={ClipboardList} hint="Plan-task rows with status COMPLETED" loading={isLoading} />
      </section>

      {offline ? (
        <ErrorState title="Backend offline" message="The optimization and execution APIs are unreachable." onRetry={refresh} />
      ) : isLoading ? (
        <LoadingState label="Loading execution records" />
      ) : (
        <div className="space-y-6">
          <section className="space-y-4">
            <SectionHeader
              icon={CalendarClock}
              title="Approved plans awaiting / during execution"
              description={`${approvedPlans.length} plan(s) approved through real controller decisions. Planned windows shown below remain the source of truth until an execution outcome is recorded.`}
            />
            <DataTable<ApprovedPlan>
              columns={planColumns}
              rows={approvedPlans}
              keyField={(row) => row.plan.id}
              emptyTitle="No approved plans"
              emptyDescription="Approve a plan in the Controller Workspace — its execution status will appear here afterwards."
            />
          </section>

          <section className="space-y-4">
            <SectionHeader
              icon={Hammer}
              title="Execution outcomes"
              description={`${outcomes.data?.length ?? 0} persisted outcome(s) — recorded actual start/end per plan task.`}
              right={
                outcomes.data && outcomes.data.length > 0 ? null : (
                  <Badge variant="warning">
                    <TriangleAlert /> No actuals recorded yet
                  </Badge>
                )
              }
            />
            <DataTable<ExecutionOutcome>
              columns={outcomeColumns}
              rows={outcomes.data ?? []}
              keyField={(row) => row.id}
              emptyTitle="No execution outcomes yet"
              emptyDescription="Execution results are recorded against the backend through the outcomes API when a replacement is executed on the ground. Until then this table is honestly empty."
            />
          </section>

          <p className="text-xs text-ink-faint">
            Requested vs actual start/end comparisons become visible as soon as outcomes with actual timestamps exist.
            No delay or completion values are displayed unless the backend has recorded them.
          </p>
        </div>
      )}
    </div>
  );
}