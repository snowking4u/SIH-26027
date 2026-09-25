import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

export type StatusTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "ai"
  | "brand";

const dotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      default: "bg-ink-faint",
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
      ai: "bg-ai",
      brand: "bg-brand-600",
    },
  },
  defaultVariants: { tone: "default" },
});

/**
 * Maps a raw backend status value to a tone + readable label.
 *
 * Handles common status strings used across the SIH 26027 API. Unknown
 * values fall back to a neutral tone while still being shown verbatim
 * (normalised to "Title Case"), so no backend value is ever hidden.
 */
export function statusTone(status: string | null | undefined): StatusTone {
  const value = (status ?? "").toUpperCase().replace(/[\s-]+/g, "_");
  if (
    ["CONNECTED", "ONLINE", "APPROVED", "COMPLETE", "COMPLETED", "EXECUTED", "EXECUTION_COMPLETE", "FEASIBLE", "OK", "HEALTHY", "RECOMMENDED", "GRANTED", "NORMAL"].includes(value)
  ) {
    return "success";
  }
  if (
    ["PENDING", "PLANNED", "REVIEW", "REQUIRES_REVIEW", "CANDIDATE", "IN_PROGRESS", "SCHEDULED", "SUBMITTED", "MODIFIED", "UPDATED", "DRAFT", "AVAILABLE", "RESTRICTED"].includes(value)
  ) {
    return "warning";
  }
  if (
    ["REJECTED", "FAILED", "FAILURE", "INFEASIBLE", "OFFLINE", "DISCONNECTED", "ERROR", "CANCELLED", "DENIED", "DANGER", "CRITICAL", "BLOCKED"].includes(value)
  ) {
    return "danger";
  }
  if (value.startsWith("S&") || value.includes("SIGNAL") || ["S&T"].includes(value)) {
    return "info";
  }
  if (["TRACTION", "TRD", "ENGINEERING", "ENG", "OHE", "OVERHEAD"].includes(value)) {
    return "brand";
  }
  return "default";
}

function readableLabel(status: string | null | undefined): string {
  const value = (status ?? "").trim();
  if (!value) return "Unknown";
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => (word === "&" ? "&" : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

export interface StatusBadgeProps extends VariantProps<typeof dotVariants> {
  status: string | null | undefined;
  /** Optional explicit override for the tone mapping. */
  tone?: StatusTone;
  /** Live/pulsing dot — used for online/approved operational states. */
  pulse?: boolean;
  icon?: LucideIcon;
  className?: string;
}

/**
 * Railway-aware status pill. The tone is derived from the status value
 * (see `statusTone`);  pass an explicit `tone` to override the mapping.
 */
export function StatusBadge({
  status,
  tone,
  pulse = false,
  icon: Icon,
  className,
}: StatusBadgeProps) {
  const resolvedTone: StatusTone = tone ?? statusTone(status);
  const label = readableLabel(status);
  const IconComp = Icon;

  return (
    <Badge
      variant={resolvedTone === "default" ? "default" : resolvedTone}
      className={cn("gap-1.5", className)}
      title={status ?? undefined}
    >
      {IconComp ? (
        <IconComp className="size-3" aria-hidden="true" />
      ) : (
        <span className={cn(dotVariants({ tone: resolvedTone }), pulse && "animate-pulse")} aria-hidden="true" />
      )}
      {label}
    </Badge>
  );
}