// Server-side entry point: trackEvent/identify (./events) are marked "server only" and pull
// in posthog-node. A Client Component that only needs captureError must import it from
// "./errors" directly (see app/global-error.tsx) instead of this barrel.
export { captureError } from "./errors";
export { trackEvent, identify } from "./events";
export type { ErrorContext, EventName, ObservabilityEnvironment, Role } from "./types";
