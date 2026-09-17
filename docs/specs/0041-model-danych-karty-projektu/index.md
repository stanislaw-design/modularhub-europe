# 0041. Model danych pod nowy uklad karty projektu

**Date**: 2026-09-15
**Status**: Accepted

## Summary

Dzisiejsza baza pozwala jednemu produktowi mieć tylko jeden standard wykonania i jedną cenę naraz. To narzędzie nie oddaje tego, jak realnie sprzedają domy modułowi producenci: ten sam dom bywa oferowany w kilku standardach, każdy z własną, pełną ceną i zakresem. Ta decyzja dodaje nowe tabele (warianty produktu, pozycje kosztowe, etapy harmonogramu) i rozszerza kilka istniejących pól, tak żeby cena nigdy nie mogła być pokazana obok zakresu innego standardu. Dane nadal wpisujemy ręcznie przez Neon MCP, więc pilnowanie spójności ceny na liście wyników robi wyzwalacz w bazie, nie kod aplikacji.

## Context

Zobacz `rationale.md`.

## Requirements

**Historyjki użytkownika**:
- Jako klient przeglądający kartę projektu, chcę zobaczyć osobną, pełną parę cena i zakres dla każdego standardu wykonania, żeby nigdy nie założyć niższej ceny przy bogatszym zakresie.
- Jako klient, chcę wiedzieć dla każdej pozycji kosztowej (fundament, transport, wykończenie) czy jest w cenie, czy to obowiązkowa dopłata, opcja, czy leży po mojej stronie, żeby złożyć zapytanie ze świadomym budżetem.
- Jako klient, chcę widzieć harmonogram realizacji z etapami, czasem trwania i osobą odpowiedzialną za każdy etap, żeby wiedzieć czego się spodziewać po wysłaniu zapytania.
- Jako osoba prowadząca zespół sprzedaży, chcę żeby cena pokazywana na liście wyników zawsze zgadzała się z realnym, aktualnym wariantem domyślnym, nawet gdy dane wpisuje ktoś ręcznie przez Neon MCP.

**Kryteria akceptacji** (kontrakt, każde niezależnie sprawdzalne):
- **AC-1**: Jeden produkt może mieć więcej niż jeden nazwany wariant (standard wykonania), każdy z własnym zakresem cen; dwa warianty tego samego produktu nigdy nie mogą mieć tego samego standardu (wymuszone ograniczeniem unikalności).
- **AC-2**: Każda pozycja kosztowa należy do dokładnie jednego wariantu i zawsze niesie jeden z pięciu zdefiniowanych statusów (w cenie, obowiązkowa dopłata, opcja, po stronie klienta, do wyceny); status nigdy nie zostaje pusty.
- **AC-3**: Każdy etap harmonogramu (formalności, produkcja, transport, montaż, wykończenie) niesie czas trwania, punkt odniesienia startu i osobę odpowiedzialną, przypisany do jednego wariantu; co najwyżej jeden wiersz na etap na wariant.
- **AC-4**: Dokument (zdjęcie, rzut) może być przypisany do jednego, konkretnego wariantu albo zostać ogólny (dotyczy każdego wariantu tego produktu); dzisiejsza reguła "co najwyżej jedno zdjęcie okładkowe na produkt" działa bez zmian.
- **AC-5**: Cena pokazywana na produkcie (używana dziś przez filtr i sortowanie na liście wyników) zawsze odpowiada dokładnie wariantowi oznaczonemu jako domyślny; gdy żaden wariant nie jest domyślny lub produkt nie ma jeszcze żadnego wariantu, cena wraca do pustej (nigdy do zmieszanego zakresu z kilku standardów naraz). To działa niezależnie od tego, czy zapis pochodzi z przyszłego kodu aplikacji, czy z dzisiejszego ręcznego skryptu przez Neon MCP.
- **AC-6**: Kategoria produktu potrafi opisać przeznaczenie pod wynajem lub hotel, wartość której dziś nie ma żaden produkt w katalogu pilotażowym.
- **AC-7**: Wszystkie dzisiejsze 88 opublikowanych produktów zachowują dokładnie tę samą pokazywaną cenę, standard i czas produkcji/montażu zaraz po migracji, zanim jakikolwiek producent dostarczy bogatsze dane wielowariantowe.
- **AC-8**: Zbędne już płaskie pola na produkcie (standard wykonania, czas produkcji, czas montażu, lista rzeczy w cenie, lista rzeczy poza ceną, oraz druga, dziś równoległa para cenowa house_price_min/max_cents) znikają dopiero, gdy strona odczytu korzysta już z nowych tabel, nigdy w tym samym kroku co ich dodanie.
- **AC-9**: Dokument może być oznaczony jako prawdziwe zdjęcie z realizacji, odróżnione od wizualizacji lub zdjęcia marketingowego, tak żeby karta projektu mogła pokazać je w osobnej zakładce.

