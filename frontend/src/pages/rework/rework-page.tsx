import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Undo2,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { DataModeBanner } from "@/components/common/data-mode-banner";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchCandidateWindows } from "@/services/api/candidates";
import { apiErrorMessage } from "@/services/api/client";
import {
  fetchOptimizationDecisions,
  fetchOptimizationPlanTasks,
  fetchOptimizationPlans,
  reviseOptimizationPlan,
} from "@/services/api/optimization";
import { fetchPlanningTasks } from "@/services/api/planning";
import type {
  BlockPlan,
  BlockPlanTask,
  CandidateWindow,
  ControllerDecision,
  PlanningTask,
} from "@/services/api/types";
import { cn } from "@/utils/cn";
import { formatDateTime, formatTime } from "@/utils/plan-chain";

interface ReworkRow {
  plan: BlockPlan;
  tasks: BlockPlanTask[];
  planningTask: PlanningTask | null;
  currentCandidateId: number | null;
  rejection: ControllerDecision | null;
  alternates: CandidateWindow[];
}

const REWORK_STATUS = "REWORK_REQUIRED";

function useReworkData() {
  const plans = useAsyncResource(() => fetchOptimizationPlans({ status: REWORK_STATUS }), []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);
  const decisions = useAsyncResource(fetchOptimizationDecisions, []);
  const planningTasks = useAsyncResource(fetchPlanningTasks, []);
  const candidates = useAsyncResource(() => fetchCandidateWindows({ feasible: true, limit: 2000 }), []);

  const rows = useMemo<ReworkRow[]>(() => {
    const reworkPlans = (plans.data ?? []).filter((plan) => plan.status === REWORK_STATUS);
    const taskById = new Map(planningTasks.data?.map((task) => [task.id, task]) ?? []);
    const tasksByPlan = new Map<number, BlockPlanTask[]>();
    for (const task of planTasks.data ?? []) {
      const list = tasksByPlan.get(task.block_plan_id) ?? [];
      list.push(task);
      tasksByPlan.set(task.block_plan_id, list);
    }
    const latestRejectionByPlan = new Map<number, ControllerDecision>();
    for (const decision of decisions.data ?? []) {
      if (decision.decision !== "REJECTED") continue;
      const current = latestRejectionByPlan.get(decision.block_plan_id);
      if (!current || new Date(decision.decided_at).getTime() >= new Date(current.decided_at).getTime()) {
        latestRejectionByPlan.set(decision.block_plan_id, decision);
      }
    }
    const candidatesByTask = new Map<number, CandidateWindow[]>();
    for (const candidate of candidates.data ?? []) {
      const list = candidatesByTask.get(candidate.planning_task_id) ?? [];
      list.push(candidate);
      candidatesByTask.set(candidate.planning_task_id, list);
    }

    return reworkPlans
      .sort((a, b) => a.id - b.id)
      .map((plan) => {
        const tasks = tasksByPlan.get(plan.id) ?? [];
        const planningTask = tasks.length ? taskById.get(tasks[0].planning_task_id) ?? null : null;
        const currentCandidateId = tasks.length > 0 ? tasks[0].candidate_block_window_id ?? null : null;
        const taskCandidates = planningTask ? candidatesByTask.get(planningTask.id) ?? [] : [];
        const alternates =
          tasks.length === 1 ? taskCandidates.filter((candidate) => candidate.id !== currentCandidateId) : [];
        return {
          plan,
          tasks,
          planningTask,
          currentCandidateId,
          rejection: latestRejectionByPlan.get(plan.id) ?? null,
          alternates,
        };
      });
  }, [plans.data, planTasks.data, decisions.data, planningTasks.data, candidates.data]);

  return {
    rows,
    loading: plans.loading || planTasks.loading || decisions.loading || planningTasks.loading || candidates.loading,
    refresh: () => {
      plans.retry();
      planTasks.retry();
      decisions.retry();
      planningTasks.retry();
      candidates.retry();
    },
  };
}

