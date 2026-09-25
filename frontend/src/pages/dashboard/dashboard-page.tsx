import {
  CalendarClock,
  ChevronRight,
  FileCheck2,
  ListChecks,
  Map,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Target,
  TrainFront,
  Undo2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { ErrorState } from "@/components/common/error-state";
import { MetricCard, type MetricCardProps } from "@/components/common/metric-card";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_CONFIG } from "@/config/app";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchCoaAvailableWindows, fetchCoaTrains } from "@/services/api/coa";
import { fetchCandidateWindows } from "@/services/api/candidates";
import { fetchOptimizationDecisions, fetchOptimizationPlans, fetchOptimizationValidations } from "@/services/api/optimization";
import { fetchPlanningTasks } from "@/services/api/planning";
import { fetchUnifiedMaintenance } from "@/services/api/unified";
import type { BlockPlan } from "@/services/api/types";
import { cn } from "@/utils/cn";

const asTs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
};

const eventStamp = (value: string | null | undefined): string => {
  const ts = asTs(value);
  if (ts === null) return "—";
  const date = new Date(ts);
  return `${date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })} · ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
};

type Tone = MetricCardProps["tone"];

interface LaunchTarget {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface RecentEvent {
  key: string;
  ts: number;
  label: string;
  meta: string;
  status: string;
  tone: "default" | "success" | "warning" | "danger" | "info" | "ai";
  icon: LucideIcon;
}

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

const QUICK_ACTIONS: LaunchTarget[] = [
  { label: "Open Controller", path: "/controller", icon: ShieldCheck },
  { label: "View Block Plans", path: "/block-plans", icon: CalendarClock },
  { label: "View Candidate Windows", path: "/candidate-windows", icon: Target },
  { label: "View Train Impact", path: "/train-impact", icon: TrainFront },
  { label: "Open COA", path: "/coa", icon: RadioTower },
];

/** Clickable KPI card — navigates to the module that owns the metric. */
function KpiCardLink({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
  path,
}: {
  label: string;
  value: string | number | null;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  loading?: boolean;
  path: string;
}) {
  return (
    <Link
      to={path}
      title={hint}
      aria-label={`${label}: ${value ?? "unavailable"}. ${hint}`}
      className="group block h-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <MetricCard
        label={label}
        value={value}
        tone={tone}
        icon={Icon}
        hint={hint}
        loading={loading}
        className="h-full border-line p-3 transition-[box-shadow,border-color,background-color] group-hover:border-brand-300 group-hover:bg-brand-50/40 group-hover:shadow-md"
      />
    </Link>
  );
}

const PIPELINE_TONES = {
  warning: "border-warning/40 bg-warning-light/60",
  success: "border-success/40 bg-success-light/60",
  info: "border-info/30 bg-info-light/50",
  ai: "border-ai/40 bg-ai-light/60",
  default: "border-line bg-surface-muted/50",
} as const;

/** Compact count-driven stepper for the block-planning chain. */
function PipelineStepper({
  stages,
  offline,
}: {
  stages: {
    key: string;
    label: string;
    tone: keyof typeof PIPELINE_TONES;
    value: string | number | null;
    loading: boolean;
    path: string;
    hint: string;
  }[];
  offline: boolean;
}) {
  return (
    <div className="overflow-x-auto pb-1" role="navigation" aria-label="Block-planning pipeline">
      <ol className="flex min-w-max items-stretch">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          return (
            <li key={stage.key} className="flex items-center">
              <Link
                to={stage.path}
                title={stage.hint}
                className="group rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <div
                  className={cn(
                    "flex w-28 flex-col gap-1.5 rounded-md border px-2.5 py-2 shadow-card transition-[box-shadow,border-color,background-color] group-hover:border-brand-300 group-hover:bg-brand-50/40 group-hover:shadow-md",
                    PIPELINE_TONES[stage.tone],
                  )}
                >
                  <span className="truncate text-2xs font-semibold uppercase tracking-wider text-ink-faint">{stage.label}</span>
                  <span className="flex items-baseline gap-1">
                    {stage.loading && !offline ? (
                      <Skeleton className="h-6 w-9" />
                    ) : (
                      <span className="font-mono text-lg font-semibold leading-none text-ink tabular-nums">
                        {offline || stage.value == null ? "—" : stage.value}
                      </span>
                    )}
                  </span>
                </div>
              </Link>
              {!isLast ? (
                <span className="shrink-0 px-1 text-line-dark" aria-hidden="true">
                  <ChevronRight className="size-3.5" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-2xs text-ink-faint">
        Counts are live module totals per stage — sequential steps, not a single funnel.
      </p>
    </div>
  );
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

  const resources = [trains, maintenance, tasks, windows, candidates, plans, validations, decisions];
  const busy = health.api === "checking" || resources.some((resource) => resource.loading);
  const offline = health.api === "offline";

  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const prevBusyRef = useRef(busy);
  useEffect(() => {
    if (prevBusyRef.current && !busy && !resources.some((resource) => resource.error)) {
      setLastRefreshedAt(Date.now());
    }
    prevBusyRef.current = busy;
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const decidedPlanIds = useMemo(
    () => new Set((decisions.data ?? []).map((decision) => decision.block_plan_id)),
    [decisions.data],
  );
  const awaitingDecision = useMemo(
    () =>
      (plans.data ?? []).filter(
        (plan) =>
          ["PROPOSED", "VALIDATED", "SUBMITTED"].includes(plan.status) && !decidedPlanIds.has(plan.id),
      ).length,
    [plans.data, decidedPlanIds],
  );

  const metricValue = (
    resource: (typeof resources)[number],
  ): string | number | null => (offline || resource.error ? "Unavailable" : resource.data?.length ?? null);
  const metricLoading = (resource: (typeof resources)[number]): boolean => !offline && resource.loading && !resource.error;

  const metrics = useMemo(() => {
    const items = [
      {
        label: "Trains",
        icon: TrainFront,
        tone: "info" as Tone,
        path: "/coa",
        hint: "Fleet roster · GET /api/coa/trains",
        value: metricValue(trains),
        loading: metricLoading(trains),
      },
      {
        label: "Maintenance",
        icon: Wrench,
        tone: "warning" as Tone,
        path: "/maintenance",
        hint: "Requirements · GET /api/unified/maintenance",
        value: metricValue(maintenance),
        loading: metricLoading(maintenance),
      },
      {
        label: "Planning tasks",
        icon: ListChecks,
        tone: "success" as Tone,
        path: "/planning",
        hint: "Units awaiting a window · GET /api/planning/tasks",
        value: metricValue(tasks),
        loading: metricLoading(tasks),
      },
      {
        label: "Available windows",
        icon: Map,
        tone: "info" as Tone,
        path: "/coa",
        hint: "Operational gaps · GET /api/coa/available-windows",
        value: metricValue(windows),
        loading: metricLoading(windows),
      },
      {
        label: "Candidate windows",
        icon: Target,
        tone: "ai" as Tone,
        path: "/candidate-windows",
        hint: "Task ↔ window matches · GET /api/candidates/windows",
        value: metricValue(candidates),
        loading: metricLoading(candidates),
      },
      {
        label: "Block plans",
        icon: CalendarClock,
        tone: "default" as Tone,
        path: "/block-plans",
        hint: "Rostered proposals · GET /api/optimization/plans",
        value: metricValue(plans),
        loading: metricLoading(plans),
      },
      {
        label: "Validation",
        icon: FileCheck2,
        tone: (validatedPlansCount > 0 ? "success" : "default") as Tone,
        path: "/block-plans",
        hint: `${validatedPlansCount} plan(s) fully checked · GET /api/optimization/validations`,
        value: offline || validations.error ? "Unavailable" : passedValidationCount,
        loading: metricLoading(validations),
      },
      {
        label: "Awaiting decision",
        icon: Undo2,
        tone: "warning" as Tone,
        path: "/controller",
        hint: "Plans awaiting controller review · GET /api/optimization/plans",
        value: offline || plans.error ? "Unavailable" : awaitingDecision,
        loading: metricLoading(plans),
      },
    ];
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, trains, maintenance, tasks, windows, candidates, plans, validations, passedValidationCount, validatedPlansCount, awaitingDecision]);

  const pipeline = useMemo(() => {
    const stages = [
      { key: "maintenance", label: "Maintenance", tone: "warning" as const, path: "/maintenance", hint: "GET /api/unified/maintenance", value: metricValue(maintenance), loading: metricLoading(maintenance) },
      { key: "planning", label: "Planning", tone: "success" as const, path: "/planning", hint: "GET /api/planning/tasks", value: metricValue(tasks), loading: metricLoading(tasks) },
      { key: "windows", label: "Windows", tone: "info" as const, path: "/coa", hint: "GET /api/coa/available-windows", value: metricValue(windows), loading: metricLoading(windows) },
      { key: "candidates", label: "Candidates", tone: "ai" as const, path: "/candidate-windows", hint: "GET /api/candidates/windows", value: metricValue(candidates), loading: metricLoading(candidates) },
      { key: "block-plans", label: "Block plans", tone: "default" as const, path: "/block-plans", hint: "GET /api/optimization/plans", value: metricValue(plans), loading: metricLoading(plans) },
      { key: "validation", label: "Validation", tone: "success" as const, path: "/block-plans", hint: "GET /api/optimization/validations", value: offline || validations.error ? "Unavailable" : passedValidationCount, loading: metricLoading(validations) },
      { key: "controller", label: "Controller", tone: "warning" as const, path: "/controller", hint: "Awaiting review", value: offline || plans.error ? "Unavailable" : awaitingDecision, loading: metricLoading(plans) },
    ];
    return stages;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, maintenance, tasks, windows, candidates, plans, validations, passedValidationCount, awaitingDecision]);

  const recentEvents = useMemo<RecentEvent[]>(() => {
    const list: RecentEvent[] = [];

    for (const record of validations.data ?? []) {
      if (record.validation_status !== "PASSED") continue;
      const ts = asTs(record.validated_at ?? record.created_at);
      if (ts === null) continue;
      const plan: BlockPlan | undefined = (plans.data ?? []).find((p) => p.id === record.block_plan_id);
      list.push({
        key: `validation-${record.id}`,
        ts,
        label: "Validation passed",
        meta: `${plan?.plan_code ?? `Plan #${record.block_plan_id}`} · ${record.validation_type}`,
        status: "PASSED",
        tone: "success",
        icon: FileCheck2,
      });
    }

    const latestPlan = latestCreatedAt(plans.data ?? []);
    if (latestPlan?.created_at) {
      const ts = asTs(latestPlan.created_at);
      if (ts !== null) {
        list.push({ key: `plan-${latestPlan.id}`, ts, label: "Block plan created", meta: latestPlan.plan_code, status: "CREATED", tone: "default", icon: CalendarClock });
      }
    }

    const latestCandidates = [...(candidates.data ?? [])].sort((a, b) => (asTs(b.created_at) ?? 0) - (asTs(a.created_at) ?? 0)).slice(0, 2);
    for (const candidate of latestCandidates) {
      const ts = asTs(candidate.created_at);
      if (ts === null) continue;
      list.push({
        key: `candidate-${candidate.id}`,
        ts,
        label: "Candidate window generated",
        meta: `#${candidate.id} · task ${candidate.planning_task_id}`,
        status: candidate.feasibility_status,
        tone: candidate.feasible ? "success" : "warning",
        icon: Target,
      });
    }

    const latestMaintenance = latestCreatedAt(maintenance.data ?? []);
    if (latestMaintenance?.created_at) {
      const ts = asTs(latestMaintenance.created_at);
      if (ts !== null) {
        list.push({ key: `maintenance-${latestMaintenance.id}`, ts, label: "Maintenance requirement created", meta: latestMaintenance.maintenance_type, status: latestMaintenance.status, tone: "warning", icon: Wrench });
      }
    }

    const latestDecision = [...(decisions.data ?? [])].sort((a, b) => (asTs(b.decided_at) ?? 0) - (asTs(a.decided_at) ?? 0))[0];
    if (latestDecision) {
      const ts = asTs(latestDecision.decided_at);
      if (ts !== null) {
        const plan: BlockPlan | undefined = (plans.data ?? []).find((p) => p.id === latestDecision.block_plan_id);
        list.push({
          key: `decision-${latestDecision.id}`,
          ts,
          label: "Controller decision",
          meta: `${plan?.plan_code ?? `Plan #${latestDecision.block_plan_id}`}`,
          status: latestDecision.decision,
          tone: latestDecision.decision === "APPROVED" ? "success" : latestDecision.decision === "REJECTED" ? "danger" : "default",
          icon: ShieldCheck,
        });
      }
    }

    return list.sort((a, b) => b.ts - a.ts).slice(0, 5);
  }, [validations.data, plans.data, candidates.data, maintenance.data, decisions.data]);

  const criticalError = maintenance.error || tasks.error || trains.error || windows.error || candidates.error || plans.error;

  const refreshAll = () => {
    health.retry();
    for (const resource of resources) resource.retry();
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        eyebrow="Operations Control · Overview"
        title="Operations Control"
        description="Operational status and block-planning overview."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 text-xs text-ink-muted sm:inline-flex">
              <RefreshCw className={cn("size-3", busy && "animate-spin")} aria-hidden="true" />
              {lastRefreshedAt !== null ? `Last refresh ${new Date(lastRefreshedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : "First refresh pending"}
            </span>
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={busy}>
              <RefreshCw className={busy ? "animate-spin" : ""} aria-hidden="true" />
              Refresh
            </Button>
            <Badge
              variant="ai"
              className="normal-case tracking-normal"
              title={`Demo environment — the data shown is ${APP_CONFIG.dataMode}, not live railway operations`}
            >
              {APP_CONFIG.dataMode}
            </Badge>
          </div>
        }
      />

      <section className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-navy-800 bg-navy-900 px-4 py-2.5 shadow-panel">
        <div className="flex items-center gap-2">
          <p className="text-2xs font-semibold uppercase tracking-widest text-navy-400">System</p>
          <StatusBadge
            status={health.api === "online" ? "ONLINE" : health.api === "offline" ? "OFFLINE" : "CHECKING"}
            tone={health.api === "online" ? "success" : health.api === "offline" ? "danger" : "default"}
            pulse={health.api === "online"}
          />
          <StatusBadge
            status={health.db === "connected" ? "ONLINE" : health.db === "disconnected" ? "CONNECTION ERROR" : "CHECKING"}
            tone={health.db === "connected" ? "success" : health.db === "disconnected" ? "danger" : "default"}
            pulse={health.db === "connected"}
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-2xs font-semibold uppercase tracking-widest text-navy-400">Environment</p>
          <Badge variant="ai" className="normal-case tracking-normal">{APP_CONFIG.dataMode}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-2xs font-semibold uppercase tracking-widest text-navy-400">Division</p>
          <Badge variant="brand" className="normal-case tracking-normal">{APP_CONFIG.division}</Badge>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-navy-300">{health.lastChecked ? `Last checked ${new Date(health.lastChecked).toLocaleTimeString()}` : "Checking…"}</span>
          {health.api === "offline" || health.db === "disconnected" ? (
            <Button variant="secondary" size="sm" onClick={health.retry} title={health.error ?? "Retry health check"}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Retry
            </Button>
          ) : null}
        </div>
        {offline ? (
          <div className="basis-full text-xs text-warning-light">
            Backend unreachable — module counts below show “Unavailable”. Use Refresh once the server is back.
          </div>
        ) : null}
      </section>

      {criticalError ? (
        <ErrorState
          title="Some operational data could not be loaded"
          message={criticalError}
          onRetry={refreshAll}
          className="!py-6"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.slice(0, 4).map((metric) => (
          <KpiCardLink key={metric.label} {...metric} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.slice(4).map((metric) => (
          <KpiCardLink key={metric.label} {...metric} />
        ))}
      </div>

      <section className="rounded-lg border border-line bg-surface-white p-4 shadow-card">
        <SectionHeader
          icon={ChevronRight}
          title="Block-planning pipeline"
          description="Click a stage to open its module"
          className="border-b-0 pb-0"
        />
        <div className="mt-3">
          <PipelineStepper stages={pipeline} offline={offline} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <section className="rounded-lg border border-line bg-surface-white p-4 shadow-card lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">Recent operations</h2>
              <p className="text-xs text-ink-muted">Latest backend-derived events</p>
            </div>
            <Link to="/audit" className="shrink-0 text-xs font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline">
              View all
            </Link>
          </div>
          {recentEvents.length > 0 ? (
            <div className="mt-2 divide-y divide-line">
              {recentEvents.map((event) => (
                <div key={event.key} className="flex items-center gap-3 py-2.5 first:pt-2 last:pb-0">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-faint ring-1 ring-line [&_svg]:size-3",
                      event.tone === "success" && "bg-success-light text-success-dark ring-success/20",
                      event.tone === "warning" && "bg-warning-light text-warning-dark ring-warning/20",
                      event.tone === "danger" && "bg-danger-light text-danger ring-danger/20",
                      event.tone === "info" && "bg-info-light text-info ring-info/20",
                      event.tone === "ai" && "bg-ai-light text-ai ring-ai/20",
                    )}
                    aria-hidden="true"
                  >
                    <event.icon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold text-ink">{event.label}</p>
                      <StatusBadge status={event.status} tone={event.tone} className="text-2xs" />
                    </div>
                    <p className="truncate text-xs text-ink-muted">{event.meta}</p>
                  </div>
                  <time className="shrink-0 text-2xs tabular-nums text-ink-faint">{eventStamp(new Date(event.ts).toISOString())}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">No recent events recorded yet.</p>
          )}
        </section>

        <section className="rounded-lg border border-line bg-surface-white p-4 shadow-card lg:col-span-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Quick actions</h2>
            <p className="text-xs text-ink-muted">Jump into the operational workflow</p>
          </div>
          <div className="mt-3 grid gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="group flex items-center gap-2.5 rounded-md border border-line bg-surface-muted/50 px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-white text-ink-muted ring-1 ring-line transition-colors [&_svg]:size-3.5 group-hover:text-brand-700">
                  <action.icon aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">{action.label}</span>
                <ChevronRight className="size-3.5 shrink-0 text-ink-faint transition-colors group-hover:text-brand-600" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <p className="text-2xs text-ink-faint">
        All dashboard metrics, pipeline counts and recent events are read live from the backend API — no placeholder data.
      </p>
    </div>
  );
}