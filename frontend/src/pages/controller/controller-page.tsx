import {
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  Target,
  Undo2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Drawer } from "@/components/common/drawer";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchCoaAvailableWindows } from "@/services/api/coa";
import { fetchCandidateWindows } from "@/services/api/candidates";
import { apiErrorMessage } from "@/services/api/client";
import {
  createOptimizationDecision,
  fetchOptimizationDecisions,
  fetchOptimizationPlans,
  fetchOptimizationPlanTasks,
  fetchOptimizationValidations,
  validateOptimizationPlan,
} from "@/services/api/optimization";
import type { BlockPlan, CandidateWindow, ControllerDecision } from "@/services/api/types";

interface ConfirmState {
  plan: BlockPlan;
  decision: "APPROVED" | "REJECTED" | "RETURNED_FOR_REVISION";
}

const CONFIRM_TITLES: Record<ConfirmState["decision"], string> = {
  APPROVED: "Approve this block plan?",
  REJECTED: "Reject this block plan?",
  RETURNED_FOR_REVISION: "Return this block plan for revision?",
};

const CONFIRM_COPY: Record<ConfirmState["decision"], string> = {
  APPROVED: "Records an approved controller decision for this plan. Plan status itself is not advanced.",
  REJECTED: "Records a rejected controller decision. Rejected plans await revision from planning.",
  RETURNED_FOR_REVISION: "Records a request to send this plan back for revision.",
};

const detailFormat = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

const timeOnly = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const actionButtonClass = "w-full sm:w-40 justify-center";

