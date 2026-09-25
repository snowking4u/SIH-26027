/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DATA_MODE?: string;
  readonly VITE_DIVISION?: string;
  readonly VITE_HEALTH_POLL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}