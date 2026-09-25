import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export interface ErrorStateProps {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Error state with an optional retry action (e.g. re-connect to the backend). */
export function ErrorState({
  title = "Unable to reach the data source",
  message,
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-danger/25 bg-danger-light/50 px-6 py-10 text-center", className)}>
      <span className="grid size-10 place-items-center rounded-full bg-danger-light text-danger [&_svg]:size-5">
        <TriangleAlert aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message ? <p className="max-w-md font-mono text-xs text-ink-muted">{message}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}