# 0064. Atrybucja audytu panelu admina

**Date**: 2026-10-03
**Status**: Accepted

## Summary

Spec 0018 already built a database log (`audit_log`) that records every change to personal data, but never finished the part that records who made the change; today it is always blank. This decision finishes that wiring for the admin panel specifically, and adds the one admin written table (case messages) that the log does not cover at all yet. It does not add a screen to view the log, does not track who merely looked at data, and does not add two factor login; those stay separate, future decisions.

## Context

See [rationale.md](rationale.md) for the full problem description, the three options weighed, and why finishing the existing mechanism was chosen over building a second one or switching database drivers.

## Requirements

**User stories**:
- As the engineer running this platform, I want every change an administrator makes to a customer's or producer's personal data to show which admin made it, so a change can be explained or investigated after the fact.
- As the engineer running this platform, I want an administrator's messages in a client or producer facing case to leave a record that ModularHub was active and when, without the message's wording being permanently copied somewhere a client's redaction request cannot reach.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: When an admin session performs a write to a table the audit trigger already covers (`users`, `producer`, `client`, `inquiry`, `payment`, `document`) or newly covers (`message`), the resulting `audit_log` row's `actor_user_id` is that admin's user id, never NULL.
- **AC-2**: When a non admin session (client or producer) performs a write to one of those same tables through a call site shared with the admin panel (e.g. sending a case message, editing a product photo), `actor_user_id` on the resulting row stays NULL. Attribution is admin only by design in this decision; it is not a bug that producer and client writes are unattributed.
- **AC-3**: A new trigger on `message` (`AFTER INSERT OR UPDATE OR DELETE`) writes an `audit_log` row whose `old_values`/`new_values` contain only `channel_id`, `author_user_id`, `author_kind`, `type`, `locale`, `idempotency_key`, `redacted_at`, `created_at`. `body` and `payload` are never present in either value, for any row, under any circumstance.
- **AC-4**: The one update shape the `message_immutable` trigger permits (`body`/`payload` set to NULL, `redacted_at` set, the mechanism a future client requested redaction feature would use; no application code performs it yet) is unaffected by AC-3: no `audit_log` row, before or after that update, ever contains that message's `body` or `payload` content.
- **AC-5**: At least one real admin write path has an automated test asserting `audit_log.actor_user_id` is populated and correct after the action, so a future call site that forgets to wire attribution is caught by a failing test, not discovered later as a silent NULL.
- **AC-6**: After deploying to production (no staging environment exists today), the migration is confirmed applied there and one real admin action is confirmed to produce a populated `actor_user_id`, checked directly against the production database.

## Decision

**Chosen option**: Option 1: Fix in place (finish the existing mechanism)

Finish wiring the Postgres session setting `app.actor_user_id` at the admin panel's existing write call sites, using the `db.batch([...])` pattern this repo already uses for atomicity on its stateless HTTP database driver, and extend the existing audit trigger function so it also covers `message`, logging only metadata, never message content.

## Rationale

