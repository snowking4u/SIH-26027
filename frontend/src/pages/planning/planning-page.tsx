import {
  ListChecks,
  Link2,
  Boxes,
  RefreshCw,
  Target,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/utils/cn";
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
import {
  fetchPlanningConstraints,
  fetchPlanningDependencies,
  fetchPlanningPriorities,
  fetchPlanningResources,
  fetchPlanningTaskResources,
  fetchPlanningTasks,
} from "@/services/api/planning";
import { fetchCandidateWindows } from "@/services/api/candidates";
import type {
  PlanningConstraint,
  PlanningDependency,
  PlanningPriority,
  PlanningResource,
  PlanningTask,
  PlanningTaskResource,
} from "@/services/api/types";

type TabKey = "tasks" | "constraints" | "resources" | "allocations" | "dependencies" | "priorities";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tasks", label: "Planning Tasks" },
  { key: "constraints", label: "Constraints" },
  { key: "resources", label: "Resources" },
  { key: "allocations", label: "Task Resources" },
  { key: "dependencies", label: "Dependencies" },
  { key: "priorities", label: "Priorities" },
];

const dateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

export function PlanningPage() {
  const health = useHealth();
  const tasks = useAsyncResource(fetchPlanningTasks, []);
  const constraints = useAsyncResource(fetchPlanningConstraints, []);
  const resources = useAsyncResource(fetchPlanningResources, []);
  const taskResources = useAsyncResource(fetchPlanningTaskResources, []);
  const dependencies = useAsyncResource(fetchPlanningDependencies, []);
  const priorities = useAsyncResource(fetchPlanningPriorities, []);
  const candidates = useAsyncResource(fetchCandidateWindows, []);

  const [tab, setTab] = useState<TabKey>("tasks");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<PlanningTask | null>(null);

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    tasks.retry();
    constraints.retry();
    resources.retry();
    taskResources.retry();
    dependencies.retry();
    priorities.retry();
    candidates.retry();
  };

  const statusOptions = useMemo(() => {
    const list = Array.from(new Set((tasks.data ?? []).map((t) => t.status).filter(Boolean)));
    return list.sort();
  }, [tasks.data]);

  const filteredTasks = useMemo(() => {
    const rows = tasks.data ?? [];
    if (!statusFilter) return rows;
    return rows.filter((task) => task.status === statusFilter);
  }, [tasks.data, statusFilter]);

  const priorityByTask = useMemo(() => {
    const map = new Map<number, PlanningPriority>();
    for (const p of priorities.data ?? []) map.set(p.planning_task_id, p);
    return map;
  }, [priorities.data]);

  const resourceById = useMemo(() => {
    const map = new Map<number, PlanningResource>();
    for (const r of resources.data ?? []) map.set(r.id, r);
    return map;
  }, [resources.data]);

  const candidatesByTask = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of candidates.data ?? []) map.set(c.planning_task_id, (map.get(c.planning_task_id) ?? 0) + 1);
    return map;
  }, [candidates.data]);

  const taskColumns: DataTableColumn<PlanningTask>[] = [
    {
      key: "task_code",
      header: "Task",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedTask(row)}
          className="font-mono text-xs font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline"
        >
          {row.task_code}
        </button>
      ),
    },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.task_type}</Badge> },
    {
      key: "priority",
      header: "Priority",
      render: (row) => {
        const p = priorityByTask.get(row.id);
        return p ? <StatusBadge status={p.priority_band} tone="warning" /> : <span className="text-xs text-ink-faint">—</span>;
      },
    },
    {
      key: "window",
      header: "Window",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {row.earliest_start ? dateTime(row.earliest_start).split(",")[0] : "—"} → {row.latest_end ? dateTime(row.latest_end).split(",")[0] : "—"}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => `${row.duration_minutes}m`,
      className: "tabular-nums",
    },
    { key: "location", header: "Location", render: (row) => row.location_code ?? "—" },
    {
      key: "candidates",
      header: "Candidates",
      render: (row) => <span className="tabular-nums">{candidatesByTask.get(row.id) ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const constraintColumns: DataTableColumn<PlanningConstraint>[] = [
    { key: "task", header: "Task", render: (row) => <span className="font-mono text-xs">{row.planning_task_id}</span> },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.constraint_type}</Badge> },
    { key: "value", header: "Value", render: (row) => <span className="font-mono text-xs">{row.constraint_value}</span> },
    { key: "hard", header: "Hard", render: (row) => (row.hard_constraint ? <Badge variant="danger">Hard</Badge> : <Badge variant="outline">Soft</Badge>) },
    { key: "effective", header: "Effective", render: (row) => (row.effective_start ? <span className="tabular-nums text-xs">{dateTime(row.effective_start).split(",")[0]} → {row.effective_end ? dateTime(row.effective_end).split(",")[0] : "…"}</span> : "—") },
    { key: "source", header: "Source", render: (row) => row.source ?? "—" },
  ];

  const resourceColumns: DataTableColumn<PlanningResource>[] = [
    { key: "code", header: "Code", render: (row) => <span className="font-mono text-xs">{row.resource_code}</span> },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.resource_type}</Badge> },
    { key: "name", header: "Name", render: (row) => row.resource_name },
    { key: "capacity", header: "Capacity", render: (row) => (row.capacity != null ? `${row.capacity} ${row.unit ?? ""}`.trim() : "—"), className: "tabular-nums" },
    { key: "location", header: "Location", render: (row) => row.location_code ?? "—" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  ];

  const allocationColumns: DataTableColumn<PlanningTaskResource>[] = [
    { key: "task", header: "Task", render: (row) => <span className="font-mono text-xs">{row.planning_task_id}</span> },
    {
      key: "resource",
      header: "Resource",
      render: (row) => {
        const resource = resourceById.get(row.planning_resource_id);
        return resource ? `${resource.resource_code} · ${resource.resource_name}` : <span className="font-mono text-xs">{row.planning_resource_id}</span>;
      },
    },
    { key: "qty", header: "Required", render: (row) => <span className="tabular-nums">{row.required_quantity}</span> },
    { key: "status", header: "Allocation", render: (row) => <StatusBadge status={row.allocation_status} /> },
  ];

  const dependencyColumns: DataTableColumn<PlanningDependency>[] = [
    { key: "pred", header: "Predecessor", render: (row) => <span className="font-mono text-xs">{row.predecessor_task_id}</span> },
    { key: "succ", header: "Successor", render: (row) => <span className="font-mono text-xs">{row.successor_task_id}</span> },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.dependency_type}</Badge> },
    { key: "lag", header: "Lag", render: (row) => `${row.lag_minutes}m`, className: "tabular-nums" },
    { key: "desc", header: "Description", render: (row) => <span className="max-w-[24rem] truncate text-xs">{row.description ?? "—"}</span> },
  ];

  const priorityColumns: DataTableColumn<PlanningPriority>[] = [
    { key: "task", header: "Task", render: (row) => <span className="font-mono text-xs">{row.planning_task_id}</span> },
    { key: "band", header: "Band", render: (row) => <StatusBadge status={row.priority_band} tone={row.priority_band === "CRITICAL" ? "danger" : row.priority_band === "HIGH" ? "warning" : "success"} /> },
    {
      key: "severity",
      header: "Safety / Traffic",
      render: (row) => (
        <span className="inline-flex gap-1">
          <StatusBadge status={row.safety_impact} />
          <StatusBadge status={row.traffic_impact} />
        </span>
      ),
    },
    { key: "recurrence", header: "Recurrence", render: (row) => <StatusBadge status={row.failure_recurrence} /> },
    { key: "age", header: "Defect Age", render: (row) => `${row.defect_age_days}d`, className: "tabular-nums" },
    { key: "score", header: "Score", render: (row) => <span className="font-mono tabular-nums">{row.priority_score.toFixed(1)}</span> },
    {
      key: "reason",
      header: "Rationale",
      render: (row) => (
        <span title={row.calculation_reason ?? ""} className="max-w-[22rem] truncate text-xs">
          {row.calculation_reason ?? "—"}
        </span>
      ),
    },
  ];

  const anyError = tasks.error ?? constraints.error ?? resources.error ?? dependencies.error ?? priorities.error;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Planning & Requests"
        title="Planning Workspace"
        description="The planning chain: maintenance requirements become planning tasks, constrained by resources and dependencies, then matched to available windows and scored deterministically by priority."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {anyError ? <ErrorState title="Planning data unavailable" message={anyError} onRetry={refresh} /> : null}

      {offline ? null : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Planning Tasks", value: tasks.data?.length, icon: ListChecks },
            { label: "Constraints", value: constraints.data?.length, icon: AlertTriangle },
            { label: "Resources", value: resources.data?.length, icon: Boxes },
            { label: "Allocations", value: taskResources.data?.length, icon: Users },
            { label: "Dependencies", value: dependencies.data?.length, icon: Link2 },
            { label: "Prioritised", value: priorities.data?.length, icon: Target },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-line bg-surface-white p-3.5 shadow-card">
              <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">{item.label}</p>
              <p className="mt-1.5 text-2xl font-semibold text-ink tabular-nums">{item.value == null ? "…" : item.value}</p>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-navy-950 p-1 shadow-card">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === item.key ? "bg-navy-800 text-white" : "text-navy-400 hover:text-white",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!offline && tasks.loading ? <LoadingState label="Loading planning data…" /> : null}

      {tab === "tasks" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-white px-3 py-2.5 shadow-card">
            <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">Filter by status</span>
            <button
              type="button"
              onClick={() => setStatusFilter("")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                statusFilter === "" ? "bg-navy-900 text-brand-400" : "bg-surface-muted text-ink-muted hover:bg-surface-muted",
              )}
            >
              All
            </button>
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  statusFilter === status ? "bg-navy-900 text-brand-400" : "bg-surface-muted text-ink-muted hover:bg-surface-muted",
                )}
              >
                {status}
              </button>
            ))}
          </div>
          <DataTable
            rows={filteredTasks}
            columns={taskColumns}
            keyField={(row) => row.id}
            loading={tasks.loading}
            emptyTitle={statusFilter ? `No open tasks in status “${statusFilter}”` : "No planning tasks"}
            emptyDescription="Planning tasks appear once maintenance requirements have been converted."
            toolbar={<SectionHeader icon={ListChecks} title="Planning tasks" description={`${filteredTasks.length} shown · ${tasks.data?.length ?? 0} total · ${candidates.data?.length ?? 0} candidate windows across tasks`} />}
          />
        </div>
      ) : null}

      {tab === "constraints" ? (
        <DataTable
          rows={constraints.data ?? []}
          columns={constraintColumns}
          keyField={(row) => row.id}
          loading={constraints.loading}
          emptyTitle="No constraints"
          emptyDescription="No planning constraints recorded yet."
          toolbar={<SectionHeader icon={AlertTriangle} title="Constraints" description={`${constraints.data?.length ?? 0} hard/soft constraints · GET /api/planning/constraints`} />}
        />
      ) : null}

      {tab === "resources" ? (
        <DataTable
          rows={resources.data ?? []}
          columns={resourceColumns}
          keyField={(row) => row.id}
          loading={resources.loading}
          emptyTitle="No resources"
          emptyDescription="No planning resources recorded yet."
          toolbar={<SectionHeader icon={Boxes} title="Resources" description={`${resources.data?.length ?? 0} resources · GET /api/planning/resources`} />}
        />
      ) : null}

      {tab === "allocations" ? (
        <DataTable
          rows={taskResources.data ?? []}
          columns={allocationColumns}
          keyField={(row) => row.id}
          loading={taskResources.loading}
          emptyTitle="No allocations"
          emptyDescription="No task-resource allocations recorded yet."
          toolbar={<SectionHeader icon={Users} title="Task resource allocations" description={`${taskResources.data?.length ?? 0} allocations · GET /api/planning/task-resources`} />}
        />
      ) : null}

      {tab === "dependencies" ? (
        <DataTable
          rows={dependencies.data ?? []}
          columns={dependencyColumns}
          keyField={(row) => row.id}
          loading={dependencies.loading}
          emptyTitle="No dependencies"
          emptyDescription="No task dependencies recorded yet."
          toolbar={<SectionHeader icon={Link2} title="Task dependencies" description={`${dependencies.data?.length ?? 0} dependencies · GET /api/planning/dependencies`} />}
        />
      ) : null}

      {tab === "priorities" ? (
        <DataTable
          rows={priorities.data ?? []}
          columns={priorityColumns}
          keyField={(row) => row.id}
          loading={priorities.loading}
          emptyTitle="No priorities"
          emptyDescription="No deterministic priority assessments exist yet. Use the recalculate action on the backend."
          toolbar={<SectionHeader icon={Target} title="Priority assessments" description={`${priorities.data?.length ?? 0} deterministic scores · GET /api/planning/priority`} />}
        />
      ) : null}

      <Drawer
        open={selectedTask !== null}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        title={selectedTask?.task_code ?? "Planning task"}
        description={selectedTask ? `Task #${selectedTask.id}` : undefined}
      >
        {selectedTask ? (
          <dl>
            <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-xs font-medium text-ink-faint">Type</dt>
              <dd><Badge variant="outline">{selectedTask.task_type}</Badge></dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-xs font-medium text-ink-faint">Status</dt>
              <dd><StatusBadge status={selectedTask.status} /></dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-xs font-medium text-ink-faint">Duration</dt>
              <dd className="text-sm text-ink tabular-nums">{selectedTask.duration_minutes} minutes</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-xs font-medium text-ink-faint">Earliest start</dt>
              <dd className="text-sm text-ink">{dateTime(selectedTask.earliest_start)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-xs font-medium text-ink-faint">Latest end</dt>
              <dd className="text-sm text-ink">{dateTime(selectedTask.latest_end)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-xs font-medium text-ink-faint">Location</dt>
              <dd className="text-sm text-ink">{selectedTask.location_code ?? "—"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-xs font-medium text-ink-faint">Candidate windows</dt>
              <dd className="text-sm text-ink tabular-nums">{candidatesByTask.get(selectedTask.id) ?? 0}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
              <dt className="text-xs font-medium text-ink-faint">Maintenance requirement</dt>
              <dd className="text-sm text-ink font-mono">{selectedTask.maintenance_requirement_id}</dd>
            </div>
            {priorityByTask.get(selectedTask.id) ? (
              <div className="flex items-start justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-xs font-medium text-ink-faint">Priority band</dt>
                <dd><StatusBadge status={priorityByTask.get(selectedTask.id)!.priority_band} tone="warning" /></dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Drawer>
    </div>
  );
}