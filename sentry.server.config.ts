import * as Sentry from "@sentry/nextjs";
import { resolveEnvironment } from "./lib/observability/environment";
import { scrubSentryEvent } from "./lib/observability/scrub";

const environment = resolveEnvironment();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment,
  tracesSampleRate: environment === "production" ? 0.2 : 1.0,
  beforeSend: (event) => scrubSentryEvent(event),
});
