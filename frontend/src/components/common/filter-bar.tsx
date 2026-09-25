import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface FilterBarProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

/** Compact horizontal filter/toolbar strip used above tables and lists. */
export function FilterBar({ label = "Filters", children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-white px-3 py-2.5 shadow-card",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 pr-1 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        {label}
      </span>
      {children}
    </div>
  );
}