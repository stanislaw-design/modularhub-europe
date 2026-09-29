# Verify: Outdoor TV / MirageVision partnership · spec 0056 · updated 2026-09-29
_Steps derived from spec 0056 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Insert or use an existing `outdoor-tv` product (MirageVision's producer row already exists: `90e8bc66-e10a-4fba-9afe-b31544a37d40` on `modularhub-dev`); visit `/pl/results?family=outdoor-tv` → the product appears under "Więcej niż dom" → AC-1
- [ ] With zero published `outdoor-tv` products, `/pl/results?family=outdoor-tv` shows the correct pluralized empty state, other families unaffected → AC-2
- [ ] Open that product's result card → lands on `/pl/outdoor-tv/[id]`, not `/pl/project/[id]` → AC-3, AC-5
- [ ] On `/pl/outdoor-tv/[id]`, confirm no room layout, plot/foundation, construction timeline, or bulk B2B inquiry section ever renders → AC-3
- [ ] With no `video_url`, no `product_realization_photo` documents, and no producer `description`/`producer_photo`, confirm the video block, "how it looks in real use", and "about the partner" sections are fully absent (not empty/broken) → AC-4
- [ ] Add a `video_url`, a `product_realization_photo` document, and a producer `description`/`producer_photo`; reload and confirm each section now renders → AC-4, AC-9, AC-10
- [ ] Click "Wyślij zapytanie" on the outdoor-tv page → existing inquiry flow proceeds unchanged → AC-11
- [ ] From the favorites panel and the results list, confirm every link to an `outdoor-tv` product resolves to `/outdoor-tv/[id]` → AC-5

## Commands
- [ ] `GET /pl/project/<an-outdoor-tv-product-id>` → 307 to `/pl/outdoor-tv/<id>` → AC-6
- [ ] `GET /pl/outdoor-tv/<a-dom-product-id>` → 307 to `/pl/project/<id>` → AC-6
- [ ] Call `getTechnicalSpecsSchema("outdoor-tv", "draft")` → throws `"getTechnicalSpecsSchema: no technicalSpecs schema defined yet for family 'outdoor-tv'"` → AC-7
- [ ] Confirm the producer wizard's family select never offers `outdoor-tv` (`lib/producer-project-draft.ts` guard) → AC-7
- [ ] Attempt to sign in with MirageVision's `users` row email (`import-miragevision@example.modularhub.local`) → no credential exists, sign-in impossible → AC-8
- [ ] `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name IN ('producer','product') AND column_name IN ('description','video_url')` on `modularhub-dev` → both present, nullable → AC-9
- [ ] `npx vitest run lib/i18n/messages.test.ts` → en/de/nl still match pl key-for-key (no missing `OutdoorTvPage` key) → AC-12
- [ ] `npx tsc --noEmit` → clean (aside from any pre-existing, unrelated errors) → general regression check

## Acceptance-criteria coverage
- AC-1, AC-2 — covered by the two results-page steps above (already built before this session; re-confirmed here since they're prerequisites for reaching the new page)
- AC-3 — covered by the "lands on outdoor-tv page" and "no house-specific section" steps
- AC-4 — covered by the empty-then-filled section steps
- AC-5 — covered by the results/favorites link-resolution steps
- AC-6 — covered by the two `GET` redirect commands
- AC-7 — covered by the schema-getter throw and producer-wizard-exclusion commands
- AC-8 — covered by the sign-in attempt and the producer-row-exists fact (row `90e8bc66-e10a-4fba-9afe-b31544a37d40`)
- AC-9 — covered by the `information_schema.columns` query
- AC-10 — covered by the filled-section step (producer_photo / product_realization_photo reuse)
- AC-11 — covered by the "send inquiry" click-through step
- AC-12 — covered by the `messages.test.ts` run
