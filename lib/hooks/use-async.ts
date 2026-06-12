"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiError } from "@/lib/api/errors";

export type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

type CacheEntry = {
  data: unknown;
  updatedAt: number;
};

const dataCache = new Map<string, CacheEntry>();

export function clearAsyncDataCache(keyPrefix?: string) {
  if (!keyPrefix) {
    dataCache.clear();
    return;
  }
  for (const key of dataCache.keys()) {
    if (key.startsWith(keyPrefix)) dataCache.delete(key);
  }
}

export type UseAsyncDataOptions = {
  cacheKey?: string;
  staleTime?: number;
};

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options?: UseAsyncDataOptions
): AsyncState<T> & { reload: () => void } {
  const cacheKey = options?.cacheKey;
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;
  const [state, setState] = useState<AsyncState<T>>(() => {
    if (!cacheKey) return { data: null, error: null, loading: true };
    const cached = dataCache.get(cacheKey) as CacheEntry | undefined;
    if (cached && Date.now() - cached.updatedAt < staleTime) {
      return { data: cached.data as T, error: null, loading: false };
    }
    if (cached) {
      return { data: cached.data as T, error: null, loading: true };
    }
    return { data: null, error: null, loading: true };
  });
  const fetcherRef = useRef(fetcher);
  // eslint-disable-next-line react-hooks/refs
  fetcherRef.current = fetcher;

  const load = useCallback(
    (force = false) => {
      const cached = cacheKey ? (dataCache.get(cacheKey) as CacheEntry | undefined) : undefined;
      const isFresh = Boolean(cached && Date.now() - cached.updatedAt < staleTime);

      if (cacheKey && !force && isFresh) {
        setState({ data: cached!.data as T, error: null, loading: false });
        return;
      }

      setState((prev) => ({
        data: prev.data ?? (cached?.data as T | null) ?? null,
        error: null,
        loading: prev.data === null && !cached,
      }));

      fetcherRef
        .current()
        .then((data) => {
          if (cacheKey) {
            dataCache.set(cacheKey, { data, updatedAt: Date.now() });
          }
          setState({ data, error: null, loading: false });
        })
        .catch((err) =>
          setState((prev) => ({
            data: prev.data,
            error: formatApiError(err),
            loading: false,
          }))
        );
    },
    [cacheKey, staleTime]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { ...state, reload: () => load(true) };
}

export function isInitialAsyncLoad(loading: boolean, data: unknown): boolean {
  return loading && data === null;
}

export function isAsyncRefreshing(loading: boolean, data: unknown): boolean {
  return loading && data !== null;
}

export function useMutation<TArgs extends unknown[], TResult>(
  mutator: (...args: TArgs) => Promise<TResult>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutator(...args);
        setLoading(false);
        return result;
      } catch (err) {
        setError(formatApiError(err));
        setLoading(false);
        return null;
      }
    },
    [mutator]
  );

  return { mutate, loading, error, clearError: () => setError(null) };
}