## Options considered

Zobacz `rationale.md`.

## Decision

**Wybrana opcja**: Opcja 3, nowa tabela wariantu produktu

Cena i zakres przenoszą się z płaskich pól na `product` do nowej tabeli `product_variant`, jeden wiersz na nazwany standard wykonania, z pozycjami kosztowymi i etapami harmonogramu podpiętymi pod konkretny wariant, nie pod cały produkt.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`)

## Rationale

Zobacz `rationale.md`.

## Feature design

**Nowe tabele**:

`product_variant` (jeden wiersz na nazwany standard wykonania danego produktu):

| Pole | Typ | Uwaga |
|---|---|---|
| id | uuid, klucz główny | |
| product_id | uuid, klucz obcy do product, wymagane, indeksowane | |
| completion_standard | ten sam enum co dziś na product (surowy zamknięty, deweloperski, pod klucz) | unikalne razem z product_id, ale tylko wśród wierszy z pustym deleted_at (indeks unikalności częściowej), żeby usunięty miękko wariant nie blokował na zawsze ponownego dodania tego samego standardu |
| variant_label | text, może być puste | opcjonalna własna nazwa producenta (np. Comfort, Premium+), gdy sam enum standardu nie oddaje jego marketingowej nazwy; enum zostaje jedynym polem używanym do reguł biznesowych i unikalności, ta etykieta jest czysto opisowa |
| price_min_cents, price_max_cents | integer, mogą być puste | |
| scope_summary | text, może być puste | krótki opis zakresu pod ceną |
| is_default | boolean, domyślnie false | co najwyżej jeden true na produkt wśród wierszy z pustym deleted_at, ograniczenie unikalności częściowej jak przy document.is_cover |
| sort_order | integer, może być puste | |
| created_at, updated_at | timestamp | |
| deleted_at | timestamp, może być puste | miękkie usuwanie, tak jak product i document |

Cena zostaje jednowalutowa na poziomie produktu (`product.currency`, bez zmian, żaden wariant nie dostaje własnej waluty): jeden producent nie wycenia tego samego domu w dwóch walutach naraz, a osobna waluta na wariant otworzyłaby drogę do miksowania walut przy jakimkolwiek zestawieniu więcej niż jednego wariantu.

Ograniczenie: `price_max_cents >= price_min_cents`, gdy oba pola są wypełnione (sprawdzenie na poziomie bazy, ten sam wzorzec co istniejące `product_family_subcategory_match`).

`cost_line_item` (pozycje kosztowe z pięcioma statusami, zawsze przy konkretnym wariancie, bo status często różni się między wariantami):

| Pole | Typ | Uwaga |
|---|---|---|
| id | uuid, klucz główny | |
| product_variant_id | uuid, klucz obcy, wymagane, indeksowane | |
| label | text, wymagane | wolny tekst, np. Fundament, bez wspólnego słownika na tym etapie |
| status | nowy enum `cost_line_item_status`: `w-cenie`, `obowiazkowa-doplata`, `opcja`, `po-stronie-klienta`, `do-wyceny` | |
| responsible_party | text, może być puste | np. nazwa producenta, klient, podwykonawca |
| sort_order | integer, może być puste | |
| created_at, updated_at | timestamp | |

`product_timeline_stage` (etapy realizacji, też per wariant, bo czas wykończenia zależy od standardu):

| Pole | Typ | Uwaga |
|---|---|---|
| id | uuid, klucz główny | |
| product_variant_id | uuid, klucz obcy, wymagane, indeksowane | |
| stage_key | nowy enum `product_timeline_stage_key`: `formalnosci`, `produkcja`, `transport`, `montaz`, `wykonczenie` | unikalne razem z product_variant_id |
| duration_min_days, duration_max_days | integer, mogą być puste | jedna wspólna jednostka (dni) zamiast dzisiejszej mieszanki tygodni i dni |
| starts_from_label | text, może być puste | np. od podpisania umowy, od gotowego fundamentu |
| responsible_party | text, może być puste | |
| sort_order | integer, może być puste | |
| created_at, updated_at | timestamp | |

Ograniczenie: `duration_max_days >= duration_min_days`, gdy oba pola są wypełnione.

Świadomy kompromis: etapy formalności, produkcja i transport realnie bywają identyczne między wariantami tego samego produktu (różni się głównie wykończenie), ale mimo to żyją per wariant, nie per produkt, żeby czas realizacji standardu pod klucz mógł być dłuższy bez sztucznego wyjątku. Oznacza to ręczne powielanie tych samych wartości przy wpisywaniu przez Neon MCP i ryzyko, że się rozjadą, jeśli ktoś zaktualizuje jeden wariant a zapomni o drugim; odnotowane wprost w Consequences.

**Zmiany w `product`**: usuwamy w drugim przebiegu migracji (dopiero po AC-8) `completion_standard`, `production_lead_time_weeks_min/max`, `on_site_assembly_days_min/max`, `price_includes`, `price_excludes`, oraz `house_price_min_cents`/`house_price_max_cents` (druga, dziś już istniejąca para cenowa obok `price_min_cents`/`price_max_cents`, używana w przykładowych danych na węższy zakres "sama konstrukcja domu"; ta sama logika wariantu ją zastępuje, więc nie ma powodu trzymać dwóch równoległych par cenowych). Kolumny `price_min_cents`, `price_max_cents` zostają, ale zmieniają rolę z pola wpisywanego wprost na pochodną wariantu domyślnego, utrzymywaną przez wyzwalacz opisany niżej; `currency` zostaje bez zmian, dalej wpisywana wprost, jedna na produkt. Dodajemy: `installation_warranty_years` (integer, może być puste), `service_scope_description` (text, może być puste), `transport_dimensions` (text, może być puste), `crane_requirements` (text, może być puste), `min_plot_width_m` (liczba rzeczywista, może być puste). Kolumna `structural_warranty_years` zostaje bez zmian.

**Zmiany w `document`**: dodajemy `product_variant_id` (uuid, klucz obcy, może być puste). Puste pole znaczy że dokument dotyczy każdego wariantu tego produktu. Dzisiejszy częściowy indeks unikalności na okładkę (`document_one_cover_per_product`) zostaje bez zmian, bo nadal działa na poziomie produktu.

**Zmiany enumów**: `product_category` dostaje nową wartość `wynajem-hotel` (dopisanie wartości, ten sam wzorzec co dodanie `de` do `product_translation_locale`, spec 0028). `document_purpose` dostaje nową wartość `product_realization_photo`, odróżnioną od dzisiejszego `product_photo` (który zostaje dla wizualizacji i zdjęć marketingowych).

**Wyzwalacz synchronizacji ceny**: nowy wyzwalacz Postgresa (ten sam wzorzec spoza DSL drizzle-kit co wyzwalacz dziennika zdarzeń z migracji 0002, opisany w `lib/db/AGENTS.md`) uruchamiany po każdym wstawieniu, zmianie lub usunięciu wiersza w `product_variant`. Przelicza `product.price_min_cents`, `product.price_max_cents` na podstawie wariantu z `is_default = true` i `deleted_at is null` dla danego produktu.

Sprawdzenie krzyżowe tej specyfikacji wykryło poważną wadę pierwszej wersji tej reguły: gdy żaden wariant nie był oznaczony jako domyślny, wyzwalacz miał brać najniższą i najwyższą cenę spośród wszystkich wariantów naraz. To dokładnie odtwarzałoby błąd Castora z Context (cena 207 000 obok zakresu 309 900), tylko przeniesiony do tej nowej tabeli. Poprawiona reguła: **gdy żaden wariant nie jest domyślny, `product.price_min_cents`/`price_max_cents` wracają do pustych, nigdy do zmieszanego zakresu z kilku standardów naraz.** Pusta cena na produkcie renderuje się dziś jako "wycena indywidualna" (`priceOnRequest`), co jest bezpiecznym stanem, nie mylącym.

Z tego samego sprawdzenia wynika druga poprawka: przełączenie, który wariant jest domyślny, to zmiana dwóch wierszy (zdjęcie flagi z jednego, ustawienie na drugim). Sterownik tego projektu (`drizzle-orm/neon-http`) nie obsługuje interaktywnych transakcji wielo poleceniowych, a dane wchodzą dziś surowym SQL przez Neon MCP, nie przez kod aplikacji. Dwa osobne polecenia UPDATE zostawiłyby na chwilę stan "żaden wariant nie jest domyślny", w którym powyższa reguła słusznie pokazałaby pustą cenę, ale to nadal niepotrzebne, unikalne ryzyko. **Kluczowy niezmiennik: przełączenie wariantu domyślnego jest zawsze jednym poleceniem SQL**, np. `UPDATE product_variant SET is_default = (id = '<nowy-domyslny-id>') WHERE product_id = '<id-produktu>'`, nigdy dwoma osobnymi poleceniami UPDATE. Jedno polecenie, jedno uruchomienie wyzwalacza, żadnego okna z brakiem domyślnego wariantu.

Wyzwalacz działa niezależnie od tego, czy wiersz wstawia surowy SQL przez Neon MCP, czy przyszły kod aplikacji, bo działa na poziomie samej bazy, nie na poziomie zapytania które go wywołało.

**Kluczowe niezmienniki**:
- `product_variant` ma co najwyżej jeden aktywny (nie usunięty miękko) wiersz na parę (product_id, completion_standard); wymuszone częściowym ograniczeniem unikalności, nie tylko konwencją aplikacji.
- `product_variant` ma co najwyżej jeden aktywny wiersz z `is_default = true` na produkt; ten sam wzorzec częściowego indeksu unikalności co `document.is_cover`.
- Przełączenie wariantu domyślnego z jednego na drugi jest zawsze jednym poleceniem SQL, nigdy dwoma osobnymi UPDATE (patrz Wyzwalacz synchronizacji ceny wyżej); ta zasada dotyczy każdego przyszłego sposobu zapisu, ręcznego i przez aplikację.
- `product_timeline_stage` ma co najwyżej jeden wiersz na parę (product_variant_id, stage_key).
- `cost_line_item.status` nigdy nie jest puste; aplikacja czytająca te dane nigdy nie zgaduje statusu z braku wartości.
- `product.price_min_cents`/`price_max_cents` nigdy nie są wpisywane wprost po tej zmianie, tylko czytane jako wynik wyzwalacza, i wracają do pustych (nie do zmieszanego zakresu) gdy produkt nie ma aktywnego wariantu domyślnego; każdy przyszły kod zapisu ma o tym pamiętać (odnotowane też w `lib/db/AGENTS.md` przy najbliższym `/sync`).
- Produkt bez żadnego wariantu (jeszcze nie zmigrowany albo z dziś pustym `completion_standard`, patrz Build plan krok 2) po prostu nie ma sekcji cena/zakres na karcie, tak samo jak dziś brakujące pole nie renderuje pustego miejsca (spec 0020 AC-4); nigdy zgadywany wariant.

**Powierzchnia dostępu do danych** (funkcje odczytu w `lib/data/projects.ts`, zgodnie z regułą AGENTS.md że dostęp do danych jest asynchroniczny; ten projekt nie ma osobnego API REST, strony App Router czytają te funkcje wprost):

| Funkcja | Zmiana | Kluczowe wejście | Kluczowe wyjście |
|---|---|---|---|
| `getProjectById` | rozszerzona | `id: string`, `locale: Locale` | `Project` z nowym polem `variants: ProjectVariant[]`, każdy wariant już zawiera własne `costLineItems` i `timelineStages`, jedno zapytanie z odpowiednimi złączeniami zamiast osobnych wywołań na każdą encję |
| `getProjects` | bez zmian w sygnaturze | jak dziś | dalej czyta `price_min_cents`/`price_max_cents` z `product`, teraz utrzymywane przez wyzwalacz zamiast wpisywane wprost; filtr i sortowanie ze spec 0026 działają bez przebudowy |

`lib/data/types.ts`: pole `Project.commercial` (dzisiejszy płaski obiekt) zostaje zastąpione przez `Project.variants: ProjectVariant[]`, gdzie `ProjectVariant` niesie `completionStandard`, `priceMin`, `priceMax`, `currency`, `scopeSummary`, `isDefault`, `costLineItems: CostLineItem[]`, `timelineStages: TimelineStage[]`. Sama przebudowa strony (`app/[locale]/(customer)/project/[id]/page.tsx`) i jej dzisiejszych odbiorców pola `commercial` zostaje osobnym, późniejszym `/develop`, poza zakresem tej decyzji, która kończy się na bazie i funkcji odczytu.

**Model bezpieczeństwa**: bez zmian względem dzisiejszego stanu. Wszystkie nowe tabele niosą dane produktowe i komercyjne, publiczne, bez danych osobowych; czytane bez logowania, tak jak dziś `product`. Zapis nadal wyłącznie ręczny przez Neon MCP na tym etapie (decyzja potwierdzona w rozmowie projektowej); formularz producenta do samodzielnego wpisywania wariantów to świadomie osobna, przyszła decyzja.

**Wymagana konfiguracja**: brak nowych zmiennych środowiskowych ani danych dostępowych.

**Krytyczne scenariusze testowe** (każdy odpowiada kryterium w Requirements):
- Happy path: produkt z trzema wariantami (surowy zamknięty, deweloperski, pod klucz), każdy z własną ceną, własnymi pozycjami kosztowymi i własnym harmonogramem, czytany jednym wywołaniem `getProjectById`, satisfies **AC-1**, **AC-2**, **AC-3**.
- Domyślna cena: zmiana `is_default` na inny wariant tego samego produktu natychmiast zmienia `product.price_min_cents`/`price_max_cents` widoczne na liście wyników, satisfies **AC-5**.
- Brak wariantu: świeżo dodany produkt bez żadnego wiersza w `product_variant` pokazuje puste pola ceny na liście wyników, nie zero, satisfies **AC-5**.
- Dokument ogólny kontra dokument wariantowy: zdjęcie z pustym `product_variant_id` pojawia się przy każdym wariancie, zdjęcie z wypełnionym polem tylko przy swoim wariancie, satisfies **AC-4**.
- Regresja backfillu: dla losowej próbki z 88 dzisiejszych produktów, cena i standard po migracji są identyczne z wartościami sprzed migracji, satisfies **AC-7**.
- Kolejność usuwania kolumn: próba usunięcia starych płaskich pól przed potwierdzeniem, że strona odczytu korzysta z nowych tabel, zostaje odrzucona w code review/checklist, satisfies **AC-8**.

## Build plan

Kolejność według podejścia Tracer Bullet tej epiki (`docs/scope/produkcja.md`, świadomie inne niż domyślny Facade projektu): najpierw najmniejszy realny, samodzielnie sprawdzalny kawałek (wariant plus wyzwalacz ceny), potwierdzony na żywych danych, dopiero potem grubsze warstwy.

1. Migracja: tabela `product_variant`, nowa wartość enuma `product_category`, wyzwalacz synchronizacji ceny (ręcznie wzbogacona migracja, ten sam wzorzec co wyzwalacz dziennika zdarzeń), satisfies **AC-1**, **AC-5**, **AC-6**.
2. Backfill przez Neon MCP: każdy z 88 żywych produktów dostaje dokładnie jeden wiersz w `product_variant` (z dzisiejszego standardu i ceny, oznaczony jako domyślny); potwierdzenie że cena na każdym z 88 produktów jest identyczna sprzed i po, satisfies **AC-5**, **AC-7**.
3. Migracja: tabele `cost_line_item` i `product_timeline_stage`; migracja dzisiejszych `price_includes`/`price_excludes` na pozycje kosztowe (rzeczy w cenie dostają status `w-cenie`, rzeczy poza ceną dostają status `do-wyceny` jako punkt startowy do potwierdzenia per producent, nigdy zgadywane jako obowiązkowa dopłata czy opcja); migracja dzisiejszych pól produkcji i montażu na etapy harmonogramu, formalności/transport/wykończenie zostają puste, satisfies **AC-2**, **AC-3**, **AC-7**.
4. Migracja: `product_variant_id` na `document` (może być puste), nowa wartość enuma `document_purpose` na zdjęcie z realizacji, nowe kolumny na `product` (gwarancja instalacji, zakres serwisu, wymiary transportowe, wymagania dźwigu, minimalna szerokość działki), satisfies **AC-4**, **AC-9**.

Zadania 1 do 4 to cały zakres tej decyzji: baza gotowa i zbackfillowana, zero zmiany w tym, co dziś widzi klient. Przebudowa strony odczytu (`lib/data/projects.ts`, `lib/data/types.ts`, `app/[locale]/(customer)/project/[id]/page.tsx`) i dopiero po niej usunięcie starych pól są świadomie wypchnięte poza ten Build plan, do jednego, sprzężonego zadania w Follow-up: sprawdzenie krzyżowe tej specyfikacji trafnie wskazało, że zmiana kształtu `Project.commercial` bez jednoczesnej przebudowy strony, która to pole czyta wprost, zepsułaby budowę TypeScript. Te dwa kroki muszą więc wejść w jednym `/develop`, nie w dwóch osobnych.

## Consequences

**Pozytywne**:
- Cena i zakres nie mogą się już strukturalnie rozjechać między standardami, dokładnie problem który research nazwał najpilniejszym do naprawienia.
- Schemat oddaje to, co producenci już dziś realnie robią (Castor ma dwie pełne oferty na jeden dom, Steel House ma trzy standardy), zamiast wymuszać spłaszczenie do jednej ceny.
- Cena na liście wyników i jej filtr/sortowanie ze spec 0026 działają bez przebudowy, dzięki wyzwalaczowi zamiast zmiany zapytania.

**Negatywne / kompromisy**:
- Trzy nowe tabele i ręcznie wzbogacona migracja z wyzwalaczem to więcej do utrzymania niż dzisiejsze płaskie pola; każdy przyszły ręczny skrypt przez Neon MCP musi teraz wypełnić cztery tabele zamiast jednego wiersza.
- Strona szczegółów projektu i jej dzisiejsi odbiorcy pola `commercial` nie zaczną korzystać z tych danych automatycznie; to osobny, późniejszy `/develop`, więc klient nic nie zobaczy zaraz po tej migracji.
- Etapy harmonogramu żyją per wariant, nie per produkt, więc formalności, produkcja i transport (zwykle identyczne między standardami tego samego domu) trzeba ręcznie powielić przy każdym wariancie; realne ryzyko, że ktoś zaktualizuje jeden wariant a zapomni o drugim.
- Wartości nowych enumów (`wynajem-hotel`, `product_realization_photo`) są już nieodwracalne po dodaniu, bo Postgres nie ma `DROP VALUE`; ryzyko niskie, bo obie wartości są jasno uzasadnione, ale warto to świadomie odnotować.

**Neutralne**:
- Wszystkie 88 żywych produktów dostaje mechanicznie wygenerowany, pojedynczy domyślny wariant identyczny z dzisiejszym stanem, dopóki ktoś ręcznie nie doda drugiego standardu dla danego domu.

## Follow-up

- [ ] Jedno, sprzężone zadanie `/develop`: przebudować `lib/data/projects.ts` (`getProjectById` na jedno zapytanie z zagnieżdżonym wynikiem), `lib/data/types.ts` (`Project.variants` zamiast `Project.commercial`) i `app/[locale]/(customer)/project/[id]/page.tsx` na nowe tabele, a zaraz po potwierdzeniu tego na żywo, w tym samym zadaniu, uruchomić drugi przebieg migracji usuwający siedem zbędnych pól z `product`. Nigdy dwa osobne zadania, bo w przerwie między nimi kod i schemat by się rozjechały.
- [ ] Przy backfillu (Build plan krok 2) spisać listę produktów pominiętych z powodu pustego `completion_standard` (jeśli takie w ogóle istnieją wśród 88 żywych rekordów) i przekazać do ręcznego potwierdzenia standardu, zamiast zgadywać.
- [ ] Otwarte do potwierdzenia: sprawdzenie krzyżowe tej specyfikacji zaproponowało przechowywanie pozycji kosztowych jako kolumny jsonb na `product_variant` (ten sam, już sankcjonowany w tym projekcie wzorzec co `product.technical_specs`, walidowany Zodem na granicy aplikacji) zamiast osobnej tabeli `cost_line_item`. Prostsze przy ręcznym wpisywaniu przez Neon MCP (jeden JSON zamiast N wierszy), kosztem możliwości niezależnego odpytania pozycji kosztowych między produktami, czego dziś nikt nie planuje. Ta specyfikacja zostaje przy osobnej tabeli (już potwierdzonej w rozmowie projektowej), ale warto to świadomie zweryfikować przed `/develop`, jeśli ręczne wpisywanie przez Neon MCP okaże się w praktyce zbyt uciążliwe.
- [ ] Wpisać tę funkcję do `docs/scope/produkcja.md` (dziś żaden wiersz scope nie obejmuje dokładnie tego zakresu; najbliższy, funkcja 10 "Treść i luki funkcjonalne klienta", obejmuje tylko certyfikaty/galerię/walutę, nie warianty/koszty/harmonogram) przy najbliższym `/scope` albo jako nowa pozycja.
- [ ] Przebudować `app/[locale]/(customer)/project/[id]/page.tsx` i każdego innego odbiorcę pola `project.commercial` pod nowy kształt `project.variants`, osobnym `/develop`, zanim ta zmiana stanie się widoczna dla klienta.
- [ ] Zaprojektować formularz producenta do samodzielnego wpisywania wariantów/pozycji kosztowych/harmonogramu, gdy ten model danych okaże się wystarczający na danych ręcznych (decyzja zamawiającego z tej rozmowy: najpierw dopracować, potem budować formularz).
- [ ] Modelowanie VAT/ceny brutto i pełna obsługa wielu walut zostają przy już zaplanowanych funkcjach 12 (realne płatności) i 14 (realny silnik zgodności); ta decyzja świadomie trzyma ceny tylko netto.
- [ ] Wspólny słownik typów pozycji kosztowych między producentami (dziś wolny tekst) do rozważenia dopiero, gdy pojawi się realna potrzeba porównania między producentami.
- [ ] `lib/db/AGENTS.md` warto rozszerzyć przy najbliższym `/sync` o notatkę, że `product.price_min_cents`/`price_max_cents`/`currency` są od tej migracji pochodną wyzwalacza, nigdy polem wpisywanym wprost.

## Migration plan

**Strategia**: stopniowa, w bezpiecznej kolejności (dodaj puste pola, wypełnij danymi, dopiero potem usuń stare pole), nie jednorazowa wielka zmiana. Stare płaskie pola na `product` zostają w pełni działające przez cały czas trwania kroków 1 do 5 z Build plan; usuwane są dopiero w kroku 6, osobnym, późniejszym przebiegu.

**Fazy**:
1. Migracja addytywna (kroki 1, 3, 4 z Build plan): nowe tabele, nowe kolumny, nowe wartości enumów, wyzwalacz. Zero wpływu na dzisiejsze odczyty, bo stare pola nadal istnieją i nadal są źródłem prawdy aż do backfillu. Kończy się tą specyfikacją.
2. Backfill przez Neon MCP (krok 2 i część kroku 3 z Build plan): 88 żywych produktów dostaje wiersze w nowych tabelach, zweryfikowane jeden do jednego względem dzisiejszych wartości; produkty z pustym `completion_standard` świadomie pomijane, nie zgadywane (patrz Follow-up). Kończy się tą specyfikacją.
3. Przebudowa odczytu i usunięcie starych pól razem, w jednym późniejszym `/develop` (poza zakresem tej specyfikacji, patrz Follow-up): `lib/data/projects.ts`, `lib/data/types.ts` i strona szczegółów projektu zaczynają czytać nowe tabele, a dopiero zaraz po potwierdzeniu tego na żywo, w tym samym przebiegu prac, stare pięć plus dwa pola znikają z `product`. Te dwa kroki są sprzężone celowo, żeby nigdy nie istniał stan, w którym stare pole zniknęło a kod je jeszcze czyta.

**Wycofanie**: fazy 1 i 2 są w pełni odwracalne, bo tylko dodają dane, nigdy nie zmieniają ani nie usuwają starych pól; w razie błędu backfillu wystarczy usunąć błędnie wstawione wiersze z nowych tabel i wykonać backfill ponownie (ograniczenie unikalności `product_id` plus `completion_standard` chroni przed dwukrotnym wstawieniem tego samego wariantu). Faza 4 (usunięcie kolumn) jest jedynym nieodwracalnym krokiem tej migracji i dlatego jest świadomie oddzielona i uzależniona od potwierdzenia fazy 3 na żywo.

**Ryzyka**: wartości nowych enumów (`wynajem-hotel`, `product_realization_photo`) nie da się cofnąć po dodaniu, bo Postgres nie ma polecenia usuwającego pojedynczą wartość enuma. Wyzwalacz synchronizacji ceny działa na poziomie bazy, więc zadziała nawet przy ręcznym zapisie przez Neon MCP, ale skrypt, który świadomie wyłącza wyzwalacze (rzadkie, ale możliwe w surowym SQL), po cichu przestałby aktualizować cenę na `product`; warto to sprawdzić przy każdym większym ręcznym imporcie. Przełączenie wariantu domyślnego dwoma osobnymi poleceniami UPDATE zamiast jednym (patrz Wyzwalacz synchronizacji ceny) chwilowo wyczyściłoby cenę na produkcie do pustej; niegroźne (produkt na chwilę pokazuje "wycena indywidualna"), ale niepotrzebne, więc reguła jednego polecenia jest tu twardym wymogiem, nie sugestią. Faza 3 usuwa pola nadal czytane przez dzisiejszy kod i dlatego jej dwie połowy (przebudowa odczytu, usunięcie pól) muszą wejść w tym samym `/develop`, nigdy osobno.
