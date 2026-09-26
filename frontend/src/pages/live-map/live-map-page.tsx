import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Route,
  TrainFront,
  Wrench,
  MapPin,
  CalendarRange,
  Boxes,
  Blocks,
  GitPullRequest,
  CircleAlert,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

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

/* ==========================================================================
 * Value formatting — every value below is read from the API, never invented.
 * ======================================================================== */

const asKm = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

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

/** Renders a kilometre post with the trailing zeros trimmed: 1341.200 -> "1341.2". */
const fmtKm = (km: number | null | undefined): string => {
  if (km === null || km === undefined || !Number.isFinite(km)) return "—";
  return km.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};

const fmtRange = (from: string | null | undefined, to: string | null | undefined): string =>
  `${asTime(from)}–${asTime(to)}`;

/** Compact 24-hour range, used where horizontal space on the map is tight. */
const fmtRangeCompact = (from: string | null | undefined, to: string | null | undefined): string => {
  const a = minutesOfDay(from);
  const b = minutesOfDay(to);
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  if (a === null && b === null) return "time unavailable";
  if (a === null) return `–${hhmm(b ?? 0)}`;
  if (b === null) return `${hhmm(a)}–`;
  return `${hhmm(a)}–${hhmm(b)}`;
};

/* ==========================================================================
 * Corridor map layout constants (device-independent pixels).
 *
 * Every positioned element on the map is placed by a single coordinate
 * function derived from a lane's OWN kilometre range. There are no
 * hand-tuned absolute coordinates, so the geometry cannot drift apart when
 * the data volume changes.
 * ======================================================================== */

const MAP_PLANE_PAD_X = 30; // plot padding, left and right
const MAP_LANE_HEADER_H = 26; // line-name strip at the top of each lane
const MAP_TRAIN_CHIP_H = 22; // one train chip row
const MAP_TRAIN_CHIP_GAP = 3;
const MAP_RAIL_H = 20; // rail band that holds the section segments and nodes
const MAP_STATION_LABEL_H = 48; // station name + code/km strip
const MAP_CHIP_ROW_H = 26; // one stacked maintenance/block chip row
const MAP_COUNT_CHIP_H = 24; // station count chips (assets / maint / tasks)
const MAP_KM_RULER_H = 17; // per-lane kilometre ruler
const MAP_LANE_GAP = 14; // gap between two line lanes
const MAP_LANE_PAD_BOTTOM = 10;
/** Minimum horizontal slot reserved per station node — drives the lane scroll width. */
const MAP_STATION_SLOT = 132;
/** Width reserved per station label. Node separation is forced to LABEL_W + 4. */
const MAP_LABEL_W = 172;
const MAP_CHIP_W_MAX = 172;
const MAP_CHIP_W_MIN = 104;
/**
 * Node separation is the wider of "a station label fits" and "a block or train
 * chip fits", so a chip is never narrower than the text it has to show.
 */
const MAP_NODE_MIN_GAP = Math.max(MAP_LABEL_W + 4, MAP_CHIP_W_MAX + 6);
/** Fractions of the lane's km range kept free on each side so end nodes are not flush. */
const MAP_AXIS_PAD_RATIO = 0.06;
const MAP_VIEWPORT_MAX_H = 620; // vertical scroll bound; scrolling stays inside the map
const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.5;

/* ==========================================================================
 * Corridor timeline layout constants.
 * ======================================================================== */

const TL_LABEL_W = 156;
const TL_LABEL_GAP = 10;
const TL_SUBLANE_H = 18;
const TL_SUBLANE_PAD = 3;
const TL_ROW_PAD = 8;
const TL_MIN_PX_PER_HOUR = 60;
const TL_MAX_PX_PER_HOUR = 6000;
/** Bars packed per sub-lane before the timeline is widened further. */
const TL_MAX_SUBLANE_ROWS = 2;
const TL_MIN_BAR_PX = 3;
/**
 * Hard cap on the drawn height of one line row. A sub-lane can hold records
 * that genuinely share the same minute (many candidate windows are proposed
 * for one slot), and no amount of horizontal widening can separate those.
 * Rather than stretching a single row across thousands of pixels, the row is
 * capped and scrolls internally: every record stays in the DOM, reachable by
 * scrolling, and no two bars ever overlap.
 */
const TL_ROW_MAX_H = 168;
/** Left gutter reserved for the sub-lane captions, so they never sit on a bar. */
const TL_SUBLABEL_W = 46;
/**
 * Height of the "position unavailable" panel. It scrolls internally, so a long
 * list of unplaceable records is fully listed instead of being clipped.
 */
const UNMAPPED_STRIP_H = 168;

/* ==========================================================================
 * Deterministic collision avoidance.
 *
 * `spread` keeps an ordered set of items at least `minGap` apart, starting
 * from their data-derived positions, then re-centres and clamps to the
 * available width. The order is fully determined by the caller's sort, so
 * the same input always yields the same output. Underlying API values are
 * never modified.
 * ======================================================================== */
const spread = (xs: number[], minGap: number, width: number, pad: number): number[] => {
  const out = xs.map((x) => Math.max(pad, Math.min(width - pad, x)));
  for (let i = 1; i < out.length; i += 1) {
    if (out[i] - out[i - 1] < minGap) out[i] = out[i - 1] + minGap;
  }
  const overflow = out.length > 0 ? out[out.length - 1] - (width - pad) : 0;
  if (overflow > 0) {
    for (let i = 0; i < out.length; i += 1) out[i] -= overflow;
  }
  for (let i = out.length - 2; i >= 0; i -= 1) {
    if (out[i + 1] - out[i] < minGap) out[i] = out[i + 1] - minGap;
  }
  const underflow = out.length > 0 ? pad - out[0] : 0;
  if (underflow > 0) {
    for (let i = 0; i < out.length; i += 1) out[i] += underflow;
  }
  for (let i = 0; i < out.length; i += 1) out[i] = Math.max(pad, Math.min(width - pad, out[i]));
  return out;
};

const byId = <T extends { id: string }>(a: T, b: T): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/* ==========================================================================
 * Domain model
 * ======================================================================== */

interface ActiveTrain {
  train: Train;
  movement: CoaMovement | null;
  number: string;
  name: string | null;
  atStation: string | null;
  flag: string | null;
  lineCode: string | null;
}

/** A maintenance / block requirement anchored to a line + station, or explicitly unmapped. */
interface CorridorBlock {
  id: string;
  origin: "requirement" | "planned";
  station: string | null;
  line: string | null;
  /** Short head line, e.g. the maintenance type or the plan code. */
  title: string;
  /** Short qualifier shown next to the window, e.g. the block type or feasibility. */
  qualifier: string;
  timeLabel: string;
  durationMinutes: number | null;
  requirement: UnifiedBlockRequirement | null;
  planned: PlannedBlock | null;
}

interface StationCounts {
  assets: number;
  maintenance: number;
  tasks: number;
}

/** One station node inside a line lane (one node per line x station_code). */
interface LaneStation {
  key: string;
  location: Location;
  extraRows: number;
  stationCode: string;
  stationName: string;
  kmStart: number | null;
  kmEnd: number | null;
  xTrue: number;
  x: number;
  trains: ActiveTrain[];
  blocks: CorridorBlock[];
  counts: StationCounts;
}

/** One line = one dedicated lane with its own kilometre axis. */
interface Lane {
  key: string;
  name: string;
  section: string;
  kmMin: number;
  kmMax: number;
  kmKnown: boolean;
  axisMin: number;
  axisMax: number;
  stations: LaneStation[];
  stationCount: number;
  occupied: boolean;
  occupancyCount: number;
  unknownKm: LaneStation[];
  orphanBlocks: CorridorBlock[];
  orphanTrains: ActiveTrain[];
  maxTrainRows: number;
  maxBlockRows: number;
  minNodeGap: number;
  chipW: number;
}

interface LaneBox {
  top: number;
  height: number;
  headerH: number;
  trainsTop: number;
  trainsH: number;
  railTop: number;
  labelTop: number;
  blocksTop: number;
  blocksH: number;
  countsTop: number;
  rulerTop: number;
}

/** A single scheduled span on the daily time axis. */
interface TimeBar {
  id: string;
  start: number | null;
  end: number | null;
  badge: string;
  tip: string;
  tone: "window" | "candOk" | "candNo" | "occ" | "req" | "planned";
  onSelect?: () => void;
}

type SublaneKey = "windows" | "candidates" | "occupancy" | "requirements" | "planned";

const SUBLANES: { key: SublaneKey; label: string }[] = [
  { key: "windows", label: "WIN" },
  { key: "candidates", label: "CAND" },
  { key: "occupancy", label: "OCC" },
  { key: "requirements", label: "REQ" },
  { key: "planned", label: "PLAN" },
];

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

