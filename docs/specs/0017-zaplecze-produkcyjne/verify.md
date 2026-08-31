# Verify: zaplecze produkcyjne · spec 0017 · updated 2026-08-28
_Steps derived from the scope's "Done when" criteria for feature 1 (Decyzja o zapleczu produkcyjnym). `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `docs/specs/0017-zaplecze-produkcyjne/index.md` → `## Decision` and `## Proposed stack` cover hosting, database, auth provider, and file storage → DONE-WHEN-1
- [ ] Open the Neon console (or run `mcp__Neon__describe_project` with project id `spring-rain-58383710`) → project `modularhub` region is `aws-eu-central-1` (Frankfurt) → DONE-WHEN-2

## Commands
- [ ] `cat .env.local` → `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are set, host contains `eu-central-1.aws.neon.tech` → DONE-WHEN-2
- [ ] `node_modules/.bin/tsx --env-file=.env.local -e "import('./lib/db/client.ts').then(async ({db}) => console.log(await db.execute('select current_database() as db')))"` → returns `{ db: 'neondb' }`, proving the app's own db client connects → DONE-WHEN-2
- [ ] Via Neon MCP: `run_sql` with `select count(*) from information_schema.tables where table_schema = 'public'` against project `spring-rain-58383710` → returns `0` (real, empty database) → DONE-WHEN-2

## Acceptance-criteria coverage
- DONE-WHEN-1 (decision for hosting, database, auth provider, and file storage recorded in the spec) · covered by the manual spec read above.
- DONE-WHEN-2 (dev environment connects to a real, empty database) · covered by the `.env.local` check, the db client query, and the empty-table-count query.

## Explicitly out of scope for this build
Per the spec's Follow-up list, blocked/deferred until later features: Auth.js login code (needs a stability + sessions-vs-JWT decision, feature 6), Cloudflare R2 bucket (no "Done when" requirement here), the real data model and first migration (feature 2), region pinning of Vercel functions to `fra1`, DPAs with Neon/Cloudflare/Vercel.
