const envNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const APP_CONFIG = {
  displayName: "RAILFLOW AI",
  tagline: "Smart Block Planning & Railway Operations",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8011",
  dataMode: import.meta.env.VITE_DATA_MODE ?? "SYNTHETIC",
  division: import.meta.env.VITE_DIVISION ?? "Agra Division",
  healthPollMs: envNumber(import.meta.env.VITE_HEALTH_POLL_MS, 8000),
} as const;