import {
  ClipboardList,
  ClipboardMinus,
  FileWarning,
  ListChecks,
  Package,
  PlusCircle,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Drawer } from "@/components/common/drawer";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type DepartmentDefinition,
  useDepartmentData,
} from "@/hooks/useDepartmentData";
import { updateAsset } from "@/services/api/assets";
import {
  updateUnifiedDefect,
  updateUnifiedMaintenance,
} from "@/services/api/unified";
import { createTdmsFailure } from "@/services/api/tdms";
import { createTmsDefect } from "@/services/api/tms";
import { createSmmsAlert } from "@/services/api/smms";
import { apiErrorMessage } from "@/services/api/client";
import type {
  Asset,
  PlanningTask,
  UnifiedBlockRequirement,
  UnifiedDefect,
  UnifiedMaintenance,
} from "@/services/api/types";
import { RequestForm } from "./RequestForm";

type TabKey = "overview" | "maintenance" | "defects" | "tasks" | "blocks" | "assets" | "request";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab") as TabKey | null;
  const tab: TabKey =
    rawTab && ["overview", "maintenance", "defects", "tasks", "blocks", "assets", "request"].includes(rawTab)
      ? rawTab
      : "overview";

  const setTab = (newTab: TabKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab === "overview") {
        next.delete("tab");
      } else {
        next.set("tab", newTab);
      }
      return next;
    });
  };

  // Selected Drawer entities
  const [selectedMaintenance, setSelectedMaintenance] = useState<UnifiedMaintenance | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<UnifiedDefect | null>(null);
  const [selectedTask, setSelectedTask] = useState<PlanningTask | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<UnifiedBlockRequirement | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Quick Action States
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New Defect Modal State
  const [showDefectDialog, setShowDefectDialog] = useState(false);
  const [defectAssetId, setDefectAssetId] = useState<number | "">("");
  const [defectCode, setDefectCode] = useState("");
  const [defectDesc, setDefectDesc] = useState("");
  const [defectSeverity, setDefectSeverity] = useState("HIGH");
  const [defectDialogError, setDefectDialogError] = useState<string | null>(null);

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
    const asset = data.rows.assets.find((a) => a.id === assetId);
    if (!asset?.location_id) return `Asset #${assetId}`;
    const location = data.locationById.get(asset.location_id);
    const parts = [
      location?.station_code,
      location?.section_code,
      location?.line_code,
      location ? `KM ${location.km_start ?? "?"}–${location.km_end ?? "?"}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : `Location #${asset.location_id}`;
  };

  const assetName = (assetId: number | null) => {
    if (!assetId) return "—";
    const asset = data.rows.assets.find((a) => a.id === assetId);
    return asset?.asset_name ?? `Asset #${assetId}`;
  };

  // Asset Status Update Handler
  const handleUpdateAssetStatus = async (assetId: number, status: string) => {
    setActionBusy(true);
    setActionMessage(null);
    try {
      const updated = await updateAsset(assetId, { status });
      setSelectedAsset(updated);
      data.retryAll();
      setActionMessage(`Asset status updated to ${status}.`);
    } catch (err) {
      setActionMessage(`Failed to update status: ${apiErrorMessage(err)}`);
    } finally {
      setActionBusy(false);
    }
  };

  // Defect Status Update Handler
  const handleUpdateDefectStatus = async (defectId: number, status: string) => {
    setActionBusy(true);
    setActionMessage(null);
    try {
      const updated = await updateUnifiedDefect(defectId, { status });
      setSelectedDefect(updated);
      data.retryAll();
      setActionMessage(`Defect status updated to ${status}.`);
    } catch (err) {
      setActionMessage(`Failed to update status: ${apiErrorMessage(err)}`);
    } finally {
      setActionBusy(false);
    }
  };

  // Maintenance Status Update Handler
  const handleUpdateMaintenanceStatus = async (maintId: number, status: string) => {
    setActionBusy(true);
    setActionMessage(null);
    try {
      const updated = await updateUnifiedMaintenance(maintId, { status });
      setSelectedMaintenance(updated);
      data.retryAll();
      setActionMessage(`Maintenance status updated to ${status}.`);
    } catch (err) {
      setActionMessage(`Failed to update status: ${apiErrorMessage(err)}`);
    } finally {
      setActionBusy(false);
    }
  };

  // Handle Create New Defect from Dialog
  const handleCreateDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    setDefectDialogError(null);
    if (!defectAssetId) {
      setDefectDialogError("Please select a target asset.");
      return;
    }
    if (!defectCode.trim()) {
      setDefectDialogError("Please enter a defect code.");
      return;
    }

    setActionBusy(true);
    try {
      const assetId = Number(defectAssetId);
      const code = defectCode.trim().toUpperCase();
      const desc = defectDesc.trim() || `Reported by ${definition.title}`;
      const now = new Date().toISOString();

      if (definition.key === "tdms" || definition.key === "engineering") {
        await createTdmsFailure({
          asset_id: assetId,
          failure_code: code,
          failure_description: desc,
          severity: defectSeverity,
          failure_date: now,
          status: "OPEN",
          remarks: `Logged in ${definition.title}`,
        });
      } else if (definition.key === "tms") {
        await createTmsDefect({
          asset_id: assetId,
          defect_code: code,
          defect_description: desc,
          severity: defectSeverity,
          detected_date: now,
          status: "OPEN",
          inspection_id: 1,
          remarks: `Logged in ${definition.title}`,
        });
      } else {
        await createSmmsAlert({
          asset_id: assetId,
          alert_type_code: code,
          cause_code: desc,
          alert_status_code: "OPEN",
          incidence_date_time: now,
          remarks: `Logged in ${definition.title}`,
        });
      }

      setShowDefectDialog(false);
      setDefectCode("");
      setDefectDesc("");
      data.retryAll();
    } catch (err) {
      setDefectDialogError(apiErrorMessage(err));
    } finally {
      setActionBusy(false);
    }
  };

  /* ---------------------- DATA TABLE COLUMNS ---------------------- */

  const maintenanceColumns: DataTableColumn<UnifiedMaintenance>[] = [
    {
      key: "maintenance_type",
      header: "Maintenance",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedMaintenance(row)}
          className="font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline text-left"
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
      key: "block_status",
      header: "Controller Decision",
      render: (row) => {
        const blockReq = data.blockReqByMaintId.get(row.id);
        if (!blockReq) {
          return <span className="text-2xs text-ink-muted">No block req</span>;
        }
        const ctrl = data.getControllerStatusForBlock(blockReq.id);
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={ctrl.status} tone={ctrl.badgeTone} />
            {ctrl.plan ? (
              <span className="font-mono text-3xs text-brand-700">{ctrl.plan.plan_code}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
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
          className="font-medium text-ink underline-offset-2 hover:text-brand-700 hover:underline text-left font-mono text-xs"
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
      render: (row) => (
        <StatusBadge
          status={row.severity}
          tone={row.severity === "HIGH" || row.severity === "CRITICAL" ? "danger" : undefined}
        />
      ),
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
    {
      key: "task_code",
      header: "Task",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedTask(row)}
          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
        >
          {row.task_code}
        </button>
      ),
    },
    { key: "task_type", header: "Type", render: (row) => <Badge variant="outline">{row.task_type}</Badge> },
    { key: "asset", header: "Asset", render: (row) => assetName(row.asset_id) },
    {
      key: "duration",
      header: "Duration",
      render: (row) => formatDuration(row.duration_minutes),
      className: "tabular-nums",
    },
    {
      key: "plan_status",
      header: "Plan & Controller Review",
      render: (row) => {
        const planTask = data.planTaskByTaskId.get(row.id);
        const plan = planTask ? data.planById.get(planTask.block_plan_id) : null;
        const decision = plan ? data.latestDecisionByPlanId.get(plan.id) : null;

        if (decision?.decision === "APPROVED") {
          return <StatusBadge status="APPROVED" tone="success" />;
        }
        if (decision?.decision === "REJECTED" || plan?.status === "REWORK_REQUIRED") {
          return <StatusBadge status="REWORK_REQ" tone="danger" />;
        }
        if (plan) {
          return <StatusBadge status="AWAITING_REVIEW" tone="info" />;
        }
        return <span className="text-2xs text-ink-muted">Awaiting Plan</span>;
      },
    },
    {
      key: "status",
      header: "Task Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const blockColumns: DataTableColumn<UnifiedBlockRequirement>[] = [
    {
      key: "id",
      header: "Block ID",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedBlock(row)}
          className="font-mono text-xs font-bold text-ink underline-offset-2 hover:text-brand-700 hover:underline"
        >
          BR-{row.id}
        </button>
      ),
    },
    { key: "station", header: "Station", render: (row) => <span className="font-mono font-bold text-xs">{row.station_code ?? "—"}</span> },
    { key: "line", header: "Line", render: (row) => <span className="font-mono text-xs text-ink-muted">{row.line_number ?? "—"}</span> },
    { key: "block_type", header: "Type", render: (row) => <BlockTypeIcon label={row.block_type} /> },
    {
      key: "duration",
      header: "Duration",
      render: (row) => formatDuration(row.required_duration_minutes),
      className: "tabular-nums",
    },
    {
      key: "controller_status",
      header: "Controller Decision",
      render: (row) => {
        const ctrl = data.getControllerStatusForBlock(row.id);
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={ctrl.status} tone={ctrl.badgeTone} />
            {ctrl.plan ? (
              <span className="font-mono text-3xs text-brand-700">{ctrl.plan.plan_code}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Requirement Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const assetColumns: DataTableColumn<Asset>[] = [
    {
      key: "source_asset_id",
      header: "Source ID",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedAsset(row)}
          className="font-mono text-xs font-bold text-brand-700 hover:underline"
        >
          {row.source_asset_id}
        </button>
      ),
    },
    { key: "asset_name", header: "Asset Name", render: (row) => row.asset_name ?? "—" },
    { key: "asset_type", header: "Type", render: (row) => <Badge variant="brand">{row.asset_type ?? "—"}</Badge> },
    { key: "location", header: "Location", render: (row) => locationRef(row.id) },
    {
      key: "counts",
      header: "Associated Records",
      render: (row) => {
        const defCount = data.defectsByAssetId.get(row.id)?.length ?? 0;
        const maintCount = data.maintenanceByAssetId.get(row.id)?.length ?? 0;
        const inspCount = data.inspectionsByAssetId.get(row.id)?.length ?? 0;
        return (
          <span className="text-2xs text-ink-muted">
            {defCount} def · {maintCount} maint · {inspCount} insp
          </span>
        );
      },
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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setTab("request")}
              className="bg-brand-600 hover:bg-brand-700 text-white shadow-card"
            >
              <PlusCircle className="size-4 mr-1.5" />
              Raise Block Request
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={data.retryAll}
            >
              <RefreshCw className="size-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        }
      />

      {anyError ? (
        <ErrorState
          title={`Unable to reach ${definition.title} operational data`}
          message={anyError}
          onRetry={data.retryAll}
        />
      ) : null}

      {/* Action Notification Strip */}
      {actionMessage ? (
        <div className="flex items-center justify-between rounded-md border border-brand-500/20 bg-brand-50/50 px-4 py-2.5 text-xs font-medium text-brand-900">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold text-brand-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Department Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-line pb-px overflow-x-auto">
        {[
          { key: "overview" as const, label: "Overview", icon: Target, count: null },
          { key: "maintenance" as const, label: "Maintenance", icon: ClipboardMinus, count: data.counts.maintenance },
          { key: "defects" as const, label: "Defects & Alerts", icon: FileWarning, count: data.counts.defects },
          { key: "tasks" as const, label: "Planning Tasks", icon: ListChecks, count: data.counts.planningTasks },
          { key: "blocks" as const, label: "Block Requirements", icon: ClipboardList, count: data.counts.blockRequirements },
          { key: "assets" as const, label: "Assets", icon: Package, count: data.counts.assets },
          { key: "request" as const, label: "Raise Request", icon: ScrollText, count: null },
        ].map((item) => {
          const isActive = tab === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "border-brand-600 text-brand-700 bg-brand-50/40"
                  : "border-transparent text-ink-muted hover:border-line hover:text-ink"
              }`}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              {item.count !== null ? (
                <span className="rounded-full bg-surface-muted px-1.5 py-0.2 text-3xs font-mono">
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === "overview" ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Assets", value: data.counts.assets, target: "assets" as const },
              { label: "Maintenance", value: data.counts.maintenance, target: "maintenance" as const },
              { label: "Defects & Alerts", value: data.counts.defects, target: "defects" as const },
              { label: "Block Requirements", value: data.counts.blockRequirements, target: "blocks" as const },
              { label: "Planning Tasks", value: data.counts.planningTasks, target: "tasks" as const },
              { label: "Prioritised", value: data.counts.prioritized, target: "tasks" as const },
            ].map((metric) => (
              <button
                key={metric.label}
                type="button"
                onClick={() => setTab(metric.target)}
                className="cursor-pointer rounded-lg border border-line bg-surface-white p-3.5 text-left shadow-card transition-all hover:border-brand-500/50 hover:bg-surface-muted/30"
              >
                <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">{metric.label}</p>
                {data.state.maintenance.loading ? (
                  <p className="mt-1.5 text-2xl font-semibold text-ink tabular-nums">…</p>
                ) : (
                  <p className="mt-1.5 text-2xl font-semibold text-ink tabular-nums">{metric.value}</p>
                )}
              </button>
            ))}
          </section>

          {isLoading ? (
            <LoadingState label={`Loading ${definition.title} operational data…`} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <SectionHeader
                    icon={ClipboardMinus}
                    title="Recent Maintenance Requirements"
                    description="Latest maintenance requirements submitted for block coordination"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setTab("maintenance")}>
                    View all
                  </Button>
                </div>
                <div className="mt-4 divide-y divide-line">
                  {newestMaintenance.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink-muted">No maintenance records logged yet.</p>
                  ) : (
                    newestMaintenance.map((m) => {
                      const blockReq = data.blockReqByMaintId.get(m.id);
                      const ctrl = blockReq ? data.getControllerStatusForBlock(blockReq.id) : null;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-3 cursor-pointer hover:bg-surface-muted/40 px-2 rounded-md transition-colors"
                          onClick={() => setSelectedMaintenance(m)}
                        >
                          <div className="min-w-0 pr-3">
                            <p className="text-xs font-bold text-ink truncate">{m.maintenance_type}</p>
                            <p className="text-3xs text-ink-muted truncate">
                              {assetName(m.asset_id)} · {formatDuration(m.required_duration_minutes)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ctrl ? (
                              <StatusBadge status={ctrl.status} tone={ctrl.badgeTone} />
                            ) : null}
                            <StatusBadge status={m.status} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card flex flex-col justify-between">
                <div>
                  <SectionHeader
                    icon={ScrollText}
                    title="Integrated Section Controller Workflow"
                    description="Every maintenance request enters the operational block chain"
                  />
                  <div className="mt-4 space-y-3">
                    {[
                      { step: 1, title: "1. Department Raises Request", desc: "Select asset, duration, and traffic/power block need." },
                      { step: 2, title: "2. Normalized Requirement Created", desc: "Instantly synchronized to unified railway schema." },
                      { step: 3, title: "3. Planning Task & Window Matching", desc: "Matched against live available windows on AGC-MTJ corridor." },
                      { step: 4, title: "4. Section Controller Approval", desc: "Reviewed in Controller queue; decisions propagate here in real time." },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3 rounded-md border border-line/50 p-2.5 bg-surface-muted/20">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white text-3xs font-bold">
                          {item.step}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-ink">{item.title}</p>
                          <p className="text-3xs text-ink-muted">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-muted">Ready to plan a block?</span>
                  <Button size="sm" onClick={() => setTab("request")}>
                    Submit Request
                  </Button>
                </div>
              </section>
            </div>
          )}
        </>
      ) : null}

      {/* TAB 2: MAINTENANCE */}
      {tab === "maintenance" ? (
        <DataTable
          rows={data.rows.maintenance}
          columns={maintenanceColumns}
          keyField={(row) => row.id}
          loading={data.state.maintenance.loading}
          emptyTitle="No maintenance records"
          emptyDescription="No backend maintenance records match this department yet."
          toolbar={
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={ClipboardMinus}
                title="Department Maintenance Requirements"
                description={`${data.counts.maintenance} operational items loaded from unified database`}
              />
              <Button size="sm" onClick={() => setTab("request")}>
                <PlusCircle className="size-4 mr-1.5" />
                Add Maintenance Request
              </Button>
            </div>
          }
        />
      ) : null}

      {/* TAB 3: DEFECTS */}
      {tab === "defects" ? (
        <DataTable
          rows={data.rows.defects}
          columns={defectColumns}
          keyField={(row) => row.id}
          loading={data.state.defects.loading}
          emptyTitle="No defects or alerts"
          emptyDescription="No backend defects match this department yet."
          toolbar={
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={FileWarning}
                title="Defect & Failure Register"
                description={`${data.counts.defects} defects loaded from unified defect layer`}
              />
              <Button size="sm" onClick={() => setShowDefectDialog(true)}>
                <PlusCircle className="size-4 mr-1.5" />
                Report Defect
              </Button>
            </div>
          }
        />
      ) : null}

      {/* TAB 4: TASKS */}
      {tab === "tasks" ? (
        <DataTable
          rows={data.rows.planningTasks}
          columns={taskColumns}
          keyField={(row) => row.id}
          loading={data.state.planningTasks.loading}
          emptyTitle="No planning tasks"
          emptyDescription="No planning tasks exist for this department's assets."
          toolbar={
            <SectionHeader
              icon={ListChecks}
              title="Planning Tasks"
              description={`${data.counts.planningTasks} tasks scheduled across available windows`}
            />
          }
        />
      ) : null}

      {/* TAB 5: BLOCKS */}
      {tab === "blocks" ? (
        <DataTable
          rows={data.rows.blockRequirements}
          columns={blockColumns}
          keyField={(row) => row.id}
          loading={data.state.blockRequirements.loading}
          emptyTitle="No block requirements"
          emptyDescription="No block requirements exist for this department yet."
          toolbar={
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={ClipboardList}
                title="Operational Block Requirements"
                description={`${data.counts.blockRequirements} block demands reflecting live Controller decisions`}
              />
              <Button size="sm" onClick={() => setTab("request")}>
                <PlusCircle className="size-4 mr-1.5" />
                Request Block
              </Button>
            </div>
          }
        />
      ) : null}

      {/* TAB 6: ASSETS */}
      {tab === "assets" ? (
        <DataTable
          rows={data.rows.assets}
          columns={assetColumns}
          keyField={(row) => row.id}
          loading={data.state.assets.loading}
          emptyTitle="No assets loaded"
          emptyDescription="No backend assets match this department's asset types."
          toolbar={
            <SectionHeader
              icon={Package}
              title="Master Railway Assets"
              description={`${data.counts.assets} registered assets in this department`}
            />
          }
        />
      ) : null}

      {/* TAB 7: REQUEST FORM */}
      {tab === "request" ? (
        <RequestForm
          definition={definition}
          assets={data.rows.assets}
          locationById={data.locationById}
          existingDefects={data.rows.defects}
          onSuccess={() => {
            data.retryAll();
          }}
        />
      ) : null}

      {/* ===================== DRAWERS ===================== */}

      {/* 1. Maintenance Drawer */}
      <Drawer
        open={selectedMaintenance !== null}
        onOpenChange={(open) => !open && setSelectedMaintenance(null)}
        title={selectedMaintenance?.maintenance_type ?? "Maintenance requirement"}
        description={selectedMaintenance ? `Requirement #${selectedMaintenance.id} · Asset ${assetName(selectedMaintenance.asset_id)}` : undefined}
      >
        {selectedMaintenance ? (
          <div className="space-y-4">
            <dl>
              <DetailRow label="Source System" value={<Badge variant="outline">{selectedMaintenance.source_record_type}</Badge>} />
              <DetailRow label="Source Record" value={<span className="font-mono">{selectedMaintenance.source_record_id}</span>} />
              <DetailRow label="Asset" value={assetName(selectedMaintenance.asset_id)} />
              <DetailRow label="Location" value={locationRef(selectedMaintenance.asset_id)} />
              <DetailRow label="Status" value={<StatusBadge status={selectedMaintenance.status} />} />
              <DetailRow label="Required Duration" value={formatDuration(selectedMaintenance.required_duration_minutes)} />
              <DetailRow label="Planned Date" value={dateTime(selectedMaintenance.planned_date)} />
              <DetailRow label="Description" value={selectedMaintenance.description ?? "—"} />
              <DetailRow label="Remarks" value={selectedMaintenance.remarks ?? "—"} />
            </dl>

            {/* Linked Block Requirement & Controller Decision */}
            {data.blockReqByMaintId.get(selectedMaintenance.id) ? (() => {
              const b = data.blockReqByMaintId.get(selectedMaintenance.id)!;
              const ctrl = data.getControllerStatusForBlock(b.id);
              return (
                <div className="rounded-lg border border-line bg-surface-muted/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Linked Block Requirement</span>
                    <span className="font-mono text-xs font-semibold text-brand-700">BR-{b.id}</span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    Station: <strong>{b.station_code}</strong> · Line: <strong>{b.line_number}</strong> · Type: {b.block_type}
                  </div>
                  <div className="pt-2 border-t border-line flex items-center justify-between">
                    <span className="text-2xs font-semibold text-ink-faint">Controller Status:</span>
                    <StatusBadge status={ctrl.status} tone={ctrl.badgeTone} />
                  </div>
                  {ctrl.decision?.remarks ? (
                    <p className="text-2xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                      <strong>Remarks:</strong> {ctrl.decision.remarks}
                    </p>
                  ) : null}
                </div>
              );
            })() : (
              <div className="rounded-lg border border-dashed border-line p-3 text-center">
                <p className="text-xs text-ink-muted mb-2">No block requirement raised yet.</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedMaintenance(null);
                    setTab("request");
                  }}
                >
                  Raise Block for this Maintenance
                </Button>
              </div>
            )}

            {/* Update Status Control */}
            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-xs font-medium text-ink">Update Status:</span>
              <div className="flex gap-1.5">
                {["PLANNED", "IN_PROGRESS", "COMPLETED"].map((st) => (
                  <button
                    key={st}
                    disabled={actionBusy || selectedMaintenance.status === st}
                    onClick={() => handleUpdateMaintenanceStatus(selectedMaintenance.id, st)}
                    className="rounded border border-line px-2 py-1 text-2xs font-semibold hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* 2. Defect Drawer */}
      <Drawer
        open={selectedDefect !== null}
        onOpenChange={(open) => !open && setSelectedDefect(null)}
        title={selectedDefect?.defect_code ?? "Defect / alert"}
        description={selectedDefect ? `Unified record #${selectedDefect.id}` : undefined}
      >
        {selectedDefect ? (
          <div className="space-y-4">
            <dl>
              <DetailRow label="Source" value={<Badge variant="outline">{selectedDefect.source_record_type}</Badge>} />
              <DetailRow label="Defect Code" value={<span className="font-mono font-bold text-xs">{selectedDefect.defect_code}</span>} />
              <DetailRow label="Asset" value={assetName(selectedDefect.asset_id)} />
              <DetailRow label="Location" value={locationRef(selectedDefect.asset_id)} />
              <DetailRow label="Severity" value={<StatusBadge status={selectedDefect.severity} />} />
              <DetailRow label="Status" value={<StatusBadge status={selectedDefect.status} />} />
              <DetailRow label="Detected At" value={dateTime(selectedDefect.detected_at)} />
              <DetailRow label="Rectified At" value={dateTime(selectedDefect.rectified_at)} />
              <DetailRow label="Description" value={selectedDefect.defect_description ?? "—"} />
              <DetailRow label="Remarks" value={selectedDefect.remarks ?? "—"} />
            </dl>

            {/* Quick Action: Raise Maintenance for this defect */}
            <div className="rounded-lg border border-brand-500/20 bg-brand-50/40 p-3 space-y-2">
              <p className="text-xs text-brand-900 font-semibold">Need track intervention?</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelectedDefect(null);
                  setTab("request");
                }}
              >
                Raise Block Request for this Defect
              </Button>
            </div>

            {/* Status Update Control */}
            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-xs font-medium text-ink">Change Status:</span>
              <div className="flex gap-1.5">
                {["OPEN", "IN_PROGRESS", "RECTIFIED"].map((st) => (
                  <button
                    key={st}
                    disabled={actionBusy || selectedDefect.status === st}
                    onClick={() => handleUpdateDefectStatus(selectedDefect.id, st)}
                    className="rounded border border-line px-2 py-1 text-2xs font-semibold hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* 3. Planning Task Drawer */}
      <Drawer
        open={selectedTask !== null}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        title={selectedTask?.task_code ?? "Planning task"}
        description={selectedTask ? `Task #${selectedTask.id}` : undefined}
      >
        {selectedTask ? (() => {
          const planTask = data.planTaskByTaskId.get(selectedTask.id);
          const plan = planTask ? data.planById.get(planTask.block_plan_id) : null;
          const decision = plan ? data.latestDecisionByPlanId.get(plan.id) : null;
          return (
            <div className="space-y-4">
              <dl>
                <DetailRow label="Type" value={<Badge variant="outline">{selectedTask.task_type}</Badge>} />
                <DetailRow label="Task Code" value={<span className="font-mono font-bold text-xs">{selectedTask.task_code}</span>} />
                <DetailRow label="Asset" value={assetName(selectedTask.asset_id)} />
                <DetailRow label="Location" value={selectedTask.location_code ?? locationRef(selectedTask.asset_id)} />
                <DetailRow label="Status" value={<StatusBadge status={selectedTask.status} />} />
                <DetailRow label="Duration" value={formatDuration(selectedTask.duration_minutes)} />
                <DetailRow label="Earliest Start" value={dateTime(selectedTask.earliest_start)} />
                <DetailRow label="Latest End" value={dateTime(selectedTask.latest_end)} />
                <DetailRow label="Description" value={selectedTask.description ?? "—"} />
              </dl>

              {/* Plan Placement & Controller Review Card */}
              {plan ? (
                <div className="rounded-lg border border-line bg-surface-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Assigned Block Plan</span>
                    <span className="font-mono text-xs font-bold text-brand-700">{plan.plan_code}</span>
                  </div>
                  <DetailRow label="Plan Status" value={<StatusBadge status={plan.status} />} />
                  <DetailRow
                    label="Controller Decision"
                    value={
                      decision ? (
                        <StatusBadge
                          status={decision.decision}
                          tone={decision.decision === "APPROVED" ? "success" : "danger"}
                        />
                      ) : (
                        <StatusBadge status="PENDING" tone="info" />
                      )
                    }
                  />
                  {decision?.remarks ? (
                    <DetailRow label="Controller Remarks" value={<span className="text-xs text-rose-700">{decision.remarks}</span>} />
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-ink-muted">Awaiting window allocation and block plan creation.</p>
              )}
            </div>
          );
        })() : null}
      </Drawer>

      {/* 4. Block Requirement Drawer */}
      <Drawer
        open={selectedBlock !== null}
        onOpenChange={(open) => !open && setSelectedBlock(null)}
        title={selectedBlock ? `Block Requirement BR-${selectedBlock.id}` : "Block requirement"}
        description={selectedBlock ? `For maintenance requirement #${selectedBlock.maintenance_requirement_id}` : undefined}
      >
        {selectedBlock ? (() => {
          const ctrl = data.getControllerStatusForBlock(selectedBlock.id);
          return (
            <div className="space-y-4">
              <dl>
                <DetailRow label="Station" value={<span className="font-mono font-bold text-xs">{selectedBlock.station_code ?? "—"}</span>} />
                <DetailRow label="Line" value={<span className="font-mono text-xs">{selectedBlock.line_number ?? "—"}</span>} />
                <DetailRow label="Block Type" value={<BlockTypeIcon label={selectedBlock.block_type} />} />
                <DetailRow label="Required Duration" value={formatDuration(selectedBlock.required_duration_minutes)} />
                <DetailRow label="Preferred Start" value={dateTime(selectedBlock.earliest_start)} />
                <DetailRow label="Preferred End" value={dateTime(selectedBlock.latest_end)} />
                <DetailRow label="Power Block" value={<BooleanPill value={selectedBlock.power_block_required} />} />
                <DetailRow label="Traffic Block" value={<BooleanPill value={selectedBlock.traffic_block_required} />} />
                <DetailRow label="Resource Notes" value={selectedBlock.resource_notes ?? "—"} />
                <DetailRow label="Requirement Status" value={<StatusBadge status={selectedBlock.status} />} />
                <DetailRow label="Remarks" value={selectedBlock.remarks ?? "—"} />
              </dl>

              {/* Section Controller Decision Section */}
              <div className="rounded-lg border border-line bg-surface-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-brand-600" />
                    Operations Controller Status
                  </span>
                  <StatusBadge status={ctrl.status} tone={ctrl.badgeTone} />
                </div>

                {ctrl.plan ? (
                  <div className="space-y-1.5 text-xs text-ink">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Proposed Plan:</span>
                      <strong className="font-mono text-brand-700">{ctrl.plan.plan_code}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Plan Date:</span>
                      <span>{ctrl.plan.plan_date}</span>
                    </div>
                  </div>
                ) : null}

                {ctrl.decision ? (
                  <div className="rounded-md border border-line bg-surface-white p-3 space-y-1 text-xs">
                    <p className="font-semibold text-ink">
                      Decided by: {ctrl.decision.controller_code || "Section Controller"}
                    </p>
                    <p className="text-3xs text-ink-muted">
                      Time: {dateTime(ctrl.decision.decided_at)}
                    </p>
                    {ctrl.decision.remarks ? (
                      <p className="mt-1 pt-1 border-t border-line text-xs leading-relaxed text-ink">
                        <strong>Decision Remarks:</strong> {ctrl.decision.remarks}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted leading-relaxed">
                    This block requirement is active in the planning queue awaiting Controller validation and decision.
                  </p>
                )}
              </div>
            </div>
          );
        })() : null}
      </Drawer>

      {/* 5. Asset Detail Drawer */}
      <Drawer
        open={selectedAsset !== null}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
        title={selectedAsset?.asset_name ?? "Asset details"}
        description={selectedAsset ? `${selectedAsset.source_asset_id} · ${selectedAsset.asset_type}` : undefined}
      >
        {selectedAsset ? (() => {
          const defects = data.defectsByAssetId.get(selectedAsset.id) ?? [];
          const inspections = data.inspectionsByAssetId.get(selectedAsset.id) ?? [];
          const maintenance = data.maintenanceByAssetId.get(selectedAsset.id) ?? [];
          return (
            <div className="space-y-5">
              <dl>
                <DetailRow label="Source Asset ID" value={<span className="font-mono font-bold text-xs">{selectedAsset.source_asset_id}</span>} />
                <DetailRow label="Type" value={<Badge variant="brand">{selectedAsset.asset_type ?? "—"}</Badge>} />
                <DetailRow label="Subtype" value={selectedAsset.asset_subtype ?? "—"} />
                <DetailRow label="Location" value={locationRef(selectedAsset.id)} />
                <DetailRow label="Installed" value={selectedAsset.installation_date ? new Date(selectedAsset.installation_date).toLocaleDateString() : "—"} />
                <DetailRow label="Status" value={<StatusBadge status={selectedAsset.status} />} />
                <DetailRow label="Remarks" value={selectedAsset.remarks ?? "—"} />
              </dl>

              {/* Status Update Control */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface-muted/30">
                <span className="text-xs font-semibold text-ink">Change Status:</span>
                <div className="flex gap-1.5">
                  {["IN_SERVICE", "UNDER_MAINTENANCE", "RESTRICTED"].map((st) => (
                    <button
                      key={st}
                      disabled={actionBusy || selectedAsset.status === st}
                      onClick={() => handleUpdateAssetStatus(selectedAsset.id, st)}
                      className="rounded border border-line px-2 py-1 text-2xs font-semibold hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Action: Raise Request */}
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedAsset(null);
                  setTab("request");
                }}
              >
                Raise Maintenance / Block Request for this Asset
              </Button>

              {/* Associated Defects */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>Associated Defects</span>
                  <Badge variant="outline">{defects.length}</Badge>
                </h5>
                {defects.length === 0 ? (
                  <p className="text-xs text-ink-muted">No defects recorded for this asset.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto divide-y divide-line border border-line rounded-md p-2">
                    {defects.map((d) => (
                      <div key={d.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                        <span className="font-mono font-medium">{d.defect_code}</span>
                        <StatusBadge status={d.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Associated Inspections */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>Inspections History</span>
                  <Badge variant="outline">{inspections.length}</Badge>
                </h5>
                {inspections.length === 0 ? (
                  <p className="text-xs text-ink-muted">No inspection records found.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto divide-y divide-line border border-line rounded-md p-2">
                    {inspections.map((insp) => (
                      <div key={insp.id} className="pt-1.5 first:pt-0 text-xs">
                        <div className="flex justify-between font-medium">
                          <span>{insp.inspection_type}</span>
                          <span className="text-3xs text-ink-muted">{dateTime(insp.inspection_date)}</span>
                        </div>
                        <p className="text-3xs text-ink-faint">{insp.parameter_code}: {insp.parameter_value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Associated Maintenance History */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>Maintenance History</span>
                  <Badge variant="outline">{maintenance.length}</Badge>
                </h5>
                {maintenance.length === 0 ? (
                  <p className="text-xs text-ink-muted">No maintenance recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto divide-y divide-line border border-line rounded-md p-2">
                    {maintenance.map((m) => (
                      <div key={m.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-medium text-ink">{m.maintenance_type}</p>
                          <p className="text-3xs text-ink-muted">{dateTime(m.planned_date)}</p>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })() : null}
      </Drawer>

      {/* Report Defect Dialog */}
      <Dialog open={showDefectDialog} onOpenChange={setShowDefectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Track / Signal Defect</DialogTitle>
            <DialogDescription>
              Record a new defect into {definition.title}. The defect links directly to the asset and can be targeted for maintenance and traffic block planning.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDefect} className="space-y-4 mt-2">
            {defectDialogError ? (
              <p className="text-xs text-danger">{defectDialogError}</p>
            ) : null}

            <div>
              <label className="block text-xs font-semibold text-ink">
                Target Asset <span className="text-danger">*</span>
              </label>
              <select
                value={defectAssetId}
                onChange={(e) => setDefectAssetId(e.target.value ? Number(e.target.value) : "")}
                required
                className="mt-1 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
              >
                <option value="">-- Choose Asset --</option>
                {data.rows.assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_name} ({a.source_asset_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">
                  Defect Code <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEF-WELD-01"
                  value={defectCode}
                  onChange={(e) => setDefectCode(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">
                  Severity
                </label>
                <select
                  value={defectSeverity}
                  onChange={(e) => setDefectSeverity(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Defect Description &amp; Field Observations
              </label>
              <textarea
                rows={3}
                placeholder="Observed defect details, location specifics, and required corrective intervention"
                value={defectDesc}
                onChange={(e) => setDefectDesc(e.target.value)}
                className="mt-1 w-full resize-none rounded-md border border-line-dark bg-surface-white px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setShowDefectDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionBusy}>
                {actionBusy ? "Saving…" : "Save Defect Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}