function alternateLabel(candidate: CandidateWindow): string {
  return `${formatTime(candidate.candidate_start)} → ${formatTime(candidate.candidate_end)} · candidate ${candidate.id} · ${candidate.feasibility_status}`;
}

function ReworkCard({
  row,
  busy,
  onGenerate,
}: {
  row: ReworkRow;
  busy: boolean;
  onGenerate: (alternateId?: number) => void;
}) {
  const [alternateId, setAlternateId] = useState<number | null>(null);
  const selectedAlternate = row.alternates.find((candidate) => candidate.id === alternateId) ?? null;
  const task = row.tasks[0] ?? null;
  const when = task ? `${formatTime(task.planned_start)} → ${formatTime(task.planned_end)}` : "—";

  return (
    <section className="rounded-lg border border-line bg-surface-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-amber-700">
            <Undo2 className="size-3.5" aria-hidden="true" />
            Rejected by controller · rework required
            <span className="ml-auto font-mono normal-case tracking-normal text-ink-faint">#{row.plan.id}</span>
          </p>
          <h3 className="mt-1 truncate font-mono text-sm font-bold text-ink">{row.plan.plan_code}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Wrench className="size-3" aria-hidden="true" />
              {row.planningTask?.task_type ?? "—"} · {row.planningTask?.task_code ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" aria-hidden="true" />
              {row.plan.plan_date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" aria-hidden="true" />
              {when}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={row.plan.status} />
          <Badge variant="outline">Original — keeps history</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-danger/25 bg-danger-light/40 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-danger">
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            Rejection reason
          </p>
          {row.rejection ? (
            <>
              <p className="mt-1 text-sm text-ink">{row.rejection.remarks ?? "No remarks recorded"}</p>
              <p className="mt-1 text-2xs text-ink-faint">
                Decided {formatDateTime(row.rejection.decided_at)} · decision record #{row.rejection.id}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">No REJECTED decision record found for this plan.</p>
          )}
        </div>

        <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Revised recommendation</p>
          <p className="mt-1 text-sm text-ink-muted">
            Generate a new block recommendation that corrects the rejection. It is linked back to this rejected plan (
            <span className="font-mono">revises_plan_id={row.plan.id}</span>), deterministically validated, and returned to
            the Controller queue for a fresh decision. This original is never modified or deleted.
          </p>
          {row.alternates.length > 0 ? (
            <div className="mt-3">
              <label htmlFor={`alternate-${row.plan.id}`} className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                Optional — use a different feasible window
              </label>
              <select
                id={`alternate-${row.plan.id}`}
                value={alternateId ?? ""}
                onChange={(event) => setAlternateId(event.target.value ? Number(event.target.value) : null)}
                disabled={busy}
                className="mt-1 w-full rounded-md border border-line bg-surface-white px-2 py-1.5 text-sm text-ink focus:outline-2 focus:outline-brand-600 disabled:opacity-60"
              >
                <option value="">Keep the proposed window (clone as revised)</option>
                {row.alternates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {alternateLabel(candidate)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-2xs text-ink-faint">
                Only feasible candidate windows for the same planning task are offered.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="success"
          size="sm"
          onClick={() => onGenerate(selectedAlternate?.id)}
          disabled={busy}
          title={
            selectedAlternate
              ? `Generate a revised recommendation using candidate ${selectedAlternate.id}`
              : "Generate a revised recommendation preserving the proposed window"
          }
        >
          {busy ? (
            "Generating…"
          ) : (
            <>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {selectedAlternate ? "Generate revised recommendation with this window" : "Generate revised recommendation"}
            </>
          )}
        </Button>
        <span className="text-2xs text-ink-faint">
          Reuses the existing planning APIs — create revision via <span className="font-mono">POST /plans/{row.plan.id}/revise</span>.
        </span>
      </div>
    </section>
  );
}

export function ReworkPage() {
  const health = useHealth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { rows, loading, refresh } = useReworkData();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ planId: number; planCode: string } | null>(null);

  const selectedId = searchParams.get("plan");

  useEffect(() => {
    if (!selectedId || !loading) return;
    const exists = rows.some((row) => String(row.plan.id) === selectedId);
    if (!exists) return;
    const next = new URLSearchParams(searchParams);
    next.delete("plan");
    setSearchParams(next, { replace: true });
  }, [selectedId, loading, rows, searchParams, setSearchParams]);

  const generate = async (row: ReworkRow, alternateId?: number) => {
    setBusyId(row.plan.id);
    setActionError(null);
    setNotice(null);
    try {
      const revised = await reviseOptimizationPlan(row.plan.id, {
        candidate_block_window_id: alternateId ?? undefined,
      });
      setNotice({ planId: revised.id, planCode: revised.plan_code });
    } catch (err) {
      setActionError(`${row.plan.plan_code} · ${apiErrorMessage(err)}`);
    } finally {
      setBusyId(null);
      refresh();
    }
  };

  const highlightedId = selectedId && !loading ? Number(selectedId) : null;
  const sortedRows = useMemo(() => {
    const list = rows.slice();
    if (highlightedId != null) {
      const target = list.findIndex((row) => row.plan.id === highlightedId);
      if (target >= 0) {
        const [row] = list.splice(target, 1);
        list.unshift(row);
      }
    }
    return list;
  }, [rows, highlightedId]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DataModeBanner />

      <PageHeader
        eyebrow="RAILFLOW AI"
        title="Planning · Rework Queue"
        description="Recommendations the Controller rejected with a reason. Review the feedback, then generate a revised recommendation that returns to the Controller for validation and a fresh decision. Original rejected plans and their audit histories are preserved."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={health.api === "online" ? "success" : health.api === "checking" ? "warning" : "danger"} className="font-mono">
              API ● {health.api.toUpperCase()}
            </Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
              <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        }
      />

      {notice ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-success/40 bg-success/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink">
              Revised recommendation created · <span className="font-mono">{notice.planCode}</span> · plan #{notice.planId}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/controller?plan=${notice.planId}`)}
            title="Open the revised recommendation in the Controller workspace"
          >
            <ArrowUpRight /> Review in Controller
          </Button>
        </div>
      ) : null}

      {actionError ? (
        <ErrorState title="Revision could not be generated" message={actionError} onRetry={() => setActionError(null)} retryLabel="Dismiss" />
      ) : null}

      {loading ? (
        <LoadingState label="Loading rejected plans from the rework queue…" />
      ) : sortedRows.length === 0 ? (
        <section className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line bg-surface-white/60 px-6 py-14 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
          <p className="text-sm font-semibold uppercase tracking-wider text-ink">No plans in the rework queue</p>
          <p className="max-w-md text-xs text-ink-muted">
            Rejected recommendations appear here. When the Controller rejects a plan, it is sent back as REWORK_REQUIRED
            with the rejection reason stored in controller_decision.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {sortedRows.map((row) => (
            <div
              key={row.plan.id}
              className={cn(
                "rounded-lg shadow-card",
                highlightedId === row.plan.id && "ring-2 ring-brand-500",
              )}
            >
              <ReworkCard
                row={row}
                busy={busyId === row.plan.id}
                onGenerate={(alternateId) => void generate(row, alternateId)}
              />
            </div>
          ))}
          <p className="text-2xs text-ink-faint">
            Each revision is a brand-new block plan row linked to the original via{" "}
            <span className="font-mono">revises_plan_id</span>. Originals remain in REWORK_REQUIRED and are never
            deleted, so the Controller can trace approval or rejection back to its source. See also{" "}
            <Link to="/controller" className="font-semibold text-brand-600 underline-offset-2 hover:underline">
              Controller workspace
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}