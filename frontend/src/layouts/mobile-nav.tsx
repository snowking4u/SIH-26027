import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { SidebarRail } from "@/layouts/app-sidebar";

export interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Left slide-over navigation used below the desktop breakpoint. */
export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-950/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-64 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left-full lg:hidden">
          <div className="flex h-full flex-col bg-navy-950">
            <SidebarRail collapsed={false} onNavigate={() => onOpenChange(false)} />
            <div className="flex items-center justify-between border-t border-navy-800 p-3">
              <span className="text-2xs font-medium uppercase tracking-wider text-navy-400">
                Ops Control
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close navigation"
                className="inline-flex size-8 items-center justify-center rounded-md text-navy-400 transition-colors hover:bg-navy-800/70 hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}