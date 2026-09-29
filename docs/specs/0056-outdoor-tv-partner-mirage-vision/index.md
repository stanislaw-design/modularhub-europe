# 0056. Outdoor TV product family and product page for the MirageVision partnership

**Date**: 2026-09-29
**Status**: In Progress

## Summary

ModularHub Europe has a confirmed reseller partnership with MirageVision Outdoor TVs and Displays (an American maker of outdoor rated TV lift cabinets). This spec makes their catalog buildable inside the existing product search and product family system, with a product page shaped for a resold, fixed catalog item instead of a custom built house. It covers only what can be decided today: the data model, the product page layout, and the routing. The business terms MirageVision has not confirmed yet (final pricing in euros, who ships the product, how the 5 percent commission is tracked) stay out of scope on purpose, by the engineer's own choice, and are listed under Follow up.

## Requirements

**User stories**:
- As a visitor browsing "More than a house", I want to find and open MirageVision's outdoor TV products the same way I find spa or container listings, so the catalog feels like one coherent site.
- As a visitor who opens an outdoor TV product, I want a page built for what it actually is (a shippable product with a video and real installation photos), not an empty house page with disabled sections.
- As the ModularHub team, I want to enter MirageVision's first products without first building a self service producer wizard for a partner who will never use one.
- As the ModularHub team, I want a data model that will not need to be redesigned once the real technical specification shape and business terms are confirmed.

**Acceptance criteria** (the contract, each criterion is independently checkable):
- **AC-1** (already built): the `product_family` enum, `ProductFamily` type, and `FAMILY_GROUPS["wiecej-niz-dom"]` include `outdoor-tv`, reachable at `/results?family=outdoor-tv` and via the "Outdoor TV" refine tab under "More than a house".
- **AC-2** (already built): with zero real `outdoor-tv` products, `/results?family=outdoor-tv` shows the existing empty state with the correct pluralized noun, and every other family's search behavior is unchanged.
- **AC-3**: a new route `/[locale]/outdoor-tv/[id]` renders the product page composition confirmed in the mockup review: photo and video gallery, variant picker with price card and the existing "send inquiry" call to action, technical specification table, a "how it looks in real use" photo section, a short "about the partner" block, and FAQ. No house specific section (room layout, plot or foundation, construction timeline, bulk B2B inquiry) appears on this page.
- **AC-4**: a section with no data (no video, no real use photos yet, no partner description yet) disappears entirely; it never renders empty or broken.
- **AC-5**: every place that links to a product (the results list, favorites, the compare action) resolves the link through one shared helper that sends `outdoor-tv` products to `/outdoor-tv/[id]` and every other family to `/project/[id]`.
- **AC-6**: opening `/project/[id]` for a product whose family is `outdoor-tv` redirects (307) to `/outdoor-tv/[id]`; opening `/outdoor-tv/[id]` for a product whose family is not `outdoor-tv` redirects (307) to `/project/[id]`.
- **AC-7**: the technical specification Zod schema and the producer wizard's technical fields stay explicitly excluded for `outdoor-tv` (the same guarded exclusion pattern already used for `kontenery-modulowe` before its own schema existed); calling the schema getter for this family throws a clear error instead of silently accepting or losing data.
- **AC-8**: MirageVision exists in the database as one producer row, linked to a real user row only to satisfy the required foreign key, with no login credential ever issued; every catalog product is entered by hand through the Neon MCP, the same path already used for other manual product inserts.
- **AC-9**: `producer.description` (nullable text) and `product.videoUrl` (nullable text) exist as new, generic columns any producer or product can use, not special cased to this family.
- **AC-10**: the "how it looks in real use" section and the partner logo reuse the existing `document.purpose` values `product_realization_photo` and `producer_photo`; no new document purpose is added.
- **AC-11**: the "send inquiry" call to action on the new page reuses today's inquiry flow and action unchanged; this spec adds no order, lead, or commission tracking model.
- **AC-12**: the feature works in `pl` (the only active locale today) with no missing translation key.

## Decision

**Chosen option**: Option 1 (see [rationale.md](rationale.md)): reuse the existing product and producer tables, add a dedicated product page route, and guard the two routes against each other.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`)

## Rationale

Full context, the options considered, and why this one was chosen: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
- `product` (existing table): `family` already includes `outdoor-tv` (migration applied). New column `video_url` (`text`, nullable) on every family, not just this one.
- `producer` (existing table): new column `description` (`text`, nullable), usable by any producer.
- `document` (existing table): no schema change. Reuses `purpose = 'producer_photo'` for the partner logo and `purpose = 'product_realization_photo'` for the "how it looks in real use" section, the same way `purpose = 'product_photo'` already serves the main gallery.
- `product_variant` (existing table): no schema change. Models the 43 inch, 50 inch, and cabinet only variants the same way it already models completion standards for houses.
- `users` (existing table): one row required as the foreign key anchor for MirageVision's `producer` row; no credential is ever issued from it.

No new tables. No change to `product_family_subcategory_match` (the check constraint), since `outdoor-tv` never sets `category`, `spaSubcategory`, or `containerSubcategory`.

**API surface**:
| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/[locale]/outdoor-tv/[id]` | page (new) | `id` (path), `locale` | rendered product page, or a redirect | public | 404 unknown id, 307 to `/project/[id]` for the wrong family |
| `/[locale]/project/[id]` | page (existing, extended) | `id` (path), `locale` | rendered house page, or a redirect | public | 307 to `/outdoor-tv/[id]` when `family = outdoor-tv` |
| `resolveProductHref(family, id, locale)` | shared helper (new) | `family`, `id`, `locale` | the correct product href | n/a | n/a |
| the existing inquiry action | unchanged | unchanged | unchanged | unchanged | unchanged |

