# Rationale: 0064. Atrybucja audytu panelu admina

## Context

Spec 0018 built a database level audit trail for personal data (`audit_log`, plus a Postgres trigger in `drizzle/0002_audit_log_trigger.sql`) on six tables: `users`, `producer`, `client`, `inquiry`, `payment`, `document`. The trigger captures what changed (old and new row values, with `name`/`email`/`phone`/`nip` hashed to md5) on every insert, update, and delete. It also reads an actor id from a Postgres session setting, `app.actor_user_id`, meant to be set by the application right before a write, so the log would show who made the change.

That part was never finished. Nothing in the application ever sets `app.actor_user_id`. The column exists, the trigger reads it correctly, but it is always empty (NULL) in practice. The result: the audit log can show what changed on a row, but never who changed it. For the admin panel (`/internal`, spec 0055), which already has real, unsupervised access to customer and producer personal data, this means there is today no way to tell which administrator performed a given action, nor any way to prove a given change was or was not made by a legitimate admin session.

The database driver in use, `drizzle-orm/neon-http` (see `lib/db/AGENTS.md`), makes this harder than a simple oversight to fix. It does not support interactive, multi statement transactions (`db.transaction`); every single `db.update()` or `db.insert()` call is its own independent HTTP request to Neon, which means it is also its own independent Postgres transaction. A session level setting like `app.actor_user_id` only lives for the duration of one transaction, so setting it in one call has no effect on a write made in a separate call. The only way to make a session setting apply to a write, on this driver, is to send both in the same `db.batch([...])` call, which Neon executes as one real, atomic transaction. This repo already uses that exact pattern for other atomicity needs (e.g. `lib/offer-actions.ts`, which mixes a typed Drizzle statement with a raw `db.execute(sql\`...\`)` in one batch), so the mechanism itself is proven; it has simply never been pointed at this particular problem.

