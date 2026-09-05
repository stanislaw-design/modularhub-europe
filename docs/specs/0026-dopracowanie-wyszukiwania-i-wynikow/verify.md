# Verify: dopracowanie wyszukiwania i wyników · spec 0026 · updated 2026-09-04
_Steps derived from spec 0026 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Otwórz `/pl/klient/wyniki?heatSource=pompa-ciepla&priceMin=150000&priceMax=250000&sort=price-asc` (uwaga: użyj wartości z `PRICE_THRESHOLDS`, nie spec's ilustracyjnych 200000/400000, które nie są prawidłowymi progami i zostają odrzucone przez AC-3) → zwraca tylko "Baltyk Loft 120" i "Karpaty Alpine 104" (jedyne domy z pompą ciepła w tym przedziale), posortowane rosnąco po cenie → AC-1, AC-2, AC-4, AC-5, AC-10
- [x] Otwórz `/pl/klient/wyniki?heatSource=nieznana-wartosc` → filtr zignorowany, reszta strony działa normalnie, brak błędu → AC-3
- [x] Otwórz `/pl/klient/wyniki?priceMin=400000&priceMax=200000` (odwrócone) → oba pola ceny odrzucone, brak filtra ceny → AC-4
- [x] Otwórz `/pl/klient/wyniki?q=Baltyk` → dopasowuje "Baltyk Loft 120" i "Baltyk Studio 38" po nazwie; `?q=%20%20` (same spacje) zwraca wszystkie wyniki bez filtra → AC-6
- [x] Otwórz `/pl/klient/wyniki?family=spa-modulowe&spaSubcategory=jacuzzi` (brak pasujących produktów) → pusty stan mówi „Brak spa modułowych…”, nigdy „domów”, bez błędu → AC-8, AC-11
- [x] Na `/pl/klient/wyniki` kliknij chip „Pompa ciepła” → URL od razu aktualizuje się do `?heatSource=pompa-ciepla` i lista się odświeża; kliknij ponownie → filtr znika (toggle) → AC-7
- [x] `CategoryFilterBar` pokazuje pięć chipów opartych na danych, cztery kategorie ze spec ("Parterowy/Piętrowy" to dwa osobne, wzajemnie wykluczające się chipy tego samego wymiaru storeys): Parterowy, Piętrowy, Pompa ciepła, Rekuperacja, Klasa A+; sześć starych dekoracyjnych chipów i przycisk „Filtry” nie istnieją → AC-7
- [x] Na zakładce spa modułowe/pergola pojawia się rząd chipów podkategorii, podłączony tym samym wzorcem toggle → AC-8
- [x] Pole „Słowo kluczowe” w pasku filtrów `/wyniki` aktualizuje URL po kliknięciu „Szukaj” (albo Enter), zachowując aktywne filtry chipów → AC-9
- [x] Kliknięcie chipa atrybutu z aktywnym wcześniej `sort`/`q`/inną podkategorią zachowuje resztę filtra w URL (żaden parametr nie znika) → AC-10
- [x] Przejście klawiaturą po chipach `CategoryFilterBar`/`SubcategoryFilterBar`: fokus widoczny (`.focus-ring`), `Enter` aktywuje link, chipy nie są `disabled` → AC-14
- [x] Dokładnie jeden prawdziwy `<h1>` na `/wyniki` (licznik wyników) niezależnie od aktywnych filtrów → AC-14
- [x] W kreatorze producenta (krok „Dane techniczne”, rodzina dom) pola Źródło ciepła/Wentylacja/Klasa energetyczna to selecty z zamkniętej listy, nie pola tekstowe; „nieznana” nie jest wśród opcji klasy energetycznej → spec Feature design

## Commands
- [x] `npm run test` → 499/499 testów przechodzi (dwa niepowiązane błędy bundlowania `.agents/skills/dev-rfc` i `.claude/skills/dev-rfc`, `bun:test`, są sprzed tego builda i poza jego zakresem) → wszystkie AC pośrednio
- [x] `npx tsc --noEmit` → brak błędów → wszystkie AC pośrednio
- [x] Zapytanie weryfikacyjne w Neon: `select count(*) from product where family='dom' and status='published' and (...)` → zwraca 0 wierszy → AC-12
- [x] `select indexname from pg_indexes where tablename='product'` → zawiera `product_status_family_idx`, `product_floor_area_m2_idx`, `product_price_min_cents_idx`, `product_technical_specs_heat_source_idx`, `product_technical_specs_ventilation_idx`, `product_technical_specs_energy_class_idx`, `product_search_vector_idx` → AC-13

## Acceptance-criteria coverage
- AC-1 (nowe parametry URL) … covered by happy-path step, `lib/results-filters.test.ts`
- AC-2 (granica family=dom, skrót pompa-ciepla) … covered by happy-path step, chip step, `lib/product-technical-specs.test.ts`
- AC-3 (łagodne odrzucanie pole po polu) … covered by invalid-value step, `lib/results-filters.test.ts`
- AC-4 (filtr ceny, priceOnRequest wykluczony, priceMin produktu) … covered by happy-path + reversed-range steps
- AC-5 (sortowanie) … covered by happy-path step, sort dropdown manual check
- AC-6 (wyszukiwanie pełnotekstowe, prefiks, puste q) … covered by q step
- AC-7 (CategoryFilterBar realny, toggle, usunięte chipy) … covered by chip steps
- AC-8 (podkategorie spa/pergola) … covered by empty-subcategory step
- AC-9 (pole wyszukiwania w pasku, wzorzec nawigacji) … covered by search-field step
- AC-10 (koniunkcja wszystkich filtrów) … covered by happy-path + filter-preservation steps
- AC-11 (EmptyResults świadomy rodziny) … covered by empty-subcategory step, `EmptyResults.test.tsx`
- AC-12 (backfill istniejących produktów) … covered by Neon verification query
- AC-13 (nowe indeksy) … covered by pg_indexes query
- AC-14 (WCAG 2.2 AA) … covered by keyboard/h1 steps
