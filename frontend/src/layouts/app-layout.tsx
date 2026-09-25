import { Suspense, useCallback, useState } from "react";
import { Outlet } from "react-router-dom";

import { LoadingState } from "@/components/common/loading-state";
import { useHealth } from "@/hooks/useHealth";
import { AppSidebar } from "@/layouts/app-sidebar";
import { AppTopbar } from "@/layouts/app-topbar";
import { MobileNav } from "@/layouts/mobile-nav";

const SIDEBAR_STORAGE_KEY = "railflow.sidebarCollapsed";

function PageSuspense() {
  return (
    <div className="p-6">
      <LoadingState label="Loading module…" />
    </div>
  );
}

/** Application shell: sidebar + topbar + routed content area. */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed",
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const health = useHealth();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "expanded");
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-ink">
      <aside className="hidden h-full shrink-0 lg:block">
        <AppSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopbar health={health} onOpenMobileNav={() => setMobileNavOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-surface">
          <Suspense fallback={<PageSuspense />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </div>
  );
}