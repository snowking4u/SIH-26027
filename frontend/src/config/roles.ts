export type UserRole = "controller" | "tdms" | "tms" | "smms";

export interface RoleMetadata {
  id: UserRole;
  name: string;
  department: string;
  dashboardRoute: string;
  description: string;
  badge: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleMetadata> = {
  controller: {
    id: "controller",
    name: "Section Controller",
    department: "Operations Control (COA)",
    dashboardRoute: "/controller",
    description: "Full access to network planning, live map, corridor blocks, train impacts & executive dashboards (excluding external TDMS, TMS, SMMS logs).",
    badge: "Ops Control",
  },
  tdms: {
    id: "tdms",
    name: "TDMS Officer",
    department: "Track Defect Management System",
    dashboardRoute: "/tdms",
    description: "Dedicated access strictly to Track Defect Management System & rail structural records.",
    badge: "TDMS",
  },
  tms: {
    id: "tms",
    name: "TMS Officer",
    department: "Track Management System",
    dashboardRoute: "/tms",
    description: "Dedicated access strictly to Track Management System, inspections, and track geometry records.",
    badge: "TMS",
  },
  smms: {
    id: "smms",
    name: "SMMS Officer",
    department: "Signal Maintenance Management System",
    dashboardRoute: "/smms",
    description: "Dedicated access strictly to Signal & Telecom Maintenance Management System alarms and asset logs.",
    badge: "SMMS",
  },
};

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  controller: "/controller",
  tdms: "/tdms",
  tms: "/tms",
  smms: "/smms",
};

/**
 * Access Control Rules:
 * - TDMS: Only has access to `/tdms`
 * - TMS: Only has access to `/tms`
 * - SMMS: Only has access to `/smms`
 * - Controller: Has access to ALL dashboards EXCEPT `/tdms`, `/tms`, and `/smms`
 */
export function isRouteAllowed(role: UserRole | undefined | null, pathname: string): boolean {
  if (!role) return false;

  const path = pathname.toLowerCase();

  if (role === "tdms") {
    return path === "/tdms" || path.startsWith("/tdms/");
  }

  if (role === "tms") {
    return path === "/tms" || path.startsWith("/tms/");
  }

  if (role === "smms") {
    return path === "/smms" || path.startsWith("/smms/");
  }

  if (role === "controller") {
    // Controller cannot access internal TDMS, TMS, SMMS departmental silos
    if (
      path === "/tdms" ||
      path.startsWith("/tdms/") ||
      path === "/tms" ||
      path.startsWith("/tms/") ||
      path === "/smms" ||
      path.startsWith("/smms/")
    ) {
      return false;
    }
    return true;
  }

  return false;
}

export function getDashboardForRole(role?: string | null): string {
  if (!role) return "/login";
  const normalized = role.toLowerCase().trim() as UserRole;
  return ROLE_DASHBOARDS[normalized] || "/controller";
}
