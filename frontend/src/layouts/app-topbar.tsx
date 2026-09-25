import { ChevronDown, LogOut, MapPin, Menu } from "lucide-react";
import { useState } from "react";

import { ConnectionControl } from "@/components/common/connection-control";
import { StatusBadge } from "@/components/common/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_CONFIG } from "@/config/app";
import { ROLE_CONFIGS } from "@/config/roles";
import { useAuth } from "@/context/auth-context";
import type { HealthState } from "@/types/health";

export interface AppTopbarProps {
  health: HealthState & { retry: () => void };
  onOpenMobileNav: () => void;
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const currentRole = user?.role || "controller";
  const roleConfig = ROLE_CONFIGS[currentRole] || ROLE_CONFIGS.controller;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CT";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User account menu"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-navy-300 transition-colors hover:bg-navy-800/70 hover:text-white border border-navy-700/60"
        >
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[10px] font-bold text-white shadow-card">
            {initials}
          </span>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold leading-tight text-white">{user?.name || "Controller"}</p>
            <p className="text-3xs text-brand-400 leading-tight font-medium">{roleConfig.badge}</p>
          </div>
          <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52" align="end">
        <DropdownMenuLabel className="pb-1.5">
          <p className="text-xs font-semibold text-white">{user?.name || "Official"}</p>
          <p className="text-2xs font-normal text-navy-400 mt-0.5">{roleConfig.department}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={logout}
          className="text-rose-400 hover:text-rose-300 focus:text-rose-300 cursor-pointer"
        >
          <LogOut className="size-3.5 mr-2" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppTopbar({ health, onOpenMobileNav }: AppTopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-navy-800 bg-navy-900/95 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="-ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-navy-300 transition-colors hover:bg-navy-800/70 hover:text-white lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="hidden min-w-0 items-baseline gap-2 lg:flex">
        <span className="truncate text-sm font-bold tracking-wide text-white">{APP_CONFIG.displayName}</span>
        <span className="truncate text-2xs text-navy-400">{APP_CONFIG.tagline}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-1.5 text-xs font-medium text-navy-300 md:inline-flex">
          <MapPin className="size-3.5 text-navy-400" aria-hidden="true" />
          {APP_CONFIG.division}
        </span>

        <StatusBadge status={APP_CONFIG.dataMode} tone="ai" className="hidden sm:inline-flex" pulse />

        <ConnectionControl health={health} onRetry={health.retry} className="hidden sm:inline-flex" />

        <UserMenu />
      </div>
    </header>
  );
}