/* ==========================================================================
 * Page
 * ======================================================================== */

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

  /* ---------------------------------------------------------------- trains */

  const activeTrains = useMemo<ActiveTrain[]>(() => {
    const latestByTrain = new Map<number, CoaMovement>();
    for (const mv of movements.data ?? []) {
      const prev = latestByTrain.get(mv.train_id);
      if (!prev || String(mv.movement_datetime) > String(prev.movement_datetime)) {
        latestByTrain.set(mv.train_id, mv);
      }
    }
    return (trains.data ?? [])
      .map((train) => {
        const movement = latestByTrain.get(train.id) ?? null;
        return {
          train,
          movement,
          number: train.train_number ?? `${train.train_id}`,
          name: train.train_name ?? null,
          atStation: movement ? movement.station_code : null,
          flag: movement ? movement.movement_flag : null,
          lineCode: movement ? movement.line_number : null,
        };
      })
      .filter((t) => t.atStation != null)
      .sort((a, b) => a.number.localeCompare(b.number) || a.train.id - b.train.id);
  }, [trains.data, movements.data]);

  /* ------------------------------------------------------- planned blocks */

  const plannedBlocks = useMemo<PlannedBlock[]>(() => {
    const candidateById = new Map((candidates.data ?? []).map((c) => [c.id, c]));
    const windowById = new Map((windows.data ?? []).map((w) => [w.id, w]));
    const planById = new Map((plans.data ?? []).map((p) => [p.id, p]));
    return (planTasks.data ?? []).flatMap((task) => {
      const candidate =
        task.candidate_block_window_id != null ? candidateById.get(task.candidate_block_window_id) ?? null : null;
      const window = candidate ? windowById.get(candidate.available_window_id) ?? null : null;
      const planCode = planById.get(task.block_plan_id)?.plan_code ?? `PLAN#${task.block_plan_id}`;
      const station = window?.station_code ?? null;
      const line = window?.line_number ?? null;
      if (!candidate || !station || !line) return [];
      return [{ planCode, task, candidate, window, station, line }];
    });
  }, [planTasks.data, candidates.data, windows.data, plans.data]);

  /* ------------------------------------------- per-station derived records */

  const assetById = useMemo(() => new Map((assets.data ?? []).map((a) => [a.id, a])), [assets.data]);
  const locationById = useMemo(
    () => new Map((locations.data ?? []).map((l) => [l.id, l])),
    [locations.data],
  );

  /** maintenance requirement -> maintenance record -> asset -> location. Never guessed. */
  const blockLocation = useMemo(() => {
    const maintenanceById = new Map((maintenance.data ?? []).map((m) => [m.id, m]));
    return (block: CorridorBlock): Location | null => {
      if (!block.requirement) return null;
      const record = maintenanceById.get(block.requirement.maintenance_requirement_id);
      if (!record) return null;
      const asset = assetById.get(record.asset_id);
      if (!asset || asset.location_id == null) return null;
      return locationById.get(asset.location_id) ?? null;
    };
  }, [maintenance.data, assetById, locationById]);

  /** Every maintenance / block requirement, joined to its maintenance record. */
  const corridorBlocks = useMemo<CorridorBlock[]>(() => {
    const maintenanceById = new Map((maintenance.data ?? []).map((m) => [m.id, m]));
    const fromRequirements = (blocks.data ?? []).map((req) => {
      const linked = maintenanceById.get(req.maintenance_requirement_id) ?? null;
      return {
        id: `req-${req.id}`,
        origin: "requirement" as const,
        station: req.station_code ?? null,
        line: req.line_number ?? null,
        title: linked?.maintenance_type ?? req.block_type ?? "Block",
        qualifier: req.block_type ?? "—",
        timeLabel:
          req.earliest_start || req.latest_end
            ? fmtRangeCompact(req.earliest_start, req.latest_end)
            : "time unavailable",
        durationMinutes: req.required_duration_minutes ?? null,
        requirement: req,
        planned: null,
      };
    });
    const fromPlans = plannedBlocks.map((pb) => ({
      id: `plan-${pb.task.id}`,
      origin: "planned" as const,
      station: pb.station,
      line: pb.line,
      title: pb.planCode,
      qualifier: pb.candidate.feasibility_status,
      timeLabel: fmtRangeCompact(pb.task.planned_start, pb.task.planned_end),
      durationMinutes: pb.task.planned_duration_minutes ?? null,
      requirement: null,
      planned: pb,
    }));
    return [...fromRequirements, ...fromPlans].sort((a, b) => a.id.localeCompare(b.id));
  }, [blocks.data, maintenance.data, plannedBlocks]);

  /* ------------------------------------------------------------- the lanes */

  const lanes = useMemo<Lane[]>(() => {
    const locs = locations.data ?? [];

    // 1. bucket every location row under its line, in stable order.
    const lineRows = new Map<string, Location[]>();
    for (const loc of locs) {
      const key = loc.line_code || `UNASSIGNED-LINE-${loc.id}`;
      const list = lineRows.get(key) ?? [];
      list.push(loc);
      lineRows.set(key, list);
    }

    // 2. index the records each station/lane needs.
    const trainsByLineStation = new Map<string, ActiveTrain[]>();
    for (const train of activeTrains) {
      const key = `${train.lineCode}|${train.atStation}`;
      const list = trainsByLineStation.get(key) ?? [];
      list.push(train);
      trainsByLineStation.set(key, list);
    }
    const blocksByLineStation = new Map<string, CorridorBlock[]>();
    for (const block of corridorBlocks) {
      if (!block.line || !block.station) continue;
      const key = `${block.line}|${block.station}`;
      const list = blocksByLineStation.get(key) ?? [];
      list.push(block);
      blocksByLineStation.set(key, list);
    }
    const assetsByLocation = new Map<number, Asset[]>();
    for (const asset of assets.data ?? []) {
      if (asset.location_id == null) continue;
      const list = assetsByLocation.get(asset.location_id) ?? [];
      list.push(asset);
      assetsByLocation.set(asset.location_id, list);
    }
    const maintenanceAssets = new Set<number>();
    for (const record of maintenance.data ?? []) maintenanceAssets.add(record.asset_id);
    const tasksByStation = new Map<string, number>();
    for (const task of planning.data ?? []) {
      if (!task.location_code) continue;
      tasksByStation.set(task.location_code, (tasksByStation.get(task.location_code) ?? 0) + 1);
    }
    const occupancyByLine = new Map<string, CoaLineOccupancy[]>();
    for (const row of occupancy.data ?? []) {
      const key = row.line_number;
      const list = occupancyByLine.get(key) ?? [];
      list.push(row);
      occupancyByLine.set(key, list);
    }

    const result: Lane[] = [];

    for (const [key, rows] of lineRows) {
      // 3. one station node per (line, station_code): identical rows at the same
      //    kilometre would otherwise draw two nodes on top of each other.
      const byStation = new Map<string, Location[]>();
      for (const loc of rows) {
        if (!loc.station_code) continue;
        const list = byStation.get(loc.station_code) ?? [];
        list.push(loc);
        byStation.set(loc.station_code, list);
      }

      const kmValues = rows.flatMap((r) => [asKm(r.km_start), asKm(r.km_end)]).filter(
        (v): v is number => v !== null,
      );
      const kmKnown = kmValues.length > 0;
      const kmMin = kmKnown ? Math.min(...kmValues) : 0;
      const kmMax = kmKnown ? Math.max(...kmValues) : 1;
      const range = Math.max(kmMax - kmMin, 0.001);
      const pad = range * MAP_AXIS_PAD_RATIO;
      const axisMin = kmMin - pad;
      const axisMax = kmMax + pad;

      const stations: LaneStation[] = [];
      const unknownKm: LaneStation[] = [];
      for (const [stationCode, stationRows] of byStation) {
        const sorted = [...stationRows].sort(
          (a, b) => (asKm(a.km_start) ?? Number.POSITIVE_INFINITY) - (asKm(b.km_start) ?? Number.POSITIVE_INFINITY)
            || a.id - b.id,
        );
        const representative = sorted[0];
        const kmStart = asKm(representative.km_start);
        const kmEnd = asKm(representative.km_end);
        const counts: StationCounts = { assets: 0, maintenance: 0, tasks: tasksByStation.get(stationCode) ?? 0 };
        for (const loc of stationRows) {
          for (const asset of assetsByLocation.get(loc.id) ?? []) {
            counts.assets += 1;
            if (maintenanceAssets.has(asset.id)) counts.maintenance += 1;
          }
        }
        const node: LaneStation = {
          key: `${key}|${stationCode}`,
          location: representative,
          extraRows: stationRows.length - 1,
          stationCode,
          stationName: representative.station_name ?? representative.station_code ?? stationCode,
          kmStart,
          kmEnd,
          xTrue: 0,
          x: 0,
          trains: trainsByLineStation.get(`${key}|${stationCode}`) ?? [],
          blocks: blocksByLineStation.get(`${key}|${stationCode}`) ?? [],
          counts,
        };
        (kmStart === null ? unknownKm : stations).push(node);
      }

      // Deterministic order: kilometre first, then code, then row id.
      stations.sort(
        (a, b) => (a.kmStart ?? Number.POSITIVE_INFINITY) - (b.kmStart ?? Number.POSITIVE_INFINITY)
          || a.stationCode.localeCompare(b.stationCode)
          || a.location.id - b.location.id,
      );
      unknownKm.sort((a, b) => a.stationCode.localeCompare(b.stationCode) || a.location.id - b.location.id);

      const laneOccupancy = occupancyByLine.get(key) ?? [];
      result.push({
        key,
        name: rows.find((r) => r.line_name)?.line_name ?? rows.find((r) => r.line_code)?.line_code ?? key,
        section:
          rows.find((r) => r.section_name)?.section_name
          ?? rows.find((r) => r.section_code)?.section_code
          ?? rows.find((r) => r.division_name)?.division_name
          ?? "section not recorded",
        kmMin,
        kmMax,
        kmKnown,
        axisMin,
        axisMax,
        stations,
        stationCount: stations.length + unknownKm.length,
        occupied: laneOccupancy.length > 0,
        occupancyCount: laneOccupancy.length,
        unknownKm,
        orphanBlocks: [],
        orphanTrains: [],
        maxTrainRows: Math.max(1, ...stations.map((s) => s.trains.length)),
        maxBlockRows: Math.max(0, ...stations.map((s) => s.blocks.length)),
        minNodeGap: MAP_NODE_MIN_GAP,
        chipW: MAP_CHIP_W_MAX,
      });
    }

    // 4. anything that references a line or station we do not have a location
    //    for is reported as unavailable, never given a fabricated position.
    const laneKeys = new Set(result.map((l) => l.key));
    for (const block of corridorBlocks) {
      if (block.line && laneKeys.has(block.line)) continue;
      for (const lane of result) {
        if (block.line === null && block.station && lane.stations.some((s) => s.stationCode === block.station)) {
          lane.orphanBlocks.push(block);
        }
      }
    }
    for (const train of activeTrains) {
      if (train.lineCode && laneKeys.has(train.lineCode)) continue;
      for (const lane of result) {
        if (train.lineCode === null && train.atStation && lane.stations.some((s) => s.stationCode === train.atStation)) {
          lane.orphanTrains.push(train);
        }
      }
    }

    // Longest line first is not wanted: keep a stable, readable order —
    // named lines alphabetically, then the synthetic/unassigned ones.
    result.sort((a, b) => {
      const an = a.key.startsWith("UNASSIGNED") ? 1 : 0;
      const bn = b.key.startsWith("UNASSIGNED") ? 1 : 0;
      if (an !== bn) return an - bn;
      const asy = a.key.startsWith("SYN-") ? 1 : 0;
      const bsy = b.key.startsWith("SYN-") ? 1 : 0;
      if (asy !== bsy) return asy - bsy;
      return a.key.localeCompare(b.key);
    });
    return result;
  }, [locations.data, activeTrains, corridorBlocks, assets.data, maintenance.data, planning.data, occupancy.data]);

  const unmappedBlocks = useMemo(() => {
    const laneKeys = new Set(lanes.map((l) => l.key));
    const stationKeys = new Set(lanes.flatMap((l) => l.stations.map((s) => s.stationCode)));
    return corridorBlocks.filter((b) => {
      if (b.line) return !laneKeys.has(b.line);
      return !b.station || !stationKeys.has(b.station);
    });
  }, [corridorBlocks, lanes]);

  const unmappedTrains = useMemo(() => {
    const laneKeys = new Set(lanes.map((l) => l.key));
    return activeTrains.filter((t) => !t.lineCode || !laneKeys.has(t.lineCode));
  }, [activeTrains, lanes]);

  /* --------------------------------------------------------------- helpers */

  const occupiedLines = useMemo(
    () => new Set((occupancy.data ?? []).map((row) => row.line_number)),
    [occupancy.data],
  );

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
    { key: "window", header: "COA window", render: (row) => `${fmtRange(row.window_start, row.window_end)} · ${asDate(row.window_start)}` },
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

  const totalStations = lanes.reduce((sum, l) => sum + l.stationCount, 0);

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Operations Control · Live Map"
        title="Live Map — Railway Network"
        description="One dedicated lane per line, each with its own kilometre axis. Stations sit at their recorded kilometre, maintenance blocks sit on their own line and station, and nothing is drawn outside the map viewport."
        actions={
          <>
            <Badge variant="ai">DEMO / SYNTHETIC REPLAY</Badge>
            <Button variant="outline" size="sm" onClick={refresh} disabled={health.api === "checking"}>
              <RefreshCw className={health.api === "checking" ? "animate-spin" : ""} /> Refresh
            </Button>
          </>
        }
      />

      <section className="min-w-0 rounded-lg border border-line bg-surface-white p-5 shadow-card">
        <SectionHeader
          icon={Route}
          title="Unified corridor"
          description={`${lanes.length} line lane(s) · ${totalStations} station node(s) · per-line kilometre axis`}
          right={
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * 1.25))} title="Zoom in">
                <ZoomIn />
              </Button>
              <span className="w-11 text-center font-mono text-2xs text-ink-muted">{Math.round(zoom * 100)}%</span>
              <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z / 1.25))} title="Zoom out">
                <ZoomOut />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setZoom(1)} title="Fit view">
                <Maximize2 />
              </Button>
            </div>
          }
        />

        <Legend />

        <div className="mt-4 min-w-0">
          {lanes.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface-muted/40 px-4 py-6 text-center text-sm text-ink-faint">
              Backend returned no locations — nothing to draw.
            </p>
          ) : (
            <CorridorCanvas
              lanes={lanes}
              unmappedBlocks={unmappedBlocks}
              unmappedTrains={unmappedTrains}
              blockLocation={blockLocation}
              assets={assets.data ?? []}
              maintenance={maintenance.data ?? []}
              planning={planning.data ?? []}
              occupiedLines={occupiedLines}
              zoom={zoom}
              onSelect={setSelected}
            />
          )}
        </div>

        <p className="mt-4 text-xs text-ink-faint">
          Lane height, chip rows and the horizontal scroll width are computed from the number of stations, trains and
          blocks actually returned by the API. Train positions are the latest recorded COA movement per train. Records
          that reference an unknown line or station are listed as <span className="font-semibold">position
          unavailable</span> instead of being placed on the map.
        </p>
      </section>

      <CorridorTimeline
        lanes={lanes}
        blocks={corridorBlocks}
        windows={windows.data ?? []}
        candidates={candidates.data ?? []}
        occupancy={occupancy.data ?? []}
        blockLocation={blockLocation}
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
        locations={locations.data ?? []}
      />
    </div>
  );
}

