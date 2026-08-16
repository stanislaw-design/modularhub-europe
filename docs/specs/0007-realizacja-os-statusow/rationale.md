# Rationale: 0007 realizacja, oś statusów zamówienia

## Context

Klient akceptujący ofertę wiążącą (funkcja 9, `BindingOfferView`) trafia dziś w ślepy zaułek: po kliknięciu „Zaakceptuj ofertę” widzi tylko tekst zastępczy „Śledzenie realizacji (produkcja, transport, montaż, odbiór) pojawi się tutaj w kolejnym etapie” i nigdzie dalej nie prowadzi.

W modelu danych nie istnieje żadna encja reprezentująca postęp zamówienia. `docs/design.md` wprost odnotowuje to jako świadomie odłożone: „an order/status entity for the fulfilment timeline (screens 10, 16)”. Istniejący `StatusPill` komunikuje inny rodzaj statusu, jeden z trzech wykluczających się wyników (dopuszczone/warunkowo/niedopuszczone), nie sekwencję uporządkowanych w czasie etapów, gdzie kilka etapów jest jednocześnie „prawdziwych” (ukończone) naraz, a tylko jeden jest „teraz”.

Na tym etapie Facade nic nie jest trwale zapisywane i nie ma logowania (`docs/scope/scope.md`), więc postęp zamówienia dla celów demo musi być danymi mockowymi przypisanymi na sztywno do projektu, tym samym wzorcem co `eligibility.ts` i `plot-analysis.ts`.

`docs/scope/scope.md` (funkcja 10) wprost zaznacza, że ten ekran „ustala wzorzec osi statusu używany też u producenta” (funkcja 16, ten sam wzorzec osi statusu ma wyglądać spójnie z widokiem klienta dla tego samego zamówienia). Kształt przyjęty tutaj staje się więc kształtem, który odziedziczy tamten przyszły ekran.

## Options considered

### Option 1: Reużyj `StatusPill` per etap, bez nowego komponentu

Każdy z pięciu etapów renderowany jako osobny `StatusPill` (z przeznaczonymi na nowo etykietami zamiast dopuszczone/warunkowo/niedopuszczone), ułożone jeden pod drugim, z datą i listą dokumentów pod spodem. Zero nowego komponentu do zaprojektowania.

**Pros**:
- Najszybsze do zbudowania, żadnego nowego komponentu wizualnego.

**Cons**:
- `docs/design.md` (sekcja 7) traktuje kolory statusu jako zarezerwowany, osobny język znaczeniowy, nigdy dekoracyjny; przeznaczanie na nowo `approved`/`conditional`/`blocked` do oznaczenia pozycji w sekwencji (ukończony/aktualny/nadchodzący) to niezgodne semantycznie użycie tego samego komponentu do dwóch różnych rodzajów statusu.
- Brak jakiegokolwiek wizualnego sygnału sekwencji (to są uporządkowane w czasie kroki jednej ścieżki, nie trzy wykluczające się wyniki); same osobne pigułki tego nie oddają.

### Option 2: Nowy współdzielony komponent `StageTimeline` w `components/ui/`

Nowy, ogólny, prezentacyjny komponent bazowy: przyjmuje uporządkowaną listę etapów (etykieta, status ukończony/aktualny/nadchodzący, opcjonalna data, opcjonalne dokumenty) i nic nie wie o realizacji domów. Ten ekran go konsumuje z danymi klienta; funkcja 16 (producent) skonsumuje go później z własnymi danymi tego samego zamówienia.

**Pros**:
- Dokładnie odpowiada wprost nazwanej w `docs/scope/scope.md` przyszłej potrzebie (funkcja 16 ma wyglądać spójnie z tym ekranem dla tego samego zamówienia); to nie spekulacyjna abstrakcja, tylko już znane, konkretne powtórne użycie.
- Trzyma zarezerwowany język `StatusPill` nietknięty; nowy komponent ma własny, osobny język wizualny dla sekwencji etapów.

**Cons**:
- Odrobinę więcej pracy projektowej niż wersja jednorazowa: komponent musi być na tyle ogólny, żeby dało się go użyć bez zmian również po stronie producenta.

### Option 3: Komponent tylko dla tego ekranu, w `components/klient/`

`FulfillmentTimeline` zbudowany wyłącznie na potrzeby tej strony, bez ambicji współdzielenia; funkcja 16 zbuduje swój własny, osobny komponent osi statusów, gdy przyjdzie na nią kolej.

**Pros**:
- Najprostszy zakres tej jednej specyfikacji, żadnych założeń o przyszłym użyciu.

**Cons**:
- Prosto koliduje z wyraźnym zapisem w `docs/scope/scope.md`, że funkcja 16 ma wyglądać spójnie z tym ekranem; realizacja tej opcji oznacza, że ktoś odtworzy ten sam wzorzec wizualny drugi raz od zera albo dwa ekrany rozjadą się wizualnie.

## Rationale

Option 2 wygrywa, bo `docs/scope/scope.md` już dziś, zanim funkcja 16 dostanie własną specyfikację, nazywa wprost to samo powtórne użycie: „ten sam wzorzec osi statusu co w kroku klienta”. To nie jest hipotetyczna przyszła potrzeba, którą trzeba by zgadywać, tylko udokumentowany fakt, więc zbudowanie współdzielonego, ogólnego komponentu teraz nie jest przedwczesną abstrakcją w rozumieniu `AGENTS.md` („nie projektuj pod hipotetyczne przyszłe wymagania”), tylko odpowiedzią na już zapisane wymaganie.

Option 1 odpada, bo `docs/design.md` (sekcja 7) traktuje trzy kolory statusu `StatusPill` jako zarezerwowany, wąsko zdefiniowany język (dopuszczone/warunkowo/niedopuszczone), nigdy dekoracyjny ani przeznaczany na nowo. Użycie go do oznaczenia pozycji w sekwencji złamałoby tę zasadę, a przy okazji nie dałoby żadnego wizualnego sygnału, że te pięć elementów to uporządkowana ścieżka, nie trzy niezależne wyniki.

Option 3 byłby uzasadniony, gdyby przyszłe użycie u producenta było niepewne, ale nie jest: to samo `scope.md` już dziś każe funkcji 16 wyglądać spójnie z tym ekranem. Budowanie osobnego komponentu tylko po to, żeby go potem zduplikować albo migrować, to więcej pracy w sumie niż zaprojektowanie jednego ogólnego komponentu od razu.
