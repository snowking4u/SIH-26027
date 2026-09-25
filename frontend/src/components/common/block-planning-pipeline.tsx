import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

/** Backend foundation is implemented and exposes live data via the API. */
export type PipelineStageState = "foundation" | "phase2" | "future";

export interface PipelineStage {
  key: string;
  label: string;
  detail?: string;
  state: PipelineStageState;
  icon?: LucideIcon;
}

const stateMeta: Record<
  PipelineStageState,
  { label: string; badge: "success" | "warning" | "ai"; dot: string }
> = {
  foundation: { label: "Backend ready", badge: "success", dot: "bg-success" },
  phase2: { label: "Frontend pending", badge: "warning", dot: "bg-warning" },
  future: { label: "Planned", badge: "ai", dot: "bg-ai" },
};

export interface BlockPlanningPipelineProps {
  stages: PipelineStage[];
  className?: string;
}

/**
 * Visualises the end-to-end block planning workflow:
 *
 *   Source systems → unified maintenance → requirements → planning tasks →
 *   available/candidate windows → AI/optimization → recommended block →
 *   validation → controller → execution → audit.
 *
 * Each stage is labelled with its current implementation state so the
 * controller/evaluator can immediately see what is live, what is pending
 * and what is planned — without fabricating results.
 */
export function BlockPlanningPipeline({ stages, className }: BlockPlanningPipelineProps) {
  return (
    <div className={cn("overflow-x-auto pb-1", className)}>
      <ol className="flex min-w-max items-stretch gap-0">
        {stages.map((stage, index) => {
          const meta = stateMeta[stage.state];
          const Icon = stage.icon;
          const isLast = index === stages.length - 1;

          return (
            <li key={stage.key} className="flex items-center">
              <div className="group relative flex w-40 flex-col rounded-md border border-line bg-surface-white p-3 shadow-card transition-colors hover:border-navy-400">
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden="true" />
                  <Badge variant={meta.badge} className="px-2 normal-case tracking-normal">
                    {meta.label}
                  </Badge>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  {Icon ? (
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-muted text-ink-muted [&_svg]:size-3.5">
                      <Icon aria-hidden="true" />
                    </span>
                  ) : null}
                  <p className="text-xs font-semibold leading-tight text-ink">{stage.label}</p>
                </div>
                {stage.detail ? (
                  <p className="mt-1.5 text-2xs leading-relaxed text-ink-faint">{stage.detail}</p>
                ) : null}
              </div>
              {!isLast ? (
                <span className="shrink-0 px-1 text-line-dark" aria-hidden="true">
                  <ChevronRight className="size-4" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}