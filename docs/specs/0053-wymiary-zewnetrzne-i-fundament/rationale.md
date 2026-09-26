# 0053. Rationale: Wymiary zewnętrzne i wymagania fundamentowe w kreatorze producenta

## Context

Zgłoszenie wyszło od zrzutu ekranu karty projektu klienta: sekcja logistyki pokazuje "External dimensions" i "Foundation requirements", oba ze statusem "TO BE COMPLETED". Weryfikacja w kodzie potwierdziła: `Project.externalDimensions`/`foundationOptions` (`lib/data/types.ts`) to pola wymagane w typie widocznym klientowi, `product.external_dimensions`/`foundation_options` (`lib/db/schema.ts`) to kolumny istniejące od spec 0018, ale żaden plik w `components/producent/`, `lib/producer-project-draft.ts`, `lib/producer-product-actions.ts` ani `lib/db/queries.ts` ich nie dotyka. Sam schemat bazy niesie o tym komentarz z 2018: "Pola obecne tylko w dzisiejszym fixture Project, których kreator producenta jeszcze nie zbiera: nullable, wypełniane później (patrz spec 0018 Follow-up)".

Trzy kolejne duże przebudowy kreatora (spec 0045, 0049, 0050) rozbudowały kreator o dziesiątki innych pól (warianty, układ pomieszczeń, FAQ, logistyka, tłumaczenia), ale żadna nie podjęła akurat tego follow-upu. Spec 0050 (AC-1) nawet opisuje krok "Dane podstawowe" jako zawierający "wymiary zewnętrzne", zakładając, że pole już tam jest, choć w kodzie go nie ma, co sugeruje, że luka po prostu umknęła uwadze przy kilku kolejnych rundach projektowania, nie że była świadomie odkładana.

Krok "Dane techniczne" ma dziś ugruntowaną sekcję logistyki (gwarancja konstrukcyjna, dawniej też wymiary transportowe i wymagania żurawia, usunięte spec 0049 na rzecz jednego PDF specyfikacji) — dokładnie tej klasy pole, krótki, deklaratywny tekst producenta bez żadnej reguły wyliczającej. Produkt ma też ugruntowany, generyczny mechanizm tłumaczenia dowolnego worka krótkich tekstów (`generateProjectItemTranslations`, `lib/ai/product-translation.ts`), używany dziś przez opis, nazwy pomieszczeń, pytania FAQ i własne pozycje "Co musi zapewnić klient" — zapisywany w `product_translation`, per (produkt, locale).

Zakres tej decyzji: tylko dwa pola z pierwotnego follow-upu spec 0018 (`externalDimensions`, `foundationOptions`), zgodnie z tym, co zgłoszenie faktycznie pokazało. Pozostałe pola z tej samej starej listy (`roofType`, `constructionSystem`, `customizationScope`, częściowo `rooms`/`bedrooms`/`bathrooms`/`storeys`) zostają poza zakresem, zaznaczone w Follow-up głównego pliku.

## Options considered

Silnik problemu miał trzy niezależne osie decyzyjne (czy pola są wymagane, czy `foundationOptions` ma tłumaczenia, czy `externalDimensions` jest wolnym tekstem czy strukturą), przepytane osobno z zamawiającym. Poniższe opcje pokazują skrajne, kompletne alternatywy wobec wybranej kombinacji.

### Option 1: Pola opcjonalne, wolny tekst, `foundationOptions` tłumaczone (wybrane)

Oba pola jako zwykłe, opcjonalne pola tekstowe w miejscach, gdzie schemat i poprzednie specyfikacje już je koncepcyjnie umieściły; `foundationOptions` dostaje pełne EN/NL/DE przez już istniejący generyczny mechanizm tłumaczeń.

**Pros**:
- Spójne z każdym sąsiednim polem tej samej sekcji logistyki (`installationWarrantyYears`, dawne `serviceScopeDescription`/`transportDimensions`), żadne z nich nie blokowało zapisu.
- Zero nowej infrastruktury: kolumny na `product` już istnieją, tłumaczenie reużywa mechanizmu zbudowanego dla `roomLayout`/`faq`/`clientRequirements`.
- `foundationOptions` (zdanie opisowe, różne u różnych producentów) staje się czytelne dla klienta na każdym locale, nie tylko po polsku.

