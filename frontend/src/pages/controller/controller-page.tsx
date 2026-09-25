import {
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  FileCheck2,
  Layers,
  ListChecks,
  MapPin,
  RefreshCw,
  Target,
  TrainFront,
  Undo2,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataModeBanner } from "@/components/common/data-mode-banner";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchAssets } from "@/services/api/assets";
import { fetchCandidateWindow, fetchCandidateWindows } from "@/services/api/candidates";
import { fetchCoaAvailableWindows, fetchCoaLineOccupancy, fetchCoaSchedules, fetchCoaTrains } from "@/services/api/coa";
import { apiErrorMessage } from "@/services/api/client";
import { fetchLocations } from "@/services/api/locations";
import {
  createOptimizationDecision,
  fetchOptimizationDecisions,
  fetchOptimizationPlanTasks,
  fetchOptimizationPlans,
  fetchOptimizationValidations,
  validateOptimizationPlan,
} from "@/services/api/optimization";
import { fetchPlanningTasks } from "@/services/api/planning";
import { fetchUnifiedBlockRequirements, fetchUnifiedMaintenance } from "@/services/api/unified";
import type { CandidateWindow, ControllerDecision, PlanningTask, UnifiedMaintenance } from "@/services/api/types";
import { cn } from "@/utils/cn";
import {
  buildPlanSummaries,
  formatDateTime,
  formatTime,
  type PlanSummary,
} from "@/utils/plan-chain";

interface ConfirmState {
  planId: number;
  planCode: string;
  decision: "APPROVED";
}

interface RejectTarget {
  planId: number;
  planCode: string;
}

const CONFIRM_TITLES: Record<ConfirmState["decision"], string> = {
  APPROVED: "Approve this block plan?",
};

const CONFIRM_COPY: Record<ConfirmState["decision"], string> = {
  APPROVED: "Records a real APPROVED controller decision through the backend. The plan leaves the pending queue and appears in Decision History.",
};

const NOT_IN_BACKEND = "not modelled in the current backend data";
const AWAITING_STATUSES = new Set(["DRAFT", "PROPOSED", "VALIDATED", "SUBMITTED"]);
const REWORK_STATUS = "REWORK_REQUIRED";
const ACTION_BUTTON = "flex-1 basis-32 justify-center";

