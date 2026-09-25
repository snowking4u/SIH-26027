import { cva } from "class-variance-authority";
import { ChevronsLeft, ChevronsRight, TrainFront } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app";
import { getNavGroupsForRole, type NavItem } from "@/config/navigation";
import { ROLE_CONFIGS } from "@/config/roles";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/utils/cn";

const itemVariants = cva(
  "relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      collapsed: {
        false: "mx-2 h-9 px-3",
        true: "mx-1.5 h-9 justify-center px-0",
      },
      active: {
        false: "text-navy-400 hover:bg-navy-800/70 hover:text-navy-200",
        true: "bg-navy-800 text-white",
      },
    },
  },
);

const itemIconVariants = cva("transition-colors [&_svg]:size-4", {
  variants: {
    active: {
      false: "text-navy-400 group-hover:text-navy-200",
      true: "text-brand-400",
    },
  },
});

function BrandBlock({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const currentRole = user?.role || "controller";
  const roleConfig = ROLE_CONFIGS[currentRole] || ROLE_CONFIGS.controller;

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-navy-800 px-4 py-4",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card [&_svg]:size-5">
        <TrainFront aria-hidden="true" />
      </span>
      {!collapsed ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold tracking-wide text-white">{APP_CONFIG.displayName}</p>
          <p className="truncate text-2xs text-brand-400 font-medium">{roleConfig.badge} · Portal</p>
        </div>
      ) : null}
    </div>
  );
}

function NavItemLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();

  const isCurrentActive = () => {
    const currentPathWithSearch = location.pathname + (location.search || "");
    if (item.path.includes("?")) {
      return currentPathWithSearch === item.path;
    }
    if (location.pathname === item.path) {
      const tabParam = new URLSearchParams(location.search).get("tab");
      return !tabParam || tabParam === "overview";
    }
    return false;
  };

  const isActive = isCurrentActive();
  const className = cn("group", itemVariants({ collapsed, active: isActive }));

  const link = (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={className}
      aria-label={collapsed ? item.label : undefined}
    >
      {isActive && !collapsed ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand-400"
          aria-hidden="true"
        />
      ) : null}
      <span className={cn(itemIconVariants({ active: isActive }))}>
        <item.icon aria-hidden="true" />
      </span>
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="!ml-2">
        {item.label}
        <span className="mt-0.5 block max-w-[12rem] font-normal text-navy-400">{item.description}</span>
      </TooltipContent>
    </Tooltip>
  );
}

/** Brand + grouped navigation. Reused by the desktop rail and the mobile drawer. */
export function SidebarRail({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const currentRole = user?.role || "controller";
  const navGroups = getNavGroupsForRole(currentRole);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-full flex-col bg-navy-950 transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <BrandBlock collapsed={collapsed} />
        <nav className="flex-1 overflow-y-auto py-3" aria-label="Primary">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed ? (
                <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-400/70">
                  {group.label}
                </p>
              ) : (
                <div className="mx-3 mb-1 border-t border-navy-800" aria-hidden="true" />
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavItemLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}

export interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
}

/** Desktop rail with brand, grouped navigation and collapse control. */
export function AppSidebar({ collapsed, onToggleCollapsed, onNavigate }: AppSidebarProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-navy-950 transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <SidebarRail collapsed={collapsed} onNavigate={onNavigate} />
      <div className="border-t border-navy-800 p-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-3 rounded-md text-sm font-medium text-navy-400 transition-colors hover:bg-navy-800/70 hover:text-navy-200",
            collapsed ? "h-9 justify-center px-0" : "h-9 px-3",
          )}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" aria-hidden="true" />
          ) : (
            <ChevronsLeft className="size-4" aria-hidden="true" />
          )}
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </div>
  );
}