# 0062. Rationale: tablica ogłoszeń B2B

## Context

Spec 0037 zbudowało model danych dla dużych zamówień B2B (`project_request`, `bulk_product_inquiry`, `project_quote`) i serwerowe funkcje do składania zapytań, wycen i akceptacji. Spec 0038 dołożyło pierwsze widoczne wejście: formularz `/project-request`, ekran przeglądania `/verified-manufacturers` i automatyczne dopasowanie zapytania do zweryfikowanych wolumenowo producentów po kraju dostawy (`autoTargetProducers`, push).

Dziś, mimo że backend wycen jest gotowy i przetestowany, nie istnieje żaden ekran, na którym producent mógłby zobaczyć przypisane mu zapytania i złożyć wycenę, żaden ekran admina do zarządzania tym lejkiem, i żaden ekran klienta do przeglądania otrzymanych wycen. Zapytanie trafia do bazy, zostaje dopasowane, i tam kończy jego droga.

Push ma też węższy problem: dopasowuje tylko producentów, którzy już dziś deklarują dostawę do kraju zapytania (`producerDeliveryCountry`). To wyklucza producenta, który mógłby zrealizować zamówienie na indywidualne zlecenie, mimo że nie ma jeszcze wiersza dostawy do tego kraju, i wyklucza każdego nowego producenta zweryfikowanego po tym, jak dane zapytanie zostało już dopasowane raz, przy wysłaniu.

W rozmowie z inżynierem rozważono też model, w którym ModularHub Europe ręcznie decyduje, któremu producentowi przekazać każde zapytanie (push ręczny, model konsjerża). Odrzucono go: nie skaluje się poza garstkę producentów, wprowadza człowieka jako pojedynczy punkt awarii w każdym leadzie, i duplikuje pracę, którą już wykonuje `producer_capacity_profile.volumeVerificationStatus` jako filtr jakości producenta.

Osobny wątek dotyczył ochrony przed pominięciem platformy przez strony transakcji. Ustalono, że tożsamość producenta jest już publiczna (`/verified-manufacturers`, `/project/[id]` pokazują realną nazwę firmy), więc chowanie jej nie jest już opcją. Natomiast dane kontaktowe inwestora nigdy nie muszą być ujawnione producentowi przed realnym zainteresowaniem obu stron, a to jest coś, co platforma faktycznie kontroluje i co już częściowo robi dzisiejszy kod (`submitProjectQuote` nie zwraca kontaktu wołającemu).

## Options considered

### Option 1: Ręczne, kuratorowane przekazywanie zapytań (push ręczny)

Administrator przegląda każde nowe zapytanie i osobiście decyduje, którym zweryfikowanym producentom je przekazać.

**Pros**:
- Pełna kontrola nad trafnością dopasowania na starcie, gdy producentów jest mało.

**Cons**:
- Nie skaluje się: każdy nowy producent i każde nowe zapytanie mnoży pracę jednej osoby.
- Administrator staje się pojedynczym punktem awarii całego lejka (urlop, choroba, przeciążenie).
- Duplikuje filtr jakości, który już istnieje (`volumeVerificationStatus`).

### Option 2: Zostać przy automatycznym push po kraju dostawy (status quo)

Nic nie budować, zostać przy dzisiejszym `autoTargetProducers`.

**Pros**:
- Zero nowej pracy.

**Cons**:
- Nie daje producentowi żadnego ekranu do zobaczenia zapytania i złożenia wyceny; to ten właśnie problem ta funkcja ma rozwiązać.
- Wyklucza producentów bez wiersza `producerDeliveryCountry` dla danego kraju, mimo że mogliby zrealizować zamówienie na indywidualne zlecenie.
- Dopasowanie liczy się raz, przy wysłaniu; producent zweryfikowany później nigdy nie zobaczy starszych zapytań.

### Option 3: Otwarta tablica ogłoszeń (pull), zastępująca push całkowicie

Każdy producent z `volumeVerificationStatus = approved` widzi wszystkie otwarte zapytania na jednym ekranie i może złożyć wycenę na każde z nich, niezależnie od kraju dostawy czy posiadania pasującego produktu w katalogu. Push (`autoTargetProducers`, `project_request_target_producer`) zostaje usunięty.

**Pros**:
- Skaluje się z liczbą producentów bez pracy administratora.
- Producent może odpowiedzieć na zapytanie z kraju, do którego formalnie nie dostarcza jeszcze, ale jest w stanie zrealizować na indywidualne zlecenie, zgodnie z tym jak inżynier opisał rzeczywistą elastyczność produkcji seryjnej.
- Nowy, zweryfikowany producent od razu widzi całą historię otwartych zapytań, nie tylko te wysłane po jego weryfikacji.

**Cons**:
- Traci sygnał trafności (kraj dostawy); producent musi sam ocenić, czy zapytanie ma sens dla niego.
- Usuwa dane historyczne (`project_request_target_producer`) przy migracji.

### Option 4: Push i pull razem (hybryda)

Push nadal dopasowuje po kraju i oznacza zapytanie jako "dla Ciebie", a tablica dodatkowo pokazuje wszystkie otwarte zapytania.

**Pros**:
- Zachowuje sygnał trafności tam, gdzie jest dostępny, nie zamykając drogi do szerszego rynku.

**Cons**:
- Dwa równoległe mechanizmy do utrzymania (dwa źródła prawdy o tym, kto widzi co) dla korzyści, która przy dzisiejszej garstce producentów jest czysto kosmetyczna.
- Prosta tablica w pełni pokrywa to, czego potrzebuje dzisiejsza skala; hybryda to złożoność pod problem, którego jeszcze nie ma.

## Rationale

Option 3 wygrywa, bo rozwiązuje realny, dziś istniejący problem (zero ekranu producenta) bez wprowadzania nowego punktu awarii (Option 1) i bez trzymania sztucznego ograniczenia kraju dostawy jako twardego warunku widoczności (Option 2), skoro inżynier wprost opisał, że brak dzisiejszej dostawy do kraju nie oznacza braku zdolności do realizacji na indywidualne zlecenie. Option 4 broniłaby sygnału trafności, ale przy jednym dzisiejszym zweryfikowanym producencie (Budman House) ta korzyść jest czysto teoretyczna, a koszt (dwa równoległe mechanizmy widoczności) jest już dziś realny do zbudowania i utrzymania. Zgodnie z regułą projektu "nie budować pod problem, którego nie ma" (Facade/Tracer Bullet, `AGENTS.md`), Option 3 jest właściwym wyborem na tę skalę, z filtrem kraju jako jawnie odłożonym Follow-up, gdy liczba producentów i zapytań realnie urośnie.

Maskowanie kontaktu inwestora do momentu akceptacji wyceny (nie: moderacja treści, nie: ukrywanie tożsamości producenta) jest mechanizmem ochrony przed pominięciem platformy, który faktycznie da się zbudować i utrzymać, bo nie wymaga ludzkiego osądu per zapytanie czy per oferta: to jedna reguła odczytu (nigdy nie zwracaj kontaktu producentowi) plus jeden punkt w cyklu życia wyceny (ujawnij przy akceptacji), zamiast kolejki recenzji.
