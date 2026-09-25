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
import { fetchTmsDefects, fetchTmsInspections, fetchTmsMaintenance } from "@/services/api/tms";
import type { TmsDefect, TmsInspection, TmsMaintenance } from "@/services/api/types";

type TabKey = "defects" | "inspections" | "maintenance";
const TABS: { key: TabKey; label: string }[] = [
  { key: "defects", label: "Defects" },
  { key: "inspections", label: "Inspections" },
  { key: "maintenance", label: "Maintenance" },
];

const dateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

export function TmsPage() {
  const health = useHealth();
  const defects = useAsyncResource(fetchTmsDefects, []);
  const inspections = useAsyncResource(fetchTmsInspections, []);
  const maintenance = useAsyncResource(fetchTmsMaintenance, []);
  const [tab, setTab] = useState<TabKey>("defects");

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    defects.retry();
    inspections.retry();
    maintenance.retry();
  };

  const defectColumns: DataTableColumn<TmsDefect>[] = [
    { key: "code", header: "Code", render: (row) => <span className="font-mono text-xs">{row.defect_code}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    {
      key: "severity",
      header: "Severity",
      render: (row) => <StatusBadge status={row.severity} tone={["HIGH", "CRITICAL"].includes((row.severity ?? "").toUpperCase()) ? "danger" : undefined} />,
    },
    { key: "desc", header: "Description", render: (row) => <span className="max-w-[26rem] truncate text-xs">{row.defect_description ?? "—"}</span> },
    { key: "detected", header: "Detected", render: (row) => <span className="tabular-nums">{dateTime(row.detected_date)}</span> },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const inspectionColumns: DataTableColumn<TmsInspection>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.inspection_type}</Badge> },
    { key: "date", header: "Date", render: (row) => <span className="tabular-nums">{new Date(row.inspection_date).toLocaleDateString()}</span> },
    { key: "parameter_code", header: "Parameter", render: (row) => <span className="font-mono text-xs">{row.parameter_code}</span> },
    { key: "value", header: "Value", render: (row) => row.parameter_value ?? "—" },
  ];

  const maintenanceColumns: DataTableColumn<TmsMaintenance>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    { key: "defect", header: "Defect", render: (row) => <span className="font-mono text-xs">{row.defect_id}</span> },
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
        eyebrow="Source System · Track (TMS)"
        title="TMS — Track Monitoring System"
        description="Track inspection parameters, detected defects and the maintenance items they generate. Read from GET /api/tms/*."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {offline ? (
        <ErrorState title="TMS data unavailable" message="Backend /health reports offline." onRetry={refresh} />
      ) : defects.error || inspections.error || maintenance.error ? (
        <ErrorState title="TMS API error" message={defects.error ?? inspections.error ?? maintenance.error} onRetry={refresh} />
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

      {!offline && defects.loading && inspections.loading ? <LoadingState label="Loading TMS data…" /> : null}

      {tab === "defects" ? (
        <DataTable
          rows={defects.data ?? []}
          columns={defectColumns}
          keyField={(row) => row.id}
          loading={defects.loading}
          emptyTitle="No TMS defects"
          emptyDescription="No track defect records from TMS yet."
          toolbar={<SectionHeader icon={FileWarning} title="Track defects" description={`${defects.data?.length ?? 0} records · GET /api/tms/defects`} />}
        />
      ) : null}

      {tab === "inspections" ? (
        <DataTable
          rows={inspections.data ?? []}
          columns={inspectionColumns}
          keyField={(row) => row.id}
          loading={inspections.loading}
          emptyTitle="No TMS inspections"
          emptyDescription="No track inspection parameter records yet."
          toolbar={<SectionHeader icon={SearchCheck} title="Inspections" description={`${inspections.data?.length ?? 0} records · GET /api/tms/inspections`} />}
        />
      ) : null}

      {tab === "maintenance" ? (
        <DataTable
          rows={maintenance.data ?? []}
          columns={maintenanceColumns}
          keyField={(row) => row.id}
          loading={maintenance.loading}
          emptyTitle="No TMS maintenance"
          emptyDescription="No maintenance action items from TMS yet."
          toolbar={<SectionHeader icon={Wrench} title="TMS maintenance" description={`${maintenance.data?.length ?? 0} records · GET /api/tms/maintenance`} />}
        />
      ) : null}
    </div>
  );
}