/* ==========================================================================
 * Legend — sits above the map in normal flow, so it can never overlap it.
 * ======================================================================== */

function Legend() {
  const item = (node: ReactNode, label: string) => (
    <span className="inline-flex items-center gap-1.5 text-2xs text-slate-500">
      {node}
      {label}
    </span>
  );
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3">
      <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Legend</span>
      {item(<span className="inline-block h-1 w-6 rounded-full bg-emerald-500" aria-hidden="true" />, "Clear section")}
      {item(<span className="inline-block h-1 w-6 rounded-full bg-amber-500" aria-hidden="true" />, "Occupied section")}
      {item(<span className="inline-block h-1 w-6 rounded-full bg-navy-500" aria-hidden="true" />, "No occupancy data")}
      {item(<span className="inline-block size-2.5 rounded-full border-2 border-navy-900 bg-brand-500" aria-hidden="true" />, "Station node")}
      {item(<span className="inline-block h-2.5 w-6 rounded-sm border border-red-300/70 bg-red-600" aria-hidden="true" />, "Maintenance block")}
      {item(<span className="inline-block h-2.5 w-6 rounded-sm border border-amber-200/70 bg-red-500 ring-1 ring-amber-300/60" aria-hidden="true" />, "Planned block")}
      {item(<span className="inline-block h-2.5 w-6 rounded-sm border border-navy-500 bg-navy-700" aria-hidden="true" />, "Train")}
      {item(<span className="inline-block h-2.5 w-4 rounded-sm border border-navy-500 bg-navy-700" aria-hidden="true" />, "Assets / maintenance / tasks")}
    </div>
  );
}

/* ==========================================================================
 * Measured width hook — the map fills the space it is given, and only then
 * decides whether it needs to scroll horizontally.
 * ======================================================================== */

function useMeasuredWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ==========================================================================
 * Corridor map
 * ======================================================================== */

interface CorridorCanvasProps {
  lanes: Lane[];
  unmappedBlocks: CorridorBlock[];
  unmappedTrains: ActiveTrain[];
  blockLocation: (block: CorridorBlock) => Location | null;
  assets: Asset[];
  maintenance: UnifiedMaintenance[];
  planning: PlanningTask[];
  occupiedLines: Set<string | null | undefined>;
  zoom: number;
  onSelect: (selection: Selection) => void;
}

interface PlacedChip {
  block: CorridorBlock;
  x: number;
  row: number;
  width: number;
}

