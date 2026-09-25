import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BellRing,
  Building2,
  CalendarClock,
  ClipboardList,
  FileSearch,
  Hammer,
  Layers,
  ListChecks,
  Map,
  RadioTower,
  Settings,
  ShieldCheck,
  Target,
  TrainFront,
  Undo2,
  Wrench,
  Zap,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Role-based navigation for the block-planning control system.
 *
 * Operations Control owns the executive screens; Department Workspaces are the
 * request originators; Planning & Requests covers the planning chain; Insight
 * dips into the authoritative source systems (COA/TMS/TDMS/SMMS/Unified).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Primary",
    items: [
      {
        label: "Overview",
        path: "/",
        icon: Activity,
        description: "Operational status across the division",
      },
      {
        label: "Controller",
        path: "/controller",
        icon: ShieldCheck,
        description: "Review, validate and decide on block plans",
      },
      {
        label: "Live Map",
        path: "/live-map",
        icon: Map,
        description: "Unified railway network drill-down",
      },
    ],
  },
  {
    label: "Departments",
    items: [
      {
        label: "Engineering",
        path: "/departments/engineering",
        icon: Wrench,
        description: "Track, bridges and level crossings",
      },
      {
        label: "S&T / Signal",
        path: "/departments/snt",
        icon: RadioTower,
        description: "Signalling, track circuits and points",
      },
      {
        label: "Traction / TRD",
        path: "/departments/traction",
        icon: Zap,
        description: "Overhead equipment and traction distribution",
      },
    ],
  },
  {
    label: "Planning",
    items: [
      {
        label: "Planning",
        path: "/planning",
        icon: ListChecks,
        description: "Tasks, constraints, resources and dependencies",
      },
      {
        label: "Block Requests",
        path: "/block-requests",
        icon: ClipboardList,
        description: "Traffic and power block requirements",
      },
      {
        label: "Candidate Windows",
        path: "/candidate-windows",
        icon: Target,
        description: "Feasible task ↔ window matches",
      },
      {
        label: "Block Plans",
        path: "/block-plans",
        icon: CalendarClock,
        description: "Persisted block-plan proposals",
      },
      {
        label: "Rework",
        path: "/rework",
        icon: Undo2,
        description: "Controller-rejected plans awaiting revised recommendations",
      },
      {
        label: "Train Impact",
        path: "/train-impact",
        icon: TrainFront,
        description: "Trains in the corridor of proposed blocks",
      },
    ],
  },
  {
    label: "Sources",
    items: [
      {
        label: "Unified",
        path: "/unified",
        icon: Layers,
        description: "Merged defects, maintenance and blocks",
      },
      {
        label: "COA",
        path: "/coa",
        icon: TrainFront,
        description: "Trains, schedules, movements and occupancy",
      },
      {
        label: "TMS",
        path: "/tms",
        icon: FileSearch,
        description: "Track monitoring inspections and defects",
      },
      {
        label: "TDMS",
        path: "/tdms",
        icon: Activity,
        description: "Structure defect and failure records",
      },
      {
        label: "SMMS",
        path: "/smms",
        icon: BellRing,
        description: "Signal telecom alerts and maintenance",
      },
    ],
  },
  {
    label: "Team & System",
    items: [
      {
        label: "Departments",
        path: "/departments",
        icon: Building2,
        description: "Department directory",
      },
      {
        label: "Maintenance",
        path: "/maintenance",
        icon: Wrench,
        description: "Maintenance requirement register",
      },
      {
        label: "Execution",
        path: "/execution",
        icon: Hammer,
        description: "Recorded block execution outcomes",
      },
      {
        label: "Audit",
        path: "/audit",
        icon: FileSearch,
        description: "Decisions and validation trace",
      },
      {
        label: "Settings",
        path: "/settings",
        icon: Settings,
        description: "Connection and runtime configuration",
      },
    ],
  },
];

/** Flat list used for fallback navigation helper code. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);