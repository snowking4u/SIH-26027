import { FileWarning, RefreshCw, SearchCheck, Wrench } from "lucide-react";
import { useState } from "react";

import { cn } from "@/utils/cn";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchTdmsFailures, fetchTdmsInspections, fetchTdmsMaintenanceRecords } from "@/services/api/tdms";
import type { TdmsFailure, TdmsInspection, TdmsMaintenance } from "@/services/api/types";

type TabKey = "failures" | "inspections" | "maintenance";
const TABS: { key: TabKey; label: string }[] = [
  { key: "failures", label: "Failures" },
  { key: "inspections", label: "Inspections" },
  { key: "maintenance", label: "Maintenance" },
];

const dateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

export function TdmsPage() {
  const health = useHealth();
  const failures = useAsyncResource(fetchTdmsFailures, []);
  const inspections = useAsyncResource(fetchTdmsInspections, []);
  const maintenance = useAsyncResource(fetchTdmsMaintenanceRecords, []);
  const [tab, setTab] = useState<TabKey>("failures");

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    failures.retry();
    inspections.retry();
    maintenance.retry();
  };

  const failureColumns: DataTableColumn<TdmsFailure>[] = [
    { key: "code", header: "Code", render: (row) => <span className="font-mono text-xs">{row.failure_code}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    {
      key: "severity",
      header: "Severity",
      render: (row) => <StatusBadge status={row.severity} tone={["HIGH", "CRITICAL"].includes((row.severity ?? "").toUpperCase()) ? "danger" : undefined} />,
    },
    { key: "desc", header: "Description", render: (row) => <span className="max-w-[26rem] truncate text-xs">{row.failure_description ?? "—"}</span> },
    { key: "date", header: "Failure Date", render: (row) => <span className="tabular-nums">{dateTime(row.failure_date)}</span> },
    {
      key: "rectified",
      header: "Rectified",
      render: (row) => (row.rectification_date ? <span className="tabular-nums">{dateTime(row.rectification_date)}</span> : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const inspectionColumns: DataTableColumn<TdmsInspection>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.inspection_type}</Badge> },
    { key: "date", header: "Date", render: (row) => <span className="tabular-nums">{new Date(row.inspection_date).toLocaleDateString()}</span> },
    { key: "parameter_code", header: "Parameter", render: (row) => <span className="font-mono text-xs">{row.parameter_code}</span> },
    { key: "value", header: "Value", render: (row) => row.parameter_value ?? "—" },
  ];

  const maintenanceColumns: DataTableColumn<TdmsMaintenance>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    { key: "failure", header: "Failure", render: (row) => (row.failure_id ? <span className="font-mono text-xs">{row.failure_id}</span> : "—") },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.maintenance_type}</Badge> },
    { key: "planned", header: "Planned", render: (row) => (row.planned_date ? <span className="tabular-nums">{dateTime(row.planned_date)}</span> : "—") },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Source System · Structures (TDMS)"
        title="TDMS — Structure & Defect Monitoring"
        description="Structure failure records, inspection parameters and the maintenance items they trigger. Read from GET /api/tdms/*."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {offline ? (
        <ErrorState title="TDMS data unavailable" message="Backend /health reports offline." onRetry={refresh} />
      ) : failures.error || inspections.error || maintenance.error ? (
        <ErrorState title="TDMS API error" message={failures.error ?? inspections.error ?? maintenance.error} onRetry={refresh} />
      ) : null}

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

      {!offline && failures.loading && inspections.loading ? <LoadingState label="Loading TDMS data…" /> : null}

      {tab === "failures" ? (
        <DataTable
          rows={failures.data ?? []}
          columns={failureColumns}
          keyField={(row) => row.id}
          loading={failures.loading}
          emptyTitle="No TDMS failures"
          emptyDescription="No structure failure records from TDMS yet."
          toolbar={<SectionHeader icon={FileWarning} title="Structure failures" description={`${failures.data?.length ?? 0} records · GET /api/tdms/failures`} />}
        />
      ) : null}

      {tab === "inspections" ? (
        <DataTable
          rows={inspections.data ?? []}
          columns={inspectionColumns}
          keyField={(row) => row.id}
          loading={inspections.loading}
          emptyTitle="No TDMS inspections"
          emptyDescription="No structure inspection parameter records yet."
          toolbar={<SectionHeader icon={SearchCheck} title="Inspections" description={`${inspections.data?.length ?? 0} records · GET /api/tdms/inspections`} />}
        />
      ) : null}

      {tab === "maintenance" ? (
        <DataTable
          rows={maintenance.data ?? []}
          columns={maintenanceColumns}
          keyField={(row) => row.id}
          loading={maintenance.loading}
          emptyTitle="No TDMS maintenance"
          emptyDescription="No maintenance action items from TDMS yet."
          toolbar={<SectionHeader icon={Wrench} title="TDMS maintenance" description={`${maintenance.data?.length ?? 0} records · GET /api/tdms/maintenance`} />}
        />
      ) : null}
    </div>
  );
}