See [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
No new tables or columns. `audit_log` and its `actor_user_id` column already exist (spec 0018). One migration changes two things in the database:
- `CREATE OR REPLACE FUNCTION audit_log_capture()`: when `TG_TABLE_NAME = 'message'`, the function builds `old_values`/`new_values` as an explicit allowlist (`channel_id`, `author_user_id`, `author_kind`, `type`, `locale`, `idempotency_key`, `redacted_at`, `created_at`, matching AC-3 exactly), not the normal `to_jsonb(row)` plus a denylist of dropped keys. An allowlist is deliberate here: a denylist would silently let any future new column on `message` flow into the audit log by default, the wrong default for a table this spec is specifically trying to keep content out of.
- `CREATE TRIGGER message_audit AFTER INSERT OR UPDATE OR DELETE ON "message" FOR EACH ROW EXECUTE FUNCTION audit_log_capture();`, the same shape as the six existing triggers in `drizzle/0002_audit_log_trigger.sql`.

**Known, accepted side effect**: `audit_log.actor_user_id` carries a foreign key to `users.id` with no `ON DELETE` behavior, so once this decision makes the column real, a `users` row that was ever an attributed actor cannot be deleted while its `audit_log` rows exist (the table is append only). This is unchanged schema, not something this migration introduces, but it has no practical effect until this decision ships. See Consequences and Follow up.

**Write call sites touched** (every place an admin session writes to an audit covered table today, found by reading the code, not a guess):

| File | Function | Table written | Admin identified by |
|---|---|---|---|
| `lib/producer-block-actions.ts` | block/unblock producer | `users`, `sessions` | `requireAdminActorId()` (existing) |
| `lib/producer-member-actions.ts` | invite/remove producer member | `users`, `producer_member`, `sessions` | `requireAdminActorId()` (existing) |
| `lib/project-quote-actions.ts` | `setClientB2bVerification` | `client` | inline `session.user.role !== "admin"` check (existing) |
| `lib/project-quote-actions.ts` | `setProducerVolumeVerification` | `producer_capacity_profile` (not trigger covered; wired anyway for consistency, has no effect until that table is ever added to the trigger) | inline `session.user.role !== "admin"` check (existing) |
| `lib/cases/messaging.ts` | `sendMessage` | `message` | only when `getCaseActor()` returns `{ kind: "advisor" }`; client/producer sends stay unattributed (AC-2) |
| `lib/cases/cards.ts` | the advisor card closing action (inserts an advisor `message`, updates `inquiry`, in one `db.batch`) | `message`, `inquiry` | always an advisor action, called only from the admin case screen |
| `lib/product-photo-actions.ts`, `lib/producer-project-translation-actions.ts`, `lib/producer-room-layout-actions.ts` | various (shared admin/producer actions) | `document` and others | only when the resolved actor's role is `"admin"`; producer's own edits stay unattributed (AC-2) |

This table was corrected once already during this spec's cross check (an advisor write in `lib/cases/cards.ts` was missed on the first pass); task 5 of the Build plan below re-reads every file in this table at build time rather than trusting this list blindly, since a shared-actor codebase like this one is easy to under-scan by grep alone.

**Key invariants**:
- The actor is set with `select set_config('app.actor_user_id', <value>, true)`, never a literal `SET LOCAL app.actor_user_id = <value>`. Postgres does not accept a bound parameter inside a `SET`/`SET LOCAL` statement; `set_config(...)` is an ordinary function call and accepts one safely. The third argument, `true`, scopes it to end at the transaction's end, the same lifetime `SET LOCAL` would give it.
- That `set_config(...)` call is always the first statement in the same `db.batch([...])` call as the write(s) it should apply to, never a separate, earlier call (the driver gives no other way to share session state between statements, see Rationale).
- The shared helper (task 2 below) always discards the `set_config(...)` call's own result before returning the batch's results to its caller, so every existing call site that reads its own results by position (e.g. `batchResults[1]` in `lib/project-quote-actions.ts`) keeps working unchanged; the helper must not shift those indices.
- `message.body` and `message.payload` are never present in `audit_log`, regardless of actor, regardless of whether the message was later redacted (enforced by the allowlist in Feature design, not a denylist).
- Any admin initiated write to a trigger covered table must go through the shared helper; a direct `db.update()`/`db.insert()` at such a call site, bypassing the helper, is a bug matching AC-1's contract, even though nothing enforces this at compile time.
- A malformed or unrecognized actor id is not a silent failure in the other direction: `audit_log.actor_user_id` has a foreign key to `users.id`, so a bad id makes the trigger's own insert fail its FK check, which aborts the whole `db.batch` the real write was riding in. A bug in actor resolution therefore blocks the admin's actual action (fails loud) rather than just losing attribution (failing quiet); this is accepted as the safer of the two failure directions, but it does mean a bug here is user visible, not just an audit gap.

**Security model**: Attribution is scoped to admin only, matching the existing role model (`session.user.role === "admin"`, or `CaseActor.kind === "advisor"` for the shared case messaging call site). No new roles, no new permission. Compliance scope: personal data (RODO), the same scope spec 0018 already named for `audit_log` itself; this decision does not change who can read or write the covered tables, only who gets credited for the write.

**Configuration required**: none. No new environment variables, no new credentials.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):
- Happy path: an admin blocks a producer; the resulting `audit_log` row on `users` has `actor_user_id` equal to that admin's id, verifies **AC-1**, **AC-5**.
- Happy path: an admin (advisor) sends a message in a case; the resulting `message_audit` row has `author_user_id`/`author_kind` populated and no `body`/`payload` key present, verifies **AC-3**.
- Failure case: the `message_immutable`-permitted redaction update (`body`/`payload` set to NULL) is applied directly to a row an admin had already replied to in the same channel; no `audit_log` row, before or after that update, contains the pre redaction `body`, verifies **AC-4**.
- Failure case: an admin write is attempted with a malformed actor id (simulating a bug in actor resolution); the whole write fails (the FK check on `audit_log.actor_user_id` rejects it) rather than silently succeeding unattributed, verifies the fail loud invariant above.
- Auth/permission: a producer edits their own product photo (an audit covered table, `document`) through the same action a admin could also call; the resulting `audit_log` row has `actor_user_id` NULL, verifies **AC-2**.

