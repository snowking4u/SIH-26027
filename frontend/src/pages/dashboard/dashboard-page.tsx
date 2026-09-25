import {
  CalendarClock,
  FileCheck2,
  ListChecks,
  Map,
  RefreshCw,
  Target,
  TrainFront,
  Undo2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";

import { ConnectionControl } from "@/components/common/connection-control";
import { ErrorState } from "@/components/common/error-state";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { TimelineItem } from "@/components/common/timeline-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchCoaAvailableWindows, fetchCoaTrains } from "@/services/api/coa";
import { fetchCandidateWindows } from "@/services/api/candidates";
import { fetchOptimizationDecisions, fetchOptimizationPlans, fetchOptimizationValidations } from "@/services/api/optimization";
import { fetchPlanningTasks } from "@/services/api/planning";
import { fetchUnifiedMaintenance } from "@/services/api/unified";
import type { BlockPlan } from "@/services/api/types";

const asTs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
};

const clockTime = (value: string | null | undefined): string => {
  const ts = asTs(value);
  if (ts === null) return "—";
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

interface PipelineStage {
  key: string;
  label: string;
  tone: "default" | "success" | "warning" | "info" | "ai";
  value: (string | number) | null | undefined;
}

interface RecentEvent {
  ts: number;
  label: string;
  meta: string;
  tone: "default" | "success" | "warning" | "info" | "ai";
}

interface LaunchTarget {
  label: string;
  path: string;
  icon: LucideIcon;
}

const LAUNCH_TARGETS: LaunchTarget[] = [
  { label: "Planning", path: "/planning", icon: ListChecks },
  { label: "Block Requests", path: "/block-requests", icon: Wrench },
  { label: "Candidate Windows", path: "/candidate-windows", icon: Target },
  { label: "Train Impact", path: "/train-impact", icon: TrainFront },
  { label: "Execution", path: "/execution", icon: FileCheck2 },
  { label: "Audit", path: "/audit", icon: FileCheck2 },
];

function latestCreatedAt<T extends { created_at?: string | null }>(rows: T[]): T | null {
  let latest: T | null = null;
  let latestTs = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    const ts = asTs(row.created_at);
    if (ts !== null && ts > latestTs) {
      latest = row;
      latestTs = ts;
    }
  }
  return latest;
}

