import { ClipboardList, Layers, RefreshCw, Wrench } from "lucide-react";
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
import {
  fetchUnifiedBlockRequirements,
  fetchUnifiedDefects,
  fetchUnifiedMaintenance,
} from "@/services/api/unified";
import type {
  UnifiedBlockRequirement,
  UnifiedDefect,
  UnifiedMaintenance,
} from "@/services/api/types";

type TabKey = "defects" | "maintenance" | "blocks";
const TABS: { key: TabKey; label: string }[] = [
  { key: "defects", label: "Defects & Failures" },
  { key: "maintenance", label: "Maintenance Requirements" },
  { key: "blocks", label: "Block Requirements" },
];

const dateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

const duration = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export function UnifiedPage() {
  const health = useHealth();
  const defects = useAsyncResource(fetchUnifiedDefects, []);
  const maintenance = useAsyncResource(fetchUnifiedMaintenance, []);
  const blocks = useAsyncResource(fetchUnifiedBlockRequirements, []);
  const [tab, setTab] = useState<TabKey>("defects");

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    defects.retry();
    maintenance.retry();
    blocks.retry();
  };

  const defectColumns: DataTableColumn<UnifiedDefect>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "source", header: "Source", render: (row) => <Badge variant="outline">{row.source_record_type}</Badge> },
    { key: "code", header: "Code", render: (row) => <span className="font-mono text-xs">{row.defect_code ?? "—"}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    {
      key: "severity",
      header: "Severity",
      render: (row) => <StatusBadge status={row.severity} tone={["HIGH", "CRITICAL"].includes((row.severity ?? "").toUpperCase()) ? "danger" : undefined} />,
    },
    { key: "detected", header: "Detected", render: (row) => <span className="tabular-nums">{dateTime(row.detected_at)}</span> },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const maintenanceColumns: DataTableColumn<UnifiedMaintenance>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "source", header: "Source", render: (row) => <Badge variant="outline">{row.source_record_type}</Badge> },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.maintenance_type}</Badge> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    {
      key: "duration",
      header: "Required",
      render: (row) => duration(row.required_duration_minutes),
      className: "tabular-nums",
    },
    { key: "planned", header: "Planned", render: (row) => (row.planned_date ? <span className="tabular-nums">{new Date(row.planned_date).toLocaleDateString()}</span> : "—") },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const blockColumns: DataTableColumn<UnifiedBlockRequirement>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "req", header: "Req", render: (row) => <span className="font-mono text-xs">{row.maintenance_requirement_id}</span> },
    { key: "station", header: "Station", render: (row) => row.station_code ?? "—" },
    { key: "line", header: "Line", render: (row) => row.line_number ?? "—" },
    { key: "type", header: "Block Type", render: (row) => <Badge variant="outline">{row.block_type}</Badge> },
    {
      key: "flags",
      header: "Power / Traffic",
      render: (row) => (
        <span className="inline-flex gap-1">
          {row.power_block_required ? <Badge variant="ai">PWR</Badge> : null}
          {row.traffic_block_required ? <Badge variant="info">TRF</Badge> : null}
          {!row.power_block_required && !row.traffic_block_required ? <Badge variant="outline">—</Badge> : null}
        </span>
      ),
    },
    {
      key: "window",
      header: "Preferred Window",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {row.earliest_start ? new Date(row.earliest_start).toLocaleString().split(",")[0] : "—"} → {row.latest_end ? new Date(row.latest_end).toLocaleString().split(",")[0] : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const loading = defects.loading || maintenance.loading || blocks.loading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Unified Layer"
        title="Unified Register"
        description="Source systems normalised into one picture: defects/failures/alerts, the maintenance requirements they generate and the block requirements derived from them. Read from GET /api/unified/*."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {offline ? (
        <ErrorState title="Unified data unavailable" message="Backend /health reports offline." onRetry={refresh} />
      ) : defects.error || maintenance.error || blocks.error ? (
        <ErrorState title="Unified API error" message={defects.error ?? maintenance.error ?? blocks.error} onRetry={refresh} />
      ) : null}

      {offline ? null : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Defects & Failures", value: defects.data?.length, icon: Layers },
            { label: "Maintenance Requirements", value: maintenance.data?.length, icon: Wrench },
            { label: "Block Requirements", value: blocks.data?.length, icon: ClipboardList },
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

      {!offline && loading ? <LoadingState label="Loading unified register…" /> : null}

      {tab === "defects" ? (
        <DataTable
          rows={defects.data ?? []}
          columns={defectColumns}
          keyField={(row) => row.id}
          loading={defects.loading}
          emptyTitle="No unified defects"
          emptyDescription="No defect/failure/alert records in the unified register yet."
          toolbar={<SectionHeader icon={Layers} title="Unified defects & failures" description={`${defects.data?.length ?? 0} records · GET /api/unified/defects`} />}
        />
      ) : null}

      {tab === "maintenance" ? (
        <DataTable
          rows={maintenance.data ?? []}
          columns={maintenanceColumns}
          keyField={(row) => row.id}
          loading={maintenance.loading}
          emptyTitle="No maintenance requirements"
          emptyDescription="No maintenance requirements in the unified register yet."
          toolbar={<SectionHeader icon={Wrench} title="Maintenance requirements" description={`${maintenance.data?.length ?? 0} records · GET /api/unified/maintenance`} />}
        />
      ) : null}

      {tab === "blocks" ? (
        <DataTable
          rows={blocks.data ?? []}
          columns={blockColumns}
          keyField={(row) => row.id}
          loading={blocks.loading}
          emptyTitle="No block requirements"
          emptyDescription="No block requirements derived in the unified register yet."
          toolbar={<SectionHeader icon={ClipboardList} title="Block requirements" description={`${blocks.data?.length ?? 0} records · GET /api/unified/block-requirements`} />}
        />
      ) : null}
    </div>
  );
}