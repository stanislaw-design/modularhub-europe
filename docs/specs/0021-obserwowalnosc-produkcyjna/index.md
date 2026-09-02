# 0021. Obserwowalność produkcyjna

**Date**: 2026-09-01
**Status**: In Progress

## Summary

This spec adds two things ModularHub Europe does not have yet: a place where a production error automatically shows up with enough context to fix it, and a place where the key steps of the client and producer journey (signing up, sending a query, making an offer, paying) get counted so drop offs are visible. Errors go to Sentry, business events go to PostHog, both hosted in the EU for RODO reasons, and all feature code talks to them through one small internal module instead of calling the vendor SDKs directly. Because logins are not wired in yet, the events are anonymous for now and gain a real identity once a session exists.

## Context

See [rationale.md](rationale.md) for the full problem context, the options weighed, and the sourced reasoning behind this decision.

## Requirements

**User stories**:
- As a developer, I want a production error to reach a dashboard with enough context that I can diagnose and fix it without asking the affected user what happened.
- As the founder and operator, I want an email the moment a critical error happens, so a broken login or payment does not sit unnoticed.
- As the founder and operator, I want to see the client and producer journey (registration through payment) as a funnel once those features ship, so I can see where people are dropping off.
- As a data subject (a client or a producer), I want my identifying data kept out of third party tools by default, and deletable on request, even though this feature has no screen of its own.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A production error thrown in client or server code is captured by Sentry with the request path, release (commit) version, browser and device info (client errors only), and whatever identity context exists at capture time (role and a pseudonymous ID once a session exists, otherwise anonymous). Email, name, phone, address, payment details, and document contents are never included.
- **AC-2**: Errors and events are tagged by environment (development, staging, production); a local dev run or a CI test run never sends data into the production Sentry or PostHog project.
- **AC-3**: A new or critical Sentry issue sends an email alert.
- **AC-4**: The `trackEvent()` wrapper supports all seven defined business events (registration, product added, query sent, offer submitted, offer accepted, payment completed, order status changed) and is proven end to end with at least one manually fired test event visible in the PostHog EU project, using a distinct ID passed explicitly by the caller rather than one read from a persisted browser cookie. The feature that implements each underlying action (scope items 6, 7, 8, 12, 13) is responsible for calling it at the right point once built.
- **AC-5**: All error and event capture goes through one internal wrapper module, enforced by lint rule, not just convention; no feature code imports the Sentry or PostHog SDK directly.
- **AC-6**: A failed or slow observability call never blocks, delays, or fails the user facing request. Delivery is still explicitly flushed before a serverless function suspends (an unawaited call can otherwise be silently dropped when Vercel freezes the function), and a failure in the capture path itself is only logged to the console, never thrown back to the caller.
- **AC-7**: A person's error and event history in Sentry and PostHog can be deleted or anonymized by their pseudonymous ID on request, using each tool's own deletion mechanism, and this has been exercised at least once with a test ID.
- **AC-8**: Error capture and performance trace sampling are configured with concrete limits (Sentry's built in spike protection for error storms, a capped trace sample rate such as 20%) so neither a repeating error nor a traffic spike exhausts a free tier (5,000 errors or 1,000,000 PostHog events a month) or floods the dashboard with duplicates.

## Options considered

See [rationale.md](rationale.md) for the options weighed and why this one was chosen.

## Decision

**Chosen option**: Option 1: Two EU hosted tools behind one internal wrapper, starting now, anonymous until a session exists

Sentry (EU data region) captures client and server errors, PostHog (EU Cloud) captures the business event funnel, and every feature calls a small internal module (`lib/observability/`) instead of the vendor SDKs, so both start tracking immediately in pseudonymous form, ahead of the RODO consent banner (scope item 5).

**Implementation skills**: `sentry-sdk-setup` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-sdk-setup/`) · `sentry-instrument` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-instrument/`) · `sentry-fix-stack-traces` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-fix-stack-traces/`) · `sentry-create-alert` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-create-alert/`) · `sentry-setup-releases` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-setup-releases/`) · `posthog-instrumentation` (`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`)

## Rationale

See [rationale.md](rationale.md) for the full reasoning.

## Feature design

**Data model sketch**:
No new entities in ModularHub's own Postgres schema. Sentry and PostHog are each the system of record for their own data (errors, events), referenced only by the app's internal `user.id` as a pseudonymous external key, never as a foreign key or a joined table.

**State transitions**: None; this feature has no state machine of its own.

**API surface**:
No new HTTP endpoints. The surface is a code level module, `lib/observability/`, exposing:

| Function | Inputs | Output | Notes |
|---|---|---|---|
| `captureError(error, context)` | `error: Error`, `context: { path, role?, userId?, distinctId? }` | void (never blocks the caller; flushed before the function suspends) | Only sanctioned way to report an error; scrubs PII before calling Sentry |
| `trackEvent(name, properties, distinctId)` | `name: EventName` (one of the seven defined events), `properties: Record<string, unknown>`, `distinctId: string` (required, supplied by the caller, not read from a persisted cookie) | void (never blocks the caller; flushed before the function suspends) | Only sanctioned way to report a business event; scrubs PII before calling PostHog |
| `identify(userId, role, distinctId)` | `userId: string`, `role: 'klient' \| 'producent'`, `distinctId: string` | void | No-ops until a real session exists (Auth.js is planned but not yet wired in); called once by whichever feature ships the first real login, so PostHog can alias the caller's prior anonymous `distinctId` to the real user once persistent identity is allowed (see the cookieless note below) |

**Key invariants**:
- No call site outside `lib/observability/` imports `@sentry/nextjs` or `posthog-js`/`posthog-node` directly, enforced by an ESLint `no-restricted-imports` rule, not just documentation.
- Email, name, phone, address, payment details, and document contents never cross into a `captureError` or `trackEvent` call; scrubbing happens inside the wrapper, not left to each call site to remember.
- A failure inside `captureError` or `trackEvent` itself never throws back into the caller, and never blocks or slows the response it was called during.
- Every call is explicitly flushed (Sentry `flush()`; PostHog `shutdown()` or `flushAt: 1`) inside Vercel's `waitUntil()` before a serverless function is allowed to suspend. A bare unawaited SDK call is not enough on Vercel: the runtime can freeze the function right after the response is sent, silently dropping anything still in flight.
- PostHog runs with in memory only persistence (no cookie, no `localStorage`) until scope item 5's consent banner ships. This satisfies this feature's own "done when" without setting a non essential cookie ahead of consent, at the cost of not reliably linking one visitor's anonymous activity across page reloads or logins until then (see Consequences and Follow-up).

**Security model**:
Compliance scope: RODO (GDPR), since both tools act as third party data processors handling data about real EU users (a Poland pilot). Sentry EU region (Frankfurt) and PostHog EU Cloud are chosen specifically to keep this data inside the EU. Dashboard access for both tools is a single admin account (the founder and engineer) for this pilot phase; no ModularHub-side auth gates them. Identity attached to errors and events is a pseudonymous internal ID plus role, never a direct identifier; the erasure process (AC-7) lets that pseudonymous history be deleted or anonymized in both tools on request.

**Configuration required**:
- `SENTRY_DSN`: Sentry project connection string, client and server
- `SENTRY_AUTH_TOKEN`: upload source maps during build for readable stack traces
- `SENTRY_ORG`, `SENTRY_PROJECT`: identify the project for source map and release tooling
- `SENTRY_URL`: the EU region's API endpoint (for example `https://de.sentry.io`), so the source map upload and release tooling talk to the right regional API, separate from the DSN used for event ingestion
- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog project API key (client exposed by design)
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog EU Cloud host URL
- Environment and release tagging reuse Vercel's own `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA`, already present from spec 0019; no new variable needed for those.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: a deliberately thrown error in a server action reaches the Sentry EU project tagged with request path, release SHA, and role/pseudonymous ID (or anonymous, if no session), and is confirmed present after the function has fully suspended (proving the flush, not just the call, worked), verifies **AC-1**
- Failure case: PostHog is unreachable when `trackEvent()` fires during a real user action (e.g. sending a query); the action still completes and only the console shows the capture failure, verifies **AC-6**
- Identity linking: a test event fired with an explicit `distinctId` before `identify()` is called, followed by `identify()` with that same `distinctId`, results in both showing under one person in PostHog, verifies **AC-4**
- Auth/permission: a local dev run and a CI test run both execute instrumented code paths and produce zero events in the production Sentry or PostHog project, verifies **AC-2**

