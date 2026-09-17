# 0041. Rationale: Model danych pod nowy uklad karty projektu

## Context

Karta projektu klienta ma dziś jedną cenę i jeden standard wykonania na produkt (`product.completion_standard`, `product.price_min_cents`/`price_max_cents`). To nie oddaje tego, jak realnie sprzedają domy modułowi producenci: ten sam fizyczny dom bywa oferowany w kilku standardach wykończenia naraz, każdy z inną, pełną ceną i inną listą tego co wchodzi w zakres.

Materiał badawczy `docs/research/2026-09-12-karta-projektu-research.md` i rekomendacja `docs/research/2026-09-12-karta-projektu-rekomendacja-klient.pdf` nazywają to najpilniejszym problemem do naprawienia, ważniejszym niż układ sekcji na stronie: gdy niższa cena jednego standardu jest pokazana obok zakresu wyposażenia właściwego wyższemu standardowi, klient dowiaduje się o rozbieżności dopiero od handlowca, nie od strony. To nie jest teoretyczne ryzyko: katalog Castora (`_docs/Katalog domów PDF skompresowany 3.pdf`, opisany w materiale badawczym) pokazuje model CAS 98 Mikołajki z dwiema realnymi, kompletnymi ofertami na ten sam dom, stan surowy zamknięty za 207 000 zł netto i stan wykończony za 309 900 zł netto, a historyczny manifest importu (`_docs/castor-import-manifest.json`) zapisał je jako jeden produkt z ceną minimum/maksimum i listą wyposażenia wziętą z bogatszego standardu. Dzisiejszy schemat bazy strukturalnie wymusza dokładnie ten błąd, bo ma tylko jedno pole na standard i jedną parę cenową na cały produkt.

Do tego dochodzą mniejsze, ale realne luki wskazane w tym samym materiale i potwierdzone w kodzie: pozycje `price_includes`/`price_excludes` to płaskie listy tekstu bez informacji, czy dana pozycja jest obowiązkową dopłatą, opcją, czy leży po stronie klienta; czas realizacji (`production_lead_time_weeks_min/max`, `on_site_assembly_days_min/max`) nie mówi kto za dany etap odpowiada ani od jakiego zdarzenia liczy się termin; dokument (zdjęcie, rzut) nie potrafi powiedzieć, czy dotyczy konkretnego wariantu; kategoria produktu nie zna jeszcze przeznaczenia pod wynajem lub hotel, mimo że badanie klienckie wprost wymienia ten segment.

Dane do bazy nadal wpisujemy ręcznie przez Neon MCP (decyzja z funkcji 7 i 9, `docs/scope/produkcja.md`), nie przez formularz producenta. To ogranicza wybór mechanizmu utrzymania spójności: cokolwiek pilnuje, żeby cena pokazywana klientowi zawsze odpowiadała realnemu wariantowi, musi działać nawet gdy zapis jest surowym SQL bez udziału kodu aplikacji.

## Options considered

### Opcja 1: Więcej płaskich pól na `product`

Dodać drugą i trzecią parę pól cenowych i zakresowych wprost na `product` (np. `price2_min_cents`, `price2_max_cents`, `scope2_includes`...), po jednej parze na każdy możliwy standard.

**Pros**:
- Żadnej nowej tabeli, migracja ograniczona do dodania kolumn.
- Najmniejsza możliwa zmiana w istniejącym kodzie odczytu.

**Cons**:
- Sztywno zakłada z góry, ile standardów istnieje; Castor ma dwa, Steel House (wg materiału badawczego) trzy, kolejny producent może mieć jeszcze inną liczbę.
- Nie da się w ten sposób dodać statusów pozycji kosztowych ani harmonogramu bez powielenia tej samej sztywnej struktury po raz drugi i trzeci.
- Łamie podstawową zasadę normalizacji: powtarzalna, listowa struktura (warianty) wciśnięta w płaskie kolumny zamiast w osobne wiersze.

### Opcja 2: Osobny wiersz `product` na każdy standard

Traktować każdy standard jako osobny produkt, powiązany z resztą przez wspólne pole grupujące (np. `model_group_id`).

**Pros**:
- Zero zmian w kształcie tabeli `product`; każdy dzisiejszy odbiorca danych produktu działa bez modyfikacji.

