import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual tone of the confirm action — defaults to danger. */
  intent?: "danger" | "success" | "default";
  icon?: LucideIcon;
  onConfirm: () => void;
  /** Shows a busy state on the confirm button (e.g. awaiting an API call). */
  busy?: boolean;
}

/** Confirmation dialog used for destructive / consequential controller actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  intent = "danger",
  icon: Icon,
  onConfirm,
  busy = false,
}: ConfirmDialogProps) {
  const variant = intent === "danger" ? "danger" : intent === "success" ? "success" : "default";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          {Icon ? (
            <span className="mb-1 grid size-10 place-items-center rounded-md bg-surface-muted text-ink-muted [&_svg]:size-5">
              <Icon aria-hidden="true" />
            </span>
          ) : null}
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={busy}>
            {busy ? "Processing…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}