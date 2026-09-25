import {
  CalendarClock,
  Clock,
  Map,
  RefreshCw,
  TrainFront,
} from "lucide-react";
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
  fetchCoaEvents,
  fetchCoaLineOccupancy,
  fetchCoaMovements,
  fetchCoaAvailableWindows,
  fetchCoaSchedules,
  fetchCoaTrains,
} from "@/services/api/coa";
import type {
  CoaAvailableWindow,
  CoaLineOccupancy,
  CoaMovement,
  CoaSchedule,
  OperationalEvent,
  Train,
} from "@/services/api/types";

type TabKey = "trains" | "schedules" | "movements" | "occupancy" | "windows" | "events";

const TABS: { key: TabKey; label: string }[] = [
  { key: "trains", label: "Trains" },
  { key: "schedules", label: "Schedules" },
  { key: "movements", label: "Movements" },
  { key: "occupancy", label: "Line Occupancy" },
  { key: "windows", label: "Available Windows" },
  { key: "events", label: "Operational Events" },
];

const dateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

export function CoaPage() {
  const health = useHealth();
  const trains = useAsyncResource(() => fetchCoaTrains({ limit: 1000 }), []);
  const schedules = useAsyncResource(() => fetchCoaSchedules({ limit: 1000 }), []);
  const movements = useAsyncResource(() => fetchCoaMovements({ limit: 1000 }), []);
  const occupancy = useAsyncResource(() => fetchCoaLineOccupancy({ limit: 1000 }), []);
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 1000 }), []);
  const events = useAsyncResource(() => fetchCoaEvents({ limit: 1000 }), []);
  const [tab, setTab] = useState<TabKey>("trains");

  const offline = health.api === "offline";
  const refresh = () => {
    health.retry();
    trains.retry();
    schedules.retry();
    movements.retry();
    occupancy.retry();
    windows.retry();
    events.retry();
  };

  const trainColumns: DataTableColumn<Train>[] = [
    { key: "train_id", header: "Train", render: (row) => <span className="font-mono text-xs font-medium">{row.train_id}</span> },
    { key: "train_number", header: "Number", render: (row) => row.train_number ?? "—" },
    { key: "train_name", header: "Name", render: (row) => row.train_name ?? "—" },
    { key: "loco", header: "Loco", render: (row) => row.loco_number ?? "—" },
    { key: "direction", header: "Direction", render: (row) => (row.direction ? <Badge variant="outline">{row.direction}</Badge> : "—") },
    {
      key: "schedule_date",
      header: "Schedule Date",
      render: (row) => (row.schedule_date ? new Date(row.schedule_date).toLocaleDateString() : "—"),
    },
  ];

  const scheduleColumns: DataTableColumn<CoaSchedule>[] = [
    { key: "train_id", header: "Train", render: (row) => <span className="font-mono text-xs">{row.train_id}</span> },
    { key: "station_code", header: "Station", render: (row) => <Badge variant="outline">{row.station_code}</Badge> },
    { key: "sequence", header: "Seq", render: (row) => <span className="tabular-nums">{row.sequence_number}</span> },
    {
      key: "arrival",
      header: "Scheduled Arrival",
      render: (row) => <span className="tabular-nums">{row.scheduled_arrival ? new Date(row.scheduled_arrival).toLocaleString() : "—"}</span>,
    },
    {
      key: "departure",
      header: "Scheduled Departure",
      render: (row) => <span className="tabular-nums">{row.scheduled_departure ? new Date(row.scheduled_departure).toLocaleString() : "—"}</span>,
    },
    { key: "line", header: "Line", render: (row) => row.line_number ?? "—" },
  ];

  const movementColumns: DataTableColumn<CoaMovement>[] = [
    { key: "train_id", header: "Train", render: (row) => <span className="font-mono text-xs">{row.train_id}</span> },
    { key: "station_code", header: "Station", render: (row) => <Badge variant="outline">{row.station_code}</Badge> },
    {
      key: "flag",
      header: "Movement",
      render: (row) => (
        <StatusBadge
          status={row.movement_flag === "A" ? "Arrival" : row.movement_flag === "D" ? "Departure" : "Transit"}
          tone={row.movement_flag === "A" ? "info" : row.movement_flag === "D" ? "success" : "warning"}
        />
      ),
    },
    {
      key: "datetime",
      header: "Date Time",
      render: (row) => <span className="tabular-nums">{dateTime(row.movement_datetime)}</span>,
    },
    { key: "line", header: "Line", render: (row) => row.line_number ?? "—" },
  ];

  const occupancyColumns: DataTableColumn<CoaLineOccupancy>[] = [
    { key: "station", header: "Station", render: (row) => <Badge variant="outline">{row.station_code}</Badge> },
    { key: "line", header: "Line", render: (row) => row.line_number },
    {
      key: "start",
      header: "Occupancy Start",
      render: (row) => <span className="tabular-nums">{dateTime(row.occupancy_start)}</span>,
    },
    {
      key: "end",
      header: "Occupancy End",
      render: (row) => <span className="tabular-nums">{row.occupancy_end ? dateTime(row.occupancy_end) : "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.occupancy_status} />,
    },
    { key: "train", header: "Train", render: (row) => (row.train_id ? <span className="font-mono text-xs">{row.train_id}</span> : "—") },
  ];

  const windowColumns: DataTableColumn<CoaAvailableWindow>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "station", header: "Station", render: (row) => <Badge variant="outline">{row.station_code}</Badge> },
    { key: "line", header: "Line", render: (row) => row.line_number },
    {
      key: "window",
      header: "Window Start → End",
      render: (row) => (
        <span className="tabular-nums text-xs">
          {dateTime(row.window_start)} → {dateTime(row.window_end)}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => `${row.duration_minutes}m`,
      className: "tabular-nums",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.window_status} />,
    },
  ];

  const eventColumns: DataTableColumn<OperationalEvent>[] = [
    { key: "event_type", header: "Event", render: (row) => <Badge variant="outline">{row.event_type}</Badge> },
    { key: "train", header: "Train", render: (row) => (row.train_id ? <span className="font-mono text-xs">{row.train_id}</span> : "—") },
    { key: "station", header: "Station", render: (row) => row.station_code ?? "—" },
    {
      key: "datetime",
      header: "Date Time",
      render: (row) => <span className="tabular-nums">{dateTime(row.event_datetime)}</span>,
    },
    { key: "description", header: "Description", render: (row) => <span className="max-w-[28rem] truncate">{row.description ?? "—"}</span> },
  ];

  const IS_LOADING = trains.loading && schedules.loading && movements.loading;
  const ERROR = trains.error ?? schedules.error ?? movements.error;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Source System · Control Office Application"
        title="COA — Train Operations"
        description="Timetable, live D/A/T movements, line occupancy and the operational gaps (available windows) that become block opportunities. Every row comes from GET /api/coa/*."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
            <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      {ERROR ? <ErrorState title="Unable to reach COA data" message={ERROR} onRetry={refresh} /> : null}

      {offline ? null : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Trains", value: trains.data?.length, icon: TrainFront },
            { label: "Schedule Entries", value: schedules.data?.length, icon: CalendarClock },
            { label: "Movements", value: movements.data?.length, icon: TrainFront },
            { label: "Occupancy Records", value: occupancy.data?.length, icon: Map },
            { label: "Available Windows", value: windows.data?.length, icon: Clock },
            { label: "Operational Events", value: events.data?.length, icon: CalendarClock },
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

      {IS_LOADING ? <LoadingState label="Loading COA data…" /> : null}

      {tab === "trains" ? (
        <DataTable
          rows={trains.data ?? []}
          columns={trainColumns}
          keyField={(row) => row.id}
          loading={trains.loading}
          emptyTitle="No trains in horizon"
          emptyDescription="The fleet roster for the schedule horizon is empty."
          toolbar={<SectionHeader icon={TrainFront} title="Train roster" description={`${trains.data?.length ?? 0} trains · GET /api/coa/trains`} />}
        />
      ) : null}

      {tab === "schedules" ? (
        <DataTable
          rows={schedules.data ?? []}
          columns={scheduleColumns}
          keyField={(row) => row.id}
          loading={schedules.loading}
          emptyTitle="No schedule entries"
          emptyDescription="The source timetable for this horizon is empty."
          toolbar={<SectionHeader icon={CalendarClock} title="Schedules" description={`${schedules.data?.length ?? 0} entries · GET /api/coa/schedules`} />}
        />
      ) : null}

      {tab === "movements" ? (
        <DataTable
          rows={movements.data ?? []}
          columns={movementColumns}
          keyField={(row) => row.id}
          loading={movements.loading}
          emptyTitle="No movements"
          emptyDescription="No arrival / departure / transit events recorded."
          toolbar={<SectionHeader icon={TrainFront} title="Movements" description={`${movements.data?.length ?? 0} D/A/T events · GET /api/coa/movements`} />}
        />
      ) : null}

      {tab === "occupancy" ? (
        <DataTable
          rows={occupancy.data ?? []}
          columns={occupancyColumns}
          keyField={(row) => row.id}
          loading={occupancy.loading}
          emptyTitle="No occupancy records"
          emptyDescription="No line-hold records derived from movements."
          toolbar={<SectionHeader icon={Map} title="Line occupancy" description={`${occupancy.data?.length ?? 0} records · GET /api/coa/line-occupancy`} />}
        />
      ) : null}

      {tab === "windows" ? (
        <DataTable
          rows={windows.data ?? []}
          columns={windowColumns}
          keyField={(row) => row.id}
          loading={windows.loading}
          emptyTitle="No available windows"
          emptyDescription="No operational gaps derived from the COA yet."
          toolbar={<SectionHeader icon={Clock} title="Available windows" description={`${windows.data?.length ?? 0} gaps · GET /api/coa/available-windows`} />}
        />
      ) : null}

      {tab === "events" ? (
        <DataTable
          rows={events.data ?? []}
          columns={eventColumns}
          keyField={(row) => row.id}
          loading={events.loading}
          emptyTitle="No operational events"
          emptyDescription="No recorded operational events."
          toolbar={<SectionHeader icon={CalendarClock} title="Operational events" description={`${events.data?.length ?? 0} events · GET /api/coa/events`} />}
        />
      ) : null}
    </div>
  );
}