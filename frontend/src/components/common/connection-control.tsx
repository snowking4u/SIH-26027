import { cva, type VariantProps } from "class-variance-authority";
import { RefreshCw, ServerCog } from "lucide-react";

import type { HealthState } from "@/types/health";
import { cn } from "@/utils/cn";

type IndicatorKind = "api" | "db";

const dotVariants = cva("size-1.5 rounded-full", {
  variants: {
    state: {
      ok: "bg-success",
      bad: "bg-danger",
      checking: "bg-navy-400",
    },
  },
});

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider",
  {
    variants: {
      state: {
        ok: "border-success/30 bg-success/[0.12] text-success-dark",
        bad: "border-danger/40 bg-danger/[0.14] text-danger",
        checking: "border-navy-700 bg-navy-800 text-navy-400",
      },
    },
  },
);

interface SingleIndicatorProps extends VariantProps<typeof dotVariants> {
  kind: IndicatorKind;
  state: "ok" | "bad" | "checking";
  className?: string;
}

function SingleIndicator({ kind, state, className }: SingleIndicatorProps) {
  const label =
    kind === "api"
      ? state === "ok"
        ? "API Online"
        : state === "bad"
          ? "API Offline"
          : "API Checking…"
      : state === "ok"
        ? "Database Online"
        : state === "bad"
          ? "Database Connection Error"
          : "Database Checking…";

  return (
    <span className={cn(pillVariants({ state }), "select-none", className)} title={label}>
      <span className={cn(dotVariants({ state }), state === "ok" && "animate-pulse")} aria-hidden="true" />
      {label}
    </span>
  );
}

export interface ConnectionControlProps {
  health: Pick<HealthState, "api" | "db" | "lastChecked" | "error">;
  onRetry: () => void;
  className?: string;
}

/**
 * Live API + database connection readouts. All states — ONLINE, OFFLINE,
 * CONNECTION ERROR — are derived from the actual GET /health and
 * GET /health/db responses, never hardcoded.
 */
export function ConnectionControl({ health, onRetry, className }: ConnectionControlProps) {
  const apiBad = health.api === "offline";
  const dbBad = health.db === "disconnected";
  const anyBad = apiBad || dbBad;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <SingleIndicator
        kind="api"
        state={health.api === "online" ? "ok" : health.api === "offline" ? "bad" : "checking"}
      />
      <SingleIndicator
        kind="db"
        state={health.db === "connected" ? "ok" : health.db === "disconnected" ? "bad" : "checking"}
      />
      {anyBad ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-navy-700 bg-navy-800 px-2 py-1 text-2xs font-semibold text-navy-300 transition-colors hover:border-navy-600 hover:text-white"
          title={
            health.error ??
            `Last checked: ${health.lastChecked ? new Date(health.lastChecked).toLocaleTimeString() : "never"}`
          }
        >
          <RefreshCw className="size-3" aria-hidden="true" />
          Retry
        </button>
      ) : health.api === "checking" || health.db === "checking" ? (
        <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-navy-400">
          <ServerCog className="size-3 animate-spin" aria-hidden="true" />
          Checking connection…
        </span>
      ) : null}
    </div>
  );
}