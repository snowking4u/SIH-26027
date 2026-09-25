import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Route,
  TrainFront,
  Wrench,
  Diamond,
  MapPin,
  CalendarRange,
  Boxes,
  Blocks,
  GitPullRequest,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Drawer } from "@/components/common/drawer";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useHealth } from "@/hooks/useHealth";
import { fetchAssets } from "@/services/api/assets";
import {
  fetchCoaAvailableWindows,
  fetchCoaLineOccupancy,
  fetchCoaMovements,
  fetchCoaSchedules,
  fetchCoaTrains,
} from "@/services/api/coa";
import { fetchCandidateWindows } from "@/services/api/candidates";
import { fetchLocations } from "@/services/api/locations";
import { fetchOptimizationPlanTasks, fetchOptimizationPlans } from "@/services/api/optimization";
import { fetchPlanningTasks } from "@/services/api/planning";
import { fetchUnifiedBlockRequirements, fetchUnifiedMaintenance } from "@/services/api/unified";
import type {
  Asset,
  BlockPlanTask,
  CandidateWindow,
  CoaAvailableWindow,
  CoaLineOccupancy,
  CoaMovement,
  CoaSchedule,
  Location,
  PlanningTask,
  Train,
  UnifiedBlockRequirement,
  UnifiedMaintenance,
} from "@/services/api/types";

const asKm = (value: string | number | null | undefined): number | null =>
  value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value);

const asDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : value;
};

const asTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : value;
};

const minutesOfDay = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
};

const spanPct = (start: string | null | undefined, end: string | null | undefined): { left: number; width: number } | null => {
  const s = minutesOfDay(start);
  const e = minutesOfDay(end);
  if (s === null) return null;
  const left = 2 + (s / 1440) * 96;
  const width = Math.max(0.4, ((e ?? s) - s) / 1440 * 96);
  return { left, width };
};

const COLOR_CLEAR = "#34d399";
const COLOR_OCCUPIED = "#f59e0b";
const COLOR_BLOCK = "#ef4444";
const COLOR_SELECTED = "#3b82f6";

const STATION_Y = 230;
const RAIL_A_Y = 150;
const RAIL_B_Y = 310;

interface Junction {
  stationCode: string;
  stationName: string;
  km: number;
  location: Location;
  x: number;
  left: number;
  right: number;
  rowA: Location[];
  rowB: Location[];
}

interface Track {
  key: string;
  name: string;
  section: string;
  kmMin: number;
  kmMax: number;
  stations: Location[];
}

interface ActiveTrain {
  train: Train;
  movement: CoaMovement | null;
  number: string;
  name: string | null;
  atStation: string | null;
  flag: string | null;
}

interface PlannedBlock {
  planCode: string;
  task: BlockPlanTask;
  candidate: CandidateWindow;
  window: CoaAvailableWindow | null;
  station: string | null;
  line: string | null;
}

type Selection =
  | { kind: "station"; location: Location }
  | { kind: "train"; train: Train; atStation: string | null }
  | { kind: "planned"; block: PlannedBlock }
  | { kind: "asset"; asset: Asset; location: Location }
  | { kind: "maintenance"; maintenance: UnifiedMaintenance; location: Location }
  | { kind: "block-req"; block: UnifiedBlockRequirement; location: Location }
  | { kind: "task"; task: PlanningTask; location: Location };

