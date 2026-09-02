# lib/observability/

The one sanctioned path to error tracking (Sentry) and business event analytics (PostHog), introduced by spec 0021. No feature code talks to either vendor SDK directly; an ESLint rule enforces this, not just convention.

## Conventions

- `captureError(error, context?)` (`errors.ts`) is the only sanctioned way to report an error. Never throws, never blocks the caller: fire and forget, flushed via `@vercel/functions`' `waitUntil()` on the server before the function is allowed to suspend (an unawaited call can otherwise be silently dropped when Vercel freezes the function). `context` carries `path`, `role`, `userId`/`distinctId`, all optional.
- `trackEvent(name, properties, distinctId)` and `identify(userId, role, distinctId)` (`events.ts`) are server only (`import "server-only"`), backed by `posthog-node`. `name` is one of the seven `EventName` values in `types.ts` (`user_registered`, `product_added`, `query_sent`, `offer_submitted`, `offer_accepted`, `payment_completed`, `order_status_changed`). `distinctId` is always supplied by the caller, never read from a persisted cookie (no login yet, spec 0021 Follow-up: `identify()` is a no-op call site until a real session exists).
- Import from the barrel (`index.ts`) in server code. A Client Component that only needs `captureError` imports it from `./errors` directly (see `app/global-error.tsx`): the barrel also re-exports the PostHog wrapper, which is `server only` and would break a client bundle.
- `scrubProperties()` and `scrubSentryEvent()` (`scrub.ts`) strip PII (email, name, phone, address, payment, card, iban, document, attachment, postal, zip, matched by key, case insensitive) before anything reaches Sentry or PostHog. `scrubSentryEvent` is wired as Sentry's `beforeSend` hook in every init file.
- `resolveEnvironment()` (`environment.ts`) maps `VERCEL_ENV` to `development` / `staging` / `production`. `preview` maps to `staging` until real Vercel Custom Environments exist (needs a Vercel Pro purchase, spec 0019 Follow-up).
- Enforcement: `eslint.config.mjs`'s `no-restricted-imports` rule blocks any file outside this directory (plus the SDK init files below) from importing `@sentry/nextjs`, `posthog-js`, or `posthog-node` directly.

## Wired at (outside this directory)

- `instrumentation.ts`: dispatches to `sentry.server.config.ts` / `sentry.edge.config.ts` by runtime; exports `onRequestError = Sentry.captureRequestError` as the framework level safety net (separate from `captureError()`, which is for errors code explicitly wants to report with richer context).
- `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`: `Sentry.init()` per runtime, all three wired to `resolveEnvironment()` and `scrubSentryEvent`, 20% trace sample rate in production (100% elsewhere, where the DSN is unset by design so nothing sends).
- `app/global-error.tsx`: the client error boundary, calls `captureError` on mount.
- `next.config.ts`: `withSentryConfig`, release auto detected from the Vercel commit SHA at build time.

## Configuration

`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, set on Vercel's Production and Preview environments only (Preview stands in for Staging). Development and CI stay unconfigured by design, so nothing sends from a local run or a test run.

## Known gaps (see `docs/specs/0021-obserwowalnosc-produkcyjna/verify.md`)

- AC-7 (a documented, once exercised deletion/anonymization runbook) is not built yet.
- Whether a `proxy.ts` error actually reaches Sentry via `onRequestError`/`captureRequestError`, versus a coincidental dev only client side re-throw, is unconfirmed.

Governing spec: `docs/specs/0021-obserwowalnosc-produkcyjna/`.

_Drafted by /sync from the introducing change, worth a quick human pass._
