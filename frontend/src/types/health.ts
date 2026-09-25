/** Response contract of GET /health */
export interface ApiHealth {
  status: string;
}

/** Response contract of GET /health/db */
export interface DbHealth {
  status: string;
  database: string;
}

export type ApiStatus = "checking" | "online" | "offline";
export type DbStatus = "checking" | "connected" | "disconnected";

export interface HealthState {
  api: ApiStatus;
  db: DbStatus;
  /** ISO timestamp of the last completed health check (success or failure). */
  lastChecked: string | null;
  /** Any transport/HTTP error message captured during the last check. */
  error: string | null;
}

/** Shared success-path shape used by healthish endpoints. */
export type BackendStatus =
  | "healthy"
  | "unhealthy"
  | "ok"
  | "synced"
  | "pending";