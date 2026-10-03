# lib/cases/

The managed advisory case flow (spec 0048, "zarządzany przepływ doradczy"): an inquiry becomes a "case" routed through an advisor, with per-channel messaging between client, advisor, and producer. Backs `app/[locale]/panel/` (client case view), `app/[locale]/internal/` ([AGENTS.md](../../app/[locale]/internal/AGENTS.md), advisor/admin case view), and the case email notifications below.

## Key files

| File | Owns |
|---|---|
| `access.ts` | `evaluateCaseAccess`/`requireCaseAccess`: the one, sole place that decides who can see a case and its channels. |
| `actor.ts` | `getCaseActor()`: resolves the calling user's `CaseActor` (client/producer/advisor) from the session, never from a client supplied id. |
| `queries.ts` | Read models for the client/advisor case screens (`CaseSummary`, `CaseView`), always gated through `requireCaseAccess`. |
| `create.ts` | Creates a case from a new inquiry (start cards, channels). |
| `cards.ts` / `start-cards.ts` | The "start cards" summary state (spec 0048 AC-43) derived from messages, not a separate answered flag. |
| `messaging.ts` | Per channel message list/append. |
| `poll.ts` | Polling support for near live case updates. |
| `notify.ts` | Case email notifications (new case, new message); thin wrapper over `lib/notifications/send.ts`. |
| `email-policy.ts` | `shouldEmailForMessage`: throttles message emails. |
| `clock.ts` | Injected `Clock` + `microOffsetTimestamp` for deterministic, orderable timestamps in tests. |

## Conventions

- **Every** read or write that touches a case or its channels goes through `requireCaseAccess`/`evaluateCaseAccess` first; no route, action, or query rolls its own access check. `evaluateCaseAccess` is a pure function (no DB access) specifically so the whole permission matrix (client/producer/advisor × channel kind) is unit testable without a connection.
- `evaluateCaseAccess` returns `null` for "no such case" and "not your case" alike — never leaks which one it was.
- The actor is always resolved server side from the session (`actor.ts`), never trusted from a client supplied id.
- `stage === "legacy_direct"` (pre spec 0048 direct inquiries) never has a case or channels; access evaluates to `null`, and `app/[locale]/internal/cases-and-inquiries/` deliberately gives these rows no detail link.
- Email notifications are best effort everywhere in this directory: a send failure is caught and reported via `captureError`, never rethrown, never blocks the case/message write that triggered it. `shouldEmailForMessage` (at most one email per recipient+channel per 10 minute window, none if the recipient was active in the last 90 seconds) runs on `channel_read_state` data, no DB access of its own, for the same unit testability reason as `evaluateCaseAccess`.
- Interval/window logic takes a `Clock` parameter (`systemClock` in production, a fake in tests) instead of calling `Date.now()`/`new Date()` directly — the one way this directory's time dependent code stays testable without real waits.
- `microOffsetTimestamp` exists because a single `db.batch` can insert several start card rows faster than JS `Date`'s millisecond resolution can distinguish; it fabricates a sub millisecond offset string Postgres parses natively, to preserve insertion order (spec 0048 AC-38).

## Related specs

`docs/specs/0048-zarzadzany-przeplyw-doradczy/`. Email sending itself: `docs/specs/0051-powiadomienia-e-mail/` (shared `lib/notifications/` sender this directory's `notify.ts` wraps).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