**Key invariants**:
- A product whose family is `outdoor-tv` only ever renders at `/outdoor-tv/[id]`; a product of any other family only ever renders at `/project/[id]`. The redirect guard (AC-6) makes this true even for a stale or mistyped link.
- No `outdoor-tv` product can be validated as "complete" technical specification (Zod), because no schema exists yet; the schema getter throws rather than returning an empty pass (AC-7).
- `producer.description` and `product.videoUrl` are optional everywhere; no code path requires either to render.

**Security model**: unchanged from every other family: public, unauthenticated browsing. MirageVision's producer row carries no login credential, so producer panel authorization is unaffected. The existing inquiry flow's authorization rule is reused as is (AC-11).

**Configuration required**: none. No new environment variable, feature flag, or credential.

**Critical test scenarios**:
- Happy path: from `/results?family=wiecej-niz-dom`, open the "Outdoor TV" refine tab, click a seeded product, land on `/outdoor-tv/[id]`, see the gallery, variant and price, click "Send inquiry", the existing inquiry flow proceeds unchanged. Verifies **AC-2**, **AC-3**, **AC-11**.
- Empty sections: a seeded product with no `video_url`, no `product_realization_photo` documents, and a producer with no `description` renders the page with those three sections fully absent, no broken layout. Verifies **AC-4**.
- Redirect: `GET /project/<an-outdoor-tv-id>` returns a 307 to `/outdoor-tv/<id>`; `GET /outdoor-tv/<a-dom-id>` returns a 307 to `/project/<id>`. Verifies **AC-6**.
- Permission: the user row linked to MirageVision's producer cannot sign in to the producer panel (no credential was ever issued), and the producer wizard's family choice never offers `outdoor-tv`. Verifies **AC-8**.

## Build plan

This sits in the Produkcja epic on the real database from day one, the same reasoning spec 0035 used for the earlier two "More than a house" families: there is no facade or sample data split left to sequence here, so the plan puts the data foundation first, then one thin, complete thread (a product reachable and correctly routed end to end), then the full page.

1. (Already done) Migrate `outdoor-tv` into the `product_family` enum; extend `ProductFamily`, `FAMILY_GROUPS`, the results filter, `FamilyTabs`, and the four locale message files. Satisfies **AC-1**, **AC-2**, **AC-12**.
2. [x] Migrate `producer.description` and `product.video_url` (both nullable text, additive, one deployment). Satisfies **AC-9**. (`drizzle/0037_certain_hydra.sql`, applied and confirmed live on `modularhub-dev`.)
3. [x] Insert MirageVision's `users` row and linked `producer` row by hand through the Neon MCP; issue no login credential. Satisfies **AC-8**. (`producer.id = 90e8bc66-e10a-4fba-9afe-b31544a37d40` on `modularhub-dev`; also added `US` to the `country` dictionary, needed for `producer.country_code` and not previously covered by this spec.)
4. [x] Build `resolveProductHref(family, id, locale)` and wire every existing product link (results list, favorites, compare) through it. Satisfies **AC-5**. (`lib/product-family-groups.ts`; wired in `ResultCard`, `FavoriteCard`, `PopularHomes`, `ProjectCompareTable`, `verified-manufacturers/page.tsx`. `CategoryShowcase.tsx` intentionally left untouched, see Follow-up: the homepage showcase stays disabled/out of scope.)
5. [x] Build the `/[locale]/outdoor-tv/[id]` page from the confirmed mockup: reuse the gallery, variant picker and price card, technical specification render, and FAQ pattern; add the new video block and the new "how it looks in real use" and "about the partner" sections; every optional section follows the existing `hasXSection` pattern. Add `generateMetadata` and product JSON-LD, mirroring `/project/[id]`'s pattern with no house specific fields. Satisfies **AC-3**, **AC-4**. (`app/[locale]/(customer)/outdoor-tv/[id]/page.tsx`, plus new `components/klient/OutdoorTv{TechnicalSpecs,RealUseGallery,PartnerSection}.tsx`. No mockup was available this session; composition follows the section list above and the existing `/project/[id]` patterns as closely as the family allows — worth a human pass against the actual approved mockup.)
6. [x] Add the redirect guard to both `/project/[id]` and the new route. Satisfies **AC-6**.
7. [x] Confirm the `Exclude<>` guards in `lib/product-technical-specs.ts` and `lib/producer-project-draft.ts` stay in place (already done this session) and add a short pointer comment to this spec's Follow up. Satisfies **AC-7**. (Confirmed unchanged: both the type-level `Exclude<>` unions and the runtime throw for `outdoor-tv` were already in place before this build.)
8. [x] Extend `completion_standard` with a generic `katalogowy` value (`drizzle/0039_lean_sentinels.sql`) for product families whose variants are not house completion levels; relax `product_variant_product_standard_unique` to exclude that value (`drizzle/0040_pale_annihilus.sql`) so several `katalogowy` variants can coexist per product, told apart by `variantLabel` instead. Applied to `modularhub-dev`. Insert the first real `outdoor-tv` product as `status = 'draft'` with three `katalogowy` variants (43", 50", cabinet only), all `priceOnRequest = true` pending the MirageVision meeting. Not part of the original Build plan; done ahead of the meeting so the page has something real to demo. See Follow-up: the variant *shape* (43"/50"/cabinet-only) is still provisional until 2026-10-02.

