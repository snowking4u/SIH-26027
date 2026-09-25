import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** The "no data loaded" state — always used instead of showing fake rows. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-dark bg-surface-muted/60 px-6 py-10 text-center", className)}>
      {Icon ? (
        <span className="grid size-10 place-items-center rounded-full bg-surface-white text-ink-faint [&_svg]:size-5">
          <Icon aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <div className="max-w-md text-xs leading-relaxed text-ink-muted">{description}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}