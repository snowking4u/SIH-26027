import {
  ClipboardList,
  Clock3,
  Lock,
  RefreshCw,
  Route,
  Wrench,
  Zap,
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
import { fetchPlanningConstraints, fetchPlanningTasks } from "@/services/api/planning";
import { fetchUnifiedBlockRequirements, fetchUnifiedMaintenance } from "@/services/api/unified";
import type {
  PlanningConstraint,
  PlanningTask,
  UnifiedBlockRequirement,
  UnifiedMaintenance,
} from "@/services/api/types";
import { formatDateTime, formatTime } from "@/utils/plan-chain";

interface BlockRequestRow {
  requirement: UnifiedBlockRequirement;
  maintenance: UnifiedMaintenance | null;
  tasks: PlanningTask[];
  constraints: PlanningConstraint[];
  kind: string;
}

const blockKind = (req: UnifiedBlockRequirement): string => {
  const power = req.power_block_required;
  const traffic = req.traffic_block_required;
  if (power && traffic) return "Integrated Block";
  if (power) return "Power Block";
  if (traffic) return "Traffic Block";
  return req.block_type ?? "Block";
};

export function BlockRequestsPage() {
  const health = useHealth();
  const requirements = useAsyncResource(fetchUnifiedBlockRequirements, []);
  const maintenance = useAsyncResource(fetchUnifiedMaintenance, []);
  const planningTasks = useAsyncResource(fetchPlanningTasks, []);
  const constraints = useAsyncResource(fetchPlanningConstraints, []);

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    requirements.retry();
    maintenance.retry();
    planningTasks.retry();
    constraints.retry();
  };

  const rows = useMemo<BlockRequestRow[]>(() => {
    const maintenanceById = new Map((maintenance.data ?? []).map((m) => [m.id, m]));
    const tasksByReqId = new Map<number, PlanningTask[]>();
    for (const task of planningTasks.data ?? []) {
      if (task.block_requirement_id == null) continue;
      const list = tasksByReqId.get(task.block_requirement_id) ?? [];
      list.push(task);
      tasksByReqId.set(task.block_requirement_id, list);
    }
    const constraintsByTaskId = new Map<number, PlanningConstraint[]>();
    for (const constraint of constraints.data ?? []) {
      const list = constraintsByTaskId.get(constraint.planning_task_id) ?? [];
      list.push(constraint);
      constraintsByTaskId.set(constraint.planning_task_id, list);
    }
    return (requirements.data ?? []).map((requirement) => {
      const tasks = tasksByReqId.get(requirement.id) ?? [];
      const taskConstraints = tasks.flatMap((task) => constraintsByTaskId.get(task.id) ?? []);
      const sourceMaintId = tasks[0]?.maintenance_requirement_id ?? requirement.maintenance_requirement_id;
      return {
        requirement,
        maintenance: maintenanceById.get(sourceMaintId) ?? null,
        tasks,
        constraints: taskConstraints,
        kind: blockKind(requirement),
      };
    });
  }, [requirements.data, maintenance.data, planningTasks.data, constraints.data]);

  const integrated = rows.filter((row) => row.requirement.power_block_required && row.requirement.traffic_block_required).length;
  const pending = rows.filter((row) => row.requirement.status === "PENDING" || row.requirement.status === "OPEN").length;
  const withTasks = rows.filter((row) => row.tasks.length > 0).length;

  const columns: DataTableColumn<BlockRequestRow>[] = [
    {
      key: "location",
      header: "Station / Line",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">{row.requirement.station_code ?? "—"}</span>
          <span className="font-mono text-2xs text-ink-faint">{row.requirement.line_number ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Block type",
      render: (row) => {
        const kinds: string[] = [];
        if (row.requirement.traffic_block_required) kinds.push("Traffic");
        if (row.requirement.power_block_required) kinds.push("Power");
        return (
          <Badge variant={row.requirement.traffic_block_required && row.requirement.power_block_required ? "warning" : row.requirement.power_block_required ? "brand" : "info"}>
            {kinds.length > 0 ? `${kinds.join(" + ")} Block` : row.kind}
          </Badge>
        );
      },
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => (
        <span className="flex items-center gap-1 tabular-nums">
          <Clock3 className="size-3 text-ink-faint" />
          {row.requirement.required_duration_minutes ?? "?"}m
        </span>
      ),
    },
    {
      key: "window",
      header: "Earliest → latest",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {row.requirement.earliest_start ? `${formatDateTime(row.requirement.earliest_start)} → ${formatTime(row.requirement.latest_end)}` : "—"}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source ask",
      render: (row) => (
        <div className="flex max-w-xs flex-col">
          <span className="text-xs">{row.maintenance?.maintenance_type ?? `Maintenance req #${row.requirement.maintenance_requirement_id}`}</span>
          <span className="text-2xs text-ink-faint">{row.maintenance?.description ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "tasks",
      header: "Planning tasks",
      render: (row) =>
        row.tasks.length === 0 ? (
          <Badge variant="outline">Not yet planned</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.tasks.map((task) => (
              <Badge key={task.id} variant="success">{task.task_code}</Badge>
            ))}
          </div>
        ),
    },
    {
      key: "constraints",
      header: "Constraints",
      render: (row) =>
        row.constraints.length === 0 ? (
          <span className="text-xs text-ink-faint">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.constraints.slice(0, 3).map((constraint) => (
              <Badge key={constraint.id} variant={constraint.hard_constraint ? "danger" : "outline"} title={constraint.description ?? undefined}>
                {constraint.constraint_type}
              </Badge>
            ))}
            {row.constraints.length > 3 ? <Badge variant="outline">+{row.constraints.length - 3}</Badge> : null}
          </div>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.requirement.status} />,
    },
  ];

  const isLoading = requirements.loading || planningTasks.loading || constraints.loading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Maintenance · Blocks"
        title="Block Requests"
        description="Why each maintenance task needs track time: station and line, block type (Traffic / Power / Integrated), required duration and the earliest → latest window. Rendered directly from unified block requirements."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Block requests" value={requirements.data?.length ?? null} icon={ClipboardList} hint="Unified block requirements" loading={requirements.loading} />
        <MetricCard label="Integrated blocks" value={integrated} tone="warning" icon={Lock} hint="Traffic + power required together" loading={isLoading} />
        <MetricCard label="Awaiting planning" value={pending} tone="warning" icon={Route} hint="PENDING / OPEN requests" loading={isLoading} />
        <MetricCard label="With planning tasks" value={withTasks} tone="success" icon={Wrench} hint="Promoted into the planning pipeline" loading={isLoading} />
      </section>

      {offline ? (
        <ErrorState title="Backend offline" message="The unified block-requirement API is unreachable." onRetry={refresh} />
      ) : isLoading ? (
        <LoadingState label="Loading block requests" />
      ) : (
        <section className="space-y-4">
          <SectionHeader
            icon={Zap}
            title="Requested block deployments"
            description={`${rows.length} block request(s), each joined to its source ask, planning tasks and hard/soft constraints.`}
          />
          <DataTable<BlockRequestRow>
            columns={columns}
            rows={rows}
            keyField={(row) => row.requirement.id}
            loading={false}
            emptyTitle="No block requests"
            emptyDescription="Block requests are derived from maintenance demand — they appear here automatically once sources feed the unified layer."
          />
        </section>
      )}
    </div>
  );
}