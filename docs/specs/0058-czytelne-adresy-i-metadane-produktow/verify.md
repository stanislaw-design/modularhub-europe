# Verify: czytelne adresy i metadane produktów · spec 0058 · updated 2026-09-30
_Steps derived from spec 0058 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] W panelu producenta stwórz nowy produkt "dom", wpisz nazwę "Test Slug Dom" i zapisz → produkt dostaje `slug` `test-slug-dom` przy pierwszym zapisie z niepustą nazwą → AC-1
- [ ] Zmień nazwę tego samego produktu na coś innego i zapisz ponownie → `slug` zostaje `test-slug-dom`, nie przelicza się → AC-1
- [ ] Otwórz `/pl/project/pomerania-40` (albo dowolny wyrównany produkt) → strona renderuje właściwy produkt → AC-3
- [ ] Otwórz `/pl/project/<uuid tego samego produktu>?wariant=pod-klucz` → przekierowanie 308 na `/pl/project/pomerania-40?wariant=pod-klucz`, zapytanie zachowane → AC-4
- [ ] W kreatorze producenta zacznij nowy produkt bez wypełnionej nazwy, otwórz jego link `/pl/project/<uuid>` → strona renderuje się normalnie, bez przekierowania (produkt nie ma jeszcze sluga) → AC-5
- [ ] Na liście wyników, w ulubionych, w porównywarce i w podglądzie producenta/administratora sprawdź, że link do produktu ze slugiem pokazuje slug, nie uuid → AC-6
- [ ] Podejrzyj źródło strony produktu opublikowanego → `<link rel="canonical">` i `og:url` wskazują na adres ze slugiem → AC-7
- [ ] Podejrzyj źródło strony produktu w statusie innym niż `published` (np. `draft`) otwartej bezpośrednim linkiem → strona renderuje się normalnie, ale zawiera `<meta name="robots" content="noindex,nofollow">` → AC-7

## Commands
- [ ] `npx tsx --env-file=.env.local scripts/backfill-product-slugs.ts` (dry run, potem `-- --apply` na docelowej bazie) → każdy istniejący produkt z nazwą i bez sluga dostaje go, bez duplikatów (`select count(*), count(distinct slug) from product` się zgadzają) → AC-8
- [ ] `npx vitest run lib/product-slug.test.ts lib/data/projects.test.ts lib/producer-product-actions.test.ts` → wszystkie testy przechodzą, w tym nowe testy przekierowania/kolizji/braku sluga → AC-1, AC-2, AC-3, AC-5, AC-9
- [ ] `npx tsc --noEmit -p .` i `npm run build` → czyste, `/project/[slug]` i `/outdoor-tv/[slug]` widoczne w tabeli tras → AC-9

## Acceptance-criteria coverage
- AC-1 (slug wyliczony raz, przy pierwszym niepustym name) — covered by producer-product-actions.test.ts "slug (spec 0058)" + manual create/rename steps above.
- AC-2 (kolizja → losowy sufiks) — covered by product-slug.test.ts (appendSlugSuffix) + producer-product-actions.test.ts collision test + real backfill run against dev DB (Modulor 28 ×5, Create Order Product ×N, Case Field Product ×N, BARN 152 ×2 all deduplicated with unique suffixes).
- AC-3 (segment = slug OR id) — covered by projects.test.ts `getProjectBySlugOrId` + manual step above.
- AC-4 (308 redirect id→slug, query preserved) — covered by manual step above (no automated test yet; `permanentRedirect` used explicitly for the 308, not the default `redirect`'s 307).
- AC-5 (no slug yet → normal render, no redirect) — covered by projects.test.ts + manual step above.
- AC-6 (every link-building call site inserts slug) — covered by the `resolveProductHref` signature change and its 8 call sites (ResultCard, FavoriteCard, PopularHomes, ProjectCompareTable, CategoryShowcase, verified-manufacturers page, both product pages' cross-family redirects); manual spot check above.
- AC-7 (canonical/openGraph on slug, robots noindex for non-published) — covered by manual steps above (no automated test yet).
- AC-8 (backfill, no duplicates) — covered by the real dry-run + `--apply` run against modularhub-dev (153/153 unique slugs, 1 remaining null row confirmed to have a null name).
- AC-9 (existing tests pass, new redirect/no-slug tests) — covered by the full `lib/data/projects.test.ts` and `lib/producer-product-actions.test.ts` runs (52 and 10 tests respectively, all passing).