function CorridorCanvas({
  lanes,
  unmappedBlocks,
  unmappedTrains,
  blockLocation,
  assets,
  maintenance,
  planning,
  occupiedLines,
  zoom,
  onSelect,
}: CorridorCanvasProps) {
  const [viewportRef, viewportWidth] = useMeasuredWidth<HTMLDivElement>(1000);

  const maxStations = Math.max(1, ...lanes.map((l) => l.stationCount));
  const minPlotWidth = MAP_STATION_SLOT * maxStations;
  const naturalWidth = Math.max(Math.round(viewportWidth / zoom), minPlotWidth + MAP_PLANE_PAD_X * 2);

  /* ---- single coordinate source: every x comes from the lane's own km axis */
  const model = useMemo(() => {
    const inner = naturalWidth - MAP_PLANE_PAD_X * 2;
    const kmToPx = (lane: Lane) => (km: number | null) => {
      if (km === null) return MAP_PLANE_PAD_X;
      const span = lane.axisMax - lane.axisMin;
      if (span <= 0) return MAP_PLANE_PAD_X + inner / 2;
      return MAP_PLANE_PAD_X + ((km - lane.axisMin) / span) * inner;
    };

    const placed: { lane: Lane; stations: LaneStation[]; chips: PlacedChip[]; minGap: number; chipW: number }[] = [];

    for (const lane of lanes) {
      const toPx = kmToPx(lane);
      const ordered = [...lane.stations].sort(
        (a, b) => a.xTrue - b.xTrue || a.stationCode.localeCompare(b.stationCode) || a.location.id - b.location.id,
      );
      for (const s of ordered) s.xTrue = toPx(s.kmStart);
      const xs = spread(ordered.map((s) => s.xTrue), MAP_NODE_MIN_GAP, naturalWidth, MAP_PLANE_PAD_X);
      ordered.forEach((s, i) => {
        s.x = xs[i];
      });

      const gaps: number[] = [];
      for (let i = 1; i < ordered.length; i += 1) gaps.push(ordered[i].x - ordered[i - 1].x);
      const minGap = gaps.length > 0 ? Math.min(...gaps) : naturalWidth - MAP_PLANE_PAD_X * 2;
      const chipW = Math.max(MAP_CHIP_W_MIN, Math.min(MAP_CHIP_W_MAX, Math.round(minGap - 8)));

      // Chips: stacked per station (row index = position in the station's list),
      // then de-collided *within each row* so two chips in the same row can
      // never sit on top of each other.
      const rows = new Map<number, LaneStation[]>();
      for (const s of ordered) {
        s.blocks.forEach((_block, i) => {
          const list = rows.get(i) ?? [];
          list.push(s);
          rows.set(i, list);
        });
      }
      const chips: PlacedChip[] = [];
      for (const [row, holders] of rows) {
        const rowXs = spread(holders.map((h) => h.x), chipW + 6, naturalWidth, MAP_PLANE_PAD_X);
        holders.forEach((holder, i) => {
          const block = holder.blocks[row];
          if (block) chips.push({ block, x: rowXs[i], row, width: chipW });
        });
      }
      chips.sort((a, b) => a.row - b.row || a.x - b.x || a.block.id.localeCompare(b.block.id));

      placed.push({ lane, stations: ordered, chips, minGap, chipW });
    }

    /* ---- vertical box model, derived from the per-lane band sizes */
    let y = 0;
    const boxes: LaneBox[] = [];
    for (const entry of placed) {
      const { lane } = entry;
      const trainsH = lane.maxTrainRows * MAP_TRAIN_CHIP_H;
      const blocksH = lane.maxBlockRows * MAP_CHIP_ROW_H;
      const height =
        MAP_LANE_HEADER_H + trainsH + MAP_RAIL_H + MAP_STATION_LABEL_H + blocksH + MAP_COUNT_CHIP_H
        + MAP_KM_RULER_H + MAP_LANE_PAD_BOTTOM;
      // every band offset below is relative to the lane box itself, because each
      // lane is rendered inside its own offset container.
      const trainsTop = MAP_LANE_HEADER_H;
      const railTop = trainsTop + trainsH;
      const labelTop = railTop + MAP_RAIL_H;
      const blocksTop = labelTop + MAP_STATION_LABEL_H;
      const countsTop = blocksTop + blocksH;
      boxes.push({
        top: y,
        height,
        headerH: MAP_LANE_HEADER_H,
        trainsTop,
        trainsH,
        railTop,
        labelTop,
        blocksTop,
        blocksH,
        countsTop,
        rulerTop: countsTop + MAP_COUNT_CHIP_H,
      });
      y += height + MAP_LANE_GAP;
    }
    const lanesHeight = Math.max(0, y - MAP_LANE_GAP);

    const unmappedCount = unmappedBlocks.length + unmappedTrains.length;
    const unmappedH = unmappedCount > 0 ? UNMAPPED_STRIP_H : 0;
    return { placed, boxes, lanesHeight, totalHeight: lanesHeight + unmappedH, unmappedCount };
  }, [lanes, naturalWidth, unmappedBlocks.length, unmappedTrains.length]);

  const hasUnmapped = model.unmappedCount > 0;

  return (
    <div
      ref={viewportRef}
      data-testid="corridor-viewport"
      className="min-w-0 overflow-auto rounded-lg border border-navy-800 bg-gradient-to-b from-navy-900 to-navy-950 shadow-inner"
      style={{ maxHeight: MAP_VIEWPORT_MAX_H }}
    >
      {/* outer box is the *scaled* size, so zoom never clips the content */}
      <div style={{ width: model.totalHeight > 0 ? naturalWidth * zoom : naturalWidth, height: model.totalHeight * zoom }}>
        <div
          className="relative origin-top-left"
          style={{ width: naturalWidth, height: model.totalHeight, transform: `scale(${zoom})` }}
        >
          {model.placed.map((entry, index) => (
            <LaneView
              key={entry.lane.key}
              entry={entry}
              box={model.boxes[index]}
              width={naturalWidth}
              occupiedLines={occupiedLines}
              assets={assets}
              maintenance={maintenance}
              planning={planning}
              blockLocation={blockLocation}
              onSelect={onSelect}
            />
          ))}

          {hasUnmapped ? (
            <UnmappedStrip
              top={model.lanesHeight}
              blocks={unmappedBlocks}
              trains={unmappedTrains}
              blockLocation={blockLocation}
              onSelect={onSelect}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface LaneViewProps {
  entry: { lane: Lane; stations: LaneStation[]; chips: PlacedChip[]; minGap: number; chipW: number };
  box: LaneBox;
  width: number;
  occupiedLines: Set<string | null | undefined>;
  assets: Asset[];
  maintenance: UnifiedMaintenance[];
  planning: PlanningTask[];
  blockLocation: (block: CorridorBlock) => Location | null;
  onSelect: (selection: Selection) => void;
}

function LaneView({
  entry,
  box,
  width,
  occupiedLines,
  assets,
  maintenance,
  planning,
  blockLocation,
  onSelect,
}: LaneViewProps) {
  const { lane, stations, chips } = entry;
  const railY = box.railTop + MAP_RAIL_H / 2;
  const railColor = occupiedLines.has(lane.key) ? "#fbbf24" : "#22c55e";
  const muted = !occupiedLines.has(lane.key);

  const toPx = (km: number | null) => {
    const inner = width - MAP_PLANE_PAD_X * 2;
    const span = lane.axisMax - lane.axisMin;
    if (km === null || span <= 0) return MAP_PLANE_PAD_X;
    return MAP_PLANE_PAD_X + ((km - lane.axisMin) / span) * inner;
  };

  return (
    <div
      data-testid={`lane-${lane.key}`}
      className="absolute left-0 rounded-lg border border-navy-700/60 bg-navy-900/35"
      style={{ top: box.top, width, height: box.height }}
    >
      {/* 1. line identity, at the top of its own lane */}
      <div
        className="absolute left-0 right-0 flex items-center gap-2 border-b border-navy-700/50 px-3"
        style={{ top: 0, height: box.headerH }}
      >
        <span className="truncate font-mono text-xs font-semibold text-navy-200">{lane.name}</span>
        <span className="truncate text-2xs text-navy-400">{lane.section}</span>
        <span className="ml-auto shrink-0 font-mono text-2xs text-navy-400">
          {lane.kmKnown
            ? `km ${fmtKm(lane.kmMin)} → ${fmtKm(lane.kmMax)} · ${lane.stationCount} stn`
            : `km unavailable · ${lane.stationCount} stn`}
        </span>
      </div>

      {/* 2. rail bed + one section segment per station km span */}
      <div
        className="absolute"
        style={{
          left: MAP_PLANE_PAD_X / 2,
          width: width - MAP_PLANE_PAD_X,
          top: railY - 5,
          height: 10,
          borderRadius: 5,
          background: "rgba(95,122,168,0.30)",
        }}
        aria-hidden="true"
      />
      {stations.map((s) => {
        const left = Math.min(toPx(s.kmStart), toPx(s.kmEnd));
        const right = Math.max(toPx(s.kmStart), toPx(s.kmEnd));
        return (
          <div
            key={`sec-${s.key}`}
            className="absolute rounded-full"
            style={{
              left,
              width: Math.max(3, right - left),
              top: railY - 3.5,
              height: 7,
              background: muted ? "rgba(48,80,127,0.85)" : railColor,
              border: "1px solid rgba(7,13,27,0.55)",
            }}
            title={
              s.kmStart === null
                ? `${lane.key} · ${s.stationCode} · km unavailable`
                : `${lane.key} · ${s.stationCode} · km ${fmtKm(s.kmStart)}–${fmtKm(s.kmEnd)} · ${
                    muted ? "no occupancy record" : "occupancy recorded"
                  }`
            }
            aria-hidden="true"
          />
        );
      })}

      {/* 3. station nodes on the rail, de-collided horizontally */}
      {stations.map((s) => {
        const shifted = Math.abs(s.x - s.xTrue) > 1;
        return (
          <div key={s.key}>
            {/* leader from the true kilometre position to the de-collided node */}
            {shifted ? (
              <>
                <div
                  className="absolute border-l border-dotted border-navy-500/80"
                  style={{ left: s.xTrue, top: box.railTop - 4, height: MAP_RAIL_H + MAP_STATION_LABEL_H + 8 }}
                  aria-hidden="true"
                />
                <div
                  className="absolute border-t border-dotted border-navy-500/80"
                  style={{ left: Math.min(s.xTrue, s.x), width: Math.abs(s.x - s.xTrue), top: box.railTop - 4 }}
                  aria-hidden="true"
                />
              </>
            ) : null}
            <div
              className="absolute -translate-x-1/2"
              style={{ left: s.x, top: box.railTop + MAP_RAIL_H / 2 - 6 }}
              aria-hidden="true"
            >
              <span className="block size-3 rounded-full border-2 border-navy-900 bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.55)]" />
            </div>
            <button
              type="button"
              data-testid={`station-${lane.key}-${s.stationCode}`}
              onClick={() => onSelect({ kind: "station", location: s.location })}
              className="absolute z-10 flex flex-col items-center rounded px-1 text-center hover:bg-navy-800/50"
              style={{
                left: Math.max(0, Math.min(width - MAP_LABEL_W, s.x - MAP_LABEL_W / 2)),
                top: box.labelTop,
                width: MAP_LABEL_W,
                height: MAP_STATION_LABEL_H,
              }}
              title={`${s.stationName} (${s.stationCode}) · line ${lane.key} · km ${fmtKm(s.kmStart)}–${fmtKm(s.kmEnd)}${
                s.extraRows > 0 ? ` · ${s.extraRows + 1} catalogue rows at this km` : ""
              }`}
            >
              <span className="w-full truncate text-xs font-bold leading-tight text-white">{s.stationName}</span>
              <span className="w-full truncate font-mono text-2xs font-semibold leading-tight text-brand-300">
                {s.stationCode}
              </span>
              <span className="w-full truncate font-mono text-2xs leading-tight tabular-nums text-navy-400">
                km {fmtKm(s.kmStart)}
              </span>
              {s.extraRows > 0 ? (
                <span className="w-full truncate text-2xs leading-tight text-navy-500">
                  +{s.extraRows} duplicate row{s.extraRows > 1 ? "s" : ""}
                </span>
              ) : null}
            </button>
          </div>
        );
      })}

      {/* 4. trains, in their own band above the rail, stacked per station */}
      {stations.map((s) =>
        s.trains.map((train, i) => {
          const chipW = 104;
          return (
            <button
              key={`${s.key}-train-${train.train.id}`}
              type="button"
              onClick={() => onSelect({ kind: "train", train: train.train, atStation: s.stationCode })}
              className="absolute flex items-center justify-center gap-1 overflow-hidden rounded border border-navy-500 bg-navy-800 px-1 text-left hover:border-info"
              style={{
                left: Math.max(0, Math.min(width - chipW, s.x - chipW / 2)),
                width: chipW,
                top: box.trainsTop + (lane.maxTrainRows - 1 - i) * MAP_TRAIN_CHIP_H,
                height: MAP_TRAIN_CHIP_H - MAP_TRAIN_CHIP_GAP,
              }}
              title={`Train ${train.number} — line ${train.lineCode} at ${s.stationCode} (latest COA movement ${
                train.movement?.movement_datetime ?? "—"
              })`}
            >
              <TrainGlyph flag={train.flag} />
              <span className="truncate font-mono text-2xs font-semibold text-navy-100">{train.number}</span>
            </button>
          );
        }),
      )}

      {/* 5. maintenance / planned block chips, stacked, on the correct line */}
      {chips.map((chip) => (
        <button
          key={chip.block.id}
          type="button"
          data-testid={`block-${chip.block.id}`}
          onClick={() => {
            if (chip.block.origin === "planned" && chip.block.planned) {
              onSelect({ kind: "planned", block: chip.block.planned });
            } else if (chip.block.requirement) {
              const loc = blockLocation(chip.block);
              if (loc) onSelect({ kind: "block-req", block: chip.block.requirement, location: loc });
            }
          }}
          className={`absolute flex flex-col justify-center overflow-hidden rounded border px-1.5 text-left leading-tight ${
            chip.block.origin === "planned"
              ? "border-amber-200/80 bg-red-500 ring-1 ring-amber-300/50 hover:bg-red-400"
              : "border-red-300/70 bg-red-600/90 hover:bg-red-500"
          }`}
          style={{
            left: chip.x,
            width: chip.width,
            top: box.blocksTop + chip.row * MAP_CHIP_ROW_H,
            height: MAP_CHIP_ROW_H - 3,
          }}
          title={`${chip.block.title} · ${chip.block.qualifier} · ${chip.block.station ?? "—"} · line ${
            chip.block.line ?? "—"
          } · ${chip.block.timeLabel}`}
        >
          {/* Two short lines rather than one long one, so neither is cut off.
              The station is in the tooltip because the chip sits under it. */}
          <span className="truncate text-2xs font-bold text-white">{chip.block.title}</span>
          <span className="truncate font-mono text-2xs text-red-100">
            {chip.block.qualifier} · {chip.block.timeLabel}
          </span>
        </button>
      ))}

      {/* 6. station record counters */}
      {stations.map((s) => {
        const chipsOut: { icon: ReactNode; n: number; label: string; onClick: () => void; cls: string }[] = [];
        if (s.counts.assets > 0) {
          const loc = s.location;
          chipsOut.push({
            icon: <Boxes className="size-3 text-ai" />,
            n: s.counts.assets,
            label: "assets",
            cls: "border-ai/50",
            onClick: () => onSelect({ kind: "asset", asset: (assets.find((a) => a.location_id === loc.id) ?? assets[0]) as Asset, location: loc }),
          });
        }
        if (s.counts.maintenance > 0) {
          const loc = s.location;
          const assetId = (assets.find((a) => a.location_id === loc.id) ?? {}).id;
          const record = maintenance.find((m) => m.asset_id === assetId);
          chipsOut.push({
            icon: <Wrench className="size-3 text-info" />,
            n: s.counts.maintenance,
            label: "maintenance",
            cls: "border-info/50",
            onClick: () => {
              if (record) onSelect({ kind: "maintenance", maintenance: record, location: loc });
            },
          });
        }
        if (s.counts.tasks > 0) {
          const loc = s.location;
          const task = planning.find((t) => t.location_code === s.stationCode);
          chipsOut.push({
            icon: <GitPullRequest className="size-3 text-cyan-400" />,
            n: s.counts.tasks,
            label: "planning tasks",
            cls: "border-cyan-500/50",
            onClick: () => {
              if (task) onSelect({ kind: "task", task, location: loc });
            },
          });
        }
        if (chipsOut.length === 0) return null;
        return (
          <div
            key={`counts-${s.key}`}
            className="absolute flex items-center gap-1"
            style={{ left: s.x - (chipsOut.length * 46) / 2, top: box.countsTop, height: MAP_COUNT_CHIP_H }}
          >
            {chipsOut.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.onClick}
                className={`flex h-[18px] w-11 items-center justify-center gap-0.5 rounded border bg-navy-800 text-2xs font-semibold text-navy-200 hover:bg-navy-700 ${chip.cls}`}
                title={`${chip.n} ${chip.label} at ${s.stationCode}`}
              >
                {chip.icon}
                {chip.n}
              </button>
            ))}
          </div>
        );
      })}

      {/* 7. this lane's own kilometre ruler */}
      <div className="absolute" style={{ left: MAP_PLANE_PAD_X, width: width - MAP_PLANE_PAD_X * 2, top: box.rulerTop, height: MAP_KM_RULER_H }}>
        <div className="absolute left-0 right-0 top-0 border-t border-navy-700/70" aria-hidden="true" />
        {[
          { km: lane.kmMin, label: fmtKm(lane.kmMin) },
          { km: (lane.kmMin + lane.kmMax) / 2, label: fmtKm((lane.kmMin + lane.kmMax) / 2) },
          { km: lane.kmMax, label: fmtKm(lane.kmMax) },
        ].map((tick, i) => (
          <span
            key={`${tick.label}-${i}`}
            className="absolute top-0 flex items-center gap-1 font-mono text-2xs text-navy-400"
            style={{
              left: i === 0 ? 0 : i === 1 ? "50%" : undefined,
              right: i === 2 ? 0 : undefined,
              transform: i === 1 ? "translateX(-50%)" : undefined,
              height: MAP_KM_RULER_H,
            }}
          >
            <span className="border-l border-navy-600 pl-1">{tick.label}</span>
          </span>
        ))}
      </div>

      {/* 8. stations and blocks whose kilometre / line could not be resolved */}
      {lane.unknownKm.length > 0 || lane.orphanBlocks.length > 0 || lane.orphanTrains.length > 0 ? (
        <div
          className="absolute flex items-center gap-1.5 rounded border border-dashed border-navy-600 px-1.5"
          style={{ left: MAP_PLANE_PAD_X, top: box.countsTop, height: MAP_COUNT_CHIP_H, width: width - MAP_PLANE_PAD_X * 2 }}
        >
          <CircleAlert className="size-3 shrink-0 text-amber-400" />
          <span className="truncate text-2xs text-amber-200">
            position unavailable:
            {lane.unknownKm.length > 0 ? ` km missing for ${lane.unknownKm.map((s) => s.stationCode).join(", ")}` : ""}
            {lane.orphanBlocks.length > 0 ? ` ${lane.orphanBlocks.length} block(s) not on this line` : ""}
            {lane.orphanTrains.length > 0 ? ` ${lane.orphanTrains.length} train(s) not on this line` : ""}
          </span>
        </div>
      ) : null}

      {lane.kmKnown ? null : (
        <div
          className="absolute flex items-center gap-1.5 rounded border border-dashed border-amber-500/70 px-2"
          style={{ left: MAP_PLANE_PAD_X, top: box.railTop, width: width - MAP_PLANE_PAD_X * 2, height: MAP_RAIL_H }}
        >
          <CircleAlert className="size-3 shrink-0 text-amber-400" />
          <span className="text-2xs text-amber-200">This line has no kilometre data in the catalogue — schematic only.</span>
        </div>
      )}
    </div>
  );
}

function UnmappedStrip({
  top,
  blocks,
  trains,
  blockLocation,
  onSelect,
}: {
  top: number;
  blocks: CorridorBlock[];
  trains: ActiveTrain[];
  blockLocation: (block: CorridorBlock) => Location | null;
  onSelect: (selection: Selection) => void;
}) {
  const total = blocks.length + trains.length;
  return (
    <div
      data-testid="unmapped-strip"
      className="absolute left-0 flex flex-col gap-1 rounded-lg border border-dashed border-amber-500/50 bg-navy-900/60 px-2 py-1.5"
      style={{ top, height: UNMAPPED_STRIP_H }}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-wider text-amber-300">
          <CircleAlert className="size-3" /> Position unavailable — {total} record{total === 1 ? "" : "s"}
        </span>
        <span className="text-2xs text-navy-400">
          no matching line/station in the location catalogue, so these are not plotted and no position is invented
        </span>
      </div>
      {/* Scrolls rather than clipping: every unplaceable record stays listed. */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-testid="unmapped-strip-scroll">
        <div className="flex flex-wrap items-start gap-1.5">
          {blocks.map((block) => {
            const loc = blockLocation(block);
            const reason =
              block.line && !block.station
                ? `line "${block.line}" is not in the location catalogue`
                : !block.line && block.station
                  ? `station ${block.station} is not in the location catalogue`
                  : block.station
                    ? `station ${block.station} is not on line ${block.line}`
                    : "no line or station recorded";
            const label = `${block.line ?? "line ?"} / ${block.station ?? "station ?"} — ${block.title} · ${block.qualifier} · ${block.timeLabel}`;
            const cls =
              "max-w-full whitespace-normal break-words rounded border border-amber-500/40 bg-navy-800 px-1.5 py-0.5 text-2xs leading-snug text-amber-200/90";
            return loc ? (
              <button
                key={block.id}
                type="button"
                onClick={() => {
                  if (block.requirement) onSelect({ kind: "block-req", block: block.requirement, location: loc });
                }}
                className={`${cls} text-left hover:bg-navy-700`}
                title={`${label} — ${reason}`}
              >
                {label}
                <span className="block text-navy-400">{reason}</span>
              </button>
            ) : (
              <span key={block.id} className={cls} title={`${label} — ${reason}`}>
                {label}
                <span className="block text-navy-400">{reason}</span>
              </span>
            );
          })}
          {trains.map((train) => (
            <span
              key={`ut-${train.train.id}`}
              className="max-w-full whitespace-normal break-words rounded border border-navy-600 bg-navy-800 px-1.5 py-0.5 text-2xs leading-snug text-navy-300"
              title={`Train ${train.number} reported on line ${train.lineCode ?? "unknown"}`}
            >
              train {train.number} on line {train.lineCode ?? "?"}
              <span className="block text-navy-500">line not in the location catalogue</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
 * Corridor timeline
 * ======================================================================== */

interface CorridorTimelineProps {
  lanes: Lane[];
  blocks: CorridorBlock[];
  windows: CoaAvailableWindow[];
  candidates: CandidateWindow[];
  occupancy: CoaLineOccupancy[];
  blockLocation: (block: CorridorBlock) => Location | null;
  onSelect: (selection: Selection) => void;
}

interface PackedBar {
  bar: TimeBar;
  left: number;
  width: number;
  row: number;
  /** true when the record carries no usable time and is parked in the gutter. */
  unplaceable: boolean;
}

function CorridorTimeline({
  lanes,
  blocks,
  windows,
  candidates,
  occupancy,
  blockLocation,
  onSelect,
}: CorridorTimelineProps) {
  const windowById = useMemo(() => new Map(windows.map((w) => [w.id, w])), [windows]);

  /* ---- per line, per sub-lane: the real records, no truncation */
  const series = useMemo(() => {
    const map = new Map<string, Map<SublaneKey, TimeBar[]>>();
    const get = (line: string) => {
      let entry = map.get(line);
      if (!entry) {
        entry = new Map(SUBLANES.map((s) => [s.key, [] as TimeBar[]]));
        map.set(line, entry);
      }
      return entry;
    };
    const push = (line: string, sublane: SublaneKey, bar: TimeBar) => {
      if (!line) return;
      get(line).get(sublane)!.push(bar);
    };

    for (const w of windows) {
      push(w.line_number, "windows", {
        id: `win-${w.id}`,
        start: minutesOfDay(w.window_start),
        end: minutesOfDay(w.window_end),
        badge: `${w.duration_minutes}m`,
        tip: `Available window · ${w.station_code} · ${fmtRange(w.window_start, w.window_end)} · ${w.window_status}`,
        tone: "window",
      });
    }
    for (const c of candidates) {
      const w = windowById.get(c.available_window_id);
      if (!w) continue;
      push(w.line_number, "candidates", {
        id: `cand-${c.id}`,
        start: minutesOfDay(c.candidate_start),
        end: minutesOfDay(c.candidate_end),
        badge: `${c.candidate_duration_minutes}m`,
        tip: `Candidate #${c.id} · ${w.station_code} · ${fmtRange(c.candidate_start, c.candidate_end)} · ${c.feasibility_status}${
          c.feasibility_reason ? ` · ${c.feasibility_reason}` : ""
        }`,
        tone: c.feasible ? "candOk" : "candNo",
      });
    }
    for (const o of occupancy) {
      push(o.line_number, "occupancy", {
        id: `occ-${o.id}`,
        start: minutesOfDay(o.occupancy_start),
        end: minutesOfDay(o.occupancy_end),
        badge: o.train_id != null ? `T${o.train_id}` : o.occupancy_status,
        tip: `Occupancy · ${o.station_code} · train ${o.train_id ?? "—"} · ${fmtRange(o.occupancy_start, o.occupancy_end)} · ${o.occupancy_status}`,
        tone: "occ",
      });
    }
    for (const b of blocks) {
      if (!b.line) continue;
      const start = b.requirement
        ? minutesOfDay(b.requirement.earliest_start)
        : b.planned
          ? minutesOfDay(b.planned.task.planned_start)
          : null;
      const end = b.requirement
        ? minutesOfDay(b.requirement.latest_end)
        : b.planned
          ? minutesOfDay(b.planned.task.planned_end)
          : null;
      push(b.line, b.origin === "planned" ? "planned" : "requirements", {
        id: `tb-${b.id}`,
        start,
        end,
        badge: b.durationMinutes != null ? `${b.durationMinutes}m` : "—",
        tip: `${b.title} · ${b.station ?? "station —"} · ${b.timeLabel}`,
        tone: b.origin === "planned" ? "planned" : "req",
        onSelect: () => {
          if (b.origin === "planned" && b.planned) {
            onSelect({ kind: "planned", block: b.planned });
            return;
          }
          if (!b.requirement) return;
          const loc = blockLocation(b);
          if (loc) onSelect({ kind: "block-req", block: b.requirement, location: loc });
        },
      });
    }
    for (const entry of map.values()) {
      for (const list of entry.values()) list.sort((a, b) => a.id.localeCompare(b.id));
    }
    return map;
  }, [windows, candidates, occupancy, blocks, windowById, onSelect, blockLocation]);

  /* ---- every sub-lane packs into <= TL_MAX_SUBLANE_ROWS, else the axis widens */
  const pxPerHour = useMemo(() => {
    const all: TimeBar[][] = [];
    for (const entry of series.values()) {
      for (const { key } of SUBLANES) {
        const list = entry.get(key) ?? [];
        if (list.length > 0) all.push(list);
      }
    }
    const rowsNeeded = (value: number) => {
      let worst = 0;
      for (const list of all) {
        worst = Math.max(worst, packSublane(list, value).rows);
      }
      return worst;
    };
    if (rowsNeeded(TL_MAX_PX_PER_HOUR) <= TL_MAX_SUBLANE_ROWS) return TL_MAX_PX_PER_HOUR;
    if (rowsNeeded(TL_MIN_PX_PER_HOUR) > TL_MAX_SUBLANE_ROWS) return TL_MIN_PX_PER_HOUR;
    let lo = TL_MIN_PX_PER_HOUR;
    let hi = TL_MAX_PX_PER_HOUR;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (rowsNeeded(mid) <= TL_MAX_SUBLANE_ROWS) hi = mid;
      else lo = mid;
    }
    return hi;
  }, [series]);

  const axisWidth = pxPerHour * 24;
  const innerWidth = TL_LABEL_W + TL_SUBLABEL_W + TL_LABEL_GAP + axisWidth;

  const rows = useMemo(
    () => {
      const computed = lanes.map((lane) => {
        const entry = series.get(lane.key) ?? new Map<SublaneKey, TimeBar[]>();
        // Each sub-lane starts where the previous one ended, so the five
        // sub-lanes stack instead of being drawn on top of each other.
        let offset = 0;
        let naturalH = 0;
        let unplaceable = 0;
        // Only render sublanes that have actual data (count > 0).
        // This collapses empty sublanes completely.
        const sublanes = SUBLANES.map((sublane) => {
          const list = entry.get(sublane.key) ?? [];
          if (list.length === 0) return null;
          const packed = packSublane(list, pxPerHour);
          const h = Math.max(TL_SUBLANE_H, packed.rows * TL_SUBLANE_H);
          unplaceable += packed.bars.filter((b) => b.unplaceable).length;
          const placed = { sublane, packed, count: list.length, offset, height: h };
          offset += h + TL_SUBLANE_PAD;
          naturalH += h + TL_SUBLANE_PAD;
          return placed;
        }).filter((s): s is NonNullable<typeof s> => s !== null);

        // Remove trailing sublane pad from the last sublane to avoid extra gap at bottom
        const correctedNaturalH = sublanes.length > 0 ? naturalH - TL_SUBLANE_PAD : 0;

        return {
          lane,
          sublanes,
          naturalH: correctedNaturalH + TL_ROW_PAD,
          bodyH: Math.min(TL_ROW_MAX_H, correctedNaturalH + TL_ROW_PAD),
          capped: correctedNaturalH + TL_ROW_PAD > TL_ROW_MAX_H,
          unplaceable,
        };
      });

      // DEV DIAGNOSTICS: log each lane's computed heights to identify the gap source
      if (process.env.NODE_ENV !== 'production') {
        console.group('[CorridorTimeline] Row height diagnostics');
        computed.forEach((row, i) => {
          console.log(`Lane ${i} (${row.lane.key}):`, {
            sublaneCount: row.sublanes.length,
            sublanes: row.sublanes.map(s => ({
              key: s.sublane.key,
              label: s.sublane.label,
              count: s.count,
              packedRows: s.packed.rows,
              height: s.height,
              offset: s.offset,
            })),
            naturalH: row.naturalH,
            bodyH: row.bodyH,
            capped: row.capped,
            unplaceable: row.unplaceable,
          });
        });
        const totalNaturalH = computed.reduce((sum, r) => sum + r.naturalH, 0);
        const totalBodyH = computed.reduce((sum, r) => sum + r.bodyH, 0);
        console.log(`Total naturalH: ${totalNaturalH}px, Total bodyH: ${totalBodyH}px, Lanes: ${computed.length}`);
        console.groupEnd();
      }

      // Filter out lanes that have NO visible sublanes (no data at all)
      // These lanes only render the label column which forces ~40-60px minimum height
      return computed.filter(row => row.sublanes.length > 0);
    },
    [lanes, series, pxPerHour],
  );

  const orphanLines = useMemo(() => {
    const known = new Set(lanes.map((l) => l.key));
    const extra = new Set<string>();
    for (const [line, entry] of series) {
      if (known.has(line)) continue;
      let any = false;
      for (const list of entry.values()) if (list.length > 0) any = true;
      if (any) extra.add(line);
    }
    return Array.from(extra).sort();
  }, [series, lanes]);

  const now = new Date();
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;

  return (
    <section className="min-w-0 rounded-lg border border-line bg-surface-white p-5 shadow-card">
      <SectionHeader
        icon={CalendarRange}
        title="Daily timeline"
        description={`One shared 00:00 → 24:00 axis at ${Math.round(pxPerHour)} px/hour. Each line section gets its own stacked lanes, so no two records ever overlap.`}
        right={<Badge variant="outline" className="text-2xs">00:00 → 24:00</Badge>}
      />

      <div className="mt-4 min-w-0 overflow-x-auto rounded-lg border border-line">
        <div style={{ width: innerWidth, minWidth: "100%" }}>
          {/* time axis header — inside the same scroller so it stays aligned */}
          <div className="grid items-end border-b border-line bg-surface-muted/50" style={{ gridTemplateColumns: `${TL_LABEL_W}px ${TL_SUBLABEL_W}px 1fr`, height: 30 }}>
            <div className="truncate px-2 font-mono text-2xs font-medium uppercase text-ink-faint">Line section</div>
            <div className="truncate px-1 font-mono text-2xs font-medium uppercase text-ink-faint">Data</div>
            <div className="relative h-full" style={{ marginRight: TL_LABEL_GAP }}>
              {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
                <span
                  key={hour}
                  className="absolute bottom-0 flex h-full items-end border-l border-slate-300 pl-1 font-mono text-2xs text-slate-500"
                  style={{ left: `${(hour / 24) * 100}%` }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
              <span
                className="absolute bottom-0 flex h-full items-end border-l border-slate-300 pl-1 font-mono text-2xs text-slate-500"
                style={{ left: "100%" }}
              >
                24:00
              </span>
              <div className="absolute inset-y-0 border-l-2 border-brand-500/70" style={{ left: `${nowPct}%` }} aria-hidden="true" />
            </div>
          </div>

          {rows.map(({ lane, sublanes, bodyH, naturalH, capped, unplaceable }) => (
            <div
              key={lane.key}
              data-testid={`tl-row-${lane.key}`}
              className="grid border-b border-line last:border-b-0"
              style={{ gridTemplateColumns: `${TL_LABEL_W}px ${TL_SUBLABEL_W}px 1fr` }}
            >
              <div className="border-r border-line px-2 py-1.5">
                <p className="truncate font-mono text-2xs font-semibold text-ink">{lane.name}</p>
                <p className="truncate font-mono text-2xs text-ink-faint">{lane.section}</p>
                <p className="truncate font-mono text-2xs text-ink-faint">{lane.key}</p>
              </div>
              {/* sub-lane captions live in their own gutter, so a caption can
                  never be drawn on top of a bar at 00:00 */}
              <div className="relative border-r border-line/70" aria-hidden="true">
                {sublanes.map(({ sublane, count, offset }) => (
                  <span
                    key={sublane.key}
                    className="absolute left-1 whitespace-nowrap font-mono text-2xs uppercase text-ink-faint"
                    style={{ top: offset + 3 }}
                  >
                    {sublane.label}
                    {count > 0 ? <span className="ml-0.5 text-ink-muted">·{count}</span> : null}
                  </span>
                ))}
              </div>
              <div className="relative">
                {/* The row body is capped and scrolls internally. Every record
                    stays rendered; nothing is dropped or hidden by the cap. */}
                <div
                  data-testid={`tl-body-${lane.key}`}
                  className="relative overflow-y-auto"
                  style={{ height: bodyH, marginRight: TL_LABEL_GAP }}
                  title={
                    capped
                      ? `${naturalH}px of stacked records, shown in a ${bodyH}px scrollable area`
                      : undefined
                  }
                >
                  {/* hour grid */}
                  {Array.from({ length: 25 }, (_, hour) => (
                    <div
                      key={hour}
                      className="absolute inset-y-0 border-l border-slate-200/80"
                      style={{ left: `${(hour / 24) * 100}%` }}
                      aria-hidden="true"
                    />
                  ))}
                  <div className="absolute inset-y-0 border-l-2 border-brand-500/70" style={{ left: `${nowPct}%` }} aria-hidden="true" />

                  {/* records with no usable time are parked in a labelled
                      gutter at the left edge rather than being given a
                      fabricated position on the axis */}
                  {unplaceable > 0 ? (
                    <div
                      data-testid={`tl-unplaceable-${lane.key}`}
                      className="absolute inset-y-0 left-0 z-20 flex w-5 items-start justify-center border-r border-dashed border-slate-400 pt-0.5"
                      title={`${unplaceable} record(s) have no usable time; their real time is in the tooltip`}
                    >
                      <CircleAlert className="size-3 text-amber-600" />
                    </div>
                  ) : null}

                  <div className="relative" style={{ height: naturalH }}>
                    {sublanes.map(({ sublane, packed, offset, height }) => (
                      /* each sub-lane is a real band; bars are positioned inside it */
                      <div key={sublane.key} className="absolute left-0 right-0" style={{ top: offset, height }}>
                        {packed.bars.map((item) => (
                          <TimelineBar key={item.bar.id} item={item} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                {capped ? (
                  <p className="absolute right-1 top-0.5 z-20 rounded bg-white/85 px-1 font-mono text-2xs text-slate-500">
                    scroll ↕
                  </p>
                ) : null}
              </div>
            </div>
          ))}

          {orphanLines.length > 0 ? (
            <div className="grid border-t border-line bg-amber-50/60" style={{ gridTemplateColumns: `${TL_LABEL_W}px ${TL_SUBLABEL_W}px 1fr` }}>
              <div className="border-r border-line px-2 py-1.5">
                <p className="truncate font-mono text-2xs font-semibold text-amber-800">Unmapped lines</p>
                <p className="truncate font-mono text-2xs text-amber-700">{orphanLines.join(", ")}</p>
              </div>
              <div className="border-r border-line/70" aria-hidden="true" />
              <div className="px-2 py-1.5 text-2xs text-amber-800" style={{ marginRight: TL_LABEL_GAP }}>
                <CircleAlert className="mr-1 inline size-3" />
                COA / block records exist for {orphanLines.length} line(s) with no entry in the location catalogue, so
                they are not drawn against a track.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-slate-500">
        <span className="font-semibold uppercase tracking-wider text-slate-400">Legend</span>
        <TimelineLegendItem cls="border-emerald-600/60 bg-emerald-500/80" label="Available window" />
        <TimelineLegendItem cls="border-emerald-600/60 bg-emerald-400/80" label="Candidate (feasible)" />
        <TimelineLegendItem cls="border-amber-600/60 bg-amber-500/80" label="Candidate (infeasible)" />
        <TimelineLegendItem cls="bg-amber-500/90" label="Line occupancy" />
        <TimelineLegendItem cls="border-red-300/70 bg-red-600" label="Maintenance block requirement" />
        <TimelineLegendItem cls="border-amber-200/80 bg-red-500 ring-1 ring-amber-300/60" label="Planned block" />
      </div>
    </section>
  );
}

function TimelineLegendItem({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-5 rounded-sm border ${cls}`} aria-hidden="true" />
      {label}
    </span>
  );
}

const TONE_CLASS: Record<TimeBar["tone"], string> = {
  window: "border-emerald-600/70 bg-emerald-500/85",
  candOk: "border-emerald-600/70 bg-emerald-400/85",
  candNo: "border-amber-600/70 bg-amber-500/85",
  occ: "border-amber-700/60 bg-amber-500/95",
  req: "border-red-300/70 bg-red-600/90",
  planned: "border-amber-200/80 bg-red-500 ring-1 ring-amber-300/60",
};

function TimelineBar({ item }: { item: PackedBar }) {
  const wide = item.width >= 46;
  const common = {
    className: `absolute overflow-hidden rounded-sm border text-2xs font-semibold leading-none text-white ${TONE_CLASS[item.bar.tone]}`,
    style: {
      left: item.unplaceable ? 1 : item.left,
      width: item.unplaceable ? TL_MIN_BAR_PX : item.width,
      top: item.row * TL_SUBLANE_H,
      height: TL_SUBLANE_H - 2,
      ...(item.unplaceable ? { opacity: 0.55 } : null),
    },
    title: item.unplaceable ? `${item.bar.tip}\n(no usable time — parked in the left gutter)` : item.bar.tip,
  };
  const body = wide ? (
    <span className="flex h-full items-center gap-1 px-1">
      <span className="truncate">{item.bar.badge}</span>
    </span>
  ) : null;
  if (item.bar.onSelect) {
    return (
      <button type="button" {...common} onClick={item.bar.onSelect}>
        {body}
      </button>
    );
  }
  return <div {...common}>{body}</div>;
}

/* ==========================================================================
 * Time-axis packing: greedy interval packing inside each sub-lane.
 * ======================================================================== */

function packSublane(bars: TimeBar[], pxPerHour: number): { bars: PackedBar[]; rows: number; offset: number } {
  const usable = Math.max(1, pxPerHour * 24);
  const placed: { bar: TimeBar; left: number; width: number }[] = [];
  const unplaceable: TimeBar[] = [];
  for (const bar of bars) {
    // A record with no usable time is never given a fabricated position: it is
    // marked so the renderer can park it in a clearly-labelled gutter instead.
    if (bar.start === null || !Number.isFinite(bar.start)) {
      unplaceable.push(bar);
      continue;
    }
    const startMin = Math.max(0, Math.min(1440, bar.start));
    const endMin = Math.max(startMin, Math.min(1440, bar.end ?? bar.start));
    const left = (startMin / 1440) * usable;
    const width = Math.max(TL_MIN_BAR_PX, ((endMin - startMin) / 1440) * usable - 1);
    placed.push({ bar, left, width: Math.min(Math.max(width, TL_MIN_BAR_PX), Math.max(TL_MIN_BAR_PX, usable - left)) });
  }
  placed.sort((a, b) => a.left - b.left || b.width - a.width || byId(a.bar, b.bar));

  const rowEnds: number[] = [];
  const rowOf = new Map<string, number>();
  const gutter = 1.5;
  for (const item of placed) {
    let row = rowEnds.findIndex((end) => end <= item.left + 0.5);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(0);
    }
    rowOf.set(item.bar.id, row);
    rowEnds[row] = item.left + item.width + gutter;
  }

  const rows = rowEnds.length;
  const out: PackedBar[] = [];
  for (const bar of bars) {
    const found = placed.find((p) => p.bar.id === bar.id);
    if (found) out.push({ bar, left: found.left, width: found.width, row: rowOf.get(bar.id) ?? 0, unplaceable: false });
    else out.push({ bar, left: 0, width: TL_MIN_BAR_PX, row: 0, unplaceable: true });
  }
  return { bars: out, rows, offset: 0 };
}

/* ==========================================================================
 * Selection drawer
 * ======================================================================== */

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
  locations: Location[];
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
  locations,
}: SelectionDrawerProps) {
  if (!selection) return null;

  const title =
    selection.kind === "station"
      ? `${selection.location.station_name || selection.location.station_code} · km ${fmtKm(asKm(selection.location.km_start))}`
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
          ? `${selection.block.station} · ${selection.block.line} · ${fmtRange(selection.block.task.planned_start, selection.block.task.planned_end)} (${selection.block.task.planned_duration_minutes}m)`
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
              <SectionHeader icon={Boxes} title="Assets here" description={`${stationDetail(selection.location).assets.length} real /api/assets at km ${fmtKm(asKm(selection.location.km_start))}`} />
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
            <section>
              <SectionHeader icon={Route} title="Catalogue rows for this station" description={`${locations.filter((l) => l.station_code === selection.location.station_code).length} location row(s) in GET /api/locations`} />
              <div className="space-y-1.5">
                {locations
                  .filter((l) => l.station_code === selection.location.station_code)
                  .map((l) => (
                    <div key={l.id} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-muted/40 px-3 py-2 text-xs">
                      <span className="font-mono font-semibold">{l.line_code ?? "—"}</span>
                      <span className="truncate text-ink-muted">{l.line_name ?? "—"}</span>
                      <span className="truncate text-ink-faint">{l.section_name ?? l.section_code ?? "—"}</span>
                      <span className="ml-auto font-mono tabular-nums text-ink-muted">
                        km {fmtKm(asKm(l.km_start))} → {fmtKm(asKm(l.km_end))}
                      </span>
                    </div>
                  ))}
              </div>
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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const color = flag === "D" ? "#60a5fa" : flag === "A" ? "#fbbf24" : "#8ba3c9";
  const bgColor = flag === "D" ? "#1e3a5f" : flag === "A" ? "#4a3a1a" : "#2a3a4a";
  const borderColor = flag === "D" ? "#3b82f6" : flag === "A" ? "#fbbf24" : "#5a6a7c";
  return (
    <svg viewBox="0 0 64 26" className="h-3.5 w-7 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={`tg-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bgColor} />
          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`tg-loco-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect x="4" y="6" width="44" height="10" rx="3" fill={`url(#tg-body-${uid})`} stroke={borderColor} strokeWidth="1.5" />
      <rect x="48" y="8" width="8" height="6" rx="2" fill={`url(#tg-loco-${uid})`} stroke={borderColor} strokeWidth="1" />
      <rect x="51" y="9" width="4" height="4" rx="1" fill={bgColor} stroke={borderColor} strokeWidth="0.5" />
      <rect x="10" y="8" width="6" height="4" rx="1" fill={bgColor} stroke={borderColor} strokeWidth="0.5" opacity="0.8" />
      <rect x="20" y="8" width="6" height="4" rx="1" fill={bgColor} stroke={borderColor} strokeWidth="0.5" opacity="0.8" />
      <rect x="30" y="8" width="6" height="4" rx="1" fill={bgColor} stroke={borderColor} strokeWidth="0.5" opacity="0.8" />
      <circle cx="13" cy="20" r="3" fill="#0b1424" stroke={borderColor} strokeWidth="1" />
      <circle cx="23" cy="20" r="3" fill="#0b1424" stroke={borderColor} strokeWidth="1" />
      <circle cx="33" cy="20" r="3" fill="#0b1424" stroke={borderColor} strokeWidth="1" />
      <circle cx="43" cy="20" r="3" fill="#0b1424" stroke={borderColor} strokeWidth="1" />
      <circle cx="53" cy="20" r="3" fill="#0b1424" stroke={borderColor} strokeWidth="1" />
      {flag === "D" ? (
        <path d="M54 11 L58 14 L54 17" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {flag === "A" ? (
        <path d="M50 11 L46 14 L50 17" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {flag === "T" ? (
        <>
          <path d="M54 11 L58 14 L54 17" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          <path d="M50 11 L46 14 L50 17" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </>
      ) : null}
    </svg>
  );
}