function RejectReasonDialog({
  open,
  onOpenChange,
  planCode,
  reason,
  onReasonChange,
  error,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planCode: string;
  reason: string;
  onReasonChange: (value: string) => void;
  error: string | null;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onOpenChange(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="mb-1 grid size-10 place-items-center rounded-md bg-surface-muted text-ink-muted [&_svg]:size-5">
            <XCircle aria-hidden="true" />
          </span>
          <DialogTitle>Reject this block plan?</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{planCode}</span> — a rejection reason is required. It is stored in{" "}
            <span className="font-mono">controller_decision</span> and the plan moves to the Rework queue (
            <span className="font-mono">REWORK_REQUIRED</span>) so Planning can review the feedback and generate a revised
            recommendation.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1">
          <label htmlFor="reject-reason" className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
            Rejection reason <span className="text-danger">*</span>
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={3}
            autoFocus
            placeholder="Tell Planning what must change before this block can be approved."
            className="mt-1.5 w-full resize-none rounded-md border border-line bg-surface-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-brand-600"
          />
          {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
          <p className="mt-1 text-2xs text-ink-faint">
            The original plan and its full audit history are preserved — nothing is deleted.
          </p>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Processing…" : "Reject & send to rework"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SyntheticTag() {
  return (
    <span className="inline-flex items-center rounded border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.5 font-mono text-2xs font-bold uppercase tracking-wider text-amber-700">
      Demo / Synthetic
    </span>
  );
}

function LabeledField({ label, children, muted }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className={cn("mt-1 break-words text-sm", muted ? "text-ink-muted" : "text-ink")}>{children}</dd>
    </div>
  );
}

function validationBadge(summary: PlanSummary) {
  if (!summary.validated) return <Badge variant="outline">Validation not run</Badge>;
  if (summary.failedValidation > 0) return <Badge variant="danger">✗ Validation failed</Badge>;
  if (summary.warningValidation > 0) return <Badge variant="warning">! Validation warning</Badge>;
  return <Badge variant="success">✓ Validation passed</Badge>;
}

function WindowBar({ start, end }: { start: string | null; end: string | null }) {
  if (!start || !end) {
    return <p className="text-xs text-ink-faint">Time window not available</p>;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[3.25rem] whitespace-nowrap font-mono text-xs font-bold tabular-nums text-ink">{formatTime(start)}</span>
      <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-600/10" role="presentation">
        <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-brand-600/50 to-brand-600/25" aria-hidden="true" />
      </div>
      <span className="min-w-[3.25rem] whitespace-nowrap text-right font-mono text-xs font-bold tabular-nums text-ink">{formatTime(end)}</span>
    </div>
  );
}

function stepDot(tone: "ok" | "warn" | "muted") {
  return cn("size-1.5 shrink-0 rounded-full", tone === "ok" ? "bg-success" : tone === "warn" ? "bg-amber-600" : "bg-ink-faint/60");
}

function LineageSection({
  summary,
  maintenanceRecord,
  candidateById,
}: {
  summary: PlanSummary;
  maintenanceRecord: UnifiedMaintenance | undefined;
  candidateById: Map<number, CandidateWindow>;
}) {
  const task = summary.tasks[0] ?? null;
  const planningTask: PlanningTask | null = task?.planningTask ?? null;
  const candidateId = task?.blockPlanTask.candidate_block_window_id ?? null;
  const candidate = candidateId != null ? (task?.candidate ?? candidateById.get(candidateId) ?? null) : null;
  const availableWindow = task?.availableWindow ?? null;

  const steps: { label: string; code: ReactNode; detail: ReactNode; tone: "ok" | "warn" | "muted" }[] = [
    {
      label: "Maintenance requirement",
      code: maintenanceRecord ? `ID ${maintenanceRecord.id}` : "—",
      detail: maintenanceRecord
        ? `${maintenanceRecord.maintenance_type} · source ${maintenanceRecord.source_record_type} #${maintenanceRecord.source_record_id}`
        : "Not linked in current backend data",
      tone: "ok",
    },
    {
      label: "Planning task",
      code: planningTask ? `${planningTask.task_code} · ID ${planningTask.id}` : "—",
      detail: planningTask
        ? `${planningTask.task_type}${planningTask.block_requirement_id != null ? ` · block requirement ${planningTask.block_requirement_id}` : ""}`
        : "Not linked in current backend data",
      tone: "ok",
    },
    {
      label: "Candidate window",
      code: candidate ? `ID ${candidate.id}` : candidateId != null ? `ID ${candidateId}` : "—",
      detail: candidate
        ? `${formatTime(candidate.candidate_start)} → ${formatTime(candidate.candidate_end)} · ${candidate.feasibility_status}${availableWindow ? ` · window ${availableWindow.id} ${availableWindow.window_status}` : ""}`
        : candidateId != null
          ? "Window record not present in fetched backend data"
          : "No candidate linked to this plan task",
      tone: candidate ? "ok" : "muted",
    },
    {
      label: "Block plan",
      code: summary.plan.plan_code,
      detail: `ID ${summary.plan.id} · ${summary.plan.status}`,
      tone: "ok",
    },
    {
      label: "Validation",
      code: summary.validated ? `${summary.passedValidation} / ${summary.validation.length} PASSED` : "Not run",
      detail: summary.failedValidation > 0 ? `${summary.failedValidation} failed` : summary.warningValidation > 0 ? `${summary.warningValidation} warning` : "All checks recorded as passed",
      tone: summary.validated && summary.failedValidation === 0 ? "ok" : "warn",
    },
    {
      label: "Controller decision",
      code: summary.latestDecision ? summary.latestDecision.decision : "Awaiting decision",
      detail: summary.latestDecision ? `Recorded ${formatDateTime(summary.latestDecision.decided_at)}` : "No decision recorded yet — your Approve / Reject is persisted here",
      tone: summary.latestDecision ? "ok" : "warn",
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-surface-muted/40 p-4">
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-ink-faint" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Plan lineage</h3>
      </div>
      <ol className="mt-4 space-y-0">
        {steps.map((step, index) => (
          <li key={step.label}>
            <div className="grid gap-x-3 gap-y-1 rounded-lg border border-line bg-surface-white px-3 py-2 sm:grid-cols-[minmax(0,max-content)_minmax(0,1fr)] sm:items-center">
              <span
                className={cn(
                  "flex min-w-0 items-center gap-2 text-2xs font-semibold uppercase tracking-wider",
                  step.tone === "ok" ? "text-ink" : step.tone === "warn" ? "text-amber-700" : "text-ink-faint",
                )}
              >
                <span className={stepDot(step.tone)} />
                {step.label}
              </span>
              <span className="min-w-0 sm:text-right">
                <span className="block break-words font-mono text-xs font-bold text-ink">{step.code}</span>
                <span className="mt-0.5 block break-words text-2xs text-ink-muted">{step.detail}</span>
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      <details className="group mt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-2xs font-semibold uppercase tracking-widest text-ink-faint">
          <span className="inline-flex items-center gap-2">
            <Database className="size-3.5" aria-hidden="true" />
            Data provenance — endpoints actually consumed
          </span>
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="mt-3 space-y-1 border-t border-line pt-3 font-mono text-2xs text-ink-muted">
          <li>Block plans · GET /api/optimization/plans</li>
          <li>Plan tasks · GET /api/optimization/plan-tasks</li>
          <li>Candidate windows · GET /api/candidates/windows & /windows</li>
          <li>COA trains · occupancy · schedules · available windows</li>
          <li>Validation · GET /api/optimization/validations</li>
          <li>Decisions · GET/POST /api/optimization/decisions</li>
          <li>Planning tasks · GET /api/planning/tasks</li>
          <li>Unified maintenance & block requirements · GET /api/unified/*</li>
          <li>Locations & assets · GET /api/locations · /api/assets</li>
        </ul>
      </details>
    </section>
  );
}

function QueueItem({
  summary,
  active,
  taskType,
  onSelect,
  disabled,
}: {
  summary: PlanSummary;
  active: boolean;
  taskType: string;
  onSelect: () => void;
  disabled: boolean;
}) {
  const stationName = summary.tasks[0]?.location?.station_name ?? null;
  const when = summary.start && summary.end ? `${formatTime(summary.start)} → ${formatTime(summary.end)}` : "No window";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-brand-500 bg-brand-600/5 ring-1 ring-brand-500"
          : "border-line bg-surface-white hover:border-brand-300 hover:bg-surface-muted/30",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-ink">
        <span className="size-1.5 rounded-full bg-brand-600" aria-hidden="true" />
        Recommended
        <span className="ml-auto font-mono normal-case tracking-normal text-ink-faint">#{summary.plan.id}</span>
      </span>
      <span className="mt-1 block truncate font-mono text-xs font-bold text-ink">{summary.plan.plan_code}</span>
      <span className="mt-0.5 block truncate text-2xs text-ink-muted">{taskType}</span>
      <span className="mt-1 flex items-center justify-between gap-2 text-2xs text-ink-muted">
        <span className="min-w-0 truncate font-mono">
          {summary.line ?? "—"}
          {stationName ? <span className="not-italic"> · {stationName}</span> : null}
        </span>
        <span className="shrink-0 font-mono tabular-nums">{when}</span>
      </span>
      <span className="mt-1.5 inline-flex items-center gap-2">
        <StatusBadge status={summary.plan.status} />
        {validationBadge(summary)}
      </span>
    </button>
  );
}

function ReworkItem({
  summary,
  active,
  taskType,
  onSelect,
  disabled,
}: {
  summary: PlanSummary;
  active: boolean;
  taskType: string;
  onSelect: () => void;
  disabled: boolean;
}) {
  const rejection = summary.latestDecision?.decision === "REJECTED" ? summary.latestDecision : null;
  const when = summary.start && summary.end ? `${formatTime(summary.start)} → ${formatTime(summary.end)}` : "No window";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-amber-500 bg-amber-600/5 ring-1 ring-amber-500"
          : "border-line bg-surface-white hover:border-amber-300 hover:bg-surface-muted/30",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wider text-amber-700">
        <Undo2 className="size-3.5" aria-hidden="true" />
        Rework required
        <span className="ml-auto font-mono normal-case tracking-normal text-ink-faint">#{summary.plan.id}</span>
      </span>
      <span className="mt-1 block truncate font-mono text-xs font-bold text-ink">{summary.plan.plan_code}</span>
      <span className="mt-0.5 block truncate text-2xs text-ink-muted">{taskType}</span>
      <span className="mt-1 flex items-center justify-between gap-2 text-2xs text-ink-muted">
        <span className="min-w-0 truncate font-mono">{when}</span>
        <span className="shrink-0">{rejection ? formatDateTime(rejection.decided_at) : null}</span>
      </span>
      {rejection?.remarks ? (
        <span
          className="mt-1.5 block truncate rounded-md border border-amber-600/20 bg-amber-600/[0.05] px-2 py-1 text-2xs text-ink-muted"
          title={rejection.remarks}
        >
          Reason: {rejection.remarks}
        </span>
      ) : null}
      <span className="mt-1.5 inline-flex items-center gap-2">
        <StatusBadge status={summary.plan.status} />
      </span>
    </button>
  );
}

export function ControllerPage() {
  const health = useHealth();
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);
  const validations = useAsyncResource(fetchOptimizationValidations, []);
  const decisions = useAsyncResource(fetchOptimizationDecisions, []);
  const candidates = useAsyncResource(fetchCandidateWindows, []);
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 2000 }), []);
  const tasks = useAsyncResource(fetchPlanningTasks, []);
  const requirements = useAsyncResource(fetchUnifiedBlockRequirements, []);
  const maintenance = useAsyncResource(fetchUnifiedMaintenance, []);
  const trains = useAsyncResource(() => fetchCoaTrains({ limit: 500 }), []);
  const occupancy = useAsyncResource(() => fetchCoaLineOccupancy({ limit: 1000 }), []);
  const schedules = useAsyncResource(() => fetchCoaSchedules({ limit: 1000 }), []);
  const locations = useAsyncResource(() => fetchLocations({ limit: 500 }), []);
  const assets = useAsyncResource(fetchAssets, []);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<Map<number, CandidateWindow>>(new Map());
  const dismissedRef = useRef(false);
  const advanceRef = useRef(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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
  );

  const navigate = useNavigate();

  const awaiting = useMemo(
    () =>
      summaries
        .filter((s) => !s.latestDecision && AWAITING_STATUSES.has(s.plan.status))
        .sort((a, b) => {
          const aStart = a.start ? new Date(a.start).getTime() : Number.MAX_SAFE_INTEGER;
          const bStart = b.start ? new Date(b.start).getTime() : Number.MAX_SAFE_INTEGER;
          return aStart - bStart || a.plan.id - b.plan.id;
        }),
    [summaries],
  );

  const reworkPlans = useMemo(
    () =>
      summaries
        .filter((s) => s.plan.status === REWORK_STATUS)
        .sort((a, b) => {
          const aAt = a.latestDecision ? new Date(a.latestDecision.decided_at).getTime() : a.plan.id;
          const bAt = b.latestDecision ? new Date(b.latestDecision.decided_at).getTime() : b.plan.id;
          return aAt - bAt || a.plan.id - b.plan.id;
        }),
    [summaries],
  );

  const selected = selectedId != null ? summaries.find((s) => s.plan.id === selectedId) ?? null : null;
  const summaryById = useMemo(() => new Map(summaries.map((s) => [s.plan.id, s])), [summaries]);

  const candidateById = useMemo(() => {
    const map = new Map((candidates.data ?? []).map((c) => [c.id, c]));
    for (const [id, detail] of candidateDetails) {
      if (!map.has(id)) map.set(id, detail);
    }
    return map;
  }, [candidates.data, candidateDetails]);

  const maintenanceById = useMemo(() => new Map((maintenance.data ?? []).map((m) => [m.id, m])), [maintenance.data]);

  const decisionRows = useMemo(
    () =>
      (decisions.data ?? [])
        .slice()
        .sort((a, b) => new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime()),
    [decisions.data],
  );

  const offline = health.api === "offline";
  const isLoading = plans.loading || planTasks.loading || validations.loading || decisions.loading;

  const validatedCount = summaries.filter((s) => s.validated).length;
  const todayKey = new Date().toDateString();
  const decidedToday = (decisions.data ?? []).filter((d) => new Date(d.decided_at).toDateString() === todayKey).length;

  useEffect(() => {
    const deepLink = searchParams.get("plan");
    if (!deepLink) return;
    const target = summaries.find((s) => String(s.plan.id) === deepLink);
    if (target) {
      setSelectedId(target.plan.id);
      const next = new URLSearchParams(searchParams);
      next.delete("plan");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, summaries, setSearchParams]);

  useEffect(() => {
    if (selectedId == null && !dismissedRef.current && awaiting.length > 0) {
      setSelectedId(awaiting[0].plan.id);
    }
  }, [selectedId, awaiting]);

  useEffect(() => {
    if (!advanceRef.current) return;
    if (!selected || !selected.latestDecision) return;
    advanceRef.current = false;
    const next = awaiting[0] ?? null;
    if (next) {
      dismissedRef.current = false;
      setSelectedId(next.plan.id);
    } else {
      setSelectedId(null);
    }
  }, [awaiting, selected]);

  useEffect(() => {
    if (!selected) return;
    for (const task of selected.tasks) {
      const id = task.blockPlanTask.candidate_block_window_id;
      if (id == null || task.candidate || candidateDetails.has(id)) continue;
      fetchCandidateWindow(id)
        .then((detail) => setCandidateDetails((current) => (current.has(id) ? current : new Map(current).set(id, detail))))
        .catch(() => {
          /* candidate detail unavailable -> lineage falls back to the plan-task ID link */
        });
    }
  }, [selected, candidateDetails]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current != null) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const clearSelection = () => {
    dismissedRef.current = true;
    setSelectedId(null);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimerRef.current != null) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 8000);
  };

  const validationPassed = selected
    ? selected.validated && selected.failedValidation === 0 && selected.warningValidation === 0
    : false;

  const rejectionOf = (summary: PlanSummary): ControllerDecision | null =>
    summary.latestDecision && summary.latestDecision.decision === "REJECTED" ? summary.latestDecision : null;

  const canApprove = selected
    ? !offline && !busy && AWAITING_STATUSES.has(selected.plan.status) && validationPassed
    : false;

  const runValidation = async (summary: PlanSummary) => {
    setBusy(true);
    setActionError(null);
    try {
      const result = await validateOptimizationPlan(summary.plan.id);
      validations.retry();
      if (result.length === 0) setActionError(`Validation ran for ${summary.plan.plan_code} — backend returned no validation records.`);
    } catch (err) {
      setActionError(`Validation failed: ${apiErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const recordDecision = async () => {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      await createOptimizationDecision({
        block_plan_id: confirm.planId,
        decision: confirm.decision,
        controller_code: "CONTROLLER",
        remarks: `Controller workspace: ${confirm.decision}`,
      });
      showNotice(`DECISION RECORDED · ${confirm.decision} · Plan: ${confirm.planCode}`);
      advanceRef.current = true;
      setConfirm(null);
      decisions.retry();
      plans.retry();
      validations.retry();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitRejection = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("A rejection reason is required before the plan can be sent back to Planning.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await createOptimizationDecision({
        block_plan_id: rejectTarget.planId,
        decision: "REJECTED",
        controller_code: "CONTROLLER",
        remarks: reason,
      });
      showNotice(`REJECTED · ${rejectTarget.planCode} · moved to Rework queue for Planning review`);
      advanceRef.current = true;
      setRejectTarget(null);
      setRejectReason("");
      setRejectError(null);
      decisions.retry();
      plans.retry();
      validations.retry();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const refresh = () => {
    health.retry();
    plans.retry();
    planTasks.retry();
    validations.retry();
    decisions.retry();
    candidates.retry();
    windows.retry();
    tasks.retry();
    requirements.retry();
    maintenance.retry();
    trains.retry();
    occupancy.retry();
    schedules.retry();
    locations.retry();
    assets.retry();
  };

  const decisionColumns: DataTableColumn<ControllerDecision>[] = [
    {
      key: "plan",
      header: "Plan",
      render: (row) => (
        <span className="font-mono text-xs">{summaryById.get(row.block_plan_id)?.plan.plan_code ?? `#${row.block_plan_id}`}</span>
      ),
    },
    {
      key: "decision",
      header: "Decision",
      render: (row) => (
        <StatusBadge status={row.decision} tone={row.decision === "APPROVED" ? "success" : row.decision === "REJECTED" ? "danger" : "warning"} />
      ),
    },
    {
      key: "remarks",
      header: "Reason / remarks",
      render: (row) =>
        row.remarks ? (
          <span className="block max-w-[20rem] truncate text-xs text-ink-muted" title={row.remarks}>
            {row.remarks}
          </span>
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        ),
    },
    {
      key: "decided_at",
      header: "Time",
      render: (row) => <span className="tabular-nums text-xs">{formatDateTime(row.decided_at)}</span>,
    },
    {
      key: "review",
      header: "",
      align: "right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-2xs"
          onClick={() => setSelectedId(row.block_plan_id)}
          title="Show this plan's information"
        >
          Show plan
        </Button>
      ),
    },
  ];

  const firstTaskOf = (summary: PlanSummary) => summary.tasks[0] ?? null;

  const maintenanceRecordOf = (summary: PlanSummary): UnifiedMaintenance | undefined => {
    const task = firstTaskOf(summary);
    return task?.planningTask?.maintenance_requirement_id != null
      ? maintenanceById.get(task.planningTask.maintenance_requirement_id)
      : undefined;
  };

  const taskTypeOf = (summary: PlanSummary): string =>
    maintenanceRecordOf(summary)?.maintenance_type ?? firstTaskOf(summary)?.planningTask?.task_type ?? "—";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <DataModeBanner />

      <PageHeader
        eyebrow="RAILFLOW AI"
        title="Controller Workspace"
        description="Work through the pending recommendations one at a time — review why the block is needed, where and when it is planned, how it was validated and what it affects, then record your decision."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={health.api === "online" ? "success" : health.api === "checking" ? "warning" : "danger"} className="font-mono">
              API ● {health.api.toUpperCase()}
            </Badge>
            <Badge variant={health.db === "connected" ? "success" : health.db === "checking" ? "warning" : "danger"} className="font-mono">
              DATABASE ● {health.db.toUpperCase()}
            </Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
              <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        }
      />

      {actionError ? (
        <ErrorState title="Action could not complete" message={actionError} onRetry={() => setActionError(null)} retryLabel="Dismiss" />
      ) : null}

      {notice ? (
        <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 px-4 py-3">
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">{notice}</p>
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className="min-w-0 rounded-lg border border-line bg-surface-white shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink">Pending recommendations</h2>
              </div>
              <p className="mt-1 text-2xs text-ink-muted">
                {isLoading
                  ? "Loading…"
                  : `${awaiting.length} awaiting decision${awaiting.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <span className="hidden max-w-full shrink-0 rounded-md border border-line bg-surface-muted/50 px-2 py-1 text-2xs text-ink-faint sm:inline-flex sm:flex-wrap">
              PENDING <b className="tabular-nums text-ink">{awaiting.length}</b> · VALIDATED <b className="tabular-nums text-ink">{validatedCount}</b> · DECIDED TODAY <b className="tabular-nums text-ink">{decidedToday}</b>
            </span>
          </div>

          <div className="space-y-2 p-3 max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <LoadingState label="Loading pending recommendations…" />
            ) : awaiting.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
                <p className="text-sm font-semibold uppercase tracking-wider text-ink">All recommendations reviewed</p>
                <p className="text-xs text-ink-muted">No block plans currently require controller decision.</p>
              </div>
            ) : (
              awaiting.map((summary) => (
                <QueueItem
                  key={summary.plan.id}
                  summary={summary}
                  active={selected?.plan.id === summary.plan.id}
                  taskType={taskTypeOf(summary)}
                  onSelect={() => {
                    dismissedRef.current = false;
                    setSelectedId(summary.plan.id);
                  }}
                  disabled={offline}
                />
              ))
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-amber-600/25 bg-surface-white shadow-card">
          <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <Undo2 className="size-4 text-amber-600" aria-hidden="true" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-amber-700">Rework queue</h2>
              </div>
              <p className="mt-1 text-2xs text-ink-muted">
                {isLoading
                  ? "Loading…"
                  : `${reworkPlans.length} rejected plan${reworkPlans.length === 1 ? "" : "s"} awaiting a revised recommendation from Planning`}
              </p>
            </div>
          </div>

          <div className="space-y-2 p-3 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <LoadingState label="Loading rework queue…" />
            ) : reworkPlans.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
                <p className="text-sm font-semibold uppercase tracking-wider text-ink">No plans in rework</p>
                <p className="text-xs text-ink-muted">
                  Rejected recommendations move here so Planning can review the rejection reason and re-submit.
                </p>
              </div>
            ) : (
              reworkPlans.map((summary) => (
                <ReworkItem
                  key={summary.plan.id}
                  summary={summary}
                  active={selected?.plan.id === summary.plan.id}
                  taskType={taskTypeOf(summary)}
                  onSelect={() => {
                    dismissedRef.current = false;
                    setSelectedId(summary.plan.id);
                  }}
                  disabled={offline}
                />
              ))
            )}
          </div>
        </section>
        </div>

        <div className="min-w-0">
          {selected ? (
            <section className="min-w-0 space-y-4 rounded-lg border border-line bg-surface-white p-4 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">Recommendation</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-mono text-sm font-bold text-ink">{selected.plan.plan_code}</span>
                    <StatusBadge status={selected.plan.status} />
                    {validationBadge(selected)}
                    <SyntheticTag />
                    {selected.latestDecision ? (
                      <Badge variant={selected.latestDecision.decision === "APPROVED" ? "success" : selected.latestDecision.decision === "REJECTED" ? "danger" : "warning"}>
                        Latest decision · {selected.latestDecision.decision}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-1 rounded-md p-1 text-xs text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                  title="Clear selection"
                  aria-label="Clear selection"
                >
                  <X className="size-4" /> Clear selection
                </button>
              </div>

              <div className="grid items-stretch gap-4 md:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-line bg-surface-muted/40 p-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Why / What</h3>
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    <p className="break-words text-ink">
                      {maintenanceRecordOf(selected)?.description ??
                        firstTaskOf(selected)?.planningTask?.description ??
                        selected.plan.description ??
                        "Operational description not available"}
                    </p>
                    <dl className="grid gap-x-4 gap-y-2">
                      <LabeledField label="Maintenance">{taskTypeOf(selected)}</LabeledField>
                      <LabeledField label="Task" muted>
                        <span className="break-all font-mono">{firstTaskOf(selected)?.planningTask?.task_code ?? "—"}</span>
                      </LabeledField>
                      <LabeledField label="Duration" muted>
                        <span className="tabular-nums">{selected.durationMinutes != null ? `${selected.durationMinutes} min` : "—"}</span>
                      </LabeledField>
                    </dl>
                  </div>
                </div>

                <div className="min-w-0 rounded-lg border border-line bg-surface-muted/40 p-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Where</h3>
                  </div>
                  <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm">
                    <LabeledField label="Section">
                      {firstTaskOf(selected)?.location?.section_name ?? "—"}
                      <span className="mt-0.5 block text-xs text-ink-muted">{firstTaskOf(selected)?.location?.division_name ?? "—"}</span>
                    </LabeledField>
                    <LabeledField label="Line">
                      <span className="break-all font-mono">{selected.line ?? "—"}</span>
                      <span className="mt-0.5 break-words text-xs text-ink-muted">{firstTaskOf(selected)?.line ?? "—"}</span>
                    </LabeledField>
                    <LabeledField label="Station">
                      {firstTaskOf(selected)?.location?.station_name ?? "—"}
                      <span className="mt-0.5 block break-all font-mono text-xs text-ink-muted">{selected.station ?? "—"}</span>
                    </LabeledField>
                    <LabeledField label="Asset">
                      {firstTaskOf(selected)?.asset?.asset_name ?? firstTaskOf(selected)?.asset?.asset_type ?? "—"}
                      <span className="mt-0.5 block break-all font-mono text-xs text-ink-muted">{firstTaskOf(selected)?.asset?.source_asset_id ?? "—"}</span>
                    </LabeledField>
                  </dl>
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-line bg-surface-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-faint">When — proposed block window</h3>
                </div>
                <div className="mt-3">
                  <WindowBar start={selected.start} end={selected.end} />
                  {(() => {
                    const task = firstTaskOf(selected);
                    const candidateId = task?.blockPlanTask.candidate_block_window_id ?? null;
                    const candidate = candidateId != null ? (task?.candidate ?? candidateById.get(candidateId) ?? null) : null;
                    const availableWindow = task?.availableWindow ?? null;
                    const duration = selected.durationMinutes != null ? `${selected.durationMinutes} min` : null;
                    if (candidate) {
                      return (
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                          <span className="inline-flex items-center gap-1.5 font-semibold uppercase text-success">
                            <Target className="size-3.5 shrink-0" aria-hidden="true" />
                            Window ✓ feasible
                          </span>
                          <span className="break-all font-mono">candidate {candidate.id}</span>
                          {availableWindow ? <span className="break-all font-mono">· window {availableWindow.id} {availableWindow.window_status}</span> : null}
                          <span className="font-mono tabular-nums">· {formatTime(candidate.candidate_start)} → {formatTime(candidate.candidate_end)}</span>
                          {duration ? <span className="font-mono tabular-nums">· duration {duration}</span> : null}
                        </p>
                      );
                    }
                    if (candidateId != null) {
                      return (
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                          <span className="break-all font-mono">Window · candidate {candidateId}</span>
                          <span>present but detail record not fetched{duration ? <span className="font-mono"> · duration {duration}</span> : null}</span>
                        </p>
                      );
                    }
                    return (
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                        <span>Window · not available</span>
                        {duration ? <span className="font-mono normal-case">· duration {duration}</span> : null}
                      </p>
                    );
                  })()}
                </div>
                <p className="mt-3 border-t border-line pt-2 text-2xs text-ink-muted">
                  Resource allocation: {NOT_IN_BACKEND}. &nbsp;Dependencies: {NOT_IN_BACKEND}.
                </p>
              </div>

              <div className="grid items-stretch gap-4 md:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-line bg-surface-muted/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileCheck2 className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Validation</h3>
                    </div>
                    {selected.validated ? (
                      validationPassed ? (
                        <Badge variant="success">PASSED</Badge>
                      ) : (
                        <Badge variant="danger">FAILED</Badge>
                      )
                    ) : (
                      <Badge variant="outline">NOT RUN</Badge>
                    )}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {selected.validation.length === 0 ? (
                      <p className="text-sm text-ink-muted">
                        Press <span className="font-medium text-ink">Validate</span> to run the backend checks — Approve unlocks only when all checks pass.
                      </p>
                    ) : (
                      selected.validation.map((record) => (
                        <div key={record.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-line bg-surface-white px-3 py-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={record.validation_status === "PASSED" ? "text-success" : record.validation_status === "FAILED" ? "text-danger" : "text-amber-600"}>
                              {record.validation_status === "PASSED" ? "✓" : record.validation_status === "FAILED" ? "✗" : "•"}
                            </span>
                            <span className="min-w-0 break-words text-xs font-medium text-ink">{record.validation_type.replace(/_/g, " ")}</span>
                          </div>
                          <StatusBadge status={record.validation_status} tone={record.validation_status === "PASSED" ? "success" : record.validation_status === "FAILED" ? "danger" : "warning"} />
                        </div>
                      ))
                    )}
                  </div>
                  <p className="mt-3 border-t border-line pt-2 text-2xs text-ink-faint">
                    {selected.validated
                      ? `${selected.passedValidation} / ${selected.validation.length} checks passed`
                      : "No checks have been persisted for this plan yet."}
                  </p>
                </div>

                <div className="min-w-0 rounded-lg border border-line bg-surface-muted/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <TrainFront className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Train impact</h3>
                    </div>
                    {selected.impactStatus === "CLEAR" ? (
                      <Badge variant="success">CLEAR</Badge>
                    ) : selected.impactStatus === "CONFLICT" ? (
                      <Badge variant="danger">CONFLICT</Badge>
                    ) : (
                      <Badge variant="outline">UNKNOWN</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="tabular-nums text-ink">
                      <span className="font-semibold">{selected.impact.length}</span> affected train{(selected.impact.length ?? 0) === 1 ? "" : "s"}
                    </span>
                    <span className="tabular-nums text-ink">
                      <span className="font-semibold">{selected.impact.filter((row) => row.conflict).length}</span> schedule conflict{(selected.impact.filter((row) => row.conflict).length) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {selected.impact.length === 0 ? (
                      <p className="text-sm text-ink-muted">
                        {selected.impactStatus === "CLEAR"
                          ? "No COA occupancy or schedule row overlaps the proposed block window."
                          : "Impact assessment unavailable."}
                      </p>
                    ) : (
                      selected.impact.map((row) => (
                        <div key={row.key} className="min-w-0 rounded-md border border-danger/25 bg-danger-light/40 px-3 py-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-ink">
                              <Clock3 className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                              <span className="min-w-0 break-words">
                                {row.kind === "OCCUPANCY" ? "Line occupancy" : "Schedule"} · {row.trainIdLabel}
                              </span>
                              {row.line ? <span className="break-all font-mono text-ink-muted">{row.line}</span> : null}
                              {row.station ? <span className="break-all font-mono text-ink-muted">{row.station}</span> : null}
                            </span>
                            <StatusBadge status={row.conflict ? "CONFLICT" : "CLEAR"} tone={row.conflict ? "danger" : "success"} />
                          </div>
                          <p className="mt-0.5 break-words text-2xs text-ink-muted">{row.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="mt-3 border-t border-line pt-2 text-2xs text-ink-faint">
                    Calculated from COA occupancy and schedule overlap against the proposed block window. Delay impact: <span className="font-medium uppercase">not calculated by current backend</span>.
                  </p>
                </div>
              </div>

              <LineageSection summary={selected} maintenanceRecord={maintenanceRecordOf(selected)} candidateById={candidateById} />

              {selected.plan.status === REWORK_STATUS ? (
                <div className="rounded-lg border border-amber-600/30 bg-amber-600/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <Undo2 className="size-4 text-amber-600" aria-hidden="true" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-700">Returned to Planning — rework required</h3>
                  </div>
                  <p className="mt-2 text-sm text-ink">
                    The Controller rejected this recommendation. Review the rejection reason below, then generate a revised
                    recommendation from the Rework queue in the Planning workspace. The revised plan keeps this history linked via{" "}
                    <span className="font-mono">revises_plan_id</span>.
                  </p>
                  {rejectionOf(selected) ? (
                    <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                      <LabeledField label="Rejection reason">
                        <span className="normal-case">{rejectionOf(selected)?.remarks ?? "—"}</span>
                      </LabeledField>
                      <LabeledField label="Decided at" muted>
                        <span className="tabular-nums">{formatDateTime(rejectionOf(selected)?.decided_at)}</span>
                      </LabeledField>
                    </dl>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 font-medium"
                    onClick={() => navigate(`/rework?plan=${selected.plan.id}`)}
                    title="Open the rejection in the Planning rework queue"
                  >
                    <Undo2 /> Revise in Planning
                  </Button>
                </div>
              ) : null}

              <div>
                <p className="text-2xs text-ink-muted">
                  Review the proposed maintenance block, validation and operational impact before recording your decision.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={ACTION_BUTTON}
                    onClick={() => runValidation(selected)}
                    disabled={offline || busy}
                    title="Run the deterministic backend validation checks"
                  >
                    <CheckCircle2 /> Validate
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    className={ACTION_BUTTON}
                    onClick={() => setConfirm({ planId: selected.plan.id, planCode: selected.plan.plan_code, decision: "APPROVED" })}
                    disabled={!canApprove}
                    title={validationPassed ? "Records an APPROVED controller decision through the backend" : "Approve unlocks only when every validation check passes"}
                  >
                    <CheckCircle2 /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={ACTION_BUTTON}
                    disabled
                    title="Modification endpoint unavailable"
                  >
                    <Undo2 /> Modify
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className={ACTION_BUTTON}
                    onClick={() => {
                      setRejectError(null);
                      setRejectReason("");
                      setRejectTarget({ planId: selected.plan.id, planCode: selected.plan.plan_code });
                    }}
                    disabled={offline || busy || selected.plan.status === "REJECTED" || selected.plan.status === REWORK_STATUS}
                    title="Records a REJECTED controller decision — a rejection reason is required and the plan moves to the Rework queue"
                  >
                    <XCircle /> Reject
                  </Button>
                </div>
                <p className="mt-2 text-2xs text-ink-faint">Modification is not supported by the current backend.</p>
              </div>
            </section>
          ) : (
            <section className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface-white/60 p-8 text-center">
              {awaiting.length === 0 ? (
                <>
                  <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
                  <p className="text-sm font-semibold uppercase tracking-wider text-ink">All recommendations reviewed</p>
                  <p className="text-xs text-ink-muted">No block plans currently require controller decision.</p>
                </>
              ) : (
                <>
                  <ListChecks className="size-8 text-ink-faint" aria-hidden="true" />
                  <p className="text-sm font-medium text-ink">Select a recommendation</p>
                  <p className="text-xs text-ink-muted">Pick a plan from the pending queue to review it and record your decision.</p>
                </>
              )}
            </section>
          )}
        </div>
      </div>

      <details className="group rounded-lg border border-line bg-surface-white shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-faint">
            Recent controller decisions ({decisionRows.length})
          </span>
          <ChevronDown className="size-4 text-ink-faint transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-line p-4">
          <DataTable
            rows={decisionRows}
            columns={decisionColumns}
            keyField={(row) => row.id}
            loading={decisions.loading}
            emptyTitle="No decisions recorded"
            emptyDescription="Approve or reject a recommendation — the decision is persisted through the backend and appears here."
          />
        </div>
      </details>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && !busy && setConfirm(null)}
        title={confirm ? CONFIRM_TITLES[confirm.decision] : ""}
        description={confirm ? `${confirm.planCode} · ${CONFIRM_COPY[confirm.decision]}` : undefined}
        confirmLabel="Approve"
        intent="success"
        icon={CheckCircle2}
        busy={busy}
        onConfirm={recordDecision}
      />

      <RejectReasonDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setRejectTarget(null);
            setRejectReason("");
            setRejectError(null);
          }
        }}
        planCode={rejectTarget?.planCode ?? ""}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        error={rejectError}
        busy={busy}
        onConfirm={submitRejection}
      />
    </div>
  );
}