export function LiveMapPage() {
  const health = useHealth();
  const locations = useAsyncResource(() => fetchLocations({ limit: 500 }), []);
  const assets = useAsyncResource(() => fetchAssets({ limit: 1000 }), []);
  const windows = useAsyncResource(() => fetchCoaAvailableWindows({ limit: 2000 }), []);
  const planning = useAsyncResource(() => fetchPlanningTasks({ limit: 1000 }), []);
  const maintenance = useAsyncResource(() => fetchUnifiedMaintenance({ limit: 1000 }), []);
  const blocks = useAsyncResource(() => fetchUnifiedBlockRequirements({ limit: 1000 }), []);
  const trains = useAsyncResource(() => fetchCoaTrains({ limit: 1000 }), []);
  const movements = useAsyncResource(() => fetchCoaMovements({ limit: 1000 }), []);
  const occupancy = useAsyncResource(() => fetchCoaLineOccupancy({ limit: 1000 }), []);
  const schedules = useAsyncResource(() => fetchCoaSchedules({ limit: 1000 }), []);
  const candidates = useAsyncResource(() => fetchCandidateWindows({ limit: 2000 }), []);
  const plans = useAsyncResource(fetchOptimizationPlans, []);
  const planTasks = useAsyncResource(fetchOptimizationPlanTasks, []);

  const [selected, setSelected] = useState<Selection | null>(null);
  const [zoom, setZoom] = useState(1);

  const refresh = () => {
    health.retry();
    locations.retry();
    assets.retry();
    trains.retry();
    movements.retry();
    occupancy.retry();
    windows.retry();
    planning.retry();
    maintenance.retry();
    blocks.retry();
    candidates.retry();
    plans.retry();
    planTasks.retry();
  };

  const stationLocations = useMemo(() => {
    const groups = new Map<string, Location[]>();
    for (const location of locations.data ?? []) {
      if (!location.station_code) continue;
      const code = location.station_code.trim();
      if (code === "string" || code.startsWith("SYN") || code.startsWith("Synthet")) continue;
      const list = groups.get(code) ?? [];
      list.push(location);
      groups.set(code, list);
    }
    return Array.from(groups.entries()).sort(
      (a, b) => Math.min(...a[1].map((l) => asKm(l.km_start) ?? 0), 0) - Math.min(...b[1].map((l) => asKm(l.km_start) ?? 0), 0),
    );
  }, [locations.data]);

  const junctions = useMemo<Junction[]>(() => {
    const count = stationLocations.length;
    const junctionStations = stationLocations.map(([stationCode, rows], index) => {
      const sorted = [...rows].sort((a, b) => String(a.line_code).localeCompare(String(b.line_code)));
      const x = count > 1 ? 6 + (index * 88) / (count - 1) : 50;
      const run = (i: number) => sorted.filter((_, idx) => idx % 2 === i);
      const representative = sorted[0];
      const km = Math.min(...sorted.map((l) => asKm(l.km_start) ?? 0), 0);
      return {
        stationCode,
        stationName: representative.station_name ?? "",
        km: Number.isFinite(km) ? km : 0,
        location: representative,
        x,
        left: 0,
        right: 0,
        rowA: run(0),
        rowB: run(1),
      };
    });
    for (let i = 0; i < junctionStations.length; i += 1) {
      const prevX = i > 0 ? junctionStations[i - 1].x : 4;
      const nextX = i < junctionStations.length - 1 ? junctionStations[i + 1].x : 96;
      junctionStations[i].left = i === 0 ? 3 : (prevX + junctionStations[i].x) / 2;
      junctionStations[i].right = i === junctionStations.length - 1 ? 97 : (junctionStations[i].x + nextX) / 2;
    }
    return junctionStations;
  }, [stationLocations]);

  const tracks = useMemo<Track[]>(() => {
    const map = new Map<string, Track>();
    for (const location of locations.data ?? []) {
      const key = location.line_code || `LINE-${location.id}`;
      let track = map.get(key);
      if (!track) {
        track = {
          key,
          name: location.line_name || location.line_code || key,
          section: location.section_name || location.section_code || location.division_name || "operating section",
          kmMin: Number.POSITIVE_INFINITY,
          kmMax: Number.NEGATIVE_INFINITY,
          stations: [],
        };
        map.set(key, track);
      }
      track.stations.push(location);
      const start = asKm(location.km_start);
      const end = asKm(location.km_end);
      if (start !== null && start < track.kmMin) track.kmMin = start;
      if (end !== null && end > track.kmMax) track.kmMax = end;
    }
    for (const track of map.values()) {
      if (!Number.isFinite(track.kmMin)) track.kmMin = 0;
      if (!Number.isFinite(track.kmMax)) track.kmMax = track.kmMin + 1;
      track.stations.sort((a, b) => (asKm(a.km_start) ?? 0) - (asKm(b.km_start) ?? 0));
    }
    return Array.from(map.values());
  }, [locations.data]);

  const activeTrains = useMemo<ActiveTrain[]>(() => {
    const latestByTrain = new Map<number, CoaMovement>();
    for (const mv of movements.data ?? []) {
      const prev = latestByTrain.get(mv.train_id);
      if (!prev || String(mv.movement_datetime) > String(prev.movement_datetime)) {
        latestByTrain.set(mv.train_id, mv);
      }
    }
    return (trains.data ?? [])
      .filter((t) => t.train_number && !t.train_number.startsWith("SYN") && !t.train_id.startsWith("SYN"))
      .map((train) => {
        const movement = latestByTrain.get(train.id) ?? null;
        const atStation = movement ? movement.station_code : null;
        return {
          train,
          movement,
          number: train.train_number ?? `${train.train_id}`,
          name: train.train_name ?? null,
          atStation,
          flag: movement ? movement.movement_flag : null,
        };
      })
      .filter((train) => train.atStation != null && train.atStation !== "string" && !train.atStation.startsWith("SYN"));
  }, [trains.data, movements.data]);

  const plannedBlocks = useMemo<PlannedBlock[]>(() => {
    const candidateById = new Map((candidates.data ?? []).map((c) => [c.id, c]));
    const windowById = new Map((windows.data ?? []).map((w) => [w.id, w]));
    const planByTask = new Map((plans.data ?? []).map((p) => [p.id, p]));
    return (planTasks.data ?? []).flatMap((task) => {
      const candidate = task.candidate_block_window_id != null ? candidateById.get(task.candidate_block_window_id) ?? null : null;
      const window = candidate ? windowById.get(candidate.available_window_id) ?? null : null;
      const planCode = planByTask.get(task.block_plan_id)?.plan_code ?? `PLAN#${task.block_plan_id}`;
      const station = window?.station_code ?? null;
      const line = window?.line_number ?? null;
      if (!candidate || !station || !line) return [];
      return [{ planCode, task, candidate, window, station, line }];
    });
  }, [planTasks.data, candidates.data, windows.data, plans.data]);

  const occupiedLines = useMemo(() => new Set((occupancy.data ?? []).map((row) => row.line_number)), [occupancy.data]);

  const stationDetail = (loc: Location) => ({
    assets: (assets.data ?? []).filter((a) => a.location_id === loc.id),
    maintenance: (maintenance.data ?? []).filter((m) =>
      (assets.data ?? []).some((a) => a.id === m.asset_id && a.location_id === loc.id),
    ),
    windows: (windows.data ?? []).filter((w) => w.station_code === loc.station_code),
    tasks: (planning.data ?? []).filter((t) => t.location_code === loc.station_code),
    blocks: (blocks.data ?? []).filter((b) => b.station_code === loc.station_code),
  });

  const trainsAt = (stationCode: string | null): ActiveTrain[] =>
    stationCode ? activeTrains.filter((train) => train.atStation === stationCode) : [];

  const assetColumns: DataTableColumn<Asset>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "type", header: "Type", render: (row) => row.asset_type ?? "-" },
    { key: "name", header: "Asset", render: (row) => row.asset_name ?? "-" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status ?? "UNKNOWN"} /> },
  ];

  const windowColumns: DataTableColumn<CoaAvailableWindow>[] = [
    { key: "line", header: "Line", render: (row) => row.line_number },
    { key: "window", header: "COA window", render: (row) => `${asTime(row.window_start)}–${asTime(row.window_end)} · ${asDate(row.window_start)}` },
    { key: "duration", header: "Duration", render: (row) => `${row.duration_minutes}m` },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.window_status ?? "UNKNOWN"} /> },
  ];

  const taskColumns: DataTableColumn<PlanningTask>[] = [
    { key: "code", header: "Code", render: (row) => <span className="font-mono text-xs">{row.task_code}</span> },
    { key: "type", header: "Type", render: (row) => row.task_type ?? "-" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status ?? "UNKNOWN"} /> },
    { key: "window", header: "Earliest → latest", render: (row) => `${asTime(row.earliest_start)} → ${asTime(row.latest_end)}` },
  ];

  const blockColumns: DataTableColumn<UnifiedBlockRequirement>[] = [
    { key: "type", header: "Type", render: (row) => row.block_type ?? "-" },
    { key: "power", header: "Power", render: (row) => (row.power_block_required ? "Yes" : "No") },
    { key: "traffic", header: "Traffic", render: (row) => (row.traffic_block_required ? "Yes" : "No") },
    { key: "duration", header: "Duration", render: (row) => `${row.required_duration_minutes ?? "?"}m` },
  ];

  const maintenanceColumns: DataTableColumn<UnifiedMaintenance>[] = [
    { key: "when", header: "Planned", render: (row) => asDate(row.planned_date) },
    { key: "type", header: "Type", render: (row) => row.maintenance_type ?? "-" },
    { key: "duration", header: "Duration", render: (row) => `${row.required_duration_minutes ?? "?"}m` },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status ?? "UNKNOWN"} /> },
  ];

  const occupancyColumns: DataTableColumn<CoaLineOccupancy>[] = [
    { key: "line", header: "Line", render: (row) => row.line_number },
    { key: "station", header: "Station", render: (row) => <Badge variant="outline">{row.station_code}</Badge> },
    { key: "when", header: "Hold", render: (row) => `${asTime(row.occupancy_start)} → ${asTime(row.occupancy_end)}` },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.occupancy_status} /> },
  ];

  const legend = [
    { color: COLOR_CLEAR, label: "Clear" },
    { color: COLOR_OCCUPIED, label: "Occupied" },
    { color: COLOR_BLOCK, label: "Maintenance block" },
    { color: COLOR_SELECTED, label: "Selected" },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Operations Control · Live Map"
        title="Live Map — Railway Network"
        description="All tracks, stations, trains, assets and blocks share one corridor canvas. Station nodes sit on the rails; the planned block overlays its exact track section. Schematic, not geographic scale."
        actions={
          <>
            <Badge variant="ai">DEMO / SYNTHETIC REPLAY</Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
              <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
            </Button>
          </>
        }
      />

      <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
        <SectionHeader
          icon={Route}
          title="Unified corridor"
          description={`${junctions.length} station junction(s) · ${tracks.length} line section(s) · one shared coordinate space`}
          right={
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.min(3, z * 1.25))} title="Zoom in">
                <ZoomIn />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} title="Zoom out">
                <ZoomOut />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setZoom(1)} title="Fit view">
                <Maximize2 />
              </Button>
            </div>
          }
        />

        <div className="mt-4 flex flex-wrap gap-3 border-b border-line pb-3">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-2xs text-ink-muted">
              <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-navy-800 bg-gradient-to-b from-navy-900 to-navy-950 shadow-inner">
          <div className="transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}>
            <CorridorCanvas
              junctions={junctions}
              occupiedLines={occupiedLines}
              activeTrains={activeTrains}
              plannedBlocks={plannedBlocks}
              assets={assets.data ?? []}
              maintenance={maintenance.data ?? []}
              blocks={blocks.data ?? []}
              planning={planning.data ?? []}
              onSelect={setSelected}
            />
          </div>
        </div>

        {junctions.length === 0 ? (
          <p className="mt-4 text-sm text-ink-faint">Backend returned no locations — nothing to draw.</p>
        ) : null}

        <p className="mt-4 text-xs text-ink-faint">
          Train positions reflect the latest recorded COA movement per train; trains without a mappable movement are not
          drawn. Rail colour reflects recorded COA line-occupancy state; the red track segment is the validated planning
          block. Schematic, not geographic scale.
        </p>
      </section>

      <CorridorTimeline
        lines={tracks}
        plannedBlocks={plannedBlocks}
        windows={windows.data ?? []}
        candidates={candidates.data ?? []}
        occupancy={occupancy.data ?? []}
        onSelect={setSelected}
      />

      <SelectionDrawer
        selection={selected}
        onClose={() => setSelected(null)}
        onSelectStation={(loc) => setSelected({ kind: "station", location: loc })}
        stationDetail={stationDetail}
        assetColumns={assetColumns}
        windowColumns={windowColumns}
        taskColumns={taskColumns}
        blockColumns={blockColumns}
        maintenanceColumns={maintenanceColumns}
        occupancyColumns={occupancyColumns}
        trainsAt={trainsAt}
        occupancy={occupancy.data ?? []}
        schedules={schedules.data ?? []}
      />
    </div>
  );
}

