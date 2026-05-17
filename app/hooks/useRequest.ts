"use client";

import { useState, useCallback } from "react";

type RequestState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
};

type UseRequestReturn<T> = RequestState<T> & {
  execute: (input: RequestInfo, init?: RequestInit) => Promise<T | null>;
  reset: () => void;
};

/**
 * useRequest<T>
 *
 * Generic hook that wraps fetch with loading + error state.
 * Components use `execute(url, options)` instead of raw promises.
 *
 * Usage:
 *   const { data, loading, error, execute } = useRequest<MyType>();
 *   await execute("/api/requests", { method: "POST", body: ... });
 */
export function useRequest<T = unknown>(): UseRequestReturn<T> {
  const [state, setState] = useState<RequestState<T>>({
    data: null,
    loading: false,
    error: "",
  });

  const execute = useCallback(
    async (input: RequestInfo, init?: RequestInit): Promise<T | null> => {
      setState({ data: null, loading: true, error: "" });
      try {
        const res = await fetch(input, init);
        const text = await res.text();
        const json: T = text ? JSON.parse(text) : ({} as T);

        if (!res.ok) {
          const msg =
            (json as Record<string, string>)?.message ||
            (json as Record<string, string>)?.error ||
            `HTTP ${res.status}`;
          setState({ data: null, loading: false, error: msg });
          return null;
        }

        setState({ data: json, loading: false, error: "" });
        return json;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setState({ data: null, loading: false, error: msg });
        return null;
      }
    },
    []
  );

  const reset = useCallback(
    () => setState({ data: null, loading: false, error: "" }),
    []
  );

  return { ...state, execute, reset };
}
