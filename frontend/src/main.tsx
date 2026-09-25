import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { AppErrorBoundary } from "@/components/common/app-error-boundary";
import "@/index.css";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);