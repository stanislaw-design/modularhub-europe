# lib/db/

The real (production) database client, introduced by spec 0017 (choice of production backend). This is the epika Produkcja layer, separate from the mock/`localStorage` data access in `lib/data/` and elsewhere in `lib/*.ts` used by the epika Prototyp facade.

## Conventions

- Neon Postgres, region `aws-eu-central-1` (Frankfurt, EU), project `modularhub`. Personal data must stay in an EU region, this is a deliberate choice, not a default (see spec 0017).
- `client.ts` builds the Drizzle client on `drizzle-orm/neon-http` + `@neondatabase/serverless`. It throws at import time if `DATABASE_URL` is not set, callers do not need their own guard.
- Two connection strings in `.env.local` (never committed, `.env.local.example` is the template): `DATABASE_URL` (pooled, `-pooler` host, application query traffic) and `DATABASE_URL_UNPOOLED` (direct host, schema migrations and `drizzle-kit`). `drizzle.config.ts` at the repo root uses the unpooled one.
- `schema.ts` is still an empty placeholder. The real schema and first migration are feature 2 ("Prawdziwy model danych") of the epika Produkcja, see `docs/scope/produkcja.md`.
- `npm run db:generate` / `db:migrate` / `db:studio` wrap `drizzle-kit`.

Governing spec: `docs/specs/0017-zaplecze-produkcyjne/`.

_Drafted by /sync from the introducing change, worth a quick human pass._
