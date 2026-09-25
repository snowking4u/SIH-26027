import { CalendarClock, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import {
  checkCandidateWindow,
  fetchCandidateWindows,
  generateCandidateWindows,
} from "@/services/api/candidates";
import { fetchCoaAvailableWindows } from "@/services/api/coa";
import { apiErrorMessage } from "@/services/api/client";
import { fetchPlanningTasks } from "@/services/api/planning";
import type { CoaAvailableWindow, CandidateWindow } from "@/services/api/types";

const dateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

export function CandidateWindowsPage() {
  const health = useHealth();
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 2000 }), []);
  const candidates = useAsyncResource(fetchCandidateWindows, []);
  const tasks = useAsyncResource(fetchPlanningTasks, []);

  const [generateBusy, setGenerateBusy] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<{
    processed: number;
    created: number;
    skipped: number;
    infeasible: number;
    requires_review: number;
  } | null>(null);

  const [taskId, setTaskId] = useState("");
  const [windowId, setWindowId] = useState("");
  const [checkBusy, setBusy] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checked, setChecked] = useState<{
    feasible: boolean;
    feasibility_status: string;
    candidate_start: string;
    candidate_end: string;
    candidate_duration_minutes: number;
    feasibility_reason: string | null;
  } | null>(null);

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    windows.retry();
    candidates.retry();
    tasks.retry();
  };

  const runGenerate = async () => {
    setGenerateBusy(true);
    setGenerateError(null);
    setGeneration(null);
    try {
      const summary = await generateCandidateWindows();
      setGeneration({
        processed: summary.processed,
        created: summary.created,
        skipped: summary.skipped,
        infeasible: summary.infeasible,
        requires_review: summary.requires_review,
      });
      candidates.retry();
    } catch (err) {
      setGenerateError(apiErrorMessage(err));
    } finally {
      setGenerateBusy(false);
    }
  };

  const runCheck = async () => {
    const planning_task_id = Number.parseInt(taskId, 10);
    const available_window_id = Number.parseInt(windowId, 10);
    if (!Number.isFinite(planning_task_id) || !Number.isFinite(available_window_id)) {
      setCheckError("Enter numeric planning task and available window ids.");
      return;
    }
    setBusy(true);
    setCheckError(null);
    setChecked(null);
    try {
      const result = await checkCandidateWindow({ planning_task_id, available_window_id });
      setChecked({
        feasible: result.feasible,
        feasibility_status: result.feasibility_status,
        candidate_start: result.candidate_start,
        candidate_end: result.candidate_end,
        candidate_duration_minutes: result.candidate_duration_minutes,
        feasibility_reason: result.feasibility_reason,
      });
    } catch (err) {
      setCheckError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const windowColumns: DataTableColumn<CoaAvailableWindow>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "station", header: "Station", render: (row) => <Badge variant="outline">{row.station_code}</Badge> },
    { key: "line", header: "Line", render: (row) => row.line_number },
    {
      key: "window",
      header: "Available window",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {dateTime(row.window_start)} → {dateTime(row.window_end)}
        </span>
      ),
    },
    { key: "duration", header: "Duration", render: (row) => `${row.duration_minutes}m`, className: "tabular-nums" },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.window_status} />,
    },
  ];

  const candidateColumns: DataTableColumn<CandidateWindow>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "task", header: "Task", render: (row) => <span className="font-mono text-xs">{row.planning_task_id}</span> },
    { key: "window", header: "Window", render: (row) => <span className="font-mono text-xs">{row.available_window_id}</span> },
    {
      key: "candidate",
      header: "Candidate",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {dateTime(row.candidate_start)} → {dateTime(row.candidate_end)}
        </span>
      ),
    },
    { key: "duration", header: "Duration", render: (row) => `${row.candidate_duration_minutes}m`, className: "tabular-nums" },
    {
      key: "feasible",
      header: "Feasible",
      render: (row) => (
        <StatusBadge status={row.feasible ? "FEASIBLE" : "INFEASIBLE"} tone={row.feasible ? "success" : "danger"} />
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Planning · Candidate Windows"
        title="Candidate Windows"
        description="Feasible task↔window pairings from the backend candidate engine — derived from real planning tasks and real COA available windows. Nothing is fabricated on the client."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {offline ? <ErrorState title="Candidate data unavailable" message="Backend /health reports offline." onRetry={refresh} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          icon={CalendarClock}
          title="Available windows"
          description={`${windows.data?.length ?? 0} · GET /api/coa/available-windows`}
        />
      </div>
      <DataTable
        rows={windows.data ?? []}
        columns={windowColumns}
        keyField={(row) => row.id}
        loading={windows.loading}
        emptyTitle="No available windows"
        emptyDescription="Backend returned no COA available windows."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          icon={Sparkles}
          title="Candidate windows"
          description={`${candidates.data?.length ?? 0} · GET /api/candidates/windows`}
        />
        <Button variant="secondary" size="sm" onClick={runGenerate} disabled={offline || generateBusy}>
          {generateBusy ? <Loader2 className="animate-spin" /> : <Zap />} Generate candidates
        </Button>
      </div>
      <DataTable
        rows={candidates.data ?? []}
        columns={candidateColumns}
        keyField={(row) => row.id}
        loading={candidates.loading}
        emptyTitle="No candidate windows"
        emptyDescription="Run “Generate candidates” to match planning tasks to available windows."
      />

      {generation ? (
        <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
          <SectionHeader icon={Zap} title="Candidate generation result" description="POST /api/candidates/generate — deterministic, persisted." />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Processed</p>
              <p className="mt-1 text-xl font-semibold text-ink tabular-nums">{generation.processed}</p>
            </div>
            <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Created</p>
              <p className="mt-1 text-xl font-semibold text-brand-700 tabular-nums">{generation.created}</p>
            </div>
            <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Infeasible</p>
              <p className="mt-1 text-xl font-semibold text-danger tabular-nums">{generation.infeasible}</p>
            </div>
            <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Requires review</p>
              <p className="mt-1 text-xl font-semibold text-warning tabular-nums">{generation.requires_review}</p>
            </div>
          </div>
        </section>
      ) : null}

      {generateError ? (
        <div className="rounded-lg border border-danger/25 bg-danger-light px-4 py-3">
          <p className="text-sm font-medium text-danger">{generateError}</p>
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
        <SectionHeader
          icon={Zap}
          title="Check one task ↔ window"
          description="POST /api/candidates/check — deterministic, no persistence."
        />
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-medium text-ink">Planning task id</span>
            <input
              type="number"
              min={1}
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
              className="mt-1 w-40 rounded-md border border-line-dark bg-surface-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink">Available window id</span>
            <input
              type="number"
              min={1}
              value={windowId}
              onChange={(event) => setWindowId(event.target.value)}
              className="mt-1 w-40 rounded-md border border-line-dark bg-surface-white px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
            />
          </label>
          <Button onClick={runCheck} disabled={offline || checkBusy}>
            {checkBusy ? <Loader2 className="animate-spin" /> : <Zap />} Check feasibility
          </Button>
        </div>

        {checkError ? (
          <p className="mt-3 text-sm font-medium text-danger">{checkError}</p>
        ) : null}

        {checked ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
              <dt className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Feasible</dt>
              <dd className="mt-1">
                <StatusBadge status={checked.feasible ? "FEASIBLE" : "INFEASIBLE"} tone={checked.feasible ? "success" : "danger"} />
              </dd>
            </div>
            <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
              <dt className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Candidate window</dt>
              <dd className="mt-1 tabular-nums text-xs">
                {dateTime(checked.candidate_start)} → {dateTime(checked.candidate_end)}
              </dd>
            </div>
            <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
              <dt className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Duration</dt>
              <dd className="mt-1 tabular-nums text-sm">{checked.candidate_duration_minutes}m</dd>
            </div>
            <div className="rounded-md border border-line bg-surface-muted/40 px-3 py-2.5">
              <dt className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Reason</dt>
              <dd className="mt-1 text-xs">{checked.feasibility_reason ?? checked.feasibility_status}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
        <SectionHeader
          icon={CalendarClock}
          title="Feasible task pool"
          description={`${tasks.data?.length ?? 0} planning tasks · GET /api/planning/tasks`}
        />
        <DataTable
          rows={tasks.data ?? []}
          columns={[
            { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
            { key: "code", header: "Code", render: (row) => <Badge variant="outline">{row.task_code}</Badge> },
            {
              key: "window",
              header: "Task window",
              render: (row) => (
                <span className="tabular-nums text-xs">
                  {dateTime(row.earliest_start)} → {dateTime(row.latest_end)}
                </span>
              ),
            },
            { key: "duration", header: "Duration", render: (row) => `${row.duration_minutes}m`, className: "tabular-nums" },
          ]}
          keyField={(row) => row.id}
          loading={tasks.loading}
          emptyTitle="No planning tasks"
          emptyDescription="Backend returned no planning tasks."
        />
      </section>
    </div>
  );
}