**Note on AC-3's technical specification table**: no Zod schema exists yet for `outdoor-tv` (AC-7 keeps it excluded on purpose), so `product.technical_specs` is surfaced to the client generically and unvalidated (`Project.technicalSpecs`, `lib/data/projects.ts`) — any string-valued, non-underscore-prefixed key renders as a label/value tile, with the raw jsonb key humanized into a label (no per-field translation catalog yet). This lets the section work with zero real data today (it simply stays absent) and render whatever MirageVision's real fields turn out to be once entered, without inventing a schema ahead of the 2026-10-02 meeting.

## Consequences

**Positive**:
- The "More than a house" search integration was already proven end to end before any page code existed, because the tab and the empty state were built and tested first.
- The product page composition was agreed on with a working mockup before a single line of the real page was written, so there is no back and forth over layout once building starts.
- Manual catalog entry unblocks a first real MirageVision listing without first building self service tooling a reseller partner will not use.

**Negative / tradeoffs**:
- Two nearly parallel product detail routes exist long term (`/project/[id]` and `/outdoor-tv/[id]`); a future third catalog style family reuses the second, but a future family shaped like neither needs its own judgment call again.
- The `outdoor-tv` enum value is permanent in the database even if MirageVision's meeting changes the category's public facing name; only the display label (translation strings) would change, never the underlying value.
- Manual Neon MCP entry does not scale past a handful of SKUs and has no Zod safety net, since no schema exists yet; a bad manual insert cannot be caught by the application until the follow up schema spec lands.

**Neutral**:
- `producer.description` and `product.videoUrl` are now available to every producer and every family, not only MirageVision; nobody else has to use them.
- Every existing route, page, and test for `dom`, `spa-modulowe`, and `kontenery-modulowe` is unchanged by this spec.

## Follow-up

- [ ] Define the real technical specification Zod schema and producer wizard fields for `outdoor-tv` once MirageVision's meeting (2026-10-02) confirms which SKUs are in scope and their real technical shape (references **AC-7**).
- [ ] Confirm the three seeded variants (43"/50"/cabinet only, all `priceOnRequest`) against what the 2026-10-02 meeting actually confirms as sellable SKUs; the `variantLabel` text and count are a placeholder shaped by MirageVision's own site, not a locked decision.
- [ ] Confirm the final EUR price list with MirageVision; the price card's euro figure is an orientation only conversion from their listed US dollar price until then.
- [ ] Design the order, lead, and 5 percent commission tracking model in its own follow up spec once MirageVision confirms who fulfills and ships, and the moment the commission is owed. This spec deliberately reuses today's inquiry flow with none of that tracking (**AC-11**).
- [x] Enrolled as [Produkcja #45](../../scope/produkcja.md).
- [ ] The homepage "More than a house" showcase (spec 0029) stays disabled and out of scope here. If it is ever finished and re enabled, it needs `outdoor-tv` added as a third category and its pin and crossfade timing retuned, exactly as spec 0029's own Follow up already flagged for a third family.
- [ ] Consider a "related products" concept (MirageVision's other lift lines linking to each other) once the narrow scope here is built; deliberately deferred, see rationale.md.
- [ ] Confirm image usage rights for any real MirageVision product photo before it is uploaded, the same confirmation process already used for the Steel House catalog.

## Migration plan

**Strategy**: no coordination window needed for the two new nullable columns; the enum value itself is a one way door.

**Phases**:
1. (Already applied to `modularhub-dev`) `ALTER TYPE product_family ADD VALUE 'outdoor-tv'`. Postgres has no `DROP VALUE`, so this step cannot be undone by reverting a commit; only a full enum rebuild (the same heavier move spec 0039 used to replace `pergola`) could remove it later, and that is not planned.
2. Add `producer.description` and `product.video_url`, both nullable text, no default needed, safe in one deployment, fully reversible by dropping the column.

**Rollback**: phase 2 rolls back cleanly (drop the two columns). Phase 1 does not roll back; if the working name `outdoor-tv` needs to change after MirageVision's meeting, only the display label (translation strings) changes, and the old enum value stays in the database, unused and harmless.

**Risks**: a second, unrelated family could theoretically want the same enum value name in the future; low risk given the existing naming pattern, and cheap to catch in review.