## Build plan

1. Provision the Sentry project (EU region, Frankfurt) and the PostHog project (EU Cloud); add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` to the staging and production environments from spec 0019 only, so dev and CI stay unconfigured and nothing sends there, satisfies **AC-2**
2. Initialize the Sentry SDK for client, server, and the edge runtime `proxy.ts` entry point (`instrumentation.ts`, `instrumentation-client.ts`, `onRequestError`, plus `withSentryConfig` in `next.config.ts` so `SENTRY_AUTH_TOKEN`/`SENTRY_URL` actually get used for source map upload), with a `beforeSend`/`beforeSendTransaction` hook that scrubs email, name, phone, address, payment, and document fields, error capture left at Sentry's default rate relying on its built in spike protection for storm control, and performance trace sampling capped (for example 20%), satisfies **AC-1**, **AC-2**, **AC-8**
3. Build `lib/observability/errors.ts` exposing `captureError()` as the only sanctioned entry point: never blocks or slows the caller, but explicitly flushed (`Sentry.flush()`, wrapped in Vercel's `waitUntil()`) before the serverless function suspends so delivery is not silently dropped, internal failures only logged to console, satisfies **AC-1**, **AC-5**, **AC-6**
4. Deliberately throw one test error through `captureError()` from both a client and a server code path; confirm it reaches the Sentry EU dashboard with the expected context attached, after the function has fully suspended, satisfies **AC-1**
5. Configure Sentry's email alert rule for new and critical issues, satisfies **AC-3**
6. Initialize the PostHog SDK (EU Cloud host) with in memory only persistence (no cookie, no `localStorage`, so no non essential storage happens ahead of scope item 5's consent banner), environment tagged, disabled when no key is configured (dev/CI), satisfies **AC-2**
7. Build `lib/observability/events.ts` exposing `trackEvent()` (typed to the seven defined event names, taking an explicit `distinctId` from the caller) and `identify()` (no-op until a real session exists, later aliasing the passed `distinctId` to the real user), scrubbing PII at the boundary and flushed before the function suspends, satisfies **AC-4**, **AC-5**, **AC-6**
8. Fire one manual test event through `trackEvent()` with an explicit test `distinctId`, then call `identify()` with that same ID, and confirm both the event and the identity link land in the PostHog EU project, satisfies **AC-4**
9. Add an ESLint `no-restricted-imports` rule blocking `@sentry/nextjs` and `posthog-js`/`posthog-node` imports outside `lib/observability/`, so **AC-5** is enforced by tooling, satisfies **AC-5**
10. Document and exercise once, with a dummy test ID, the deletion or anonymization of a pseudonymous user's history using each tool's own mechanism (Sentry: search and delete by tag; PostHog: the person deletion API), satisfies **AC-7**

## Consequences

**Positive**:
- Errors and funnel drop offs become visible from day one of real traffic, instead of surfacing through a support email or a bounced client.
- The wrapper module gives every later feature (the loop, offers, payments, fulfilment, notifications) one already PII safe call to make, instead of each one reinventing the scrubbing rules.
- EU hosted tools keep this RODO relevant data inside the EU by default, avoiding an international transfer question later.

**Negative / tradeoffs**:
- Two dashboards to check instead of one; triage means switching between the error tracker and the analytics tool.
- Sentry's free tier (5,000 errors a month) and PostHog's free tier (1,000,000 events a month) comfortably cover a pilot, but a paid plan will eventually be needed and is not budgeted yet.
- The seven event names are defined ahead of the features that will emit them (scope items 6, 7, 8, 12, 13); those specs could still reveal a need to adjust the taxonomy once designed in detail.
- The erasure process (AC-7) is a manual runbook for a single admin; it will not scale once there is a real support queue or a larger team.
- Running PostHog cookieless until scope item 5 ships means a visitor's anonymous activity does not reliably link across a page reload or a later login during that window, so the funnel view undercounts repeat visits until real consent backed persistence turns on.

**Neutral**:
- A new project convention: no direct Sentry or PostHog SDK import outside `lib/observability/`. This needs to be written into `AGENTS.md` so later features follow it without being told each time (see Follow-up).
- Two new external accounts (a Sentry org, a PostHog project) with their own credentials to create and store.

## Follow-up

- [ ] `sentry-sdk-setup`, `sentry-instrument`, `sentry-fix-stack-traces`, `sentry-create-alert`, `sentry-setup-releases`, and `posthog-instrumentation` conventions are not yet in root `AGENTS.md` `## Agent skills`; these are project wide (every feature that throws an error or tracks an event uses them) and belong at root level, along with a rule that feature code never imports `@sentry/nextjs` or `posthog-js`/`posthog-node` directly.
- [ ] Scope items 6 (rdzeń pętli), 7 (realna oferta), 8 (realne płatności), 12 (realizacja), and 13 (powiadomienia e mail) each need to call `trackEvent()` at the right point when built; this spec only proves the pipeline works end to end with one manual test event per tool.
- [ ] The `identify(userId, role)` call is a no-op until a real session exists; whichever spec ships the first real login (expected to be scope item 6) should call it once a session is established.
- [ ] The manual data erasure process (AC-7) should be revisited for automation once account deletion itself is a real, user facing feature and request volume can no longer be handled by hand.
- [ ] If EU hosted SaaS pricing becomes a concern at higher volume, revisit the self hosted alternative (Option 2 in rationale.md).
- [ ] When scope item 5's consent banner ships and RODO consent is actually recorded, switch PostHog from in memory only persistence to its normal persistent identity (cookie or `localStorage`), so anonymous activity before and after that point can link into one funnel.
- [ ] Confirm during build exactly which self serve mechanism Sentry offers for deleting one pseudonymous user's error history (search and delete by tag versus a dedicated API); PostHog's person deletion API is already confirmed, Sentry's exact path was not independently verified at spec time.
- [ ] PostHog now also ships its own error tracking feature on EU Cloud. Rationale.md Option 3 judged it not yet as deep as Sentry's dedicated stack trace, source map, and release tooling, but this is worth re-checking if consolidating to a single vendor becomes attractive once the pilot has real usage data.

