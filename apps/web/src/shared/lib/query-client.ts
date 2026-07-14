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
      // Default 'online' mode PAUSES a failing query while the browser
      // reports offline — status stays "pending" forever, so pages show an
      // eternal skeleton and never reach their error/Try-again branch.
      // 'always' lets the failure surface; the retry policy below still
      // absorbs transient blips.
      networkMode: "always",
      retry: (failureCount: number, error: Error) => {
        const status = (error as ApiError)?.status;
        // 4xx is a permanent answer — don't hammer it.
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt: number) =>
        Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      // Same reasoning: a resolve/rename click while "offline" should fail
      // loudly (toast) rather than hang in a paused state with a spinner.
      networkMode: "always",
    },
  },
});

// Dev-only escape hatch: lets a debugging session inspect the LIVE client's
// cache (dynamic imports create a second module instance, so `import(...)`
// from the console can't reach this one).
if (import.meta.env.DEV) {
  (window as unknown as { __plQueryClient?: QueryClient }).__plQueryClient =
    queryClient;
}
