# app/[locale]/internal/

The admin panel (spec 0055, "panel administracyjny"): dashboard (`page.tsx`), `cases-and-inquiries/` (+ `cases/[id]/`), `monitoring/`, `notifications/`, `producers/`, `products/` (+ `[id]/`, spec 0031, has its own [AGENTS.md](products/AGENTS.md) for the photo manager specifics). All admin only, all behind the same session gate.

## Conventions

- Every screen repeats the exact same auth gate inline, by copy not by a shared layout guard: `const session = await auth(); if (!session) redirect(...login...); if (session.user.role !== "admin") redirect(...)`. Several screens' own comments point back at this file (previously at `products/AGENTS.md`) as "the same pattern as `/internal/products`" — keep repeating this exact shape for any new `/internal/*` screen rather than inventing a variant or trying to factor it into a layout (there is no shared `internal/layout.tsx` auth check today).
- Each data source a screen reads is read independently and fails independently (e.g. the dashboard's pageview tile, `monitoring/`'s three service checks): one source being down renders that one tile/section as unavailable, never breaks the rest of the page.
- Shared admin only UI lives in `components/internal/` (`DashboardTrendChart`, `InternalSidebar`, `ProducerBlockControl`), not in `components/ui/` or `components/producent/`.
- Data reads live in `lib/db/queries.ts` (admin specific getters, e.g. `getAdminDashboardCoreCounts`, `getAllProductsForAdmin`), `lib/cases/queries.ts` ([lib/cases/AGENTS.md](../../../lib/cases/AGENTS.md), the merged cases/legacy inquiries list), `lib/admin-monitoring.ts`, and `lib/observability/` ([lib/observability/AGENTS.md](../../../lib/observability/AGENTS.md), Sentry issues + PostHog pageviews) — never a direct DB/vendor call from inside this directory.
- `/internal/cases` and `/internal/inquiries` (the old, separate case/legacy-inquiry lists) permanently redirect to `/internal/cases-and-inquiries` (`proxy.ts`, spec 0055 AC-14): don't recreate either as a live route.

## Gotchas

- `products/AGENTS.md` still names its own route `/internal/produkty` and a sibling `/internal/zapytania` — both stale (see root `/audit` contradictions); the real folder names are `products/` and `cases-and-inquiries/`.

## Related specs

`docs/specs/0055-panel-administracyjny/` (this whole area). `0023-klient-na-realnym-zapleczu/` (legacy direct inquiries, now folded into cases-and-inquiries). `0048-zarzadzany-przeplyw-doradczy/` (the case data `cases-and-inquiries/` and `cases/[id]/` read, see [lib/cases/AGENTS.md](../../../lib/cases/AGENTS.md)).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
