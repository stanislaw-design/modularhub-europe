# Rationale: 0021. Obserwowalność produkcyjna

## Context

> ⚠️ Premise note: This spec assumes an identity (a role and a pseudonymous user ID) is available to attach to errors and events, but Auth.js is only planned, not yet wired into the app (`AGENTS.md`), and no feature in this epic has shipped a real login yet (scope item 6, the loop on real backend, is still "needs a decision"). Waiting for a real login before designing observability would block this Foundation phase item behind a Slice 1 item that has not even been designed yet; inventing a fake session model here would be worse. The right framing, applied throughout this spec: `captureError()` and `trackEvent()` work fully anonymous when no session exists, and a separate `identify(userId, role)` call, a no-op today, gets called once by whichever feature ships the first real login. See `## Feature design` in `index.md` for how this shows up in the API surface, and the Follow-up item naming which future spec should call it.

ModularHub Europe is about to take real traffic: real accounts, a real database, and, as this epic's later slices ship, real payments. Right now, if something breaks in production, the only way anyone finds out is a user complaint or a manual look at Vercel's raw logs, with no context, no grouping of repeat failures, and no way to tell how many people hit the same bug. Symmetrically, once the client and producer journey (registration, adding a product, sending a query, making an offer, paying, tracking fulfilment) is wired to a real backend, there is no way to see where people actually drop off, only whether the code technically works.

Two forces shape this decision more than any other. First, this is a single developer operation for the pilot: whatever gets chosen has to be something one person can set up, understand, and check on without a platform team behind it, which argues strongly against self hosting anything. Second, the pilot is EU only and touches personal data (accounts, addresses, payments once slice 3 ships), so RODO (GDPR) applies to whatever tool receives error or event data; a US only data region is a real compliance question, not a nice to have.

The consequence of not deciding this now: every feature built from here (auth, the real loop, offers, payments) ships with no way to see it fail in production, and by the time an incident happens the postmortem starts from zero.

## Options considered

### Option 1: Two EU hosted SaaS tools behind one internal wrapper, starting now, anonymous until a session exists

Sentry (EU data region) for errors, PostHog (EU Cloud) for business events, both reached only through `lib/observability/`, tracking starts immediately in pseudonymous form rather than waiting for the RODO consent banner (scope item 5).

**Pros**:
- Each tool is purpose built for its job (Sentry: stack traces, source maps, release tracking; PostHog: funnels, event properties), rather than a generalist tool doing both adequately
- Managed SaaS, EU hosted, needs no infrastructure a single developer has to operate
- The wrapper means a future provider swap, or adding the consent gate later, touches one module, not every feature that calls it

**Cons**:
- Two dashboards instead of one dashboard total
- Ongoing cost once free tiers are exceeded, not yet budgeted
- To start tracking now without setting a non essential cookie ahead of scope item 5's consent banner, PostHog has to run in a cookieless, memory only mode, which means anonymous activity does not reliably link across a reload or a later login until consent based persistence turns on

### Option 2: Self hosted open source stack (for example GlitchTip for errors, Umami for analytics) on the project's own infrastructure

**Pros**:
- No vendor cost ceiling, and full control over data residency and retention
- Umami could even reuse the existing Neon Postgres instance

**Cons**:
- Adds an operational surface (hosting, upgrades, backups, uptime of the observability stack itself) that a single developer pilot has not taken on anywhere else in this epic; every other Foundation decision (spec 0017) chose managed services specifically to avoid this
- If the self hosted observability stack goes down, the team loses visibility into the rest of the app at the same time, a bad failure mode for exactly the tool meant to catch failures

### Option 3: A single unified tool covering both errors and analytics

**Pros**:
- One dashboard, one vendor relationship, one set of credentials

**Cons**:
- PostHog now ships its own error tracking feature on EU Cloud, so this option is closer than it used to be, but as of this design its error tracking still lacks Sentry's depth on stack traces, source maps, and release based regression tracking; a generalist analytics tool's error handling is not yet a like for like replacement, though this is worth re-checking later (flagged in Follow-up)
- Locks the whole observability surface to one vendor's roadmap and pricing

### Option 4: Direct SDK calls, no wrapper, and wait for the RODO consent banner (scope item 5) before tracking any business event

**Pros**:
- Fastest path to shipping error tracking alone
- No PII scrubbing logic to design until the consent banner exists

**Cons**:
- Leaves scope item 4's own "done when" only half met: no business event visibility until a later, unscheduled point
- Scatters PII scrubbing logic across every future call site instead of enforcing it once, and every call site talks to the vendor SDK directly, which is expensive to change later
- Conflates two separate legal questions: GDPR's lawful basis for the processing itself (where a legitimate interest argument might apply to aggregated product analytics) and the ePrivacy Directive's separate consent requirement for storing or reading a non essential cookie, which applies regardless of that lawful basis. Waiting for scope item 5 is one valid way to resolve the cookie question, but not the only one: Option 1 resolves the same question by not storing a non essential cookie in the first place

## Rationale

Option 1 was chosen because it is the only option that satisfies both forces from Context without asking the team to take on something it has not signed up for elsewhere in this epic. The single developer constraint rules out Option 2 (self hosting adds exactly the operational surface every other Foundation spec in this epic avoided) and makes Option 3's one vendor tradeoff not worth it, since Option 1's two managed tools cost no more operational effort than one would. The RODO force is met directly by choosing the EU data region for both tools rather than by delaying tracking (Option 4); delaying would also leave scope item 4 unfinished and push the compliance question onto every future call site instead of the one wrapper.

The wrapper itself (`lib/observability/`, not a direct SDK call per feature) follows from the project's own asynchronous data access convention already in `AGENTS.md` (functions as the seam where the real implementation gets swapped in later, applied here to the same idea: one seam for the tool, not many). It also happens to be the only option where the RODO consent banner (scope item 5), when it ships, can gate tracking by changing one module instead of auditing every feature that calls PostHog directly: turning PostHog's persistence from memory only to its normal cookie based mode is a one line change inside the wrapper, not a hunt through every call site.
