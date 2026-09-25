import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BellRing,
  CalendarClock,
  ClipboardList,
  FileSearch,
  Hammer,
  Layers,
  ListChecks,
  Map,
  Settings,
  ShieldCheck,
  Target,
  TrainFront,
  Wrench,
} from "lucide-react";
import type { UserRole } from "./roles";

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
 * Controller Navigation: Purely Controller, Planning, Monitoring & Decisions.
 * Zero department workspaces (No TDMS, No TMS, No SMMS, No Engineering, No S&T, No TRD).
 */
export const CONTROLLER_NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations & Control",
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
    label: "Planning & Decisions",
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
        label: "Train Impact",
        path: "/train-impact",
        icon: TrainFront,
        description: "Trains in the corridor of proposed blocks",
      },
    ],
  },
  {
    label: "Live Feed & Monitoring",
    items: [
      {
        label: "COA Live Movements",
        path: "/coa",
        icon: TrainFront,
        description: "Trains, schedules, movements and occupancy",
      },
      {
        label: "Unified Feed",
        path: "/unified",
        icon: Layers,
        description: "Merged defects, maintenance and blocks",
      },
    ],
  },
  {
    label: "Execution & System",
    items: [
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

/** Filter navigation groups strictly based on the user's role */
export function getNavGroupsForRole(role: UserRole = "controller"): NavGroup[] {
  // TDMS isolated portal
  if (role === "tdms") {
    return [
      {
        label: "TDMS Portal",
        items: [
          {
            label: "TDMS Dashboard",
            path: "/tdms",
            icon: Activity,
            description: "Track structure defect & failure records",
          },
        ],
      },
    ];
  }

  // TMS isolated portal
  if (role === "tms") {
    return [
      {
        label: "TMS Portal",
        items: [
          {
            label: "TMS Dashboard",
            path: "/tms",
            icon: FileSearch,
            description: "Track monitoring inspections & defect register",
          },
        ],
      },
    ];
  }

  // SMMS isolated portal
  if (role === "smms") {
    return [
      {
        label: "SMMS Portal",
        items: [
          {
            label: "SMMS Dashboard",
            path: "/smms",
            icon: BellRing,
            description: "Signal telecom alerts & maintenance logs",
          },
        ],
      },
    ];
  }

  // Controller sees only controller operations & planning (No department workspaces)
  return CONTROLLER_NAV_GROUPS;
}

export const NAV_GROUPS: NavGroup[] = getNavGroupsForRole("controller");
export const ALL_NAV_ITEMS: NavItem[] = CONTROLLER_NAV_GROUPS.flatMap((group) => group.items);