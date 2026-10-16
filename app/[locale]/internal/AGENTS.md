# app/[locale]/internal/

The admin panel (spec 0055, "panel administracyjny"): dashboard (`page.tsx`), `cases-and-inquiries/` (+ `cases/[id]/`), `monitoring/`, `notifications/`, `producers/` (+ `volume-verification/`, spec 0070), `clients/b2b-verification/` (spec 0070), `large-orders/` (+ `[id]/`, spec 0070), `products/` (+ `[id]/`, spec 0031, has its own [AGENTS.md](products/AGENTS.md) for the photo manager specifics). All admin only, all behind the same session gate.

## Conventions

- Every screen repeats the exact same auth gate inline, by copy not by a shared layout guard: `const session = await auth(); if (!session) redirect(...login...); if (session.user.role !== "admin") redirect(...)`. Several screens' own comments point back at this file (previously at `products/AGENTS.md`) as "the same pattern as `/internal/products`" — keep repeating this exact shape for any new `/internal/*` screen rather than inventing a variant or trying to factor it into a layout (there is no shared `internal/layout.tsx` auth check today).
- Each data source a screen reads is read independently and fails independently (e.g. the dashboard's pageview tile, `monitoring/`'s three service checks): one source being down renders that one tile/section as unavailable, never breaks the rest of the page.
- Shared admin only UI lives in `components/internal/` (`DashboardTrendChart`, `InternalSidebar`, `ProducerBlockControl`, and for spec 0070 `LargeOrderPills`, `FilterChips`, `largeOrderDeadline`, `VerificationDecisionControl`, `ProducerDeliveryCountriesAdminSection`), not in `components/ui/` or `components/producent/`.
- Data reads live in `lib/db/queries.ts` (admin specific getters, e.g. `getAdminDashboardCoreCounts`, `getAllProductsForAdmin`), `lib/cases/queries.ts` ([lib/cases/AGENTS.md](../../../lib/cases/AGENTS.md), the merged cases/legacy inquiries list), `lib/admin-monitoring.ts`, and `lib/observability/` ([lib/observability/AGENTS.md](../../../lib/observability/AGENTS.md), Sentry issues + PostHog pageviews) — never a direct DB/vendor call from inside this directory.
- `/internal/cases` and `/internal/inquiries` (the old, separate case/legacy-inquiry lists) permanently redirect to `/internal/cases-and-inquiries` (`proxy.ts`, spec 0055 AC-14): don't recreate either as a live route.

## Large orders and approvals (spec 0070)

- `large-orders/` lists `project_request` and `bulk_product_inquiry` together (one UNION query, `getLargeOrdersForAdmin` in `lib/db/queries.ts`); an id is only unique per table, so the detail route carries `?kind=request|product`. Filters and the page number live in URL search params. The first column is the investor (client company, else contact name, else email); kind and status are coloured pills (`LargeOrderPills`, each value has its own colour plus an icon, never colour alone); the whole row is clickable through a stretched link on the investor name.
- The detail screen is the only place that shows the client's full contact data and every offer, published or not. Admin PDF links go through `getProjectQuotePdfUrl`, which has an `admin` branch.
- `large-orders/new/` is the advisor form (spec 0070 AC-20, `CreateRequestOnBehalfForm`): the admin files a free request or a product inquiry for a client who called or wrote. It calls `createRequestOnBehalf` in `lib/project-request-actions.ts`, which reuses the public form's Zod schemas and insert builders but requires a typed consent note and an explicit client language (no default), sets `created_by_staff_user_id` (no `clientId`), writes through `withAdminActor` and mails the client in that language. Same three active requests per email limit as the public form.
- Closing is `CloseRequestControl` (spec 0070 AC-19) calling `closeRequest` with a reason (`client_cancelled`, `no_offers`, `expired`, `staff_closed`), allowed from `accepted` too. It shares `closeLargeOrder` (`lib/large-order-close.ts`, a plain server module, not a `"use server"` action) with the client's `cancelRequest`, so both close with the same single `UPDATE` and the same neutral producer mail. A client can reopen only reasons other than `staff_closed`, within 30 days.
- `VerificationDecisionControl` takes `currentStatus` and only shows the decision that still changes something (approved shows "Cofnij zatwierdzenie", rejected shows "Zatwierdź"). Rejection needs a typed reason in the UI. The audit log stores the row change only, so the reason is sent as a PostHog event (`producer_volume_verification_decided`, `client_b2b_verification_decided`), not written to `audit_log`.

## Gotchas

- `products/AGENTS.md` still names its own route `/internal/produkty` and a sibling `/internal/zapytania` — both stale (see root `/audit` contradictions); the real folder names are `products/` and `cases-and-inquiries/`.

## Related specs

`docs/specs/0055-panel-administracyjny/` (this whole area). `0070-przetarg-duze-zamowienia/` (large orders list and detail, volume and B2B approvals). `0023-klient-na-realnym-zapleczu/` (legacy direct inquiries, now folded into cases-and-inquiries). `0048-zarzadzany-przeplyw-doradczy/` (the case data `cases-and-inquiries/` and `cases/[id]/` read, see [lib/cases/AGENTS.md](../../../lib/cases/AGENTS.md)).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
