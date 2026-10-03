# Verify: strona produktu dla sauny · spec 0061 · updated 2026-10-02
_Steps derived from spec 0061 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Visit `/pl/sauna/relax-550` (published Kora product) → hero, options configurator, technical specs, plot/logistics, partner, documents render in that order, no empty placeholders → AC-1, AC-4, AC-5, AC-6, AC-7, AC-8
- [ ] Visit `/pl/sauna/<id-of-a-dom-product>` → 404 → AC-11
- [ ] Visit `/pl/project/<id-of-the-sauna-product>` → redirects to `/pl/sauna/<slug>` → AC-3, AC-11
- [ ] Visit `/pl/outdoor-tv/<id-of-the-sauna-product>` → redirects to `/pl/sauna/<slug>` → AC-3, AC-11
- [ ] Visit `/pl/sauna/<id>` for a draft sauna product → page renders (not blocked), response has `<meta name="robots" content="noindex,nofollow">` → AC-9
- [ ] Visit `/pl/sauna/<id>` for a sauna product with a slug already assigned → 308 permanent redirect to `/pl/sauna/<slug>`, query string preserved → AC-9 (slug fallback pattern)
- [ ] Open producer wizard, family "spa-modulowe" → subcategory selector does not offer "sauna" (only jacuzzi/wellness-combo) → AC-10
- [ ] On `/pl/outdoor-tv/[slug]` (any existing product), confirm video section, features tiles, and the rest of the page render identically to before this change (spec 0056 regression) → AC-8

## Commands
- [ ] `npx vitest run lib/product-technical-specs.test.ts` → sauna/jacuzzi/wellness-combo branches all pass, including the "throws without spaSubcategory" case → AC-2
- [ ] `npx vitest run lib/product-family-groups.test.ts` → sauna routes to `/sauna`, jacuzzi/wellness-combo stay on `/project`, omitted spaSubcategory falls back to `/project` → AC-3
- [ ] `npx vitest run lib/producer-project-draft.test.ts` → `getSpaSubcategoryOptions` excludes sauna only with `excludeSauna: true` → AC-10
- [ ] `npx vitest run "app/[locale]/(customer)/sauna/[slug]/page.test.tsx" "app/[locale]/(customer)/project/[slug]/page.test.tsx" "app/[locale]/(customer)/outdoor-tv/[slug]/page.test.tsx"` → all pass, including the cross-route 404/redirect guards → AC-11
- [ ] `npx tsc --noEmit` → clean
- [x] Query `modularhub-dev` (Neon MCP): `select id, name, slug, family, spa_subcategory from product where spa_subcategory = 'sauna'` → Kora Relax 550 (`relax-550`) and Wooden Dream House Qube (`qube`) present with real specs/variants/options, both published, both confirmed live (200) at `/pl/sauna/relax-550` and `/pl/sauna/qube`; cross-route guards confirmed live (`/pl/project/<id>` and `/pl/outdoor-tv/<id>` both 307 → `/pl/sauna/relax-550`, `/pl/sauna/<bogus-slug>` → 404) → AC-1 through AC-9, AC-11, Build plan task 10 (first half, done 2026-10-02)
- [ ] Repeat the same seed against `modularhub` (prod) once the dev rows are reviewed → Build plan task 10 (second half, not yet done)

## Acceptance-criteria coverage
- AC-1 · route + hero + options render → UI step 1
- AC-2 · schema isolation (sauna vs jacuzzi/wellness-combo, required param) → command step 1
- AC-3 · `resolveProductHref` routing, all call sites · UI steps 2-4, command step 2
- AC-4 · options configurator placement/pricing (spec 0059 mechanism, unchanged) → UI step 1
- AC-5 · house-only sections never render → UI step 1 (visual check, no uklad/cena/harmonogram/B2B)
- AC-6 · `ProjectLogistics` conditional render → UI step 1
- AC-7 · dedicated, strict-Zod-backed technical specs component → UI step 1, command step 1
- AC-8 · shared `ProjectVideoSection`/`ProjectFeatureTiles`, zero outdoor-tv regression → UI step 8, command step 4
- AC-9 · noindex for draft, id fallback, slug redirect → UI steps 5-6
- AC-10 · sauna hidden in producer wizard selector → UI step 7, command step 3
- AC-11 · cross-route family/subcategory guards, 404/redirect → UI steps 2-4, command step 4
- Build plan task 10 (real data, dev then prod) → command steps 6-7
