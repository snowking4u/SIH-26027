import {
  ClipboardList,
  ClipboardMinus,
  FileWarning,
  Info,
  ListChecks,
  MapPin,
  Package,
  RefreshCw,
  ScrollText,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@/utils/cn";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Drawer } from "@/components/common/drawer";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type DepartmentDefinition,
  useDepartmentData,
} from "@/hooks/useDepartmentData";
import type {
  Asset,
  PlanningTask,
  UnifiedBlockRequirement,
  UnifiedDefect,
  UnifiedMaintenance,
} from "@/services/api/types";

type TabKey = "overview" | "maintenance" | "defects" | "tasks" | "blocks" | "assets" | "request";

interface TabDef {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="shrink-0 text-xs font-medium text-ink-faint">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );
}

function BlockTypeIcon({ label }: { label: string | null }) {
  return label === "POWER" ? (
    <Badge variant="ai">Power block</Badge>
  ) : label === "TRAFFIC" ? (
    <Badge variant="info">Traffic block</Badge>
  ) : (
    <Badge variant="outline">{label ?? "Block"}</Badge>
  );
}

function BooleanPill({ value }: { value: boolean }) {
  return value ? <Badge variant="warning">Required</Badge> : <Badge variant="outline">No</Badge>;
}

export function DepartmentWorkspace({ definition }: { definition: DepartmentDefinition }) {
  const data = useDepartmentData(definition);
  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedMaintenance, setSelectedMaintenance] = useState<UnifiedMaintenance | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<UnifiedDefect | null>(null);
  const [selectedTask, setSelectedTask] = useState<PlanningTask | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<UnifiedBlockRequirement | null>(null);

  const tabs: TabDef[] = [
    { key: "overview", label: "Overview", icon: Target },
    { key: "maintenance", label: "Maintenance", icon: ClipboardMinus },
    { key: "defects", label: "Defects & Alerts", icon: FileWarning },
    { key: "tasks", label: "Planning Tasks", icon: ListChecks },
    { key: "blocks", label: "Block Requirements", icon: ClipboardList },
    { key: "assets", label: "Assets", icon: Package },
    { key: "request", label: "Raise Request", icon: ScrollText },
  ];

  const anyError =
    data.state.defects.error ??
    data.state.maintenance.error ??
    data.state.planningTasks.error ??
    data.state.blockRequirements.error;

  const newestMaintenance = useMemo(
    () => [...data.rows.maintenance].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 6),
    [data.rows.maintenance],
  );

  const locationRef = (assetId: number | null) => {
    if (!assetId) return "—";
    const location = data.locationById.get(assetId);
    const parts = [
      location?.station_code,
      location?.section_code,
      location?.line_code,
      location ? `KM ${location.km_start ?? "?"}–${location.km_end ?? "?"}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : `Location #${assetId}`;
  };

  const assetName = (assetId: number | null) => {
    if (!assetId) return "—";
    const asset = data.rows.assets.find((a) => a.id === assetId);
    return asset?.asset_name ?? `Asset #${assetId}`;
  };

  const maintenanceColumns: DataTableColumn<UnifiedMaintenance>[] = [
    {
      key: "maintenance_type",
      header: "Maintenance",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedMaintenance(row)}
          className="font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline"
        >
          {row.maintenance_type}
        </button>
      ),
    },
    { key: "asset", header: "Asset", render: (row) => assetName(row.asset_id) },
    {
      key: "duration",
      header: "Required",
      render: (row) => formatDuration(row.required_duration_minutes),
      className: "tabular-nums",
    },
    {
      key: "planned_date",
      header: "Planned",
      render: (row) =>
        row.planned_date ? (
          <span className="tabular-nums">{new Date(row.planned_date).toLocaleDateString()}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => {
        const priority = data.priorityByMaintenanceId.get(row.id);
        return priority ? <StatusBadge status={priority.priority_band} tone="warning" /> : <span className="text-xs text-ink-faint">Not assessed</span>;
      },
    },
  ];

  const defectColumns: DataTableColumn<UnifiedDefect>[] = [
    {
      key: "code",
      header: "Defect / Alert",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedDefect(row)}
          className="font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline"
        >
          {row.defect_code ?? "—"}
        </button>
      ),
    },
    { key: "source", header: "Source", render: (row) => <Badge variant="outline">{row.source_record_type}</Badge> },
    { key: "asset", header: "Asset", render: (row) => assetName(row.asset_id) },
    {
      key: "severity",
      header: "Severity",
      render: (row) => <StatusBadge status={row.severity} tone={row.severity === "HIGH" || row.severity === "CRITICAL" ? "danger" : undefined} />,
    },
    {
      key: "detected",
      header: "Detected",
      render: (row) => <span className="tabular-nums">{dateTime(row.detected_at)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const taskColumns: DataTableColumn<PlanningTask>[] = [
    { key: "task_code", header: "Task", render: (row) => <span className="font-mono text-xs font-medium">{row.task_code}</span> },
    { key: "task_type", header: "Type", render: (row) => <Badge variant="outline">{row.task_type}</Badge> },
    {
      key: "priority",
      header: "Priority",
      render: (row) => {
        const priority = data.priorityByTask.get(row.id);
        return priority ? <StatusBadge status={priority.priority_band} tone="warning" /> : <span className="text-xs text-ink-faint">Not assessed</span>;
      },
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => formatDuration(row.duration_minutes),
      className: "tabular-nums",
    },
    {
      key: "earliest_start",
      header: "Earliest Start",
      render: (row) => <span className="tabular-nums">{data.timeLabel(row.earliest_start)}</span>,
    },
    {
      key: "latest_end",
      header: "Latest End",
      render: (row) => <span className="tabular-nums">{data.timeLabel(row.latest_end)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const blockColumns: DataTableColumn<UnifiedBlockRequirement>[] = [
    {
      key: "id",
      header: "Block",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedBlock(row)}
          className="font-mono text-xs font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline"
        >
          BR-{row.id}
        </button>
      ),
    },
    { key: "station", header: "Station", render: (row) => row.station_code ?? "—" },
    { key: "line", header: "Line", render: (row) => row.line_number ?? "—" },
    { key: "block_type", header: "Type", render: (row) => <BlockTypeIcon label={row.block_type} /> },
    {
      key: "duration",
      header: "Duration",
      render: (row) => formatDuration(row.required_duration_minutes),
      className: "tabular-nums",
    },
    {
      key: "window",
      header: "Preferred Window",
      render: (row) => (
        <span className="tabular-nums">
          {data.timeLabel(row.earliest_start)} – {data.timeLabel(row.latest_end)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const assetColumns: DataTableColumn<Asset>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "source_asset_id", header: "Source ID", render: (row) => <span className="font-mono text-xs">{row.source_asset_id}</span> },
    { key: "asset_name", header: "Name", render: (row) => row.asset_name ?? "—" },
    { key: "asset_type", header: "Type", render: (row) => <Badge variant="brand">{row.asset_type ?? "—"}</Badge> },
    { key: "subtype", header: "Subtype", render: (row) => row.asset_subtype ?? "—" },
    { key: "location", header: "Location", render: (row) => locationRef(row.location_id) },
    {
      key: "installed",
      header: "Installed",
      render: (row) => (row.installation_date ? new Date(row.installation_date).toLocaleDateString() : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const isLoading =
    data.state.maintenance.loading || data.state.defects.loading || data.state.planningTasks.loading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow={definition.eyebrow}
        title={definition.title}
        description={definition.description}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              data.state.maintenance.retry();
              data.state.defects.retry();
              data.state.planningTasks.retry();
              data.state.blockRequirements.retry();
            }}
          >
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      {anyError ? (
        <ErrorState title={`Unable to reach ${definition.title} data`} message={anyError} onRetry={() => data.state.maintenance.retry()} />
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-navy-950 p-1 shadow-card">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === item.key ? "bg-navy-800 text-white" : "text-navy-400 hover:text-white",
            )}
          >
            <item.icon aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Assets", value: data.counts.assets, tone: "brand" },
              { label: "Maintenance", value: data.counts.maintenance, tone: "warning" },
              { label: "Defects & Alerts", value: data.counts.defects, tone: "danger" },
              { label: "Block Requirements", value: data.counts.blockRequirements, tone: "info" },
              { label: "Planning Tasks", value: data.counts.planningTasks, tone: "success" },
              { label: "Prioritised", value: data.counts.prioritized, tone: "ai" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-lg border border-line bg-surface-white p-3.5 shadow-card">
                <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">{metric.label}</p>
                {data.state.maintenance.loading ? (
                  <p className="mt-1.5 text-2xl font-semibold text-ink tabular-nums">…</p>
                ) : (
                  <p className="mt-1.5 text-2xl font-semibold text-ink tabular-nums">{metric.value}</p>
                )}
              </div>
            ))}
          </section>

          {isLoading ? (
            <LoadingState label={`Loading ${definition.title} data…`} />
          ) : newestMaintenance.length === 0 ? (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
                <SectionHeader icon={ClipboardMinus} title="Latest maintenance requirements" />
                <p className="mt-4 text-sm text-ink-muted">No records available.</p>
              </div>
              <div className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
                <SectionHeader icon={Target} title="Route to a block" />
                <div className="mt-4 space-y-2 text-sm text-ink-muted">
                  <p>Maintenance requirements for this department appear here once backend records exist.</p>
                  <p>Each requirement flows to Planning Tasks, then to Candidate Windows, then to the Controller.</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <DataTable
                  rows={newestMaintenance}
                  columns={maintenanceColumns}
                  keyField={(row) => row.id}
                  loading={data.state.maintenance.loading}
                  emptyTitle="No maintenance records"
                  emptyDescription="No backend records match this department's assets yet."
                  toolbar={<SectionHeader icon={ClipboardMinus} title="Latest maintenance requirements" description={`${data.counts.maintenance} total for this department`} />}
                />
              </div>
              <div className="lg:col-span-2">
                <div className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
                  <SectionHeader icon={Target} title="Route to a block" />
                  <ol className="mt-4 space-y-3">
                    {[
                      { label: "Maintenance Requirement", detail: `${data.counts.maintenance} open on ${data.counts.assets} assets` },
                      { label: "Planning Task", detail: `${data.counts.planningTasks} tasks derived` },
                      { label: "Block Requirement", detail: `${data.counts.blockRequirements} needing a window` },
                      { label: "Candidate Window", detail: "Task ↔ available window matches" },
                      { label: "Controller", detail: "Approves, modifies or rejects" },
                    ].map((step, index) => (
                      <li key={step.label} className="flex items-start gap-3">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-2xs font-semibold text-brand-400">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink">{step.label}</p>
                          <p className="text-xs text-ink-muted">{step.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          )}
        </>
      ) : null}

      {tab === "maintenance" ? (
        <DataTable
          rows={data.rows.maintenance}
          columns={maintenanceColumns}
          keyField={(row) => row.id}
          loading={data.state.maintenance.loading}
          emptyTitle="No maintenance records"
          emptyDescription="No backend maintenance requirements exist for this department's assets yet."
          toolbar={<SectionHeader icon={ClipboardMinus} title="All maintenance requirements" description={`${data.counts.maintenance} records from the unified register`} />}
        />
      ) : null}

      {tab === "defects" ? (
        <DataTable
          rows={data.rows.defects}
          columns={defectColumns}
          keyField={(row) => row.id}
          loading={data.state.defects.loading}
          emptyTitle="No defects or alerts"
          emptyDescription="No backend defect/failure/alert records for this department's assets yet."
          toolbar={<SectionHeader icon={FileWarning} title="Defects, failures & alerts" description={`${data.counts.defects} records from inspections & fault logs`} />}
        />
      ) : null}

      {tab === "tasks" ? (
        <DataTable
          rows={data.rows.planningTasks}
          columns={taskColumns}
          keyField={(row) => row.id}
          loading={data.state.planningTasks.loading}
          emptyTitle="No planning tasks"
          emptyDescription="No backend planning tasks exist for this department yet."
          toolbar={<SectionHeader icon={ListChecks} title="Planning tasks" description={`${data.counts.planningTasks} tasks awaiting a window`} />}
        />
      ) : null}

      {tab === "blocks" ? (
        <DataTable
          rows={data.rows.blockRequirements}
          columns={blockColumns}
          keyField={(row) => row.id}
          loading={data.state.blockRequirements.loading}
          emptyTitle="No block requirements"
          emptyDescription="No backend block requirements exist for this department yet."
          toolbar={<SectionHeader icon={ClipboardList} title="Block requirements" description={`${data.counts.blockRequirements} derived from maintenance requirements`} />}
        />
      ) : null}

      {tab === "assets" ? (
        <DataTable
          rows={data.rows.assets}
          columns={assetColumns}
          keyField={(row) => row.id}
          loading={data.state.assets.loading}
          emptyTitle="No assets loaded"
          emptyDescription="No backend assets match this department's asset types."
          toolbar={<SectionHeader icon={Package} title="Department assets" description={`${data.counts.assets} master assets`} />}
        />
      ) : null}

      {tab === "request" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <RequestForm definition={definition} />
          <div className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
            <SectionHeader
              icon={ScrollText}
              title="How requests reach the plan"
              description="The request form is the origin of the block-planning chain — it becomes a maintenance requirement, then a planning task."
            />
            <ol className="mt-4 space-y-3">
              {[
                { label: "Department raises request", detail: "Asset, location, duration, block need" },
                { label: "Maintenance requirement", detail: "Created in the unified register" },
                { label: "Planning task", detail: "Scheduled against available windows" },
                { label: "Candidate window", detail: "Feasibility checked by the backend" },
                { label: "Controller decision", detail: "Approve / modify / reject" },
              ].map((step, index) => (
                <li key={step.label} className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-2xs font-semibold text-brand-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink">{step.label}</p>
                    <p className="text-xs text-ink-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <Drawer
        open={selectedMaintenance !== null}
        onOpenChange={(open) => !open && setSelectedMaintenance(null)}
        title={selectedMaintenance?.maintenance_type ?? "Maintenance requirement"}
        description={selectedMaintenance ? `Requirement #${selectedMaintenance.id} · Asset ${assetName(selectedMaintenance.asset_id)}` : undefined}
      >
        {selectedMaintenance ? (
          <dl>
            <DetailRow label="Source" value={<Badge variant="outline">{selectedMaintenance.source_record_type}</Badge>} />
            <DetailRow label="Source record" value={<span className="font-mono">{selectedMaintenance.source_record_id}</span>} />
            <DetailRow label="Asset" value={assetName(selectedMaintenance.asset_id)} />
            <DetailRow label="Location" value={locationRef(selectedMaintenance.asset_id)} />
            <DetailRow label="Status" value={<StatusBadge status={selectedMaintenance.status} />} />
            <DetailRow label="Required duration" value={formatDuration(selectedMaintenance.required_duration_minutes)} />
            <DetailRow label="Planned date" value={dateTime(selectedMaintenance.planned_date)} />
            <DetailRow
              label="Priority"
              value={
                data.priorityByMaintenanceId.get(selectedMaintenance.id) ? (
                  <StatusBadge
                    status={data.priorityByMaintenanceId.get(selectedMaintenance.id)!.priority_band}
                    tone="warning"
                  />
                ) : (
                  <span className="text-xs text-ink-faint">Not assessed</span>
                )
              }
            />
            <DetailRow label="Description" value={selectedMaintenance.description ?? "—"} />
            <DetailRow label="Remarks" value={selectedMaintenance.remarks ?? "—"} />
          </dl>
        ) : null}
      </Drawer>

      <Drawer
        open={selectedDefect !== null}
        onOpenChange={(open) => !open && setSelectedDefect(null)}
        title={selectedDefect?.defect_code ?? "Defect / alert"}
        description={selectedDefect ? `Unified record #${selectedDefect.id}` : undefined}
      >
        {selectedDefect ? (
          <dl>
            <DetailRow label="Source" value={<Badge variant="outline">{selectedDefect.source_record_type}</Badge>} />
            <DetailRow label="Source record" value={<span className="font-mono">{selectedDefect.source_record_id}</span>} />
            <DetailRow label="Asset" value={assetName(selectedDefect.asset_id)} />
            <DetailRow label="Location" value={locationRef(selectedDefect.asset_id)} />
            <DetailRow label="Severity" value={<StatusBadge status={selectedDefect.severity} />} />
            <DetailRow label="Status" value={<StatusBadge status={selectedDefect.status} />} />
            <DetailRow label="Detected" value={dateTime(selectedDefect.detected_at)} />
            <DetailRow label="Rectified" value={dateTime(selectedDefect.rectified_at)} />
            <DetailRow label="Description" value={selectedDefect.defect_description ?? "—"} />
            <DetailRow label="Remarks" value={selectedDefect.remarks ?? "—"} />
          </dl>
        ) : null}
      </Drawer>

      <Drawer
        open={selectedTask !== null}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        title={selectedTask?.task_code ?? "Planning task"}
        description={selectedTask ? `Task #${selectedTask.id}` : undefined}
      >
        {selectedTask ? (
          <dl>
            <DetailRow label="Type" value={<Badge variant="outline">{selectedTask.task_type}</Badge>} />
            <DetailRow label="Asset" value={assetName(selectedTask.asset_id)} />
            <DetailRow label="Location" value={selectedTask.location_code ?? locationRef(selectedTask.asset_id)} />
            <DetailRow label="Status" value={<StatusBadge status={selectedTask.status} />} />
            <DetailRow label="Duration" value={formatDuration(selectedTask.duration_minutes)} />
            <DetailRow label="Earliest start" value={dateTime(selectedTask.earliest_start)} />
            <DetailRow label="Latest end" value={dateTime(selectedTask.latest_end)} />
            <DetailRow
              label="Priority assessment"
              value={
                data.priorityByTask.get(selectedTask.id) ? (
                  <StatusBadge status={data.priorityByTask.get(selectedTask.id)!.priority_band} tone="warning" />
                ) : (
                  <span className="text-xs text-ink-faint">Not assessed</span>
                )
              }
            />
            <DetailRow label="Description" value={selectedTask.description ?? "—"} />
          </dl>
        ) : null}
      </Drawer>

      <Drawer
        open={selectedBlock !== null}
        onOpenChange={(open) => !open && setSelectedBlock(null)}
        title={selectedBlock ? `Block requirement BR-${selectedBlock.id}` : "Block requirement"}
        description={selectedBlock ? `For maintenance requirement #${selectedBlock.maintenance_requirement_id}` : undefined}
      >
        {selectedBlock ? (
          <dl>
            <DetailRow label="Station" value={selectedBlock.station_code ?? "—"} />
            <DetailRow label="Line" value={selectedBlock.line_number ?? "—"} />
            <DetailRow label="Block type" value={<BlockTypeIcon label={selectedBlock.block_type} />} />
            <DetailRow label="Duration" value={formatDuration(selectedBlock.required_duration_minutes)} />
            <DetailRow label="Earliest start" value={dateTime(selectedBlock.earliest_start)} />
            <DetailRow label="Latest end" value={dateTime(selectedBlock.latest_end)} />
            <DetailRow label="Power block" value={<BooleanPill value={selectedBlock.power_block_required} />} />
            <DetailRow label="Traffic block" value={<BooleanPill value={selectedBlock.traffic_block_required} />} />
            <DetailRow label="Resource notes" value={selectedBlock.resource_notes ?? "—"} />
            <DetailRow label="Status" value={<StatusBadge status={selectedBlock.status} />} />
            <DetailRow label="Remarks" value={selectedBlock.remarks ?? "—"} />
          </dl>
        ) : null}
      </Drawer>
    </div>
  );
}

const REQUEST_FIELDS: { key: string; label: string; required: boolean; placeholder: string }[] = [
  { key: "asset", label: "Asset", required: true, placeholder: "Track / bridge / signal / OHE asset" },
  { key: "location", label: "Section / Line / KM", required: true, placeholder: "e.g. MTJ–AGC · Dn line · KM 45" },
  { key: "maintenance_type", label: "Maintenance type", required: true, placeholder: "e.g. Through ballast cleaning" },
  { key: "work_description", label: "Work description", required: true, placeholder: "Describe the work to be done" },
  { key: "estimated_duration", label: "Estimated duration", required: true, placeholder: "e.g. 120 minutes" },
  { key: "earliest_time", label: "Earliest start time", required: true, placeholder: "e.g. 23:00" },
  { key: "latest_time", label: "Latest end time", required: true, placeholder: "e.g. 05:00" },
];

function RequestForm({ definition }: { definition: DepartmentDefinition }) {
  return (
    <div className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
      <SectionHeader
        icon={ScrollText}
        title="Raise a maintenance / block request"
        description={`New request for ${definition.title}. Fields shown are the ones this department needs to plan a safe block.`}
      />
      <div className="mt-4 grid gap-3">
        {REQUEST_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="text-xs font-medium text-ink">
              {field.label}
              {field.required ? <span className="text-danger"> *</span> : null}
            </span>
            <input
              type="text"
              placeholder={field.placeholder}
              className="mt-1 w-full rounded-md border border-line-dark bg-surface-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus:outline-none"
            />
          </label>
        ))}
        <div className="mt-1 grid grid-cols-2 gap-3">
          <label className="flex items-center justify-between rounded-md border border-line bg-surface-muted/50 px-3 py-2.5">
            <span className="text-xs font-medium text-ink">Power block required</span>
            <input type="checkbox" className="accent-brand-600" />
          </label>
          <label className="flex items-center justify-between rounded-md border border-line bg-surface-muted/50 px-3 py-2.5">
            <span className="text-xs font-medium text-ink">Traffic block required</span>
            <input type="checkbox" className="accent-brand-600" />
          </label>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-warning/25 bg-warning-light/60 px-4 py-3">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-warning-dark">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Request submission is not yet available from the backend. This form is a visual foundation only — no
            endpoint exists to persist it, so nothing you enter is stored or sent. Once the submission API is ready,
            this button will connect to it.
          </span>
        </p>
      </div>
      <Button className="mt-4 w-full" disabled title="No submission endpoint on the backend yet">
        Submit request
      </Button>
    </div>
  );
}

export function DepartmentHint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed border-line-dark bg-surface-white px-4 py-3 text-xs leading-relaxed text-ink-muted">
      <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}