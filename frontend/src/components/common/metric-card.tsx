import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

const accentVariants = cva("", {
  variants: {
    tone: {
      default: "bg-navy-400",
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
      ai: "bg-ai",
      brand: "bg-brand-500",
    },
  },
  defaultVariants: { tone: "default" },
});

export interface MetricCardProps extends VariantProps<typeof accentVariants> {
  label: string;
  /** Displayed numeric/string value. Omit (undefined/null) to show "Waiting for operational data". */
  value?: string | number | null;
  unit?: string;
  hint?: string;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

/**
 * A single headline metric. When no backend value is available yet the card
 * explicitly renders a "Waiting for operational data" state instead of a
 * fabricated statistic.
 */
export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  loading,
  tone,
  className,
}: MetricCardProps) {
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-line bg-surface-white p-4 shadow-card", className)}>
      <span className={cn("absolute inset-y-0 left-0 w-1", accentVariants({ tone }))} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : hasValue ? (
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-semibold leading-none text-ink tabular-nums">{value}</span>
              {unit ? <span className="text-xs font-medium text-ink-faint">{unit}</span> : null}
            </p>
          ) : (
            <p className="mt-1.5 text-sm font-medium text-ink-faint">
              <span className="tabular-nums">—</span>
            </p>
          )}
          {hint ? <p className="mt-2 text-xs text-ink-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-md bg-surface-muted text-ink-faint [&_svg]:size-4")}>
            <Icon aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {!hasValue && !loading ? (
        <div className="mt-3 border-t border-dashed border-line pt-2.5 pl-2">
          <Badge variant="outline" className="text-2xs normal-case tracking-normal text-ink-faint">
            Waiting for operational data
          </Badge>
        </div>
      ) : null}
    </div>
  );
}