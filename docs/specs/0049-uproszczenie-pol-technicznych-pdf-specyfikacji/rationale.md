# 0049. Rationale

## Context

Kreator projektu domu producenta (spec 0045) i asystent importu z PDF (spec 0047) zbierają dziś dziewięć osobnych pól technicznych: pięć w `product.technical_specs` (jsonb: wallBuildUp, insulation, windowClass, fireResistance, windResistance) i cztery jako zwykłe kolumny `product` (transportDimensions, craneRequirements, minPlotWidthM, serviceScopeDescription). Żadne z tych dziewięciu pól nie ma dziś filtra na stronie wyników klienta ani indeksu w bazie pod filtrowanie, w przeciwieństwie do trzech pól, które zostają bez zmian: heatSource, ventilation i heatTransferCoefficients (klasa energetyczna), wszystkie mają realne filtry na `/wyniki` i indeksy wyrażeniowe w bazie.

Test na żywo z realnym PDF producenta (sesja importu z 22 września 2026, produkt „HAVEN 218") pokazał wprost skalę problemu: asystent AI poprawnie wyciągnął pełny, czytelny opis tego, co obejmuje standard wykończenia, jako jeden akapit tekstu w polu `scope_summary` wariantu. Nikt nie musiał osobno decydować o dziewięciu polach technicznych, bo ten opis już je zawierał w naturalnej, czytelnej formie. Rozbijanie tej samej treści na dziewięć osobnych, klikalnych decyzji w ekranie przeglądu (a wcześniej, w ręcznym kreatorze, na dziewięć osobnych pól formularza) nie dodaje żadnej wartości ani producentowi, ani klientowi, tylko mnoży liczbę kroków do wykonania.

Zamawiający wprost porównał obecny stan („nawet z tym asystentem mam wrażenie że proces dodawania projektu jest zbyt skomplikowany") i wskazał kierunek: te pola mają zniknąć z obu miejsc (kreator i strona produktu), a ich rolę ma przejąć plik PDF do pobrania, tak jak dziś działają rzuty architektoniczne (`document.purpose = 'product_floor_plan'`, spec 0031).

## Options considered

### Opcja 1: Ukryj pola w UI, zostaw dane w bazie, dodaj PDF specyfikacji

Dziewięć pól znika z kreatora, z katalogu pól AI i ze strony produktu, ale kolumny i klucze jsonb w bazie zostają w schemacie nietknięte. Nowa, niezależna zdolność: jeden plik PDF na produkt, ten sam wzorzec co rzuty architektoniczne.

**Pros**:
- Odwracalne bez migracji, gdyby te pola okazały się jednak potrzebne (np. do przyszłego filtra).
- Zero ryzyka utraty danych dla istniejących produktów, zero backfillu do napisania i przetestowania.
- Mała, jasno ograniczona zmiana: katalog pól, jeden krok kreatora, dwa komponenty strony klienta, jedna nowa, dobrze doprecedowana zdolność uploadu.

**Cons**:
- Schemat bazy i Zod nadal formalnie „wie" o dziewięciu polach, których nikt nie zbiera; ktoś nowy w kodzie może się zdziwić, czemu istnieją martwe kolumny.
- Dwa równoległe źródła informacji technicznej (trzy pola strukturalne na stronie plus PDF gdzie indziej) mogą wyglądać niespójnie dla klienta, jeśli producent nie wgra PDF.

### Opcja 2: Zwiń dziewięć pól w jedno pole opisowe zamiast usuwać

Zamiast usuwać pola całkowicie, zastąp je jednym wspólnym polem tekstowym „opis techniczny", które producent wypełnia ręcznie lub AI proponuje jako jeden akapit. Bez nowej zdolności PDF.

**Pros**:
- Zachowuje pełną kontrolę tekstową bez konieczności budowania osobnej ścieżki uploadu plików.
- Prostszy model danych: jedno pole tekstowe zamiast dziewięciu.

**Cons**:
- Nie rozwiązuje realnego zaobserwowanego przypadku: PDF-y producentów już zawierają gotowy, sformatowany opis (tabele, akapity), a przepisywanie go w jedno pole tekstowe w kreatorze to dodatkowa, zbędna praca zamiast żadnej.
- Traci możliwość podania klientowi oryginalnego dokumentu producenta (np. z rysunkami, tabelami), które zwykłe pole tekstowe nie odda.

### Opcja 3: Pełne usunięcie z bazy plus PDF specyfikacji

Migracja usuwająca cztery kolumny `product` i pięć kluczy z `technical_specs` dla wszystkich wierszy, razem z nową zdolnością PDF.

**Pros**:
- Najczystszy docelowy schemat bazy, bez martwych, niezbieranych już pól.

**Cons**:
- Nieodwracalne bez oddzielnej kopii zapasowej: gdyby jednak okazało się, że te dane są komuś potrzebne (np. producent zapytał o swoje stare dane), nie da się ich odzyskać bez przywracania z backupu.
- Wymaga migracji zmieniającej dane na 65 realnych produktach produkcyjnych, przy braku jakiejkolwiek presji, żeby to zrobić teraz (nikt nie zgłosił, że te martwe kolumny przeszkadzają operacyjnie).

## Rationale

Opcja 1 wygrywa, bo dokładnie odpowiada temu, co pokazał realny test (sekcja Context): treść tych dziewięciu pól i tak żyje jako jeden naturalny opis w PDF producenta i w polu `scope_summary`, więc osobne pola formularza nie dodają wartości, tylko kroki do klikania. Zostawienie danych w bazie (zamiast Opcji 3) to bezpośrednie zastosowanie zasady „migracja produkcyjna wymaga bezpiecznej sekwencji": nic dziś nie wymusza usuwania danych 65 realnych produktów, a zrobienie tego teraz dodaje nieodwracalne ryzyko bez żadnej korzyści operacyjnej. Opcja 2 (jedno pole opisowe) odpada, bo zamawiający chce PDF konkretnie po to, żeby uniknąć przepisywania gotowego dokumentu producenta w jakiekolwiek pole tekstowe kreatora, strukturalne czy nie.
