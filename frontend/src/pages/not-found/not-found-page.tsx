import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-navy-900 text-navy-400 [&_svg]:size-6">
        <Compass aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
        <p className="max-w-md text-sm text-ink-muted">
          This control block does not exist on the console. Return to the operations dashboard.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}