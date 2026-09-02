import * as Sentry from "@sentry/nextjs";
import { waitUntil } from "@vercel/functions";
import type { ErrorContext } from "./types";

const SENTRY_FLUSH_TIMEOUT_MS = 2000;

// The only sanctioned way to report an error (AC-5). Never throws and never blocks the
// caller (AC-6): capture is fire and forget, and on the server it is flushed inside
// `waitUntil()` before the function is allowed to suspend — an unawaited Sentry call can
// otherwise be silently dropped when Vercel freezes the function right after the response
// is sent. On the client, Sentry's browser transport flushes on its own.
//
// Uses `@vercel/functions`' `waitUntil()` rather than Next's own `after()`: this module is
// imported from both server code and the client `global-error.tsx` boundary, and Next's
// bundler statically forbids `next/server`'s `after` from reaching any module in a Client
// Component's graph, even behind a runtime `typeof window` check.
export function captureError(error: unknown, context: ErrorContext = {}): void {
  try {
    const normalized = error instanceof Error ? error : new Error(String(error));

    Sentry.withScope((scope) => {
      if (context.path) scope.setTag("path", context.path);
      if (context.role) scope.setTag("role", context.role);
      const userId = context.userId ?? context.distinctId;
      if (userId) scope.setUser({ id: userId });
      Sentry.captureException(normalized);
    });

    if (typeof window === "undefined") {
      waitUntil(
        Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS).catch((flushError) => {
          console.error("[observability] Sentry flush failed", flushError);
        })
      );
    }
  } catch (captureFailure) {
    console.error("[observability] captureError failed", captureFailure);
  }
}