interface CorridorCanvasProps {
  junctions: Junction[];
  occupiedLines: Set<string | null | undefined>;
  activeTrains: ActiveTrain[];
  plannedBlocks: PlannedBlock[];
  assets: Asset[];
  maintenance: UnifiedMaintenance[];
  blocks: UnifiedBlockRequirement[];
  planning: PlanningTask[];
  onSelect: (selection: Selection) => void;
}

function CorridorCanvas({
  junctions,
  occupiedLines,
  activeTrains,
  plannedBlocks,
  assets,
  maintenance,
  blocks,
  planning,
  onSelect,
}: CorridorCanvasProps) {
  const lineLabel = (row: Location[]): string | null => {
    if (row.length === 0) return null;
    const first = row[0];
    return `${first.line_code}`;
  };

  const rowTracks = (junction: Junction, row: Location[]) => {
    const sections: { line: string; kmMin: number; kmMax: number; left: number; right: number; color: string }[] = [];
    for (let i = 0; i < row.length; i += 1) {
      const loc = row[i];
      const key = loc.line_code ?? "";
      const left = i === 0 ? junction.left : junction.x;
      const right = i === row.length - 1 ? junction.right : junction.x;
      const color = occupiedLines.has(key) ? COLOR_OCCUPIED : COLOR_CLEAR;
      sections.push({ line: key, kmMin: asKm(loc.km_start) ?? 0, kmMax: asKm(loc.km_end) ?? 0, left, right, color });
    }
    return sections;
  };

  const spanStyle = (left: number, right: number, top: number, height: number, background: string, extra?: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: `${left}%`,
    width: `${Math.max(0.2, right - left)}%`,
    top,
    height,
    borderRadius: 4,
    background,
    ...extra,
  });

  return (
    <div className="relative w-full overflow-x-auto pb-1" style={{ height: 470, minWidth: Math.max(1200, junctions.length * 150) }}>
      {/* rail bed */}
      {junctions.length > 0 ? (
        <>
          {[RAIL_A_Y, RAIL_B_Y].map((y) => (
            <div
              key={y}
              className="absolute left-[2%] right-[2%]"
              style={{ top: y - 4, height: 10, borderRadius: 8, background: "rgba(95,122,168,0.4)" }}
              aria-hidden="true"
            />
          ))}
        </>
      ) : null}

      {/* line sections on both rails */}
      {junctions.map((junction) =>
        [RAIL_A_Y, RAIL_B_Y].map((y, rowIndex) => {
          const row = rowIndex === 0 ? junction.rowA : junction.rowB;
          return rowTracks(junction, row).map((section) => (
            <div
              key={`${junction.stationCode}-${y}-${section.line}`}
              style={spanStyle(section.left, section.right, y - 2.5, 9, section.color, { border: "1px solid rgba(11,20,36,0.6)" })}
              title={`${section.line} · km ${section.kmMin.toFixed(0)}–${section.kmMax.toFixed(0)} · ${occupiedLines.has(section.line) ? "OCCUPIED" : "CLEAR"}`}
            />
          ));
        }),
      )}

      {/* junction connectors + station nodes */}
      {junctions.map((junction) => (
        <div key={junction.stationCode} className="absolute -translate-x-1/2" style={{ left: `${junction.x}%`, top: 0 }}>
          {/* vertical tie between the two rails */}
          <div
            className="absolute"
            style={{ left: -2, top: RAIL_A_Y + 5, bottom: undefined, width: 4, height: RAIL_B_Y - RAIL_A_Y - 10, background: "#b6c6e2", borderRadius: 2, opacity: 0.9 }}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => onSelect({ kind: "station", location: junction.location })}
            className="group absolute flex flex-col items-center"
            style={{ left: 0, top: STATION_Y - 24, zIndex: 10 }}
            title={`${junction.stationName ? junction.stationName + ' (' + junction.stationCode + ')' : junction.stationCode} · km ${junction.km.toFixed(0)}`}
          >
            <span
              className="block size-8 rounded-full border-4 border-navy-900 bg-brand-500 shadow-[0_0_18px_rgba(59,130,246,0.55)] transition-transform group-hover:scale-110"
              aria-hidden="true"
            />
            <span className="mx-auto mt-1 whitespace-nowrap font-mono text-[11px] font-extrabold tracking-wider text-white bg-navy-900/90 px-2 py-0.5 rounded border border-navy-700 shadow-sm">{junction.stationCode}</span>
            <span className="mx-auto whitespace-nowrap font-mono text-[9px] tabular-nums text-navy-400">km {junction.km.toFixed(0)}</span>
          </button>

          {/* line codes per rail */}
          {[
            { row: junction.rowA, y: RAIL_A_Y + 14, offset: 10 },
            { row: junction.rowB, y: RAIL_B_Y + 14, offset: 10 },
          ].map(({ row, y }) => {
            const label = lineLabel(row);
            if (!label) return null;
            return (
              <span
                key={`${junction.stationCode}-${y}`}
                className="whitespace-nowrap font-mono text-[9px] text-navy-400"
                style={{ position: "absolute", left: 6, top: y, transform: "translateY(-4px)" }}
              >
                {label}
              </span>
            );
          })}

          {/* trains on the rail */}
          {(() => {
            const here = activeTrains.filter((t) => t.atStation === junction.stationCode);
            if (here.length === 0) return null;
            return (
              <div className="absolute flex flex-col gap-1 items-center" style={{ left: -59, top: RAIL_A_Y - 75, width: 118, zIndex: 20 }}>
                {here.map((train) => (
                  <button
                    key={train.train.id}
                    type="button"
                    onClick={() => onSelect({ kind: "train", train: train.train, atStation: junction.stationCode })}
                    className="flex items-center gap-1.5 rounded-md border border-brand-400/50 bg-navy-900/95 px-2 py-0.5 shadow-lg backdrop-blur-md transition-all hover:border-brand-300 hover:scale-105"
                    title={`Train ${train.number} (${train.name || ''}) — latest COA movement at ${junction.stationCode}`}
                  >
                    <TrainGlyph flag={train.flag} />
                    <span className="font-mono text-[11px] font-bold text-brand-300">{train.number}</span>
                    <span className="text-[9px] font-bold text-navy-300" aria-hidden="true">
                      {train.flag === "D" ? "→" : train.flag === "A" ? "←" : "↔"}
                    </span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      ))}

      {/* planned block overlay — exactly on the owning rail section */}
      {plannedBlocks.map((block) => {
        const junction = junctions.find((j) => j.stationCode === block.station);
        if (!junction) return null;
        const onRowA = junction.rowA.some((l) => l.line_code === block.line);
        const y = onRowA ? RAIL_A_Y : RAIL_B_Y;
        const left = Math.max(junction.left, junction.x - 16);
        const right = Math.min(junction.right, junction.x + 16);
        return (
          <button
            key={`${block.planCode}-${block.task.id}`}
            type="button"
            onClick={() => onSelect({ kind: "planned", block })}
            className="flex items-center justify-center rounded-md px-2 text-[9px] font-bold text-white shadow-[0_0_14px_rgba(239,68,68,0.55)] transition-transform hover:scale-[1.02]"
            style={spanStyle(left, right, y - 14, 28, "rgba(239,68,68,0.85)", { border: "1px solid #fca5a5" })}
            title={`${block.planCode} · ${block.line} at ${block.station} · ${asTime(block.task.planned_start)}–${asTime(block.task.planned_end)}`}
          >
            <span className="text-center leading-tight">
              BLOCK
              <br />
              {asTime(block.task.planned_start)}–{asTime(block.task.planned_end)}
              <br />
              {block.planCode}
            </span>
          </button>
        );
      })}

      {/* yard chips below the rails: assets / maintenance / blocks / tasks */}
      {junctions.map((junction) => {
        const detail = {
          assets: assets.filter((a) => a.location_id === junction.location.id),
          maintenance: maintenance.filter((m) => assets.some((a) => a.id === m.asset_id && a.location_id === junction.location.id)),
          blocks: blocks.filter((b) => b.station_code === junction.stationCode),
          tasks: planning.filter((t) => t.location_code === junction.stationCode),
        };
        return (
          <div
            key={`yard-${junction.stationCode}`}
            className="absolute flex w-max flex-wrap items-center justify-center gap-1"
            style={{ left: 0, top: 364, transform: "translateX(-50%)" }}
          >
            {detail.assets.length > 0 ? (
              <button
                type="button"
                onClick={() => onSelect({ kind: "asset", asset: detail.assets[0], location: junction.location })}
                className="inline-flex items-center gap-1 rounded-md border border-ai/50 bg-navy-800 px-1.5 py-0.5 text-[9px] font-semibold text-navy-300 hover:bg-navy-700"
                title={`Assets at ${junction.stationCode} (${detail.assets.length})`}
              >
                <Boxes className="size-2.5 text-ai" /> {detail.assets.length}
              </button>
            ) : null}
            {detail.maintenance.length > 0 ? (
              <button
                type="button"
                onClick={() => onSelect({ kind: "maintenance", maintenance: detail.maintenance[0], location: junction.location })}
                className="inline-flex items-center gap-1 rounded-md border border-info/50 bg-navy-800 px-1.5 py-0.5 text-[9px] font-semibold text-navy-300 hover:bg-navy-700"
                title={`Maintenance at ${junction.stationCode} (${detail.maintenance.length})`}
              >
                <Wrench className="size-2.5 text-info" /> {detail.maintenance.length}
              </button>
            ) : null}
            {detail.blocks.length > 0 ? (
              <button
                type="button"
                onClick={() => onSelect({ kind: "block-req", block: detail.blocks[0], location: junction.location })}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-navy-800 px-1.5 py-0.5 text-[9px] font-semibold text-navy-300 hover:bg-navy-700"
                title={`Block requirements at ${junction.stationCode} (${detail.blocks.length})`}
              >
                <Diamond className="size-2.5 text-amber-500" /> {detail.blocks.length}
              </button>
            ) : null}
            {detail.tasks.length > 0 ? (
              <button
                type="button"
                onClick={() => onSelect({ kind: "task", task: detail.tasks[0], location: junction.location })}
                className="inline-flex items-center gap-1 rounded-md border border-cyan-500/50 bg-navy-800 px-1.5 py-0.5 text-[9px] font-semibold text-navy-300 hover:bg-navy-700"
                title={`Planning tasks at ${junction.stationCode} (${detail.tasks.length})`}
              >
                <GitPullRequest className="size-2.5 text-cyan-500" /> {detail.tasks.length}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface CorridorTimelineProps {
  lines: Track[];
  plannedBlocks: PlannedBlock[];
  windows: CoaAvailableWindow[];
  candidates: CandidateWindow[];
  occupancy: CoaLineOccupancy[];
  onSelect: (selection: Selection) => void;
}

function CorridorTimeline({ lines, plannedBlocks, windows, candidates, occupancy, onSelect }: CorridorTimelineProps) {
  const candidateWindowsOnTrack = useMemo(() => {
    const windowById = new Map(windows.map((w) => [w.id, w]));
    return candidates
      .map((candidate) => ({ candidate, window: windowById.get(candidate.available_window_id) ?? null }))
      .filter((row) => row.window != null);
  }, [candidates, windows]);

  return (
    <section className="rounded-lg border border-line bg-surface-white p-5 shadow-card">
      <SectionHeader
        icon={CalendarRange}
        title="Daily timeline"
        description="One shared 00:00 → 24:00 time axis. Each line section shows its recorded occupancy, available windows, candidates and the planned block."
        right={<Badge variant="outline">00:00 → 24:00</Badge>}
      />
      <div className="mt-4 space-y-1">
        <div className="relative h-5">
          {[0, 6, 12, 18, 24].map((hour) => (
            <span
              key={hour}
              className="absolute border-l border-navy-400/60 pl-1.5 font-mono text-[9px] text-navy-400"
              style={{ left: `${(hour / 24) * 96}%` }}
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        {lines.filter((line) => line.key !== "string" && !line.key.startsWith("SYN") && !line.name.startsWith("Synthet")).slice(0, 10).map((line) => {
          const occupancyOnLine = occupancy.filter((row) => row.line_number === line.key);
          const windowsOnLine = windows.filter((row) => row.line_number === line.key);
          const plannedOnLine = plannedBlocks.filter((block) => block.line === line.key);
          return (
            <div key={line.key} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
              <span className="truncate font-mono text-[9px] text-navy-500">{line.key}</span>
              <div className="relative h-4">
                {windowsOnLine.map((window) => {
                  const span = spanPct(window.window_start, window.window_end);
                  if (!span) return null;
                  return (
                    <div
                      key={window.id}
                      className="absolute top-0 h-1.5 rounded-sm border border-emerald-900/60 bg-emerald-500/80"
                      style={{ left: `${span.left}%`, width: `${span.width}%` }}
                      title={`Available window ${asTime(window.window_start)}–${asTime(window.window_end)} · ${window.duration_minutes}m`}
                    />
                  );
                })}
                {candidateWindowsOnTrack
                  .filter((row) => row.window?.line_number === line.key)
                  .map((row) => {
                    const span = spanPct(row.candidate.candidate_start, row.candidate.candidate_end);
                    if (!span) return null;
                    return (
                      <div
                        key={row.candidate.id}
                        className="absolute top-0 h-1.5 rounded-sm bg-ai/80"
                        style={{ left: `${span.left}%`, width: `${span.width}%` }}
                        title={`Candidate ${row.candidate.feasibility_status} · ${asTime(row.candidate.candidate_start)}–${asTime(row.candidate.candidate_end)}`}
                      />
                    );
                  })}
                {occupancyOnLine.slice(0, 24).map((row) => {
                  const span = spanPct(row.occupancy_start, row.occupancy_end);
                  if (!span) return null;
                  return (
                    <div
                      key={row.id}
                      className="absolute h-1 rounded-sm bg-amber-500"
                      style={{ left: `${span.left}%`, width: `${span.width}%`, top: 10 }}
                      title={`Occupancy T${row.train_id ?? "?"} ${asTime(row.occupancy_start)}–${asTime(row.occupancy_end)}`}
                    />
                  );
                })}
                {plannedOnLine.map((block) => {
                  const span = spanPct(block.task.planned_start, block.task.planned_end);
                  if (!span) return null;
                  return (
                    <button
                      key={`${block.planCode}-${block.task.id}`}
                      type="button"
                      onClick={() => onSelect({ kind: "planned", block })}
                      className="absolute top-0 h-3 rounded-sm border border-red-200/60 bg-red-500/90 text-[7px] font-bold leading-[0.75] text-white transition-colors hover:bg-red-400"
                      style={{ left: `${span.left}%`, width: `max(${span.width}%, 1rem)` }}
                      title={`${block.planCode} · ${asTime(block.task.planned_start)}–${asTime(block.task.planned_end)}`}
                    >
                      ⚑
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[9px] text-navy-400">
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-500" /> Window</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-ai" /> Candidate</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-amber-500" /> Occupancy</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-red-500" /> Block</span>
      </div>
    </section>
  );
}

interface SelectionDrawerProps {
  selection: Selection | null;
  onClose: () => void;
  onSelectStation: (loc: Location) => void;
  stationDetail: (loc: Location) => StationDetail;
  assetColumns: DataTableColumn<Asset>[];
  windowColumns: DataTableColumn<CoaAvailableWindow>[];
  taskColumns: DataTableColumn<PlanningTask>[];
  blockColumns: DataTableColumn<UnifiedBlockRequirement>[];
  maintenanceColumns: DataTableColumn<UnifiedMaintenance>[];
  occupancyColumns: DataTableColumn<CoaLineOccupancy>[];
  trainsAt: (station: string | null) => ActiveTrain[];
  occupancy: CoaLineOccupancy[];
  schedules: CoaSchedule[];
}

interface StationDetail {
  assets: Asset[];
  maintenance: UnifiedMaintenance[];
  windows: CoaAvailableWindow[];
  tasks: PlanningTask[];
  blocks: UnifiedBlockRequirement[];
}

function SelectionDrawer({
  selection,
  onClose,
  onSelectStation,
  stationDetail,
  assetColumns,
  windowColumns,
  taskColumns,
  blockColumns,
  maintenanceColumns,
  occupancyColumns,
  trainsAt,
  occupancy,
  schedules,
}: SelectionDrawerProps) {
  if (!selection) return null;

  const title =
    selection.kind === "station"
      ? `${selection.location.station_name || selection.location.station_code} · km ${asKm(selection.location.km_start) ?? "—"}`
      : selection.kind === "train"
        ? selection.train.train_number ?? `Train ${selection.train.train_id}`
        : selection.kind === "planned"
          ? selection.block.planCode
          : selection.kind === "asset"
            ? selection.asset.asset_name ?? `Asset ${selection.asset.id}`
            : selection.kind === "maintenance"
              ? `${selection.maintenance.maintenance_type ?? "Maintenance"} #${selection.maintenance.id}`
              : selection.kind === "block-req"
                ? `${selection.block.block_type ?? "Block"} #${selection.block.id}`
                : `${selection.task.task_code ?? `Task ${selection.task.id}`}`;

  const description =
    selection.kind === "station"
      ? `${selection.location.section_name || selection.location.section_code || "—"} · ${selection.location.line_name || selection.location.line_code || "—"}`
      : selection.kind === "train"
        ? `${selection.atStation ?? "no station"} · ${selection.train.train_name ?? "synthetic train"}`
        : selection.kind === "planned"
          ? `${selection.block.station} · ${selection.block.line} · ${asTime(selection.block.task.planned_start)}–${asTime(selection.block.task.planned_end)} (${selection.block.task.planned_duration_minutes}m)`
          : `${selection.location.station_code} · ${selection.location.line_code ?? "—"}`;

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      className="w-full sm:max-w-3xl"
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant="ai">DEMO / SYNTHETIC REPLAY</Badge>
        {selection.kind !== "station" && "location" in selection ? (
          <Button variant="outline" size="sm" onClick={() => onSelectStation(selection.location)}>
            Open station
          </Button>
        ) : null}
      </div>
      <div className="space-y-5">
        {selection.kind === "asset" ? (
          <section className="space-y-3">
            <SectionHeader icon={Boxes} title="Asset detail" description="Real record from GET /api/assets." />
            <div className="space-y-1.5 rounded-lg border border-line px-3 py-2 text-xs">
              <p><span className="text-ink-faint">Type:</span> {selection.asset.asset_type ?? "—"} {selection.asset.asset_subtype ?? ""}</p>
              <p><span className="text-ink-faint">Name:</span> {selection.asset.asset_name ?? "—"}</p>
              <p><span className="text-ink-faint">Source:</span> {selection.asset.source_asset_id ?? "—"}</p>
              <p><span className="text-ink-faint">Status:</span> <StatusBadge status={selection.asset.status ?? "UNKNOWN"} /></p>
              <p><span className="text-ink-faint">Installed:</span> {asDate(selection.asset.installation_date)}</p>
            </div>
          </section>
        ) : null}

        {selection.kind === "maintenance" ? (
          <section className="space-y-3">
            <SectionHeader icon={MapPin} title="Maintenance" description="Unified TMS maintenance tied to this asset/station." />
            <div className="space-y-1.5 rounded-lg border border-line px-3 py-2 text-xs">
              <p><span className="text-ink-faint">Type:</span> {selection.maintenance.maintenance_type ?? "—"}</p>
              <p><span className="text-ink-faint">Planned:</span> {asDate(selection.maintenance.planned_date)}</p>
              <p><span className="text-ink-faint">Duration:</span> {selection.maintenance.required_duration_minutes ?? "?"} min</p>
              <p><span className="text-ink-faint">Status:</span> <StatusBadge status={selection.maintenance.status ?? "UNKNOWN"} /></p>
            </div>
          </section>
        ) : null}

        {selection.kind === "block-req" ? (
          <section className="space-y-3">
            <SectionHeader icon={Blocks} title="Block requirement" description="Unified traffic / power block request." />
            <div className="space-y-1.5 rounded-lg border border-line px-3 py-2 text-xs">
              <p><span className="text-ink-faint">Type:</span> {selection.block.block_type ?? "—"}</p>
              <p>
                <span className="text-ink-faint">Flags:</span> Traffic {selection.block.traffic_block_required ? "✓" : "—"} · Power {selection.block.power_block_required ? "✓" : "—"}
              </p>
              <p><span className="text-ink-faint">Duration:</span> {selection.block.required_duration_minutes ?? "?"} min</p>
              <p><span className="text-ink-faint">Earliest → latest:</span> {asTime(selection.block.earliest_start)} → {asTime(selection.block.latest_end)}</p>
              <p><span className="text-ink-faint">Status:</span> <StatusBadge status={selection.block.status ?? "UNKNOWN"} /></p>
            </div>
          </section>
        ) : null}

        {selection.kind === "task" ? (
          <section className="space-y-3">
            <SectionHeader icon={GitPullRequest} title="Planning task" description="Unit of work awaiting / holding a block window." />
            <div className="space-y-1.5 rounded-lg border border-line px-3 py-2 text-xs">
              <p><span className="text-ink-faint">Code:</span> <span className="font-mono">{selection.task.task_code}</span></p>
              <p><span className="text-ink-faint">Type:</span> {selection.task.task_type ?? "—"}</p>
              <p><span className="text-ink-faint">Duration:</span> {selection.task.duration_minutes ?? "?"} min</p>
              <p><span className="text-ink-faint">Window:</span> {asTime(selection.task.earliest_start)} → {asTime(selection.task.latest_end)}</p>
              <p><span className="text-ink-faint">Status:</span> <StatusBadge status={selection.task.status ?? "UNKNOWN"} /></p>
            </div>
          </section>
        ) : null}

        {selection.kind === "planned" ? (
          <section className="space-y-3">
            <SectionHeader icon={Blocks} title="Planned block" description="The validated block deployment for this plan task." />
            <div className="space-y-1.5 rounded-lg border border-line px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold">{selection.block.planCode}</span>
                <StatusBadge status="PLANNED" tone="info" />
              </div>
              <p><span className="text-ink-faint">Task id:</span> {selection.block.task.planning_task_id}</p>
              <p><span className="text-ink-faint">Candidate window:</span> #{selection.block.candidate.id}</p>
              <p><span className="text-ink-faint">Window record:</span> #{selection.block.window?.id ?? "—"} · {selection.block.window?.duration_minutes ?? "?"}m</p>
              <p><span className="text-ink-faint">Station:</span> {selection.block.station} · <span className="text-ink-faint">Line:</span> {selection.block.line}</p>
              <p>
                <span className="text-ink-faint">Planned:</span> {asTime(selection.block.task.planned_start)} → {asTime(selection.block.task.planned_end)}
              </p>
              {selection.block.window ? (
                <p>
                  <span className="text-ink-faint">Window:</span> {asTime(selection.block.window.window_start)} → {asTime(selection.block.window.window_end)} · {selection.block.window.window_status}
                </p>
              ) : null}
            </div>
            <SectionHeader icon={GitPullRequest} title="Full chain" description="task → available window → candidate → plan task (all real records)" />
            <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-2xs">
              <Badge variant="outline">Task {selection.block.task.planning_task_id}</Badge>
              <span className="text-ink-faint">→</span>
              <Badge variant="outline">Win {selection.block.window?.id ?? "—"}</Badge>
              <span className="text-ink-faint">→</span>
              <Badge variant="outline">Cand {selection.block.candidate.id}</Badge>
              <span className="text-ink-faint">→</span>
              <Badge variant="outline">{selection.block.planCode}</Badge>
            </div>
          </section>
        ) : null}

        {selection.kind === "train" ? (
          <section className="space-y-3">
            <SectionHeader icon={TrainFront} title="Train detail" description="Roster + COA records for this service." />
            <div className="space-y-1.5 rounded-lg border border-line px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <TrainGlyph flag={selection.train.direction ?? null} />
                <StatusBadge status={selection.train.direction ?? "SCHEDULED"} tone="info" />
              </div>
              <p><span className="text-ink-faint">Train number:</span> {selection.train.train_number ?? "—"}</p>
              <p><span className="text-ink-faint">Train name:</span> {selection.train.train_name ?? "—"}</p>
              <p><span className="text-ink-faint">Loco:</span> {selection.train.loco_number ?? "—"}</p>
              <p><span className="text-ink-faint">Schedule date:</span> {asDate(selection.train.schedule_date)}</p>
              <p><span className="text-ink-faint">Last known station:</span> {selection.atStation ?? "—"}</p>
            </div>
            {selection.atStation ? (
              <div>
                <SectionHeader icon={Route} title="Also at this station" description="Other trains whose latest movement is at the same station." />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {trainsAt(selection.atStation).map((train) => (
                    <Badge key={train.train.id} variant="outline">{train.number}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <section>
              <SectionHeader icon={CalendarRange} title="Line occupancy records" description="Real /api/coa/line-occupancy rows for this train." />
              <DataTable
                rows={occupancy.filter((row) => row.train_id === selection.train.id)}
                columns={occupancyColumns}
                keyField={(row) => row.id}
                emptyTitle="No occupancy records"
                emptyDescription="This train has no line-occupancy rows on record."
              />
            </section>
            <section>
              <SectionHeader icon={CalendarRange} title="Timetable rows" description={`${schedules.filter((row) => row.train_id === selection.train.id).length} /api/coa/schedules rows for this train.`} />
              <div className="space-y-1.5">
                {schedules
                  .filter((row) => row.train_id === selection.train.id)
                  .map((row) => (
                    <div key={row.id} className="flex items-center justify-between rounded-md border border-line bg-surface-muted/40 px-3 py-2 text-xs">
                      <span className="font-mono">{row.station_code}</span>
                      <span className="tabular-nums text-ink-muted">
                        A {asTime(row.scheduled_arrival)} · D {asTime(row.scheduled_departure)}
                      </span>
                      <span className="font-mono text-ink-faint">{row.line_number ?? "—"}</span>
                    </div>
                  ))}
              </div>
            </section>
          </section>
        ) : null}

        {selection.kind === "station" ? (
          <div className="space-y-5">
            {trainsAt(selection.location.station_code).length > 0 ? (
              <section>
                <SectionHeader icon={TrainFront} title="Trains at this station" description="Latest COA movement for each service." />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {trainsAt(selection.location.station_code).map((train) => (
                    <div key={train.train.id} className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1">
                      <TrainGlyph flag={train.flag} />
                      <span className="font-mono text-xs font-semibold">{train.number}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <section>
                  <SectionHeader icon={Boxes} title="Assets here" description={`${stationDetail(selection.location).assets.length.toString()} real /api/assets at km ${asKm(selection.location.km_start) ?? "—"}`} />
                  <DataTable rows={stationDetail(selection.location).assets} columns={assetColumns} keyField={(row) => row.id} emptyTitle="No assets" emptyDescription="Backend returned no assets for this location." />
                </section>
                <section>
                  <SectionHeader icon={MapPin} title="Maintenance" description="Unified TMS maintenance tied to these assets" />
                  <DataTable rows={stationDetail(selection.location).maintenance} columns={maintenanceColumns} keyField={(row) => row.id} emptyTitle="No maintenance" emptyDescription="No maintenance mapped to assets here." />
                </section>
                <section>
                  <SectionHeader icon={CalendarRange} title="COA available windows" description="Windows for this station" />
                  <DataTable rows={stationDetail(selection.location).windows} columns={windowColumns} keyField={(row) => row.id} emptyTitle="No windows" emptyDescription="Backend returned no COA windows for this station." />
                </section>
                <section>
                  <SectionHeader icon={GitPullRequest} title="Planning tasks" description="Tasks at this station" />
                  <DataTable rows={stationDetail(selection.location).tasks} columns={taskColumns} keyField={(row) => row.id} emptyTitle="No tasks" emptyDescription="Backend returned no planning tasks here." />
                </section>
                <section>
                  <SectionHeader icon={Blocks} title="Block requirements" description="Unified block requirements at this station" />
                  <DataTable rows={stationDetail(selection.location).blocks} columns={blockColumns} keyField={(row) => row.id} emptyTitle="No blocks" emptyDescription="Backend returned no block requirements here." />
                </section>
          </div>
        ) : null}

        <p className="border-t border-line pt-3 text-2xs text-ink-faint">
          All counts in this panel are read from live API responses; empty sections mean the backend has no records for
          that object. No positions or values are invented.
        </p>
      </div>
    </Drawer>
  );
}

function TrainGlyph({ flag }: { flag: string | null }) {
  const color = flag === "D" ? "#3b82f6" : flag === "A" ? "#d97706" : "#8ba3c9";
  return (
    <svg viewBox="0 0 56 22" className="h-5 w-11" aria-hidden="true">
      <rect x="4" y="4" width="40" height="9" rx="2" fill={color} />
      <rect x="44" y="7" width="6" height="5" rx="1" fill={color} opacity="0.85" />
      <rect x="44" y="7" width="6" height="3" rx="1" fill="#e8eefb" opacity="0.9" />
      <circle cx="12" cy="17" r="3.2" fill="#0b1424" stroke="#8ba3c9" strokeWidth="1.2" />
      <circle cx="22" cy="17" r="3.2" fill="#0b1424" stroke="#8ba3c9" strokeWidth="1.2" />
      <circle cx="33" cy="17" r="3.2" fill="#0b1424" stroke="#8ba3c9" strokeWidth="1.2" />
    </svg>
  );
}