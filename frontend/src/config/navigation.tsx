import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  ClipboardMinus,
  FileSearch,
  FileWarning,
  Hammer,
  Layers,
  ListChecks,
  Map,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  Target,
  TrainFront,
  Undo2,
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

function createDepartmentNavGroups(
  basePath: string,
  departmentName: string,
): NavGroup[] {
  return [
    {
      label: `${departmentName} Operations`,
      items: [
        {
          label: "Overview",
          path: basePath,
          icon: Target,
          description: `${departmentName} status, metrics & summary`,
        },
        {
          label: "Maintenance",
          path: `${basePath}?tab=maintenance`,
          icon: ClipboardMinus,
          description: "Scheduled & reactive maintenance logs",
        },
        {
          label: "Defects & Alerts",
          path: `${basePath}?tab=defects`,
          icon: FileWarning,
          description: "Defects, inspections & alerts",
        },
      ],
    },
    {
      label: "Planning & Assets",
      items: [
        {
          label: "Planning Tasks",
          path: `${basePath}?tab=tasks`,
          icon: ListChecks,
          description: "Planning tasks & operations",
        },
        {
          label: "Block Requirements",
          path: `${basePath}?tab=blocks`,
          icon: ClipboardList,
          description: "Traffic and power block demands",
        },
        {
          label: "Assets",
          path: `${basePath}?tab=assets`,
          icon: Package,
          description: "Asset inventory & location details",
        },
      ],
    },
    {
      label: "Requests",
      items: [
        {
          label: "Raise Request",
          path: `${basePath}?tab=request`,
          icon: ScrollText,
          description: "Submit new maintenance block requirement",
        },
      ],
    },
  ];
}

/** Filter navigation groups strictly based on the user's role */
export function getNavGroupsForRole(role: UserRole = "controller"): NavGroup[] {
  // TDMS isolated portal
  if (role === "tdms") {
    return createDepartmentNavGroups("/tdms", "TDMS");
  }

  // TMS isolated portal
  if (role === "tms") {
    return createDepartmentNavGroups("/tms", "TMS");
  }

  // SMMS isolated portal
  if (role === "smms") {
    return createDepartmentNavGroups("/smms", "SMMS");
  }

  // Controller sees only controller operations & planning (No department workspaces)
  return CONTROLLER_NAV_GROUPS;
}

export const NAV_GROUPS: NavGroup[] = getNavGroupsForRole("controller");
export const ALL_NAV_ITEMS: NavItem[] = CONTROLLER_NAV_GROUPS.flatMap((group) => group.items);