export function DashboardPage() {
  const health = useHealth();
  const trains = useAsyncResource(() => fetchCoaTrains({ limit: 1000 }));
  const maintenance = useAsyncResource(fetchUnifiedMaintenance);
  const tasks = useAsyncResource(fetchPlanningTasks);
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 1000 }));
  const candidates = useAsyncResource(fetchCandidateWindows);
  const plans = useAsyncResource(fetchOptimizationPlans);
  const validations = useAsyncResource(fetchOptimizationValidations);
  const decisions = useAsyncResource(fetchOptimizationDecisions);

  const offline = health.api === "offline";

  const validatedPlans = useMemo(
    () => new Set((validations.data ?? []).filter((record) => record.validation_status === "PASSED").map((record) => record.block_plan_id)),
    [validations.data],
  );
  const passedValidationCount = useMemo(
    () => (validations.data ?? []).filter((record) => record.validation_status === "PASSED").length,
    [validations.data],
  );
  const validatedPlansCount = useMemo(
    () => (plans.data ?? []).filter((plan) => validatedPlans.has(plan.id)).length,
    [plans.data, validatedPlans],
  );
  const awaitingDecision = useMemo(
    () => (plans.data ?? []).filter((plan) => plan.status === "PROPOSED" || plan.status === "VALIDATED" || plan.status === "SUBMITTED").length,
    [plans.data],
  );

  const pipeline = useMemo<PipelineStage[]>(
    () => [
      { key: "maintenance", label: "Maintenance", tone: "warning", value: maintenance.data?.length },
      { key: "planning", label: "Planning", tone: "success", value: tasks.data?.length },
      { key: "window", label: "Window", tone: "info", value: windows.data?.length },
      { key: "candidate", label: "Candidate", tone: "ai", value: candidates.data?.length },
      { key: "block-plan", label: "Block Plan", tone: "default", value: plans.data?.length },
      { key: "validation", label: "Validation", tone: "success", value: passedValidationCount },
      { key: "controller", label: "Controller", tone: "warning", value: awaitingDecision },
    ],
    [maintenance.data, tasks.data, windows.data, candidates.data, plans.data, passedValidationCount, awaitingDecision],
  );

  const recentEvents = useMemo<RecentEvent[]>(() => {
    const list: RecentEvent[] = [];

    for (const record of validations.data ?? []) {
      if (record.validation_status !== "PASSED") continue;
      const ts = asTs(record.validated_at ?? record.created_at);
      if (ts === null) continue;
      const plan: BlockPlan | undefined = (plans.data ?? []).find((p) => p.id === record.block_plan_id);
      list.push({
        ts,
        label: "Validation passed",
        meta: `${plan?.plan_code ?? `Plan #${record.block_plan_id}`} · ${record.validation_type}`,
        tone: "success",
      });
    }

    const latestPlan = latestCreatedAt(plans.data ?? []);
    if (latestPlan?.created_at) {
      const ts = asTs(latestPlan.created_at);
      if (ts !== null) list.push({ ts, label: "Block plan created", meta: latestPlan.plan_code, tone: "default" });
    }

    const latestCandidates = [...(candidates.data ?? [])]
      .sort((a, b) => (asTs(b.created_at) ?? 0) - (asTs(a.created_at) ?? 0))
      .slice(0, 2);
    for (const candidate of latestCandidates) {
      const ts = asTs(candidate.created_at);
      if (ts === null) continue;
      list.push({
        ts,
        label: "Candidate window generated",
        meta: `#${candidate.id} · ${candidate.feasibility_status}`,
        tone: "ai",
      });
    }

    const latestMaintenance = latestCreatedAt(maintenance.data ?? []);
    if (latestMaintenance?.created_at) {
      const ts = asTs(latestMaintenance.created_at);
      if (ts === null) return [];
      list.push({
        ts,
        label: "Maintenance requirement created",
        meta: latestMaintenance.maintenance_type ?? "maintenance",
        tone: "warning",
      });
    }

    const latestDecision = [...(decisions.data ?? [])].sort((a, b) => (asTs(b.decided_at) ?? 0) - (asTs(a.decided_at) ?? 0))[0];
    if (latestDecision) {
      const ts = asTs(latestDecision.decided_at);
      if (ts !== null) {
        const plan: BlockPlan | undefined = (plans.data ?? []).find((p) => p.id === latestDecision.block_plan_id);
        list.push({
          ts,
          label: "Controller decision",
          meta: `${latestDecision.decision} · ${plan?.plan_code ?? `Plan #${latestDecision.block_plan_id}`}`,
          tone: latestDecision.decision === "APPROVED" ? "success" : latestDecision.decision === "REJECTED" ? "warning" : "default",
        });
      }
    }

    return list.sort((a, b) => b.ts - a.ts).slice(0, 5);
  }, [validations.data, plans.data, candidates.data, maintenance.data, decisions.data]);

  const refreshAll = () => {
    health.retry();
    trains.retry();
    maintenance.retry();
    tasks.retry();
    windows.retry();
    candidates.retry();
    plans.retry();
    validations.retry();
    decisions.retry();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Operations Control · Overview"
        title="Operations Control"
        description={`Live operational status for ${APP_CONFIG.division}. Every number is read from the real backend — unavailable modules show “Unavailable”, never a placeholder.`}
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-navy-800 bg-navy-900 px-5 py-4 shadow-panel">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest text-navy-400">Control-room status</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={health.api === "online" ? "ONLINE" : "OFFLINE"} tone={health.api === "online" ? "success" : "danger"} pulse />
            <StatusBadge
              status={health.db === "connected" ? "ONLINE" : "CONNECTION ERROR"}
              tone={health.db === "connected" ? "success" : "danger"}
              pulse
            />
            <span className="text-xs text-navy-300">
              {health.lastChecked ? `Last checked ${new Date(health.lastChecked).toLocaleTimeString()}` : "Checking…"}
            </span>
          </div>
        </div>
        <div className="h-10 w-px bg-navy-800 max-sm:hidden" aria-hidden="true" />
        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest text-navy-400">Environment</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="ai" className="normal-case tracking-normal">{APP_CONFIG.dataMode}</Badge>
            <Badge variant="brand" className="normal-case tracking-normal">{APP_CONFIG.division}</Badge>
          </div>
        </div>
        <div className="ml-auto">
          <ConnectionControl health={health} onRetry={health.retry} className="hidden md:inline-flex" />
        </div>
        {offline ? (
          <div className="basis-full text-xs text-warning-light">
            Backend unreachable — module counts below show “Unavailable”. Use Refresh once the server is back.
          </div>
        ) : null}
      </section>

      {maintenance.error || tasks.error || trains.error ? (
        <ErrorState
          title="Some operational data could not be loaded"
          message={maintenance.error ?? tasks.error ?? trains.error}
          onRetry={refreshAll}
        />
      ) : null}

      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Trains"
            value={offline || trains.error ? "Unavailable" : trains.data?.length ?? null}
            tone="info"
            icon={TrainFront}
            hint="Fleet roster · GET /api/coa/trains"
            loading={trains.loading}
          />
          <MetricCard
            label="Maintenance requirements"
            value={offline || maintenance.error ? "Unavailable" : maintenance.data?.length ?? null}
            tone="warning"
            icon={Wrench}
            hint="Work needing a block · GET /api/unified/maintenance"
            loading={maintenance.loading}
          />
          <MetricCard
            label="Planning tasks"
            value={offline || tasks.error ? "Unavailable" : tasks.data?.length ?? null}
            tone="success"
            icon={ListChecks}
            hint="Units awaiting a window · GET /api/planning/tasks"
            loading={tasks.loading}
          />
          <MetricCard
            label="Available windows"
            value={offline || windows.error ? "Unavailable" : windows.data?.length ?? null}
            tone="info"
            icon={Map}
            hint="Operational gaps · GET /api/coa/available-windows"
            loading={windows.loading}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Candidate windows"
            value={offline || candidates.error ? "Unavailable" : candidates.data?.length ?? null}
            tone="ai"
            icon={Target}
            hint="Feasibility-checked task ↔ window matches · GET /api/candidates/windows"
            loading={candidates.loading}
          />
          <MetricCard
            label="Block plans"
            value={offline || plans.error ? "Unavailable" : plans.data?.length ?? null}
            tone="default"
            icon={CalendarClock}
            hint="Rostered proposals · GET /api/optimization/plans"
            loading={plans.loading}
          />
          <MetricCard
            label="Validation"
            value={offline || validations.error ? "Unavailable" : passedValidationCount ?? null}
            tone={validatedPlansCount > 0 ? "success" : "default"}
            icon={FileCheck2}
            hint={`${validatedPlansCount} plan(s) fully checked · GET /api/optimization/validations`}
            loading={validations.loading}
          />
          <MetricCard
            label="Awaiting controller decision"
            value={offline || plans.error ? "Unavailable" : awaitingDecision ?? null}
            tone="warning"
            icon={Undo2}
            hint="Proposed plans not yet decided"
            loading={plans.loading}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Block-planning pipeline</h2>
          <span className="text-xs text-ink-muted">Live counts along the operational chain</span>
        </div>
        <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
          {pipeline.map((stage, index) => (
            <div key={stage.key} className="flex items-center gap-2">
              <div
                className={`flex min-w-[7.5rem] flex-col rounded-lg border border-line px-3 py-2.5 shadow-card ${
                  stage.tone === "success"
                    ? "border-success/40 bg-success/10"
                    : stage.tone === "warning"
                      ? "border-warning/40 bg-warning/10"
                      : stage.tone === "ai"
                        ? "border-ai/40 bg-ai/10"
                        : stage.tone === "info"
                          ? "border-info/40 bg-info/10"
                          : "bg-surface-muted/40"
                }`}
              >
                <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">{stage.label}</span>
                <span className="mt-0.5 text-lg font-semibold leading-none text-ink tabular-nums">
                  {offline || stage.value == null ? "…" : stage.value}
                </span>
              </div>
              {index < pipeline.length - 1 ? (
                <span className="hidden font-mono text-sm text-ink-faint lg:block" aria-hidden="true">
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {recentEvents.length > 0 ? (
        <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Recent operations</h2>
            <span className="text-xs text-ink-muted">Latest backend-derived events</span>
          </div>
          <div className="mt-3 space-y-2">
            {recentEvents.map((event) => (
              <TimelineItem
                key={`${event.label}-${event.ts}-${event.meta}`}
                tone={event.tone}
                title={event.label}
                meta={event.meta}
                description={clockTime(new Date(event.ts).toISOString())}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-2xs font-semibold uppercase tracking-widest text-ink-faint">Launch</span>
        {LAUNCH_TARGETS.map((target) => (
          <Link
            key={target.path}
            to={target.path}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-white px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand-400 hover:text-brand-700"
          >
            <target.icon className="size-3.5" aria-hidden="true" />
            {target.label}
          </Link>
        ))}
      </section>
    </div>
  );
}