A second, narrower gap was found while mapping out what the admin panel actually writes: two tables it touches, `product` (not applicable here, excluded by the engineer, see Rationale below) and `message` (spec 0048's advisory case chat, where an admin account acts as "ModularHub" towards a client or producer), are not covered by the audit trigger at all. For `message` this is a real gap: an admin's written words in a case are today invisible to any audit trail, not just unattributed.

A third constraint came from `message` itself: it already has its own narrow, deliberate exception to immutability, a trigger that allows a client requested redaction to null out `body` and `payload`. The generic audit trigger, if attached unmodified, would defeat that: it would copy the full, unredacted message body into `audit_log.new_values` on every send, and critically, into `audit_log.old_values` at the exact moment a redaction clears it, permanently preserving the very content the redaction was supposed to remove. `audit_log` itself is append only with no retention/removal process, so anything copied into it today is effectively permanent.

This work is a slice of scope feature 44 ("Użytkownicy, role, audit log i 2FA panelu admina" in `docs/scope/produkcja.md`), which bundles three things: self service role management in the panel, a full log of who viewed or changed personal data, and two factor login for admin accounts. The engineer scoped this decision down on purpose, see the choices recorded below; the rest of feature 44 is explicit Follow up for future, separate decisions.

## Options considered

### Option 1: Fix in place (finish the existing mechanism)

Wire `app.actor_user_id` at the admin initiated write call sites that already exist, using the `db.batch([...])` pattern this repo already relies on for atomicity, and extend the existing trigger function to also cover `message` (metadata only, see Decision). No new table, no new parallel mechanism; everything about this already exists in the schema and has existed since spec 0018, just unfinished.

**Pros**:
- Reuses infrastructure already designed for this exact purpose (PII redaction, append only history, old/new value capture) instead of building a second one.
- Small, well understood blast radius: a handful of admin action files identified by direct code reading (`lib/producer-block-actions.ts`, `lib/producer-member-actions.ts`, `lib/project-quote-actions.ts`, `lib/cases/messaging.ts`, and the admin branch of a few producer/admin shared actions), plus one migration.
- No new infrastructure to operate or explain to a future engineer; the shape of `audit_log` stays exactly what spec 0018 already documented.

**Cons**:
- The fix has no single choke point (no middleware, no shared `db` wrapper); every call site that should be attributed needs its own, explicit change, and a future admin write path can easily be added without anyone remembering to wire it the same way.
- The underlying trigger reads the session setting with `missing_ok = true`, so a forgotten call site fails silently (reverts to NULL) rather than with an error; this has to be defended against with a regression test, not caught by the type system or a runtime exception.

### Option 2: A separate, purpose built admin action log

Add a new table (e.g. `admin_action_log`) and have each admin action insert a plain row (`actorUserId`, `action`, `targetTable`, `targetId`) directly in application code, bypassing the Postgres trigger and the `app.actor_user_id` session setting entirely.

**Pros**:
- Simple to reason about: ordinary application code, no session level Postgres state, no HTTP driver transaction subtlety to get right.
- Immune to the "silent NULL" failure mode of Option 1, since there is no session setting to forget; a missing call just means the row is never written.

**Cons**:
- Creates a second, parallel audit mechanism alongside the one spec 0018 already built, covering an overlapping set of tables for an overlapping reason (admin accountability on personal data). Two logs that both exist "to prove who did what" is a maintenance and trust hazard: a future reader has to know which one is authoritative, or check both.
- Loses what the existing trigger gives for free: the before/after values of the row. A plain action log without old/new values tells you an admin touched `producer` row X, not what changed about it.
- Does not fix the underlying problem that `app.actor_user_id` was built for in spec 0018 and is still unfinished for every other current and future writer (producer, client); it only works around it for the admin panel specifically.

### Option 3: Switch to a driver that supports real transactions

Move off `drizzle-orm/neon-http` onto `drizzle-orm/neon-serverless` (a WebSocket based `Pool`), which supports interactive `db.transaction()`, so a single transaction could wrap a `SET LOCAL` and many writes naturally, closer to how this is normally done in a long lived Postgres connection.

**Pros**:
- Solves the stateless-HTTP-driver problem at its root, not just for this one feature; any future need for a true multi step interactive transaction stops requiring the `db.batch` workaround documented in `lib/db/AGENTS.md`.

**Cons**:
- A full driver migration for the entire application, touching every file that imports `db`, to fix a problem that `db.batch` already has a proven, working answer for. This is solving a bigger, harder problem than the one in front of us.
- A persistent connection pool is a materially different operational model for a Next.js app deployed on Vercel's serverless functions than the current stateless-per-request HTTP driver; it introduces new failure modes (pool exhaustion, cold start connection setup cost) that this project has not needed to think about so far.
- No current pain point (beyond this one audit attribution gap) justifies the cost; `lib/db/AGENTS.md` already documents `db.batch` as the accepted answer for every other atomic-write need in this codebase.

## Rationale

Option 1 was chosen. The actual, narrow problem is that one specific mechanism was designed and partly built (spec 0018) and never finished, not that the mechanism is wrong. `db.batch` already proves, in production code (`lib/offer-actions.ts`), that a raw `SET LOCAL` and a real write can travel together on this driver; finishing the wiring is strictly smaller and safer than building a second log (Option 2, which duplicates and confuses "who is the source of truth") or replacing the driver (Option 3, which fixes a problem nobody has raised about this codebase beyond this one gap, at the cost of a project wide migration).

The main risk accepted with Option 1, the silent NULL on a forgotten call site, is real but manageable: it is the same shape of risk the existing trigger design already accepted for every non admin writer (producer, client), and a regression test on at least one real admin write path (see `## Requirements`) catches a reintroduced gap in CI rather than relying on someone noticing a NULL in a database table.

Two scope boundaries were set deliberately narrow by the engineer, both recorded in `## Consequences` of the main spec rather than repeated here: attribution only for writes made from `/internal` (not a project wide rollout to every authenticated writer, which was the apparent original intent of spec 0018 but is a materially larger, separate piece of work), and no tracking of who merely *viewed* personal data (only who *changed* it; view tracking needs an application level logging mechanism on every read path, not a database trigger, and is a different kind of decision).

`product` was considered for the same trigger extension as `message` (both looked, from the admin panel's menu, like things an admin might change) but was dropped after reading the actual code: no admin action writes to `product` today, only a producer's own self service edit (`lib/producer-product-actions.ts`), which is explicitly out of scope here (see the `/internal` only boundary above). Extending the trigger to `product` now would capture only producer initiated changes, always with the actor left NULL, since the application code to attribute producer writes is a different, later decision, not this one; it would not improve admin accountability, the actual problem this spec addresses.

`message` was kept in, but with content excluded. Logging that an admin sent a message, when, and in which case (`channel_id`, `author_user_id`, `author_kind`, timestamps) answers the real accountability question (was ModularHub active in this case, and when) without reproducing the message `body`/`payload` into a second, append only, never redacted place, which would quietly undo the one redaction mechanism `message` already has for a client's own request.