**Cons**:
- Nic nie wymusza wypełnienia, więc nowe produkty też mogą zostać z placeholderem, jeśli producent pominie te pola.
- `foundationOptions` nie dostaje osobnego mechanizmu "własność AI vs producenta" (`ai_generated_*`), inaczej niż `description`.

### Option 2: Pola wymagane (blokujące zapis/przejście dalej)

Ten sam zakres co Opcja 1, ale z walidacją wymagalności, tak jak dziś ma `structuralWarrantyYears`.

**Pros**:
- Gwarantuje, że żaden nowo utworzony lub zaktualizowany produkt nie zostawia klienta z placeholderem.

**Cons**:
- Niespójne z resztą sekcji logistyki tego samego kroku, gdzie wszystkie pozostałe pola są opcjonalne.
- Blokuje istniejący workflow producenta: produkt, który dziś da się zapisać i opublikować bez tych pól, nagle by tego wymagał, bez żadnego okresu przejściowego.
- Odrzucone przez zamawiającego wprost w rundzie pytań.

### Option 3: `externalDimensions` jako strukturalne pola liczbowe (szerokość/długość/wysokość)

Zamiast jednego pola tekstowego, trzy osobne pola liczbowe.

**Pros**:
- Bardziej strukturalne dane, teoretycznie możliwe do filtrowania/sortowania w przyszłości.

**Cons**:
- Wymaga zmiany kolumny `product.external_dimensions` z `text` na strukturę (albo trzech nowych kolumn), migracja nietrywialna dla już zapisanych wartości fixture (`"13,5 × 8,0 m"`, `"6,0 × 3,4 m"`).
- Kształt różni się per rodzina produktu: dom/spa to 2D (szerokość×długość), kontener bywa 3D (plus wysokość) — struktura wymagałaby osobnej logiki per rodzinę, nieproporcjonalnej do zakresu tego zgłoszenia.
- Odrzucone przez zamawiającego wprost w rundzie pytań.

### Option 4: `foundationOptions` bez tłumaczeń, jedna wspólna wartość

Ten sam zakres co Opcja 1, ale `foundationOptions` zostaje jednym polem bez wariantów EN/NL/DE, tak jak dawne `serviceScopeDescription`/`transportDimensions`.

**Pros**:
- Mniejsza migracja (bez nowej kolumny na `product_translation`), mniejszy krok "Tłumaczenia".
- Spójne z resztą pól logistyki, z których żadne nie miało tłumaczeń.

**Cons**:
- `foundationOptions` to zdanie opisowe (nie krótki fragment logistyczny jak `transportDimensions`), więc bez tłumaczenia odtwarza dokładnie ten sam rodzaj luki, który ta specyfikacja ma zamknąć, tylko w mniejszej skali: klient na `/en`/`/nl`/`/de` widziałby surowy polski tekst.
- Odrzucone przez zamawiającego wprost w rundzie pytań.

## Rationale

Zamawiający wybrał wprost: pola opcjonalne (Opcja 2 odrzucona), `externalDimensions` jako wolny tekst (Opcja 3 odrzucona), `foundationOptions` z tłumaczeniami (Opcja 4 odrzucona), istniejące produkty bez mechanizmu przypomnienia w tym zakresie. Opcja 1 to dokładnie ta kombinacja.

Za tym wyborem stoi też spójność z tym, co kreator już robi: sekcja logistyki kroku technicznego istnieje właśnie po to, żeby zbierać krótkie, opcjonalne, deklaratywne pola producenta (Context), a mechanizm tłumaczeń per pozycja istnieje właśnie po to, żeby dowolny nowy kawałek opisowego tekstu produktu dostawał EN/NL/DE bez budowania niczego nowego. Umieszczenie `externalDimensions` w kroku "Dane podstawowe" (nie w logistyce) wynika wprost z tego, jak spec 0050 (AC-1) i komentarz schematu bazy już to pole klasyfikują, obok metrażu, liczby kondygnacji i innych podstawowych wymiarów produktu, a nie obok deklaracji logistycznych jak `foundationOptions`.

## References

Bez sekcji References na życzenie zamawiającego (poziom "bez linków"). Pełne uzasadnienie powyżej.
