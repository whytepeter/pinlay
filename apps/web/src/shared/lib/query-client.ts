/**
 * Shared TanStack Query client.
 *
 * Sensible defaults for the dashboard:
 *  - Don't retry 4xx (auth / validation / not-found are not transient); retry
 *    network + 5xx up to 2× with exponential backoff. QueryList surfaces the
 *    retry attempts in its UI.
 *  - 30s staleTime so navigating back to a list doesn't refetch instantly.
 *  - No refetch-on-focus (annotation review is not a live trading screen).
 */
import { QueryClient } from "@tanstack/vue-query";
import type { ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: Error) => {
        const status = (error as ApiError)?.status;
        // 4xx is a permanent answer — don't hammer it.
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt: number) =>
        Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});
