# Verify: kraj jako informacja bez ocen zgodności · spec 0082 · updated 2026-11-09
_Kroki z kryteriów akceptacji spec 0082. `/check verify` je uruchamia, `/test` utrwala te trwałe._

## UI / manual
- [ ] Strona główna bez wybranego kraju, kliknij "Szukaj domów" → przejście na wyniki bez parametru `country` → AC-7
- [ ] Strona główna, w polu "Gdzie budujesz?" jest sześć krajów (Polska, Niemcy, Holandia, Belgia, Włochy, Francja), wybór Belgii daje `country=BE` w adresie → AC-2, AC-7
- [ ] `/pl/results?country=DE`, `?country=BE` i `?country=XX` → ta sama lista i licznik co bez parametru, brak tekstu "Dopuszczone prawnie" i znacznika "Wymaga dodatkowych dokumentów" → AC-3, AC-4, AC-5
- [ ] Pasek filtrów wyników (stały i mobilny) nie ma pola kraju, zmiana innego filtra zachowuje `country` w adresie → AC-8
- [ ] Strona produktu z wierszami `blocked` i `conditional` w bazie nie pokazuje statusu, powodu ani bloku "Zgodność prawna" → AC-5
- [ ] `/pl/plot` zwraca 404 → AC-6
- [ ] Strona zweryfikowanych producentów nie ma filtra kraju, karta producenta mówi "Deklaruje dostawy do: …" → AC-9
- [ ] Zapytanie o wybrane domy (`/pl/inquiry`), `/pl/project-request` i okno zapytania o produkt: pole kraju ma sześć opcji, `?country=IT` w adresie podpowiada Włochy → AC-4, AC-10
- [ ] Rejestracja klienta nie ma pola kraju → AC-10
- [ ] Rejestracja producenta: kraj siedziby ma sześć opcji → AC-11
- [ ] Panel producenta, profil zdolności: sześć krajów dostawy, zapisany wcześniej kraj spoza listy (np. US) nadal widoczny jako zaznaczony; tekst pomocy nie mówi o niedocieraniu zapytań → AC-11
- [ ] Panel producenta, kreator produktu: kraj produkcji i kraje dostawy z sześciu → AC-11
- [ ] Strona główna: brak obietnicy automatycznej oceny zgodności, brak "Nordic 126, 92%" → AC-12
- [ ] Panel admina, oceny zgodności produktu działają jak wcześniej, kraje BE, IT, FR dostępne → AC-13

## Commands
- [ ] `npx tsc --noEmit` → bez błędów → AC-14
- [ ] `npm run check:translations` → "Brak braków w tłumaczeniach" → AC-2, AC-14
- [ ] `npx vitest run lib/countries-single-source.test.ts` → przechodzi, brak osobnej listy krajów w `app`, `components`, `lib`, `scripts` → AC-1, AC-14
- [ ] `npx vitest run lib/data/countries.test.ts lib/pricing.test.ts lib/results-filters.test.ts lib/verified-manufacturers-filters.test.ts lib/product-envelope-parameters.test.ts` → przechodzą → AC-1, AC-2, AC-14
- [ ] `npx vitest run lib/project-request-actions.test.ts lib/db/large-orders-queries.test.ts` → serwer odrzuca `US` w `submitProjectRequest` i `submitBulkProductInquiry`, `getAllCountries()` zwraca sześć krajów → AC-10, AC-11
- [ ] `node --env-file=.env.local node_modules/@playwright/test/cli.js test e2e/wyniki.spec.ts e2e/strona-glowna.spec.ts e2e/dzialka.spec.ts` → przechodzą → AC-14
- [ ] Na produkcji (odczyt, za zgodą): `select code from country order by code` → są `BE`, `IT`, `FR` → AC-13
- [ ] `git diff main -- drizzle lib/db/schema.ts` → brak migracji ruszających `product_country_eligibility`, `product_compliance_assessment`, `producer_delivery_country` → AC-13

## Acceptance-criteria coverage
- AC-1 … lista i test pilnujący · AC-2 … nazwy, mapy, tłumaczenia · AC-3, AC-4, AC-5 … wyniki i produkt · AC-6 … 404 · AC-7 … SearchCard · AC-8 … pasek filtrów · AC-9 … producenci · AC-10 … formularze i serwer · AC-11 … producent · AC-12 … strona główna · AC-13 … baza i produkcja · AC-14 … testy
