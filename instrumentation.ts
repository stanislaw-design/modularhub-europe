import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Framework level safety net for uncaught server, route, action, and proxy errors; the
// application's own `captureError()` (lib/observability/errors.ts) is for errors code
// explicitly wants to report with richer context (path, role, user).
export const onRequestError = Sentry.captureRequestError;
