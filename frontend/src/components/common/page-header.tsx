import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface PageHeaderProps {
  /** Ops-oriented eyebrow, e.g. "Operations Control · Planning". */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned action cluster (buttons, badges). */
  actions?: ReactNode;
  className?: string;
}

/** Consistent page heading used at the top of every screen. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-2xs font-semibold uppercase tracking-widest text-brand-700">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  right?: ReactNode;
  className?: string;
}

/** Compact sub-section heading with optional trailing controls. */
export function SectionHeader({ icon: Icon, title, description, right, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line pb-3", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 [&_svg]:size-4">
            <Icon aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description ? <p className="truncate text-xs text-ink-muted">{description}</p> : null}
        </div>
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}