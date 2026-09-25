import { Settings } from "lucide-react";

import { ConnectionControl } from "@/components/common/connection-control";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app";
import { useHealth } from "@/hooks/useHealth";

interface ConfigRow {
  key: string;
  value: string;
  origin: string;
}

const CONFIG_ROWS: ConfigRow[] = [
  { key: "VITE_API_BASE_URL", value: APP_CONFIG.apiBaseUrl, origin: "Environment" },
  { key: "VITE_DATA_MODE", value: APP_CONFIG.dataMode, origin: "Environment" },
  { key: "VITE_DIVISION", value: APP_CONFIG.division, origin: "Environment" },
  { key: "VITE_HEALTH_POLL_MS", value: String(APP_CONFIG.healthPollMs), origin: "Environment" },
];

const CONFIG_COLUMNS: DataTableColumn<ConfigRow>[] = [
  { key: "key", header: "Key" },
  {
    key: "value",
    header: "Value",
    render: (row) => <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-ink">{row.value}</code>,
  },
  { key: "origin", header: "Origin", render: (row) => <Badge variant="outline">{row.origin}</Badge> },
];

function formatChecked(lastChecked: string | null): string {
  if (!lastChecked) return "Not yet checked";
  return new Date(lastChecked).toLocaleString();
}

export function SettingsPage() {
  const health = useHealth();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="System · Configuration"
        title="Settings"
        description="Runtime configuration for the control dashboard and live connection status."
        actions={
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload application
          </Button>
        }
      />

      <section className="space-y-3">
        <SectionHeader
          icon={Settings}
          title="Backend connection"
          description={`Health endpoints polled every ${(APP_CONFIG.healthPollMs / 1000).toFixed(0)}s.`}
          right={<ConnectionControl health={health} onRetry={health.retry} />}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface-white p-4 shadow-card">
            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">API</p>
            <div className="mt-2">
              <StatusBadge
                status={health.api === "online" ? "Online" : health.api === "offline" ? "Offline" : "Checking"}
                tone={health.api === "online" ? "success" : health.api === "offline" ? "danger" : "default"}
                pulse={health.api === "online"}
              />
            </div>
            <p className="mt-2 font-mono text-xs text-ink-muted">{APP_CONFIG.apiBaseUrl}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface-white p-4 shadow-card">
            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">Database</p>
            <div className="mt-2">
              <StatusBadge
                status={health.db === "connected" ? "Connected" : health.db === "disconnected" ? "Connection error" : "Checking"}
                tone={health.db === "connected" ? "success" : health.db === "disconnected" ? "danger" : "default"}
                pulse={health.db === "connected"}
              />
            </div>
            <p className="mt-2 text-xs text-ink-muted">via API on {APP_CONFIG.apiBaseUrl}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface-white p-4 shadow-card">
            <p className="text-2xs font-semibold uppercase tracking-widest text-ink-faint">Last check</p>
            <p className="mt-2 text-sm font-medium text-ink tabular-nums">{formatChecked(health.lastChecked)}</p>
            {health.error ? (
              <p className="mt-2 break-words font-mono text-xs text-danger">{health.error}</p>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">All health checks passing.</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          icon={Settings}
          title="Runtime configuration"
          description="Values baked in at build/runtime from the environment — no backend URL is hardcoded in components."
        />
        <DataTable
          rows={CONFIG_ROWS}
          columns={CONFIG_COLUMNS}
          keyField={(row) => row.key}
          emptyTitle="No configuration"
        />
      </section>
    </div>
  );
}