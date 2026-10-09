# Verify: wersje układu wnętrz · spec 0069 · updated 2026-10-09
_Steps derived from spec 0069 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `/pl/project/logbar-bingo-pietrowy-perfeco-a` (opcja domyślna) → sekcja Układ domu pokazuje 82,09 m², pomieszczenia produktu, brak opisu wersji → AC-1, AC-4
- [ ] Na tej stronie wybierz w konfiguratorze "Wersja 2" → adres dostaje `?opcje=`, Układ domu pokazuje 91,05 m², Garderobę, Pomieszczenie techniczne i opis wersji pod nagłówkiem → AC-1, AC-4
- [ ] Otwórz `?zakladka=rzut` na Bingo A → dwa podpisy "Wersja podstawowa · Parter" i "· Piętro"; po wyborze "Wersja 2" zakładka zostaje otwarta i pokazuje tylko "Wersja 2 · Parter" i "Wersja 2 · Piętro", w kolejności parter, piętro → AC-2
- [ ] Wybierz "Wersja 3" i "Wersja 1" → każda pokazuje własne rzuty; wersja 1 ma metraż 82,09 m², wersja 3 82,86 m² → AC-1, AC-2
- [ ] Otwórz `/pl/project/logbar-lord?zakladka=rzut` → podpisy "Rzut 1" i "Rzut 2", bez opisu wersji, wygląd jak przed zmianą → AC-3, AC-9
- [ ] Otwórz `/pl/results` i `/pl/compare?projects=<id Bingo A>` po wyborze "Wersja 2" na stronie produktu → karta i porównywarka pokazują metraż bazowy 82,09 m² → AC-5
- [ ] View source `/pl/project/logbar-bingo-pietrowy-perfeco-a?opcje=<id wersji 2>` → meta description z metrażem bazowym 82.09 m², JSON-LD bez 91,05 → AC-5
- [ ] Otwórz `/en/...`, `/de/...`, `/nl/...` Bingo A z wybraną wersją 2 → opis, nazwy pomieszczeń i podpisy pięter (Ground floor, Erdgeschoss, Begane grond) w języku strony → AC-6
- [ ] Wejdź z nieprawidłowym `?opcje=abc` → strona wraca do opcji domyślnej bez błędu → AC-3

## Commands
- [ ] `npx vitest run lib/data/project-layout.test.ts lib/translations` → przechodzą (wybór rzutów, układ, reguła grupy, braki tłumaczeń) → AC-1, AC-2, AC-3, AC-4, AC-7, AC-8
- [ ] `npx vitest run components/klient "app/[locale]/(customer)/project"` → przechodzą (podpisy rzutów, wersja bazowa na karcie, porównywarce, metadanych, JSON-LD) → AC-2, AC-5, AC-9
- [ ] `npx playwright test e2e/wersje-ukladu.spec.ts` → 4 testy przechodzą → AC-1, AC-2, AC-4, AC-6, AC-9
- [ ] `npm run check:translations` → "Brak braków w tłumaczeniach (en, de, nl)" → AC-7, AC-10
- [ ] Neon dev (`bold-tree-78265613`): `select count(*) from product_option_layout` → 4, `select count(*) from product_option_layout_translation` → 12 → AC-10
- [ ] Neon dev: dokumenty `product_floor_plan` Bingo A do D → po 8 z `product_option_id` i `floor_level`, po 2 bez opcji → AC-10
- [ ] Neon dev: `insert into document (..., purpose = 'product_photo', product_option_id = <opcja>)` → odrzucone przez CHECK; `floor_level = 'xyz'` → odrzucone → AC-8, AC-9
- [ ] `npx tsx --env-file=.env.local scripts/import-logbar-catalog.ts` drugi raz → "rzuty wersji układu: już komplet", bez nowych dokumentów (idempotentny) → AC-10

## Acceptance-criteria coverage
- AC-1 … strona Bingo z `?opcje=` i testy `project-layout`, `page.test.tsx` · AC-2 … zakładka Rzut, `selectFloorPlans` · AC-3 … Lord i opcja bez rzutów · AC-4 … Układ domu z opisem · AC-5 … karta, porównywarka, metadane, JSON-LD · AC-6 … en, de, nl · AC-7 … `check:translations` · AC-8 … `assertLayoutGroupRule` i CHECK w bazie · AC-9 … produkt bez układu, rzut bez piętra · AC-10 … backfill Logbar Bingo A do D na dev