**Cons**:
- Powiela dane techniczne, galerię i opis dla tego samego fizycznego domu dwa lub trzy razy; każda zmiana opisu wymagałaby aktualizacji kilku wierszy naraz.
- Lista wyników (`/wyniki`) pokazałaby dwie lub trzy prawie identyczne karty tego samego domu zamiast jednej, co przeczy dzisiejszemu założeniu jeden produkt, jedna karta (spec 0026).
- Wyszukiwanie pełnotekstowe i indeksy ze spec 0026 liczyłyby te same technicznie identyczne domy wielokrotnie.

### Opcja 3: Nowa tabela `product_variant` (wybrana)

Jeden wiersz na nazwany standard wykonania danego produktu, z ceną i krótkim opisem zakresu należącymi do wariantu, nie do produktu; pozycje kosztowe i harmonogram podpięte pod konkretny wariant.

**Pros**:
- Odpowiada realnemu kształtowi danych: jeden fizyczny dom, kilka sprzedawalnych konfiguracji.
- `product` zostaje jedynym źródłem prawdy o danych wspólnych (technika, galeria, opis, metraż), bez powielania.
- Skaluje się do dowolnej liczby standardów per producent, bez zmiany schematu przy kolejnym producencie.
- Sprawia, że pomylenie ceny jednego standardu z zakresem innego staje się niemożliwe na poziomie bazy, nie tylko niezalecane w konwencji aplikacji.

**Cons**:
- Realna migracja na żywych danych (88 opublikowanych produktów), z koniecznością backfillu i dwuprzebiegowego usunięcia starych kolumn.
- Strona odczytu (`lib/data/projects.ts`, strona szczegółów projektu) wymaga osobnej, późniejszej przebudowy, żeby w ogóle skorzystać z nowego kształtu; ta decyzja sama w sobie niczego klientowi jeszcze nie pokazuje.
- Trzy nowe tabele do utrzymania i rozumienia zamiast jednego płaskiego wiersza.

## Rationale

Wybrano Opcję 3, bo jest to jedyna z trzech, która czyni "najpilniejszą zmianę" z rekomendacji (cena i zakres zawsze razem, nigdy zmieszane między standardami) własnością samego schematu, a nie czymś, co ktoś może przeoczyć przy ręcznym wpisywaniu przez Neon MCP. Opcja 1 nie skaluje się do realnej liczby standardów u różnych producentów (potwierdzone różnicą między Castorem i Steel House w tym samym materiale badawczym) i nie ma miejsca na statusy pozycji kosztowych. Opcja 2 rozwiązuje tylko warstwę cenową kosztem powielenia całej reszty danych produktu i zepsucia listy wyników, którą dopiero co uporządkowano w spec 0026.

Inżynier w rozmowie projektowej potwierdził pełny zakres naraz (warianty, pozycje kosztowe, harmonogram, logistyka, gwarancja, rozróżnienie dokumentów) zamiast robić to etapami, właśnie dlatego że te elementy są ze sobą powiązane: harmonogram i pozycje kosztowe mają sens tylko przy konkretnym wariancie, więc budowanie samych wariantów bez miejsca na resztę oznaczałoby przebudowę migracji za miesiąc.

Mechanizm synchronizacji ceny (wyzwalacz w bazie, nie funkcja w kodzie aplikacji) wynika wprost z dzisiejszej rzeczywistości zapisu: dane wchodzą do bazy surowym SQL przez Neon MCP, nie przez kod, który mógłby wywołać funkcję pomocniczą. Ten sam wzorzec (logika w samej bazie, nie w warstwie aplikacji) jest już użyty w tym projekcie do dziennika zdarzeń (migracja 0002) i do kolumny wyszukiwania pełnotekstowego (spec 0026), więc to nie nowy wzorzec, tylko kontynuacja już przyjętej konwencji z `lib/db/AGENTS.md`.

Pierwsza wersja tego wyzwalacza miała lukę, znalezioną przez niezależne sprawdzenie krzyżowe tej specyfikacji: gdy żaden wariant nie był oznaczony jako domyślny, miał pokazywać najniższą i najwyższą cenę spośród wszystkich wariantów naraz, czyli dokładnie odtwarzać błąd Castora opisany w Context, tylko w nowej tabeli zamiast w starej. Poprawiona reguła (pusta cena zamiast zmieszanego zakresu, plus wymóg jednego polecenia SQL przy przełączaniu wariantu domyślnego) jest opisana w `index.md`, sekcja Feature design.

## References

Brak, zgodnie z wybranym poziomem odniesień dla tej rozmowy projektowej (bez sekcji Referencje, cały wywód zostaje w Rationale powyżej).
