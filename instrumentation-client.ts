import * as Sentry from "@sentry/nextjs";
import { resolveEnvironment } from "./lib/observability/environment";
import { scrubSentryEvent } from "./lib/observability/scrub";

const environment = resolveEnvironment();

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  // 20% cap in production (AC-8) so a traffic spike cannot exhaust the free tier or flood
  // the dashboard; 100% elsewhere, where the DSN is unset by design (AC-2) so nothing sends.
  tracesSampleRate: environment === "production" ? 0.2 : 1.0,
  // dataCollection is left unset: the SDK's conservative default (no sendDefaultPii) applies.
  // release is left unset: withSentryConfig (next.config.ts) auto-detects it from the Vercel
  // commit SHA at build time and bakes it into both bundles, which also avoids exposing
  // VERCEL_GIT_COMMIT_SHA through a NEXT_PUBLIC_ variable just for this.
  beforeSend: (event) => scrubSentryEvent(event),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
