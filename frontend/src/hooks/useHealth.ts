import { useCallback, useEffect, useState } from "react";

import { APP_CONFIG } from "@/config/app";
import {
  fetchApiHealth,
  fetchDbHealth,
} from "@/services/api/health";
import type { ApiStatus, DbStatus, HealthState } from "@/types/health";
import { apiErrorMessage } from "@/services/api/client";

function stateFromResults(
  apiOk: boolean,
  dbOk: boolean,
  error: string | null,
  lastChecked: string,
): HealthState {
  return {
    api: (apiOk ? "online" : "offline") as ApiStatus,
    db: (dbOk ? "connected" : "disconnected") as DbStatus,
    lastChecked,
    error,
  };
}

/**
 * Polls GET /health and GET /health/db.
 *
 * The header derives its API / DATABASE ONLINE + OFFLINE indicators from the
 * actual backend responses — never from hardcoded values. When the backend
 * returns, the state flips online automatically; when it does not, it flips
 * offline. `retry()` forces an immediate re-check.
 */
export function useHealth(pollMs: number = APP_CONFIG.healthPollMs) {
  const [state, setState] = useState<HealthState>({
    api: "checking",
    db: "checking",
    lastChecked: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const started = new Date().toISOString();

      const [api, db] = await Promise.allSettled([
        fetchApiHealth(),
        fetchDbHealth(),
      ]);

      if (cancelled) return;

      const apiOk =
        api.status === "fulfilled" && api.value.status === "healthy";
      const dbOk =
        db.status === "fulfilled" &&
        db.value.status === "healthy" &&
        db.value.database === "connected";

      const error =
        !apiOk || !dbOk
          ? apiErrorMessage(
              api.status === "rejected"
                ? api.reason
                : db.status === "rejected"
                  ? db.reason
                  : new Error(`Database reported ${db.value.database}`),
            )
          : null;

      setState(stateFromResults(apiOk, dbOk, error, started));
    };

    check();
    const timer = window.setInterval(check, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pollMs, attempt]);

  const retry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      api: "checking",
      db: "checking",
      error: null,
    }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry, online: state.api === "online" };
}