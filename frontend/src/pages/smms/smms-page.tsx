import { BellRing, RefreshCw, SearchCheck, Wrench } from "lucide-react";
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
import { fetchSmmsAlerts, fetchSmmsInspections, fetchSmmsMaintenance } from "@/services/api/smms";
import type { SmmsAlert, SmmsInspection, SmmsMaintenance } from "@/services/api/types";

type TabKey = "alerts" | "inspections" | "maintenance";
const TABS: { key: TabKey; label: string }[] = [
  { key: "alerts", label: "Alerts" },
  { key: "inspections", label: "Inspections" },
  { key: "maintenance", label: "Maintenance" },
];

const dateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

export function SmmsPage() {
  const health = useHealth();
  const alerts = useAsyncResource(fetchSmmsAlerts, []);
  const inspections = useAsyncResource(fetchSmmsInspections, []);
  const maintenance = useAsyncResource(fetchSmmsMaintenance, []);
  const [tab, setTab] = useState<TabKey>("alerts");

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    alerts.retry();
    inspections.retry();
    maintenance.retry();
  };

  const alertColumns: DataTableColumn<SmmsAlert>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    { key: "type", header: "Alert Type", render: (row) => <Badge variant="outline">{row.alert_type_code}</Badge> },
    {
      key: "feedback",
      header: "Feedback",
      render: (row) => (row.alert_feedback_code ? <Badge variant="info">{row.alert_feedback_code}</Badge> : "—"),
    },
    { key: "cause", header: "Cause", render: (row) => (row.cause_code ? <Badge variant="warning">{row.cause_code}</Badge> : "—") },
    {
      key: "incidence",
      header: "Incidence",
      render: (row) => <span className="tabular-nums">{dateTime(row.incidence_date_time)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.alert_status_code} />,
    },
    {
      key: "maintainer",
      header: "Maintainer",
      render: (row) => (row.maintainer_name ? `${row.maintainer_name} · ${row.maintainer_designation ?? ""}`.trim() : "—"),
    },
  ];

  const inspectionColumns: DataTableColumn<SmmsInspection>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    { key: "type", header: "Type", render: (row) => <Badge variant="outline">{row.inspection_type}</Badge> },
    { key: "date", header: "Date", render: (row) => <span className="tabular-nums">{new Date(row.inspection_date).toLocaleDateString()}</span> },
    { key: "parameter_code", header: "Parameter", render: (row) => <span className="font-mono text-xs">{row.parameter_code}</span> },
    { key: "value", header: "Value", render: (row) => row.parameter_value ?? "—" },
  ];

  const maintenanceColumns: DataTableColumn<SmmsMaintenance>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "asset", header: "Asset", render: (row) => <span className="font-mono text-xs">{row.asset_id}</span> },
    { key: "alert", header: "Alert", render: (row) => (row.alert_id ? <span className="font-mono text-xs">{row.alert_id}</span> : "—") },
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
        eyebrow="Source System · Signalling Telecom (SMMS)"
        title="SMMS — Signal & Telecom Alerts"
        description="Signal and telecom alert records with cause feedback, linked maintenance action items. Read from GET /api/smms/*."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {offline ? (
        <ErrorState title="SMMS data unavailable" message="Backend /health reports offline." onRetry={refresh} />
      ) : alerts.error || inspections.error || maintenance.error ? (
        <ErrorState title="SMMS API error" message={alerts.error ?? inspections.error ?? maintenance.error} onRetry={refresh} />
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

      {!offline && alerts.loading && inspections.loading ? <LoadingState label="Loading SMMS data…" /> : null}

      {tab === "alerts" ? (
        <DataTable
          rows={alerts.data ?? []}
          columns={alertColumns}
          keyField={(row) => row.id}
          loading={alerts.loading}
          emptyTitle="No SMMS alerts"
          emptyDescription="No signal/telecom alert records yet."
          toolbar={<SectionHeader icon={BellRing} title="Signal & telecom alerts" description={`${alerts.data?.length ?? 0} records · GET /api/smms/alerts`} />}
        />
      ) : null}

      {tab === "inspections" ? (
        <DataTable
          rows={inspections.data ?? []}
          columns={inspectionColumns}
          keyField={(row) => row.id}
          loading={inspections.loading}
          emptyTitle="No SMMS inspections"
          emptyDescription="No signal/telecom inspection records yet."
          toolbar={<SectionHeader icon={SearchCheck} title="Inspections" description={`${inspections.data?.length ?? 0} records · GET /api/smms/inspections`} />}
        />
      ) : null}

      {tab === "maintenance" ? (
        <DataTable
          rows={maintenance.data ?? []}
          columns={maintenanceColumns}
          keyField={(row) => row.id}
          loading={maintenance.loading}
          emptyTitle="No SMMS maintenance"
          emptyDescription="No maintenance action items from SMMS yet."
          toolbar={<SectionHeader icon={Wrench} title="SMMS maintenance" description={`${maintenance.data?.length ?? 0} records · GET /api/smms/maintenance`} />}
        />
      ) : null}
    </div>
  );
}