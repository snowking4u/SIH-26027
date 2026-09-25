import { cn } from "@/utils/cn";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };