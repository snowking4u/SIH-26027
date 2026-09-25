import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Right-side width — default max-w-xl. */
  className?: string;
  children: ReactNode;
}

/** Right-side slide-over panel for contextual detail. */
export function Drawer({ open, onOpenChange, title, description, className, children }: DrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-950/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-surface-white shadow-panel",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-ink">{title}</h2>
              {description ? <p className="text-xs text-ink-muted">{description}</p> : null}
            </div>
            <DialogPrimitive.Close
              className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label="Close panel"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}