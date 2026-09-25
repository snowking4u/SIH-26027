import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export interface TimelineItemProps {
  icon?: LucideIcon;
  title: string;
  meta?: ReactNode;
  description?: ReactNode;
  /** Right-aligned trailing content (badges, controls). */
  trailing?: ReactNode;
  /** Accent tone of the node dot. */
  tone?: "default" | "success" | "warning" | "danger" | "info" | "ai";
  /** Set true for all but the last item to keep the connecting line going. */
  connector?: boolean;
  className?: string;
}

const tones = {
  default: "bg-navy-400",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  ai: "bg-ai",
} as const;

/** Vertical timeline row used to explain a workflow / sequence of events. */
export function TimelineItem({
  icon: Icon,
  title,
  meta,
  description,
  trailing,
  tone = "default",
  connector = false,
  className,
}: TimelineItemProps) {
  return (
    <div className={cn("relative flex gap-3", className)}>
      {connector ? (
        <span
          className="absolute left-[13px] top-8 h-[calc(100%-8px)] w-px bg-line-dark"
          aria-hidden="true"
        />
      ) : null}
      <span
        className={cn(
          "relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-white text-ink-faint shadow-card ring-1 ring-line",
          tones[tone],
          "[&_svg]:size-3.5",
          tone === "default" && "text-navy-300",
        )}
      >
        {Icon ? <Icon aria-hidden="true" /> : null}
      </span>
      <div className="min-w-0 flex-1 pb-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {meta ? <span className="text-xs text-ink-faint">{meta}</span> : null}
          {trailing ? <span className="ml-auto shrink-0">{trailing}</span> : null}
        </div>
        {description ? <div className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</div> : null}
      </div>
    </div>
  );
}