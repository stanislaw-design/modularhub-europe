# Verify: atrybucja audytu panelu admina · spec 0064 · updated 2026-10-03

_Steps derived from spec 0064 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Log in as an admin, block a producer from `/internal/producers` → query `audit_log` for `table_name = 'users'`, `record_id = <blocked user id>` → `actor_user_id` equals the admin's user id, not NULL → AC-1
- [ ] As a producer, edit your own product's photo (e.g. reorder or delete one) → the resulting `audit_log` row on `document` has `actor_user_id` NULL → AC-2
- [ ] As an admin, edit a producer's own product photo through the same admin-reachable path → the resulting `audit_log` row on `document` has `actor_user_id` equal to the admin's id → AC-1
- [ ] As an advisor (admin session) in a case, send a message → the resulting `message_audit` row has `author_user_id`/`author_kind` populated in `new_values`, and no `body`/`payload` key present at all → AC-3
- [ ] As a client or producer, send a message in a case → the resulting `message_audit` row has `actor_user_id` NULL (message content attribution is admin/advisor only) → AC-2
- [ ] Directly apply the `message_immutable`-permitted redaction update (`body`/`payload` → NULL, `redacted_at` set) to a message an admin had already replied in; inspect every `audit_log` row for that message, before and after → none contain the pre-redaction `body`/`payload` → AC-4

## Commands
- [ ] `npm run test -- lib/producer-block-actions.test.ts` → all 3 tests pass, including the AC-5 regression assertion that `audit_log.actor_user_id` is populated after `blockProducer` → AC-5
- [ ] `npm run test` (full suite) → all pass, no regression from the attribution wiring → AC-1, AC-2, AC-3, AC-4, AC-5
- [ ] `npx tsc --noEmit` and `npm run lint` → clean → general build hygiene
- [ ] After the next production deploy: confirm via the Neon MCP (`mcp__Neon__run_sql` against the production project, `spring-rain-58383710`) that `drizzle.__drizzle_migrations` contains the `0048_message_audit_trigger` hash, then perform one real admin action in production and confirm its `audit_log` row has a populated `actor_user_id` → AC-6 (not yet done — this build only ran against the dev database, `bold-tree-78265613`)

## Acceptance-criteria coverage
- AC-1: covered by the admin block-producer manual step and the full automated suite (blockProducer, addProducerMember, removeProducerMember, setClientB2bVerification, setProducerVolumeVerification, the advisor message/card paths, and the ~8 admin-reachable write functions in `lib/product-photo-actions.ts`).
- AC-2: covered by the producer-self-edit manual step and by the client/producer message-send manual step; also exercised in the AC-5 regression test (denied non-admin session).
- AC-3: covered by the advisor-message manual step; also verified directly against a disposable Neon branch during the build (insert produced an allowlist-only `new_values`, no `body`/`payload`).
- AC-4: covered by the redaction manual step; also verified directly against a disposable Neon branch during the build (the permitted redaction update's audit rows never carried `body`/`payload`).
- AC-5: covered by `lib/producer-block-actions.test.ts`, run as part of the full `npm run test` suite (1464 tests passing after this build).
- AC-6: **not yet satisfied** — requires an actual production deployment and a manual post-deploy check, listed above; this build only reached the dev database.
