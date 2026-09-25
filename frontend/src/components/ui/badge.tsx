import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-line-dark bg-surface-muted text-ink-muted",
        success:
          "border-success/20 bg-success-light text-success-dark",
        warning: "border-warning/20 bg-warning-light text-warning-dark",
        danger: "border-danger/20 bg-danger-light text-danger-dark",
        info: "border-info/20 bg-info-light text-info",
        ai: "border-ai/20 bg-ai-light text-ai",
        brand: "border-brand-200 bg-brand-50 text-brand-700",
        outline: "border-line-dark bg-transparent text-ink-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };