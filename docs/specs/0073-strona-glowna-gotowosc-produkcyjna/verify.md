# Verify: strona główna, gotowość produkcyjna · spec 0073 · updated 2026-10-19
_Steps derived from spec 0073 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Otwórz `/de`, rozwiń pole kraju w wyszukiwarce → opcje "Deutschland", "Niederlande", "Polen" → AC-1
- [ ] Na `/pl` wybierz Budżet "50K–100K €" i kliknij Szukaj → adres `/pl/results?country=PL&priceMin=50000&priceMax=100000` → AC-2
- [ ] Wybierz Budżet "Dowolny budżet" i Szukaj → w adresie brak `priceMin` i `priceMax` → AC-2
- [ ] Zakładka "Więcej niż dom" w wyszukiwarce → brak pola Budżet → AC-2
- [ ] Sekcja realizacji pokazowej wygląda jak przed zmianą (zdjęcia, liczby CocoLeisure) → AC-3
- [ ] Karta Compliance Engine ma plakietkę "Przykład ilustracyjny" (sprawdź też `/en`, `/de`, `/nl`) → AC-4
- [ ] Sekcja producentów nie ma wyłączonego przycisku "Zobacz wszystkich producentów" → AC-5
- [ ] Ceny na kartach polecanych domów i w tabeli porównawczej: `/pl` "od 129 000 €", `/en` "from €129,000", `/de` "ab 129.000 €" → AC-6
- [ ] Strona wygląda jak dotąd: brak sekcji "Więcej niż dom" i "Co mówią nasi klienci" → AC-7
- [ ] Wyłącz bazę (zły `DATABASE_URL` w `.env.local`), odśwież `/pl` → strona się otwiera bez popularnych domów, porównania i producentów, hero i FAQ zostają, błąd w logu → AC-8
- [ ] Odśwież stronę z jednym polecanym projektem → brak tabeli porównawczej; z zerem → brak nagłówków popularnych domów → AC-9
- [ ] Wymuś błąd w trasie klienta (np. rzuć błąd w `contact/page.tsx`) → ekran "Coś poszło nie tak" z "Spróbuj ponownie" i linkiem do strony głównej, po `/de` po niemiecku → AC-10
- [ ] Źródło `/pl` i `/de` → `<title>` i `canonical` w danym języku, jeden blok JSON-LD z `Organization` i `WebSite`, `og:image` = `/images/og/home.jpg` 1200x630, `twitter:card` = `summary_large_image` → AC-14, AC-15

## Commands
- [ ] `npx tsc --noEmit` → bez błędów
- [ ] `npm run lint` → 0 błędów
- [ ] `npm run test` → wszystkie przechodzą (w tym `lib/site-url.test.ts`, `app/sitemap.test.ts`, `app/[locale]/(customer)/page.test.tsx`, `error.test.tsx`, `HomeStructuredData.test.tsx`, `countries.test.ts`, `format-price.test.ts`, `SearchCard.test.tsx`) → AC-1, AC-2, AC-6, AC-8 do AC-10, AC-12 do AC-14
- [ ] `node --env-file=.env.local node_modules/@playwright/test/cli.js test e2e/strona-glowna.spec.ts` → 6 przechodzi (`/pl` i `/de`) → AC-11
- [ ] `npm run check:translations` → brak braków (klucze `ErrorPage`, `exampleBadge`, nowe zakresy budżetu) → AC-4, AC-10
- [ ] `VERCEL_ENV=production npm run build` bez `NEXT_PUBLIC_SITE_URL` → build się przerywa z komunikatem o `NEXT_PUBLIC_SITE_URL`; z ustawioną zmienną przechodzi → AC-12
- [ ] Otwórz `/sitemap.xml` → stałe strony i opublikowane produkty (domy, sauny, outdoor TV) w czterech językach z `xhtml:link` hreflang; `/robots.txt` wskazuje `…/sitemap.xml` na adresie serwisu → AC-12, AC-13
- [ ] Przy wyłączonej bazie `/sitemap.xml` zwraca 200 z samymi stałymi stronami → AC-13

## Acceptance-criteria coverage
- AC-1 … countries.test, e2e, UI · AC-2 … SearchCard.test, e2e, UI · AC-3 … FeaturedProjectShowcase.test, UI · AC-4 … ComplianceEngineShowcase.test, UI · AC-5 … UI · AC-6 … format-price.test, PopularHomeCard.test, UI · AC-7 … UI
- AC-8 … page.test, UI · AC-9 … page.test, ProducerShowcase.test, e2e · AC-10 … error.test, UI · AC-11 … e2e
- AC-12 … site-url.test, build · AC-13 … sitemap.test, UI · AC-14 … HomeStructuredData.test, e2e · AC-15 … e2e (og:image, twitter:card)
