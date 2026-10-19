# 0073. Rationale: strona główna, gotowość produkcyjna

## Context

Analiza z 2026-10-19 (zapisana w `docs/todo/strona-glowna-gotowosc-produkcyjna.md`) pokazała, że strona główna ma poprawne tłumaczenia i prawdziwe dane z bazy, ale kilka luk przed publicznym startem. Część z nich została już naprawiona w commicie `544e3ba` (metadane, sitemapa ze stałymi stronami, hero w WebP). Ta spec obejmuje resztę, która da się zrobić bez decyzji prawnych.

Siły, które ukształtowały decyzję:
- Baza Neon ma historię wyczerpanych limitów (błąd 402), a strona główna woła trzy zapytania naraz bez żadnej obsługi błędu. W projekcie jest tylko `global-error.tsx`, nie ma `error.tsx` na żadnym poziomie, więc jedna awaria zapytania zastępuje całą stronę ekranem błędu.
- Filtr wyników akceptuje tylko cztery progi ceny (`PRICE_THRESHOLDS`), a pole Budżet w wyszukiwarce ma inne zakresy i niczego nie przekazuje. Użytkownik myśli, że filtruje.
- `NEXT_PUBLIC_SITE_URL` nie jest w `.env.local.example`, a `metadataBase` ma fallback na localhost. Błąd konfiguracji na produkcji byłby cichy i dotyczyłby sitemapy, robots i udostępnień naraz.
- Lista z analizy jest szeroka. Część pozycji (cookies, polityka prywatności, regulamin, stopka) ma już własne miejsce w scope i wymaga decyzji prawnych, których inżynier nie podejmie sam.

## Options considered

### Option 1: Jedna zbiorcza spec w trzech częściach, bez spraw prawnych

Trzy niezależne części (treść i dane, niezawodność, SEO), wspólny kontrakt, osobne zadania w jednym planie.

**Pros**:
- Jedno miejsce na całą gotowość produkcyjną strony głównej, kolejność kroków widoczna razem.
- Sprawy prawne nie blokują poprawek technicznych.

**Cons**:
- Szeroka spec, ryzyko rozrostu.
- Zostawia najpoważniejszy bloker (cookies, RODO) bez rozwiązania.

### Option 2: Wszystko w jednej spec, razem z cookies i stopką

**Pros**:
- Jedna lista do odhaczenia przed startem.

**Cons**:
- Decyzje prawne (podstawa przetwarzania, treść regulaminu) zablokowałyby część techniczną.
- Duplikuje funkcję 5 ze scope.

### Option 3: Tylko poprawki strony głównej (A i B)

**Pros**:
- Najkrótsza spec.

**Cons**:
- SEO zostaje rozproszone w funkcji 20, a bezpieczny adres strony jest wspólnym ryzykiem dla wszystkich stron.

### Option 4: Tylko bloker prawny

**Pros**:
- Rozwiązuje to, co faktycznie blokuje start.

**Cons**:
- Wymaga wejścia prawnika i nie da się go zamknąć samymi decyzjami technicznymi.

## Rationale

Wybrana opcja 1, bo rozdziela to, co inżynier może zamknąć sam (odporność, SEO, poprawność treści), od tego, co wymaga decyzji prawnych. Dzięki temu strona główna może być gotowa technicznie, zanim prawnicze elementy dojrzeją. Bloker prawny zapisano w Follow up wprost, żeby nie zginął.

Poszczególne rozstrzygnięcia: `Intl.DisplayNames` dla krajów, bo fixture ma trzy kraje i nie ma sensu utrzymywać dla nich tabeli tłumaczeń. Budżet podpinamy do wyników, a nie usuwamy, bo `getProjects` już obsługuje `priceMin` i `priceMax`, więc koszt jest niski, a wartość dla użytkownika realna. Realizacja pokazowa zostaje w kodzie jako typowany plik, bo to jeden wpis zmieniany rzadko, a tabela w bazie z ekranem admina byłaby osobną funkcją. Przykład zgodności oznaczamy jako ilustrację, bo podpięcie pod prawdziwą ocenę wprowadza przypadki brzegowe (kraj, brak oceny) bez zysku dla strony wizytówki.

Cache zapytań i przebudowa renderowania świadomie odłożone: nie ma pomiaru, że dynamiczny render jest problemem, a zmiana wymaga przebudowy nagłówka i motywu. To przedwczesna optymalizacja (cache jest też zobowiązaniem: trzeba wiedzieć, co go unieważnia i co, gdy jest nieaktualny). Sitemapa jest wyjątkiem, bo odczyt wszystkich produktów przy każdym żądaniu robota byłby realnym kosztem, więc jej cache na dobę ma jasne uzasadnienie i znaną cenę (opóźnienie do 24 godzin).

Rzucanie błędu w `site-url` na produkcji jest wybrane zamiast samego ostrzeżenia, bo cichy localhost w sitemapie i canonical psuje indeksację na tygodnie, a awaria builda jest widoczna od razu i tania w naprawie.

## Options considered: wybrane pytania szczegółowe

| Dziedzina | Wybór | Odrzucone |
|---|---|---|
| Nazwy krajów | `Intl.DisplayNames` | klucze w `messages`, tabela w bazie |
| Budżet | podpiąć do `priceMin` i `priceMax` | usunąć pole, zostawić |
| Dane realizacji | typowany plik w `lib/data` | tabela w bazie plus panel admina |
| Przykład zgodności | plakietka ilustracji | prawdziwa ocena produktu, usunięcie |
| Przycisk producentów | ukryć | link do `/verified-manufacturers` (to lista wolumenowa, nie katalog) |
| Wyłączone sekcje | jedna stała z komentarzem | przywrócić, usunąć kod |
| Awaria bazy | `allSettled` plus `error.tsx` | tylko `error.tsx`, tylko `allSettled` |
| Render dynamiczny | zostawić i zmierzyć | cache zapytań, strona statyczna |
| Sitemapa | produkty z bazy z cache na dobę | tylko stałe strony |
| JSON-LD | `Organization` i `WebSite` | plus `Product`, brak |
| Obrazek OG | statyczny z hero | dynamiczny `next/og`, grafika od zamawiającego |
| Adres strony | helper rzucający błąd na produkcji | ostrzeżenie, sama dokumentacja |
