import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

/** Catches unexpected render failures and offers a graceful reload. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected render error",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("App render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-surface p-6">
          <div className="max-w-md space-y-4 text-center">
            <p className="text-lg font-semibold text-ink">The control console hit an unexpected error.</p>
            <p className="break-words font-mono text-xs text-danger">{this.state.message}</p>
            <Button onClick={() => window.location.reload()}>Reload console</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}