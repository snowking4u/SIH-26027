import { Loader2 } from "lucide-react";

import { cn } from "@/utils/cn";

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

/** Inline loading state used across every async section. */
export function LoadingState({ label = "Loading", className }: LoadingStateProps) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2.5 rounded-lg border border-line bg-surface-white px-6 py-8", className)}>
      <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden="true" />
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <span className="sr-only">Loading</span>
    </div>
  );
}