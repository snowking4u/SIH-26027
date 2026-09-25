import { useCallback, useEffect, useRef, useState } from "react";

import { apiErrorMessage } from "@/services/api/client";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-run the loader (refresh from the backend). */
  retry: () => void;
}

/**
 * Minimal fetch-on-mount hook for one backend resource. Each page calls the
 * real service functions, so the shape returned is whatever the API returns.
 * No data is ever mocked: failures surface the backend message.
 */
export function useAsyncResource<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await loaderRef.current();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { data, loading, error, retry };
}