## Build plan

1. Migration: `CREATE OR REPLACE FUNCTION audit_log_capture()` (add the `message` body/payload stripping step) and `CREATE TRIGGER message_audit ...`, hand enriched beyond `drizzle-kit`'s DSL the same way `drizzle/0002_audit_log_trigger.sql` was, verified on a disposable Neon branch before applying (per `lib/db/AGENTS.md`), satisfies **AC-3**, **AC-4**
2. A small shared helper (e.g. `lib/db/with-admin-actor.ts`) that calls `db.batch([db.execute(sql\`select set_config('app.actor_user_id', ${actorUserId}, true)\`), ...statements])` and returns only the results for `...statements` (drops the `set_config` call's own result, so callers see the same indices as before), the one place this pattern is written, reused by every call site below, satisfies the mechanism behind **AC-1**
3. Wire `lib/producer-block-actions.ts` through the helper, the first full end to end proof that a real admin action produces a populated `actor_user_id`, satisfies **AC-1** for its slice
4. Add the regression test for task 3 (asserts `audit_log.actor_user_id` is populated and correct after a block action), satisfies **AC-5**
5. Wire the remaining call sites from the table above (`lib/producer-member-actions.ts`, both functions in `lib/project-quote-actions.ts`, `lib/cases/messaging.ts`'s `sendMessage` gated on `CaseActor.kind === "advisor"`, and the admin branch of `lib/product-photo-actions.ts`, `lib/producer-project-translation-actions.ts`, `lib/producer-room-layout-actions.ts`), satisfies **AC-1**, **AC-2** in full
6. After deploy, verify directly against production (no staging exists): confirm via the Neon MCP that the migration applied, perform one real admin action, confirm its `audit_log` row has a populated `actor_user_id`, satisfies **AC-6**

## Consequences

**Positive**:
- Admin actions on seven personal data and business critical tables (the original six plus `message`) become individually attributable to the admin who made them, closing a real accountability gap in a panel that already has live, unsupervised access to that data.
- The client's existing message redaction right stays fully intact; nothing newly copies message content into a place redaction cannot reach.
- No new infrastructure to operate: the same table, the same trigger function, the same migration style already documented in `lib/db/AGENTS.md`.

**Negative / tradeoffs**:
- The fix has no single enforcement point. Every future admin write call site has to be deliberately routed through the shared helper; nothing in the type system or at runtime stops a new call site from writing directly and silently staying unattributed. The regression test (AC-5) only guards the one call site it tests, not every future one.
- Producer and client initiated writes remain unattributed after this decision, even on the same tables (e.g. a producer's own profile edit on `client`/`producer` stays NULL). This was a deliberate scope boundary (see Rationale), not an oversight, but it means `audit_log` will show a mix of attributed and always NULL rows on the same table, which a future reader needs to understand is by design.
- `producer_capacity_profile` and `producer_member` get the actor setting wired for consistency even though no trigger listens on them yet; this has literally no observable effect until a future decision adds trigger coverage there, and could read as dead code to someone unfamiliar with this spec.
- Once `actor_user_id` is actually populated, `audit_log`'s existing (unchanged by this spec) foreign key to `users.id` means any `users` row that was ever an attributed actor cannot be deleted while `audit_log` is append only. A legitimate account deletion (an admin leaving, or a future erasure request touching an account that happened to perform an attributed write) will fail at the database level until a future decision addresses it (see Follow up).

**Neutral**:
- One new, hand enriched migration (not plain `drizzle-kit generate` output), following the pattern `lib/db/AGENTS.md` already documents for this project.
- No new dependency, no new environment variable.

## Follow-up

- [ ] Self service role grant and revoke from inside the admin panel (the first third of scope feature 44), today still a manual database change; separate future decision.
- [ ] Logging who merely viewed (not changed) a client's or producer's personal data (the second part of scope feature 44's "Done when"); needs an application level logging mechanism on read paths, not a database trigger, so it is a different kind of decision than this one.
- [ ] Two factor login for admin accounts (the third part of scope feature 44); explicitly deferred by the engineer in this session.
- [ ] A basic `/internal` screen to browse `audit_log`; today it can only be read directly against the database (e.g. via the Neon MCP or Drizzle Studio). The engineer explicitly deferred this for now.
- [ ] Extending `actor_user_id` attribution beyond the admin panel, to producer and client initiated writes, which appears to have been spec 0018's original, broader intent; explicitly deferred as a materially larger, separate decision.
- [ ] Decide whether `producer_capacity_profile` and `producer_member` should eventually get their own audit trigger coverage, now that admin writes to them already carry an actor id that nothing currently reads.
- [ ] Decide what `audit_log.actor_user_id`'s foreign key should do when the referenced `users` row is deleted (today: nothing, the delete is blocked). `ON DELETE SET NULL` is the likely answer (keep the historical row, detach it from the since deleted account) but is a deliberate call, not made in this spec.
- [ ] Build the actual client requested message redaction feature; today only the database trigger permits the update shape (`body`/`payload` to NULL), no application code performs it. This spec only makes sure that future feature, whenever built, is safe to use (AC-4).

## Migration plan

**Strategy**: Single deployment, additive only. No existing data is transformed or backfilled; the new trigger only affects rows written after it is created, and `actor_user_id` on existing historical `audit_log` rows stays NULL (that history cannot be reconstructed, and this decision does not attempt to).

**Phases**:
1. Build and verify entirely against the dev database (`modularhub-dev`): apply the migration on a disposable Neon branch first (per `lib/db/AGENTS.md`), then on dev proper; wire and test the call sites from the Build plan; run the regression test from AC-5.
2. Ship the migration and the code change together in one deployment (the engineer's chosen rollout order, see rationale.md). Because there is no staging environment today, this is the first time the change runs against anything beyond dev.
3. Immediately after that deploy, perform the manual production check from Build plan task 6: confirm the migration applied (Neon MCP against the production project), perform one real admin action, confirm its `audit_log` row carries a populated `actor_user_id`.

**Rollback**: Revert the deployed commit (removes the application side wiring) and run a follow up migration that drops `message_audit` and restores the prior `audit_log_capture()` function body (the migration file itself is never edited after being applied, per standard practice in this repo; a new migration reverses it). No data to roll back, since nothing is backfilled or transformed.

**Risks**:
- Production can drift from dev outside of `db:migrate` (this repo has a documented history of hand run production database changes); task 6 exists specifically because this cannot be assumed to just work the same way on production as it does on dev, and must be checked, not assumed.
- The silent NULL failure mode (`current_setting(..., true)` never errors) means any call site missed in task 5, or added later without reusing the Build plan's helper, fails quietly rather than loudly; AC-5's regression test covers one call site, not a structural guarantee against every future one.
- The shared helper must discard the `set_config(...)` call's own result before returning, or every existing call site that reads its batch results by position (e.g. `lib/project-quote-actions.ts`) silently reads the wrong result once that call site is migrated to use the helper.
- Once this ships, `audit_log`'s existing foreign key on `actor_user_id` starts actually blocking deletion of any `users` row that performed an attributed write (see Consequences); this is a behavior change in what used to be a harmless, always NULL column.
