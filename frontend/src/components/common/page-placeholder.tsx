import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface PlaceholderDataSource {
  /** Display name, e.g. "Planning tasks". */
  label: string;
  /** Real backend endpoint, e.g. "GET /api/planning/tasks". */
  endpoint: string;
}

export interface PagePlaceholderProps {
  icon?: LucideIcon;
  /** Plain-language answer to "what should the controller understand/do here?". */
  intent: ReactNode;
  /** Real backend endpoints that will feed this screen in Phase 2. */
  dataSources: PlaceholderDataSource[];
  /** Short extra note (stats pipeline, constraints, etc). */
  note?: string;
  className?: string;
}

/**
 * Honest placeholder for screens that are wired in Phase 2. It never shows
 * fabricated data — it states the operational intent and lists the real
 * backend endpoints the screen will consume.
 */
export function PagePlaceholder({ icon: Icon, intent, dataSources, note, className }: PagePlaceholderProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-line bg-surface-white shadow-card ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4 border-b border-line bg-surface-muted/50 px-5 py-4">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="grid size-9 place-items-center rounded-md bg-surface-white text-brand-700 shadow-card [&_svg]:size-4.5">
              <Icon aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <p className="text-sm font-semibold text-ink">Planned for Phase 2</p>
            <p className="text-xs text-ink-muted">Phase 1 delivers the application shell; live data wiring follows.</p>
          </div>
        </div>
        <Badge variant="warning">Phase 2</Badge>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">What this screen is for</p>
          <div className="mt-1.5 text-sm leading-relaxed text-ink">{intent}</div>
        </div>

        <Separator />

        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">Backend data sources</p>
          <ul className="mt-2 space-y-1.5">
            {dataSources.map((source) => (
              <li
                key={source.endpoint}
                className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-muted/40 px-3 py-2"
              >
                <span className="text-sm font-medium text-ink">{source.label}</span>
                <code className="rounded bg-navy-900 px-2 py-0.5 font-mono text-2xs text-navy-300">{source.endpoint}</code>
              </li>
            ))}
          </ul>
        </div>

        {note ? <p className="text-xs italic leading-relaxed text-ink-faint">{note}</p> : null}
      </div>
    </div>
  );
}