## References

**Project sources** (verifiable, in this repo):
- `AGENTS.md`, stack (Next.js 16 App Router, TypeScript, Vercel hosting) and the note that Auth.js is planned but not yet wired into the app, the basis for treating identity as optional in this spec
- `docs/scope/produkcja.md`, scope item 4's "done when" line (a production error reaches the tracking tool with context, key business events are recorded and visible in one place)
- spec [0018](../0018-prawdziwy-model-danych/index.md), the existing user/producer/client schema and its `audit_log` pattern, the basis for treating the internal `user.id` as the pseudonymous key
- spec [0019](../0019-ci-cd-i-srodowiska/index.md), the dev, staging, and production environments this feature tags against
- installed community skills `posthog-instrumentation` and the `sentry-for-ai` skill set, confirmed available in this environment

**Practices & standards**:
- RODO (GDPR), data processor obligations and EU data residency for personal data processed on behalf of the controller
- ePrivacy Directive 2002/58/EC (implemented in Poland's Prawo komunikacji elektronicznej), consent required to store or read a non essential cookie regardless of the GDPR lawful basis for the processing itself, the reason PostHog runs cookieless until scope item 5's consent banner exists
- non blocking, explicitly flushed telemetry (`waitUntil()` plus an explicit `flush()`/`shutdown()` call) as the standard pattern for serverless and edge functions, where an unawaited call can be silently dropped when the function suspends
- error spike protection and trace sampling as the standard way to control third party tool cost and dashboard noise at scale

**Links** (web verified during this design conversation):
- Sentry Next.js manual setup (App Router, `instrumentation.ts`): https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
- Sentry EU data region: https://blog.sentry.io/sentrys-eu-data-region-now-in-early-access/
- PostHog pricing (free tier limits): https://posthog.com/pricing
- PostHog EU Cloud region: https://posthog.com/blog/posthog-cloud-eu
- Bugsnag docs (runner up error tracker): https://docs.bugsnag.com/platforms/javascript/
- Umami docs (runner up analytics tool): https://umami.is/
