# lib/notifications/

Transactional email (spec 0051, "powiadomienia e mail"): one shared Resend sender plus one typed function per triggering event. Also the send path `lib/cases/notify.ts` ([lib/cases/AGENTS.md](../cases/AGENTS.md)) wraps for case emails (spec 0048), unified onto this sender by spec 0051's refactor so there is exactly one place that calls Resend.

## Key files

| File | Owns |
|---|---|
| `send.ts` | `sendNotificationEmail()`: the one, low level Resend call. Everything else in this directory goes through it; nothing else calls Resend's API directly. |
| `login.ts` | Magic link login email. |
| `new-inquiry.ts` | Confirmation email to the client on a new inquiry/case. |
| `new-offer.ts` | Notifies the client of a new offer. |
| `order-status.ts` | Order/fulfillment status change email. |
| `payment.ts` | Payment confirmation email. |
| `templates/` | `TransactionalEmail.tsx` (the one shared `@react-email` layout), `text.ts` (plain text counterpart, always sent alongside the HTML), `reference.ts` (`shortReference()`, the short id shown in email subjects/bodies), `contact.ts`. |

## Conventions

- `sendNotificationEmail()` is the single chokepoint: every caller supplies `emailType` (one of the fixed `NotificationEmailType` union) and `entityId`/`distinctId`; it tracks `notification_email_sent`/`notification_email_failed` via PostHog (`lib/observability/`) and reports network/non-2xx failures via `captureError`, both internally — callers never do their own tracking or error reporting for the send itself.
- Missing `RESEND_API_KEY` is a silent no-send (returns `false`), not a `notification_email_failed` event: that event means "a real send attempt reached Resend and failed," not "not configured" (spec 0051 Key invariants).
- `throwOnFailure` is the one opt-in escape from "best effort": only the login magic link email sets it, because a silently swallowed failure there has no fallback delivery path for the user. Every other sender in this directory (new inquiry, new offer, order status, payment, case emails) swallows the failure and reports it via `captureError`, never rethrows — a failed notification email must never roll back or block the write that triggered it.
- Every sender sends both `html` (via `render(TransactionalEmail(...))`) and `text` (`renderTransactionalEmailText`, the plain text counterpart built from the same props) in the same call — never HTML only.
- Copy comes from `next-intl` (`getTranslations({ locale, namespace: "<Event>Email" })`), one namespace per email type; a sender that needs a specific locale (not the request's) passes it explicitly (e.g. case emails default to `"pl"`, see `lib/cases/notify.ts`).
- `DEFAULT_FROM_EMAIL` is the one shared sender address fallback (`RESEND_FROM_EMAIL` env var overrides it); don't hardcode a from address in an individual sender file, that was the pre spec 0051 bug this consolidation fixed.

## Related specs

`docs/specs/0051-powiadomienia-e-mail/`.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
