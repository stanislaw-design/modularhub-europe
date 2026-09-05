# lib/db/

The real (production) database client, introduced by spec 0017 (choice of production backend). This is the epika Produkcja layer, separate from the mock/`localStorage` data access in `lib/data/` and elsewhere in `lib/*.ts` used by the epika Prototyp facade.

## Conventions

- Neon Postgres, region `aws-eu-central-1` (Frankfurt, EU), project `modularhub`. Personal data must stay in an EU region, this is a deliberate choice, not a default (see spec 0017).
- `client.ts` builds the Drizzle client on `drizzle-orm/neon-http` + `@neondatabase/serverless`. It throws at import time if `DATABASE_URL` is not set, callers do not need their own guard.
- Two connection strings in `.env.local` (never committed, `.env.local.example` is the template): `DATABASE_URL` (pooled, `-pooler` host, application query traffic) and `DATABASE_URL_UNPOOLED` (direct host, schema migrations and `drizzle-kit`). `drizzle.config.ts` at the repo root uses the unpooled one.
- `schema.ts` holds the real schema (spec 0018, "Prawdziwy model danych"), 21 tables. A column whose shape genuinely differs by a sibling discriminator column (e.g. `product.technicalSpecs`, keyed by `product.family`, spec 0022) is a plain `jsonb` column validated by a Zod schema at the application boundary (see `lib/product-technical-specs.ts`), not typed at the Postgres level; a narrow, cross column invariant that a manual insert could otherwise violate (e.g. `product_family_subcategory_match`) still gets a real `CHECK` constraint.
- `npm run db:generate` / `db:migrate` / `db:studio` wrap `drizzle-kit`. A schema change that both adds and removes columns in the same table should be generated in two passes (add, then remove) to avoid `drizzle-kit`'s interactive rename-detection prompt, which this repo's non-interactive tooling can't answer.
- A Postgres `GENERATED ALWAYS AS ... STORED` column (e.g. `product.searchVector`, spec 0026) has no direct drizzle-kit DSL support: declare it in `schema.ts` as a plain `customType` column (no `.generatedAlwaysAs()`), let `db:generate` emit its normal `ADD COLUMN`, then hand-enrich that one line with the `GENERATED ALWAYS AS (...) STORED` clause before applying (see `drizzle/0008_cheerful_ben_urich.sql`) — the same "beyond drizzle-kit's DSL" pattern as `drizzle/0002_audit_log_trigger.sql`'s trigger. Verify a hand-enriched migration on a disposable Neon branch (`create_branch`/`delete_branch` via the Neon MCP) before running `db:migrate` against the real database.

Governing spec: `docs/specs/0017-zaplecze-produkcyjne/`.

_Drafted by /sync from the introducing change, worth a quick human pass._
