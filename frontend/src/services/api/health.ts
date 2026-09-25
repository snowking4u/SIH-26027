import { apiGet } from "@/services/api/client";
import type { ApiHealth, DbHealth } from "@/types/health";

/** GET /health — API process liveness. */
export function fetchApiHealth(): Promise<ApiHealth> {
  return apiGet<ApiHealth>("/health");
}

/** GET /health/db — database connectivity status. */
export function fetchDbHealth(): Promise<DbHealth> {
  return apiGet<DbHealth>("/health/db");
}
