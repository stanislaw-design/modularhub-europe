# Verify: ModularProjects · spec 0076 · updated 2026-10-24
_Steps derived from spec 0076 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Zaloguj się jako producent zweryfikowany wolumenowo, otwórz `/pl/producer/panel` → menu boczne, nagłówek `/producer/panel/board`, zakładki i link powrotny w szczególe mówią "ModularProjects", odznaka mówi "Zapytania ModularProjects czekające na Twoją wycenę: N"   → AC-1
- [ ] Zaloguj się jako klient z zapytaniem, otwórz `/pl/panel/quotes` → pozycja menu i nagłówek to "ModularProjects", przycisk "Dodaj zapytanie ModularProjects"   → AC-1
- [ ] Otwórz `/pl/project-request` → tytuł karty, nagłówek, wstęp i podpowiedzi widoczności używają nazwy, próg "od 3 domów" zostaje w menu (`Zapytanie ModularProjects (od 3 domów)`)   → AC-2
- [ ] Otwórz `/pl/contact` i stopkę → "Mam projekt na ModularProjects", link "Zapytanie ModularProjects", przycisk stopki "Zapytaj w ModularProjects"   → AC-2
- [ ] Złóż trzy zapytania na jeden adres e mail, spróbuj czwartego → okno limitu mówi "aktywnych zapytań ModularProjects"   → AC-2, AC-3
- [ ] Złóż nowe zapytanie i sprawdź maile (temat i treść) do klienta, producenta i zespołu w pl, en, de, nl → zawierają "ModularProjects"   → AC-3
- [ ] Przejdź kolejno `/producer/panel/board`, `/panel/quotes`, `/project-request`, `/internal/large-orders` → adresy bez zmian, panel admina nadal ze starym słownictwem   → AC-4
- [ ] Otwórz `/pl/modularprojects` → jeden h1, karta CocoLeisure z okładką, statusem (ikona plus tekst) i trzema faktami, cała karta jest linkiem   → AC-6, AC-12
- [ ] Otwórz `/en/modularprojects/cocoleisure` → tytuł po angielsku, fakty, trzy grupy zdjęć (Renderings, Structural design, Construction), przyciski "Commission a similar project" (`/en/project-request`) i "Build projects like this" (`/en/producer/registration`), link powrotny   → AC-7
- [ ] Otwórz `/pl/modularprojects/nie-ma-takiego` → 404   → AC-7
- [ ] Otwórz stronę główną → kafel pokazuje tytuł, lead, fakty i dziesięć zdjęć z wpisu wyróżnionego, linki "Zobacz realizację" i "Zobacz wszystkie realizacje"   → AC-9
- [ ] Źródło obu stron: `<link rel="canonical">`, `hreflang` z `x-default`, `og:image`, JSON-LD `Article` (wpis) i `CollectionPage` (lista)   → AC-11
- [ ] Obie strony w jasnym i ciemnym motywie oraz przy szerokości 390 px → brak poziomego przewijania, widoczny fokus na linkach, kontrast poprawny   → AC-12
- [ ] Menu strony (grupa Zamówienia) i stopka zawierają "Realizacje ModularProjects" w czterech językach   → AC-14
- [ ] Po restarcie serwera dev, bo `messages/*.json` są trzymane w pamięci   → AC-1 do AC-14

## Commands
- [ ] `npx vitest run lib/data/modularprojects` → integralność wpisów, pliki istnieją, jeden `featured`, brak danych kontaktowych   → AC-8, AC-10, AC-13
- [ ] `npx vitest run lib/i18n/large-order-messages.test.ts` → nazwa własna dozwolona, reszta przetłumaczona w nowych przestrzeniach   → AC-5
- [ ] `npx vitest run app/sitemap.test.ts` → `/modularprojects` i wpisy w czterech językach z `lastModified`   → AC-11
- [ ] `npm run test` → wszystkie testy przechodzą (testy maili, paneli i menu zaktualizowane na nowy tekst)   → AC-3, AC-4
- [ ] `npm run lint` i `npm run build` → bez błędów   → AC-4
- [ ] `PLAYWRIGHT_BASE_URL=http://localhost:3001 node --env-file=.env.local node_modules/@playwright/test/cli.js test e2e/modularprojects-0076.spec.ts` → lista, wpis, przycisk do `/project-request`, 404, hreflang   → AC-6, AC-7, AC-11
- [ ] `ls lib/data/featured-showcase.ts` → plik nie istnieje, `public/images/success/` nie istnieje   → AC-9, AC-10

## Acceptance-criteria coverage
- AC-1 … panele (kroki 1, 2) · AC-2 … formularz, kontakt, stopka, limit (3, 4, 5) · AC-3 … maile (6, `npm run test`) · AC-4 … trasy bez zmian (7, lint, build) · AC-5 … test tłumaczeń · AC-6 … lista (8, E2E) · AC-7 … wpis i 404 (9, 10, E2E) · AC-8 … test integralności · AC-9 … kafel (11, `ls`) · AC-10 … test plików · AC-11 … SEO (12, sitemap, E2E) · AC-12 … dostępność (8, 13) · AC-13 … test danych kontaktowych · AC-14 … menu i stopka (14)
