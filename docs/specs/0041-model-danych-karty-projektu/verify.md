# Verify: model danych karty projektu · spec 0041 · updated 2026-09-15

_Steps derived from spec 0041 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Commands

- [ ] `SELECT indexdef FROM pg_indexes WHERE indexname = 'product_variant_product_standard_unique';` → partial unique index exists on `(product_id, completion_standard)` filtered `deleted_at IS NULL` → AC-1
- [ ] Insert a second `product_variant` row with a `completion_standard` already active (non-deleted) for the same `product_id` → insert fails with a unique violation on `product_variant_product_standard_unique` → AC-1
- [ ] `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'cost_line_item' AND column_name = 'status';` → `NO` → AC-2
- [ ] `SELECT count(*) FROM cost_line_item WHERE status IS NULL;` → `0` → AC-2
- [ ] `SELECT indexdef FROM pg_indexes WHERE indexname = 'product_timeline_stage_variant_stage_unique';` → unique index on `(product_variant_id, stage_key)` exists → AC-3
- [ ] Insert a second `product_timeline_stage` row with the same `(product_variant_id, stage_key)` pair → insert fails with a unique violation → AC-3
- [ ] Insert a `document` row with `product_variant_id = NULL` for a product that has variants, then one with a specific `product_variant_id` → the read side (once built, Follow-up) shows the first against every variant, the second only against its own → AC-4
- [ ] `document_one_cover_per_product` still exists and still rejects a second `is_cover = true` row for the same `product_id`/`purpose = 'product_photo'` → AC-4 (unchanged)
- [ ] On a product with two variants, mark one `is_default = true` → `product.price_min_cents`/`price_max_cents` match that variant exactly → AC-5
- [ ] Switch default with the single-statement pattern (`UPDATE product_variant SET is_default = (id = '<new>') WHERE product_id = '<id>'`) → `product.price_min_cents`/`price_max_cents` update to the new default immediately, with no intermediate NULL/mixed state → AC-5
- [ ] Set `is_default = false` on every variant of a product (or delete all its variants) → `product.price_min_cents`/`price_max_cents` become `NULL`, never a mixed min/max across standards → AC-5
- [ ] `SELECT unnest(enum_range(NULL::product_category));` → includes `wynajem-hotel` → AC-6
- [ ] `SELECT count(*) FROM product WHERE category = 'wynajem-hotel';` → `0` today (no pilot product uses it yet, expected) → AC-6
- [ ] For a random sample of the 88 live products, compare `price_min_cents`/`price_max_cents`/`completion_standard` against a pre-migration snapshot → identical → AC-7 (see note below: 39 of 88 had no `completion_standard` and were skipped, not backfilled — their flat fields are untouched and still match pre-migration values by construction)
- [ ] Old flat fields (`completion_standard`, `production_lead_time_weeks_min/max`, `on_site_assembly_days_min/max`, `price_includes`, `price_excludes`, `house_price_min_cents`/`house_price_max_cents`) still exist and are still readable on `product` → AC-8 (not yet removed — correct, removal is gated on the read-side rebuild, see Follow-up)
- [ ] `SELECT unnest(enum_range(NULL::document_purpose));` → includes `product_realization_photo`, distinct from `product_photo` → AC-9

## Acceptance-criteria coverage

- AC-1 covered by the two `product_variant` uniqueness steps above.
- AC-2 covered by the `cost_line_item.status` NOT NULL steps.
- AC-3 covered by the `product_timeline_stage` uniqueness steps.
- AC-4 covered by the `document.product_variant_id` nullability step and the unchanged-cover-index step.
- AC-5 covered by the three price-sync trigger steps (default price, atomic switch, no-default reverts to NULL).
- AC-6 covered by the `product_category` enum steps.
- AC-7 covered by the live-product comparison step.
- AC-8 covered by the old-fields-still-present step (deferred removal confirmed, not yet done — by design).
- AC-9 covered by the `document_purpose` enum step.

## Known gaps from this build (not defects, scope as designed)

- 39 of 88 live products had `completion_standard IS NULL` and were intentionally skipped from backfill (spec Follow-up), not given a `product_variant` row. Full list captured in the `/develop` session that ran this migration; worth pulling into a durable note (e.g. this file or the spec) before `/check verify` runs, so it isn't re-derived from a live query each time.
- `getProjectById`/`getProjects` (`lib/data/projects.ts`) and the project detail page do not read `product_variant`/`cost_line_item`/`product_timeline_stage` yet — that rebuild plus the old-column removal is the spec's Follow-up, a separate `/develop`.