export function ControllerPage() {
  const health = useHealth();
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);
  const validations = useAsyncResource(fetchOptimizationValidations, []);
  const decisions = useAsyncResource(fetchOptimizationDecisions, []);
  const candidates = useAsyncResource(fetchCandidateWindows, []);
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 1000 }), []);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BlockPlan | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const deepLink = searchParams.get("plan");
    if (!deepLink) return;
    const target = (plans.data ?? []).find((plan) => String(plan.id) === deepLink);
    if (target) {
      setSelectedPlan(target);
      const next = new URLSearchParams(searchParams);
      next.delete("plan");
      setSearchParams(next, { replace: true });
    }
  }, [plans.data, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedPlan && plans.data && plans.data.length > 0) {
      setSelectedPlan((plans.data.find((plan) => plan.status !== "CANCELLED" && plan.status !== "REJECTED") ?? plans.data[0]) ?? null);
    }
  }, [plans.data, selectedPlan]);

  const planTasksByPlan = useMemo(() => {
    const map = new Map<number, number>();
    for (const plan of plans.data ?? []) map.set(plan.id, 0);
    for (const task of planTasks.data ?? []) map.set(task.block_plan_id, (map.get(task.block_plan_id) ?? 0) + 1);
    return map;
  }, [plans.data, planTasks.data]);

  const planTiming = useMemo(() => {
    const candidateById = new Map((candidates.data ?? []).map((c) => [c.id, c]));
    const windowById = new Map((windows.data ?? []).map((w) => [w.id, w]));
    const map = new Map<number, { start: string; end: string; station: string | null; line: string | null }[]>();
    for (const task of planTasks.data ?? []) {
      const candidate = task.candidate_block_window_id != null ? candidateById.get(task.candidate_block_window_id) ?? null : null;
      const window = candidate ? windowById.get(candidate.available_window_id) ?? null : null;
      if (!window) continue;
      const list = map.get(task.block_plan_id) ?? [];
      list.push({
        start: task.planned_start ?? window.window_start,
        end: task.planned_end ?? window.window_end,
        station: window.station_code,
        line: window.line_number,
      });
      map.set(task.block_plan_id, list);
    }
    return map;
  }, [planTasks.data, candidates.data, windows.data]);

  const selectedTiming = selectedPlan ? planTiming.get(selectedPlan.id) ?? [] : [];
  let blockRange: string | null = null;
  if (selectedTiming.length > 0) {
    const starts = selectedTiming.map((t) => new Date(t.start).getTime()).filter(Number.isFinite);
    const ends = selectedTiming.map((t) => new Date(t.end).getTime()).filter(Number.isFinite);
    if (starts.length > 0 && ends.length > 0) {
      blockRange = `${timeOnly(new Date(Math.min(...starts)).toISOString())}–${timeOnly(new Date(Math.max(...ends)).toISOString())}`;
    }
  }

  const selectedValidationRecords = useMemo(
    () => (selectedPlan ? (validations.data ?? []).filter((record) => record.block_plan_id === selectedPlan.id) : []),
    [validations.data, selectedPlan],
  );
  const validationPassed =
    selectedValidationRecords.length > 0 && selectedValidationRecords.every((record) => record.validation_status === "PASSED");

  const offline = health.api === "offline";

  const canApprove = selectedPlan
    ? validationPassed && !offline && !busy && selectedPlan.status !== "APPROVED"
    : false;

  const planColumns: DataTableColumn<BlockPlan>[] = [
    { key: "plan_code", header: "Plan", render: (row) => (
      <button type="button" onClick={() => setSelectedPlan(row)} className="font-mono text-xs font-medium text-brand-700 hover:underline">
        {row.plan_code}
      </button>
    ) },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "tasks",
      header: "Scheduled Tasks",
      render: (row) => <span className="tabular-nums">{planTasksByPlan.get(row.id) ?? 0}</span>,
    },
    {
      key: "horizon",
      header: "Horizon",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {detailFormat(row.planning_horizon_start).split(",")[0]} → {detailFormat(row.planning_horizon_end).split(",")[0]}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Button
          variant={selectedPlan?.id === row.id ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPlan(row)}
          disabled={offline}
          title={selectedPlan?.id === row.id ? "Selected — work on this plan in the command bar" : "Work on this plan in the command bar"}
        >
          {selectedPlan?.id === row.id ? "Selected" : "Open"}
        </Button>
      ),
    },
  ];

  const candidateColumns: DataTableColumn<CandidateWindow>[] = [
    { key: "task", header: "Task", render: (row) => <span className="font-mono text-xs">{row.planning_task_id}</span> },
    { key: "window", header: "Window", render: (row) => <span className="tabular-nums">{row.available_window_id}</span> },
    {
      key: "start",
      header: "Start",
      render: (row) => <span className="tabular-nums">{detailFormat(row.candidate_start)}</span>,
    },
    {
      key: "end",
      header: "End",
      render: (row) => <span className="tabular-nums">{detailFormat(row.candidate_end)}</span>,
    },
    {
      key: "feasible",
      header: "Feasibility",
      render: (row) => <StatusBadge status={row.feasibility_status} />,
    },
  ];

  const decisionColumns: DataTableColumn<ControllerDecision>[] = [
    { key: "plan", header: "Plan", render: (row) => <span className="font-mono text-xs">{row.block_plan_id}</span> },
    {
      key: "decision",
      header: "Decision",
      render: (row) => (
        <StatusBadge status={row.decision} tone={row.decision === "APPROVED" ? "success" : row.decision === "REJECTED" ? "danger" : "warning"} />
      ),
    },
    {
      key: "controller",
      header: "Controller",
      render: (row) => row.controller_code ?? "—",
    },
    {
      key: "decided_at",
      header: "Decided at",
      render: (row) => <span className="tabular-nums">{detailFormat(row.decided_at)}</span>,
    },
    {
      key: "remarks",
      header: "Remarks",
      render: (row) => <span className="max-w-[16rem] truncate text-xs">{row.remarks ?? "—"}</span>,
    },
  ];

  const isLoading = plans.loading || candidates.loading || validations.loading || decisions.loading;

  const recordDecision = async () => {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      await createOptimizationDecision({
        block_plan_id: confirm.plan.id,
        decision: confirm.decision,
        controller_code: "CONTROLLER",
        remarks: `Frontend decision: ${confirm.decision}`,
      });
      setConfirm(null);
      decisions.retry();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const runValidation = async (plan: BlockPlan) => {
    setBusy(true);
    setActionError(null);
    try {
      const result = await validateOptimizationPlan(plan.id);
      setSelectedPlan(plan);
      validations.retry();
      if (result.length === 0) setActionError(`Validation ran for ${plan.plan_code} — backend returned no validation records.`);
    } catch (err) {
      setActionError(`Validation failed: ${apiErrorMessage(err)}`);
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
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Operations Control · Decision"
        title="Controller Workspace"
        description="Validate, then approve, modify or reject each block plan. Every action is persisted as a real controller decision record."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {actionError ? (
        <ErrorState title="Action could not complete" message={actionError} onRetry={() => setActionError(null)} retryLabel="Dismiss" />
      ) : null}

      {selectedPlan ? (
        <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-sm font-bold text-ink">{selectedPlan.plan_code}</span>
            <StatusBadge status={selectedPlan.status} />
            {blockRange ? <Badge variant="outline">{blockRange}</Badge> : null}
            <Badge variant="outline">{(planTasksByPlan.get(selectedPlan.id) ?? 0).toString()} TASK{(planTasksByPlan.get(selectedPlan.id) ?? 0) === 1 ? "" : "S"}</Badge>
            {selectedValidationRecords.length > 0 ? (
              validationPassed ? (
                <Badge variant="success">✓ VALIDATION PASSED</Badge>
              ) : (
                <Badge variant="danger">✗ VALIDATION FAILED</Badge>
              )
            ) : (
              <Badge variant="outline">NOT RUN</Badge>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              className={actionButtonClass}
              onClick={() => runValidation(selectedPlan)}
              disabled={offline || busy}
              title="Run the validation checks"
            >
              <CheckCircle2 /> Validate
            </Button>
            <Button
              variant="success"
              size="sm"
              className={actionButtonClass}
              onClick={() => setConfirm({ plan: selectedPlan, decision: "APPROVED" })}
              disabled={!canApprove}
              title={validationPassed ? "Record an approved controller decision" : "Approve is enabled once every validation check passes"}
            >
              <CheckCircle2 /> Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={actionButtonClass}
              onClick={() => setConfirm({ plan: selectedPlan, decision: "RETURNED_FOR_REVISION" })}
              disabled={offline || busy}
              title="Return for revision"
            >
              <Undo2 /> Modify
            </Button>
            <Button
              variant="danger"
              size="sm"
              className={actionButtonClass}
              onClick={() => setConfirm({ plan: selectedPlan, decision: "REJECTED" })}
              disabled={offline || busy || selectedPlan.status === "REJECTED"}
              title="Reject the plan"
            >
              <XCircle /> Reject
            </Button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DataTable
            rows={plans.data ?? []}
            columns={planColumns}
            keyField={(row) => row.id}
            loading={plans.loading}
            emptyTitle="No block plans yet"
            emptyDescription="Plans appear here once planning has drafted a block plan proposal."
            toolbar={
              <SectionHeader
                icon={CalendarClock}
                title="Block plans"
                description={`${plans.data?.length ?? 0} persisted plans · ${planTasks.data?.length ?? 0} scheduled tasks in total`}
              />
            }
          />
        </div>
        <div className="lg:col-span-2">
          <div className="flex h-full flex-col rounded-lg border border-line bg-surface-white p-5 shadow-card">
            <SectionHeader
              icon={FileCheck2}
              title="Validation"
              description={selectedPlan ? `Checks on ${selectedPlan.plan_code}` : "Select a plan to see its checks."}
              right={selectedValidationRecords.length > 0 ? (validationPassed ? <Badge variant="success">PASS</Badge> : <Badge variant="danger">FAIL</Badge>) : undefined}
            />
            <div className="mt-3 space-y-1.5">
              {isLoading ? (
                <LoadingState label="Loading validations…" />
              ) : selectedValidationRecords.length === 0 ? (
                <p className="text-sm text-ink-muted">No validation records yet — run “Validate”.</p>
              ) : (
                selectedValidationRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-muted/40 px-3 py-1.5"
                  >
                    <span className="text-xs font-medium text-ink">
                      {record.validation_status === "PASSED" ? "✓" : record.validation_status === "FAILED" ? "✗" : "•"} {record.validation_type.replace(/_/g, " ")}
                    </span>
                    <StatusBadge
                      status={record.validation_status}
                      tone={record.validation_status === "PASSED" ? "success" : record.validation_status === "FAILED" ? "danger" : "warning"}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <DataTable
        rows={candidates.data ?? []}
        columns={candidateColumns}
        keyField={(row) => row.id}
        loading={candidates.loading}
        emptyTitle="No candidate windows"
        emptyDescription="Feasible task ↔ window matches appear here from the candidate engine."
        toolbar={
          <SectionHeader
            icon={Target}
            title="Candidate block windows"
            description={`${candidates.data?.length ?? 0} feasibility-checked candidates across ${plans.data?.length ?? 0} plan(s)`}
            right={<Button variant="outline" size="sm" onClick={refresh}><RefreshCw /> Refresh</Button>}
          />
        }
      />

      <DataTable
        rows={decisions.data ?? []}
        columns={decisionColumns}
        keyField={(row) => row.id}
        loading={decisions.loading}
        emptyTitle="No decisions recorded"
        emptyDescription="Every Approve / Modify / Reject you perform is persisted here — fully auditable."
        toolbar={<SectionHeader icon={Undo2} title="Controller decision log" description={`${decisions.data?.length ?? 0} decisions on record`} />}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && !busy && setConfirm(null)}
        title={confirm ? CONFIRM_TITLES[confirm.decision] : ""}
        description={confirm ? CONFIRM_COPY[confirm.decision] : undefined}
        confirmLabel={confirm ? (confirm.decision === "APPROVED" ? "Approve" : confirm.decision === "REJECTED" ? "Reject" : "Request revision") : "Confirm"}
        intent={confirm?.decision === "APPROVED" ? "success" : confirm?.decision === "REJECTED" ? "danger" : "default"}
        icon={confirm?.decision === "APPROVED" ? CheckCircle2 : confirm?.decision === "REJECTED" ? XCircle : Undo2}
        busy={busy}
        onConfirm={recordDecision}
      />

      <Drawer
        open={selectedPlan !== null}
        onOpenChange={(open) => !open && setSelectedPlan(null)}
        title="Block plan"
        description={selectedPlan ? selectedPlan.plan_code : undefined}
      >
        {selectedPlan ? (
          <div className="space-y-1">
            <dl>
              <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-xs font-medium text-ink-faint">Plan code</dt>
                <dd className="font-mono text-sm text-ink">{selectedPlan.plan_code}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-xs font-medium text-ink-faint">Status</dt>
                <dd><StatusBadge status={selectedPlan.status} /></dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-xs font-medium text-ink-faint">Scheduled tasks</dt>
                <dd className="text-sm text-ink tabular-nums">{planTasksByPlan.get(selectedPlan.id) ?? 0}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-xs font-medium text-ink-faint">Validation</dt>
                <dd>
                  {(validations.data ?? []).some((item) => item.block_plan_id === selectedPlan.id) ? (
                    <StatusBadge
                      status={(validations.data ?? []).filter((item) => item.block_plan_id === selectedPlan.id).some((item) => item.validation_status === "FAILED") ? "FAILED" : "PASSED"}
                    />
                  ) : (
                    <Badge variant="outline">Not run</Badge>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-xs font-medium text-ink-faint">Horizon</dt>
                <dd className="text-sm text-ink tabular-nums">{detailFormat(selectedPlan.planning_horizon_start)} → {detailFormat(selectedPlan.planning_horizon_end)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-xs font-medium text-ink-faint">Plan date</dt>
                <dd className="text-sm text-ink">{detailFormat(selectedPlan.plan_date)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}