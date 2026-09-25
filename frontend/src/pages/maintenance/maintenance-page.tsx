import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GaugeCircle,
  RefreshCw,
  Wrench,
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
import { fetchAssets } from "@/services/api/assets";
import { fetchOptimizationPlanTasks, fetchOptimizationPlans } from "@/services/api/optimization";
import { fetchPlanningTasks } from "@/services/api/planning";
import { fetchUnifiedBlockRequirements, fetchUnifiedMaintenance } from "@/services/api/unified";
import type { Asset, PlanningTask, UnifiedBlockRequirement, UnifiedMaintenance } from "@/services/api/types";
import { formatDateTime } from "@/utils/plan-chain";

interface MaintenanceRow {
  maintenance: UnifiedMaintenance;
  asset: Asset | null;
  department: string | null;
  requirements: UnifiedBlockRequirement[];
  planTask: PlanningTask | null;
  taskCount: number;
}

const deptOfAssetType = (type: string | null | undefined): string | null => {
  const value = (type ?? "").toUpperCase();
  if (/SIGNAL|S&T|POINT|CIRCUIT|RELAY|BEACON/.test(value)) return "S&T / Signal";
  if (/OHE|TRACTION|TRD|ELECTR|SUBSTATION/.test(value)) return "Traction / TRD";
  if (/TRACK|BRIDGE|ENGINEERING|CIVIL|TUNNEL|crossing/i.test(value)) return "Engineering";
  if (/LEVEL/.test(value)) return "Engineering / Crossing";
  return null;
};

export function MaintenancePage() {
  const health = useHealth();
  const maintenance = useAsyncResource(fetchUnifiedMaintenance, []);
  const requirements = useAsyncResource(fetchUnifiedBlockRequirements, []);
  const planningTasks = useAsyncResource(fetchPlanningTasks, []);
  const assets = useAsyncResource(fetchAssets, []);
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    maintenance.retry();
    requirements.retry();
    planningTasks.retry();
    assets.retry();
    plans.retry();
    planTasks.retry();
  };

  const rows = useMemo<MaintenanceRow[]>(() => {
    const assetById = new Map((assets.data ?? []).map((a) => [a.id, a]));
    const requirementByMaintId = new Map<number, UnifiedBlockRequirement[]>();
    for (const req of requirements.data ?? []) {
      const list = requirementByMaintId.get(req.maintenance_requirement_id) ?? [];
      list.push(req);
      requirementByMaintId.set(req.maintenance_requirement_id, list);
    }
    const tasksByMaintId = new Map<number, PlanningTask[]>();
    for (const task of planningTasks.data ?? []) {
      const list = tasksByMaintId.get(task.maintenance_requirement_id) ?? [];
      list.push(task);
      tasksByMaintId.set(task.maintenance_requirement_id, list);
    }
    return (maintenance.data ?? []).map((maintenance) => {
      const asset = assetById.get(maintenance.asset_id) ?? null;
      const assetTasks = tasksByMaintId.get(maintenance.id) ?? [];
      return {
        maintenance,
        asset,
        department: deptOfAssetType(asset?.asset_type),
        requirements: requirementByMaintId.get(maintenance.id) ?? [],
        planTask: assetTasks[0] ?? null,
        taskCount: assetTasks.length,
      };
    });
  }, [maintenance.data, assets.data, requirements.data, planningTasks.data]);

  const needsPlanning = rows.filter((row) => row.maintenance.status === "PENDING" || row.maintenance.status === "OPEN").length;
  const hasTask = rows.filter((row) => row.taskCount > 0).length;
  const requiresBlock = rows.filter((row) => row.requirements.some((req) => req.power_block_required || req.traffic_block_required)).length;

  const columns: DataTableColumn<MaintenanceRow>[] = [
    {
      key: "operation",
      header: "Maintenance (operational)",
      render: (row) => (
        <div className="flex max-w-sm flex-col">
          <span className="text-sm font-semibold text-ink">{row.maintenance.maintenance_type}</span>
          <span className="text-xs text-ink-muted">
            {row.asset?.asset_name ?? `Asset #${row.maintenance.asset_id}`}
            {row.department ? ` · ${row.department}` : ""}
          </span>
          <span className="text-2xs text-ink-faint">
            {row.maintenance.description ?? "No description on record"} · {formatDateTime(row.maintenance.planned_date) ?? "no planned date"}
          </span>
        </div>
      ),
    },
    {
      key: "blocks",
      header: "Blocks required",
      render: (row) =>
        row.requirements.length === 0 ? (
          <Badge variant="outline">None derived</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.requirements.map((req) => {
              const kinds: string[] = [];
              if (req.power_block_required) kinds.push("Power");
              if (req.traffic_block_required) kinds.push("Traffic");
              return (
                <Badge key={req.id} variant={kinds.length > 1 ? "warning" : "info"}>
                  {kinds.length > 0 ? kinds.join(" + ") : req.block_type} · {req.required_duration_minutes ?? "?"}m
                </Badge>
              );
            })}
          </div>
        ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => <span className="tabular-nums">{row.maintenance.required_duration_minutes ?? "?"}m</span>,
    },
    {
      key: "workflow",
      header: "Planning progress",
      render: (row) => {
        if (row.taskCount === 0) {
          return <Badge variant="outline">No planning task yet</Badge>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="success">
              <GaugeCircle /> {row.taskCount} task(s)
            </Badge>
            <span className="font-mono text-2xs text-ink-faint">{row.planTask?.task_code}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.maintenance.status} />,
    },
  ];

  const isLoading = maintenance.loading || planningTasks.loading || requirements.loading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Maintenance · Division"
        title="Maintenance"
        description="Everything maintenance work that needs track time — rendered in operational language (asset, department, duration, blocks) rather than raw source IDs. All values come from the unified layer."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Maintenance asks" value={maintenance.data?.length ?? null} icon={Wrench} hint="Unified TMS / TDMS / SMMS maintenance" loading={maintenance.loading} />
        <MetricCard label="Awaiting planning" value={needsPlanning} tone="warning" icon={AlertTriangle} hint="PENDING/OPEN records not yet turned into blocks" loading={isLoading} />
        <MetricCard label="With planning tasks" value={hasTask} tone="success" icon={CheckCircle2} hint="Already promoted into the planning pipeline" loading={isLoading} />
        <MetricCard label="Block-required" value={requiresBlock} tone="info" icon={ClipboardList} hint="Need a power / traffic / integrated block" loading={isLoading} />
      </section>

      {offline ? (
        <ErrorState title="Backend offline" message="The unified maintenance API is unreachable." onRetry={refresh} />
      ) : isLoading ? (
        <LoadingState label="Loading maintenance work" />
      ) : (
        <section className="space-y-4">
          <SectionHeader
            icon={Activity}
            title="Division workfront"
            description={`${rows.length} maintenance record(s) joined to their assets, block requirements and planning tasks.`}
          />
          <DataTable<MaintenanceRow>
            columns={columns}
            rows={rows}
            keyField={(row) => row.maintenance.id}
            loading={false}
            emptyTitle="No maintenance on record"
            emptyDescription="Pending maintenance requests appear here once the source systems are feeding unified data."
          />
        </section>
      )}
    </div>
  );
}