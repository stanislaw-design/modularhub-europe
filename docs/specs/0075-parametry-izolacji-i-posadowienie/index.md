# 0075. Parametry izolacji przegród, status posadowienia i planowane użytkowanie

**Date**: 2026-10-24
**Status**: In Progress

## Summary

Dziś strona produktu nie ma żadnej liczby izolacyjności (jest tylko klasa energetyczna A+ do D), więc klient i producent nie mają jak porównać domów pod kątem przepisów DE, BE, NL, IT i FR. Ta decyzja dodaje nową tabelę z liczbami U, Rc, Uw i Ug dla przegród (z metodą, datą i stanem potwierdzenia), pole "posadowienie stałe albo tymczasowe" na produkcie oraz pole "planowane użytkowanie" w zapytaniach klienta. Obok każdego parametru strona tłumaczy po ludzku, co on znaczy. Platforma pokazuje tylko to, co producent zadeklarował albo administrator potwierdził, i nigdy nie pisze, że dom "spełnia przepisy kraju X".

## Requirements

**User stories**:
- Jako inwestor porównujący domy, chcę zobaczyć liczby izolacyjności ścian, dachu, podłogi i okien oraz wiedzieć, co one znaczą, żeby ocenić dom bez wiedzy technicznej.
- Jako inwestor, chcę wiedzieć, czy liczba jest tylko deklaracją producenta, czy potwierdziła ją platforma, i z jakiego dnia pochodzi.
- Jako inwestor składający zapytanie, chcę podać, czy dom będzie używany cały rok, czy sezonowo, żeby producent odpowiedział z uwzględnieniem przepisów kraju.
- Jako producent, chcę wpisać parametry mojego domu w panelu, bez przechodzenia kreatora od nowa.
- Jako administrator, chcę potwierdzić albo cofnąć potwierdzenie parametru oraz wpisać dane przekazane mi przez producenta.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Nowa tabela `product_envelope_parameter` ma pola: `id` (uuid), `product_id` (FK na `product`, kasowanie kaskadowe), `element` (enum `wall`, `roof`, `floor_ground`, `floor_air`, `window`, `glazing`, `door`), `quantity` (enum `u_value`, `rc_value`), `value` (numeric(6,3), większe od 0), `method` (enum `calculation`, `lab_test`, `manufacturer_declaration`), `method_note` (opcjonalny tekst, do 300 znaków), `as_of_date` (date, wymagana), `created_at`, `updated_at`. Unikat na (`product_id`, `element`, `quantity`).
- **AC-2**: CHECK w bazie: dla `window`, `glazing` i `door` dozwolone jest tylko `u_value` (to odpowiednio Uw, Ug i Ud). Dla `wall`, `roof`, `floor_ground` i `floor_air` dozwolone jest `u_value` albo `rc_value`. Zakres wartości: `u_value` od 0,05 do 6, `rc_value` od 0,1 do 20.
- **AC-3**: Tabela ma to samo potwierdzenie co `producer_certification` (spec 0065 AC-1): `confirmation_status` (`self_reported` albo `platform_confirmed`, domyślnie `self_reported`), `confirmed_at`, `confirmed_by` (FK na `users`, ON DELETE RESTRICT), `version` (int, domyślnie 1, rośnie w każdym `UPDATE`) oraz ten sam CHECK `confirmationConsistent`. Nowa tabela dostaje trigger `audit_log_capture` (wzorzec `drizzle/0048`).
- **AC-4**: Parametry przegród można dodać tylko do produktów rodziny `dom` albo `kontenery-modulowe` z podkategorią `mieszkalne`. Akcja serwerowa odrzuca każdą inną rodzinę. Baza tego nie wymusza (CHECK nie widzi innej tabeli), więc to jedyne miejsce kontroli i ma własny test.
- **AC-5**: Tabela `product` dostaje kolumnę `foundation_status` (nowy enum `permanent`, `temporary`, nullable, puste znaczy "nie podano"). CHECK: wartość może być ustawiona tylko gdy `family = 'dom'` albo (`family = 'kontenery-modulowe'` i `container_subcategory = 'mieszkalne'`). Kategoria `product.category` (w tym `mobilny`) zostaje bez zmian i nie jest powiązana z tym polem. Każdy zapis produktu, który zmienia rodzinę albo podkategorię kontenera, czyści `foundation_status` w tej samej instrukcji `UPDATE`, żeby CHECK nie zwrócił użytkownikowi surowego błędu bazy. Odczyt strony i porównania pokazuje parametry przegród tylko dla produktów z AC-4, niezależnie od tego, czy wiersze istnieją.
- **AC-6**: Tabele `inquiry`, `project_request` i `bulk_product_inquiry` dostają dwie nullable kolumny: `intended_use` (nowy enum `year_round`, `seasonal`) i `intended_use_months` (int od 1 do 11). CHECK: `intended_use_months` może być ustawione tylko gdy `intended_use = 'seasonal'`. Istniejące wiersze zostają z `NULL`.
- **AC-7**: Trzy formularze zapytania (zwykłe zapytanie, zapytanie projektowe B2B, zapytanie hurtowe o jeden produkt) pokazują nieobowiązkowy wybór "Planowane użytkowanie": cały rok albo sezonowo. Po wybraniu "sezonowo" pojawia się pole liczby miesięcy od 1 do 11, wymagane w tym wariancie przez walidację Zod w akcji (baza świadomie dopuszcza `seasonal` bez miesięcy, żeby bezpośredni zapis i dane z przyszłych źródeł nie padały na CHECK). Brak odpowiedzi nie blokuje wysłania. Zapisana wartość jest widoczna dla producenta w widoku zapytania (`app/[locale]/producer/panel/board/[id]` i `product-inquiries/[id]`) oraz dla administratora przy sprawie.
- **AC-8**: Ocena zgodności (`product_compliance_assessment`, spec 0065) przyjmuje kraje PL, DE, NL, BE, IT i FR (`productComplianceAssessmentInputSchema.countryCode`). Migracja dodaje do słownika `country` brakujące wiersze BE, IT i FR (`ON CONFLICT DO NOTHING`). Pole `rule` w bazie zostaje wolnym tekstem. Formularz administratora wybiera przepis z listy na kraj, plus opcję "inny" z wolnym tekstem. Dotychczasowe wartości (np. `bbl`) zostają poprawne i widoczne. Strona produktu ma tłumaczenia nazw nowych krajów w pl, en, de i nl. Wiersze `country` dostają niepustą `name` (kolumna jest NOT NULL). Globalny typ `CountryCode` (`lib/data/types.ts`) i listy w `results-filters.ts`, `verified-manufacturers-filters.ts`, `inquiry/page.tsx` i `auth-registration.ts` zostają PL, DE, NL, a ocena zgodności dostaje własną stałą `COMPLIANCE_COUNTRY_CODES` (PL, DE, NL, BE, IT, FR). Wybierajki krajów dostawy (`getAllCountries()` w panelu producenta, w pojemności i na `/internal/producers/[id]`) nie pokazują BE, IT i FR, bo to nie są nowe kraje dostawy: dostają filtr do dotychczasowych kodów. Formularz administratora (`ProductComplianceAdminSection`) używa `COMPLIANCE_COUNTRY_CODES`.
- **AC-9**: Na ekranie edycji produktu w panelu producenta jest osobna sekcja "Izolacja i posadowienie", poza kreatorem, widoczna tylko dla produktów z AC-4. Producent dodaje, zmienia i usuwa własne wiersze (przegroda, wielkość U lub Rc, wartość, metoda, notatka, data) oraz ustawia `foundation_status`. Nowy wiersz zawsze startuje jako `self_reported`. Zmiana `element`, `quantity`, `value`, `method` albo `as_of_date` potwierdzonego wiersza cofa go do `self_reported` i czyści `confirmed_at` i `confirmed_by` w tej samej instrukcji `UPDATE` (jak spec 0065 AC-9), jako jedno wyrażenie `CASE` porównujące stare i nowe wartości (bez `db.transaction`, którego sterownik neon-http nie obsługuje). Edycja i usunięcie przez producenta wymagają `expectedVersion`, więc producent nie nadpisze po cichu zmiany administratora. Producent może usunąć własny potwierdzony wiersz (to jego dane). Dodanie wiersza bez `id` tworzy nowy i zwraca `duplicate`, gdy para (`element`, `quantity`) już istnieje. Zmiana wiersza na parę, która już istnieje, też zwraca `duplicate`.
- **AC-10**: Administrator na `/internal/producers/[id]` widzi parametry przegród produktów danego producenta, może je dodać, zmienić i usunąć (to zapis tego, co producent przekazał, zawsze jako `self_reported`) oraz oznaczyć jako `platform_confirmed` albo cofnąć. Akcje idą przez `withAdminActor` (spec 0064). Zmianę pól potwierdzenia może wykonać wyłącznie zalogowany administrator, sprawdzane po stronie serwera. Potwierdzenie z nieaktualną `version` zwraca `stale`.
- **AC-11**: Strona `/project/[slug]` dla produktów z AC-4 pokazuje sekcję "Izolacja przegród" z wierszami z `product_envelope_parameter`. Każdy wiersz: nazwa przegrody, wartość z jednostką (W/m²K albo m²K/W), metoda, "stan na dzień" z `as_of_date` oraz stan tekstem i ikoną: "Potwierdzone przez platformę" albo "Deklaracja producenta, niepotwierdzona". Gdy `foundation_status` jest ustawione, sekcja pokazuje też linię "Posadowienie: stałe albo tymczasowe". Sekcja nie renderuje się, gdy produkt nie ma żadnego wiersza. Strona nigdzie nie pokazuje tekstu o "zgodności z przepisami kraju" na podstawie tych danych (to rola `ProjectComplianceAssessments`); test używa jawnej listy zakazanych fraz dla każdego z języków pl, en, de i nl (np. "zgodne z", "spełnia przepisy", "complies with", "konform", "voldoet aan"). Pod sekcją stoi stałe zastrzeżenie: wartości pochodzą od producenta i nie zastępują obliczeń projektanta. Etykieta "Potwierdzone przez platformę" ma w opisie wyjaśnienie, co sprawdzono: administrator platformy przejrzał dokument przekazany przez producenta, to nie jest certyfikat ani badanie. Cała sekcja jest za stałą `ENVELOPE_SECTION_ENABLED` (wzorzec `HOME_SECTIONS` ze spec 0073), domyślnie `false`, i włącza się dopiero po weryfikacji merytorycznej tekstów (patrz Follow-up).
- **AC-12**: Obok każdego parametru strona ma krótki opis pod etykietą oraz rozwijane "Co to znaczy?" (natywny element `details`, bez JavaScriptu). Treść pokrywa: czym jest U (przenikanie ciepła, niżej znaczy lepiej), czym jest Rc (opór cieplny, wyżej znaczy lepiej), że U i Rc to nie to samo i nie przelicza się ich prostym 1/Rc, że Ug szyby to nie Uw całego okna, czym jest Ud drzwi, co znaczy "stan na dzień", "deklaracja producenta" i "potwierdzone przez platformę", co znaczy posadowienie stałe i tymczasowe. Pod sekcją oceny zgodności rozwijany opis wyjaśnia pojęcia HLL i logiesfunctie, gdy ocena dotyczy FR albo NL. Teksty żyją w plikach `messages/*.json` (przestrzeń `EnvelopeParameters`).
- **AC-13**: Tabela porównania domów (`ProjectCompareTable`, `/compare`) dostaje wiersze "Ściany", "Dach" i "Podłoga" z wartością U (albo Rc, jeśli producent podał tylko Rc, z jednostką) i oznaczeniem potwierdzenia. Produkt bez danych pokazuje "Nie podano", nigdy 0. Dane dla wszystkich porównywanych produktów idą jednym zapytaniem `inArray` po `product_id`, nie zapytaniem na produkt. Wiersze są za tą samą stałą `ENVELOPE_SECTION_ENABLED`. Klucze wierszy są dopisane do `COMPARE_ROWS_BY_KIND.dom` w `lib/compare-rows.ts`. Porównanie saun i kontenerów bez zmian.
- **AC-14**: Gdy `floorAreaM2` produktu mieści się między 40 a 60 m² i sekcja z AC-11 się renderuje, sekcja pokazuje notkę: powierzchnia z katalogu może różnić się od powierzchni liczonej według lokalnych przepisów, a próg 50 m² w przepisach jest liczony według definicji danego kraju. Brak nowych kolumn na powierzchnię. Gdy `floorAreaM2` jest puste, notki nie ma. Granice 40 i 60 to stałe w kodzie (zapas na różnice między powierzchnią netto a obrysem), nie wartość prawna.
- **AC-15**: Wszystkie nowe dane są opcjonalne i niczego nie blokują. Publikacja produktu nie wymaga parametrów przegród. Produkt bez wierszy wygląda i działa dokładnie jak dziś (strona, wyniki, wyszukiwanie, porównanie). Istniejące testy przechodzą bez zmian.
- **AC-16**: Wszystkie nowe etykiety, opisy i zastrzeżenia mają prawdziwe tłumaczenia pl, en, de i nl (nie kopię polskiego tekstu). Pole `method_note` zostaje tak, jak wpisał je producent (to numer normy albo krótka uwaga) i nie ma tabeli tłumaczeń. To świadomy wyjątek od reguły spec 0067, że tekst danych pokazany klientom jest tłumaczony.
- **AC-17**: Każdy nowy stan (potwierdzone, niepotwierdzone, stałe, tymczasowe, brak danych) jest komunikowany tekstem i ikoną, nigdy samym kolorem (WCAG 2.2 AA, jak w `components/klient/AGENTS.md`). Rozwijany opis jest dostępny z klawiatury.
- **AC-18**: Producent nie może ustawić `confirmation_status`, `confirmed_at`, `confirmed_by` ani `version` nawet przez bezpośrednie wywołanie akcji. Producent może zmieniać wyłącznie wiersze produktów swojej firmy.

## Decision

**Chosen option**: Option 1: Osobna tabela parametrów przegród z potwierdzeniem, dwa pola na produkcie, jedno pole w zapytaniach.

Liczby U i Rc trafiają do nowej tabeli `product_envelope_parameter`, bo każda wartość ma własną metodę, datę i stan potwierdzenia. `technicalSpecs` zostaje nietknięte. Status posadowienia jest cechą produktu, a planowane użytkowanie jest cechą zapytania klienta. Producent wpisuje dane w panelu, administrator potwierdza. Strona pokazuje deklaracje i potwierdzenia osobno i nigdy nie ogłasza zgodności z przepisami.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Uzasadnienie, rozważane opcje i kontekst: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

- `product_envelope_parameter` (nowa): `id` uuid PK · `product_id` uuid NOT NULL FK → `product.id` ON DELETE CASCADE · `element` enum `envelope_element` · `quantity` enum `envelope_quantity` · `value` numeric(6,3) NOT NULL · `method` enum `envelope_method` · `method_note` text NULL (CHECK do 300 znaków) · `as_of_date` date NOT NULL · `confirmation_status` (istniejący enum `producer_certification_status`), `confirmed_at`, `confirmed_by`, `version` jak w spec 0065 · `created_at`, `updated_at`. Unikat (`product_id`, `element`, `quantity`). Indeks na `product_id`. Relacja 1:N, `product` → `product_envelope_parameter`.
- CHECK `envelope_quantity_by_element`: `(element IN ('window','glazing','door') AND quantity = 'u_value') OR element IN ('wall','roof','floor_ground','floor_air')`.
- CHECK `envelope_value_range`: `(quantity = 'u_value' AND value BETWEEN 0.05 AND 6) OR (quantity = 'rc_value' AND value BETWEEN 0.1 AND 20)`.
- CHECK `confirmationConsistent` jak w spec 0065.
- `product` (istnieje): nowa kolumna `foundation_status` enum `foundation_status` (`permanent`, `temporary`) NULL, plus CHECK `product_foundation_status_family_match` (AC-5).
- `inquiry`, `project_request`, `bulk_product_inquiry` (istnieją): nowe kolumny `intended_use` enum `intended_use` NULL i `intended_use_months` int NULL, CHECK `<tabela>_intended_use_months` (miesiące od 1 do 11 i tylko przy `seasonal`).
- `country` (istnieje): migracja dopisuje wiersze BE, IT, FR, jeśli ich brak.
- Nie zmieniamy: `technicalSpecs`, `floorAreaM2`, `foundationOptions` (zostaje opisowym tekstem obok nowego pola), `plot_region`, `plot_city`, `location_detail`.

**State transitions** (potwierdzenie, jak w spec 0065):
- `self_reported` → `platform_confirmed`: tylko administrator, zapisuje `confirmed_at` i `confirmed_by`.
- `platform_confirmed` → `self_reported`: administrator cofa, albo producent zmienia wartość, jednostkę, metodę, datę lub przegrodę (automatycznie).
- Każde przejście to jedna instrukcja `UPDATE` z `version = version + 1`.

**API surface** (akcje serwerowe, istniejący wzorzec projektu):

| Akcja | Plik | Kluczowe dane wejściowe | Kluczowe dane wyjściowe | Auth | Kluczowe błędy |
|---|---|---|---|---|---|
| `upsertProductEnvelopeParameter` | `lib/product-envelope-actions.ts` (nowy) | `productId`, `element`, `quantity`, `value`, `method`, `methodNote?`, `asOfDate`, `id?`, `expectedVersion?` (wymagane gdy jest `id`) | `{ ok, id, error }` | producent właściciel produktu | `unauthorized`, `family_not_supported`, `duplicate`, `stale`, walidacja |
| `deleteProductEnvelopeParameter` | j.w. | `id`, `expectedVersion` | `{ ok, error }` | producent właściciel | `not_found`, `stale` |
| `setProductFoundationStatus` | j.w. | `productId`, `status` (`permanent`, `temporary`, `null`) | `{ ok, error }` | producent właściciel | `unauthorized`, `family_not_supported` |
| `adminUpsertProductEnvelopeParameter` | `lib/product-envelope-admin-actions.ts` (nowy) | jak wyżej plus `expectedVersion?` | `{ ok, id, error }` | admin, `withAdminActor` | `stale`, `duplicate`, walidacja, `unauthorized` |
| `adminDeleteProductEnvelopeParameter` | j.w. | `id`, `expectedVersion` | `{ ok, error }` | admin, `withAdminActor` | `stale`, `unauthorized` |
| `setProductEnvelopeParameterConfirmation` | j.w. | `id`, `status`, `expectedVersion` | `{ ok, error }` | admin, `withAdminActor` | `stale`, `unauthorized` |

Zapisy zapytań (`lib/project-request-actions.ts`, akcje zwykłego zapytania i zapytania hurtowego) przyjmują dwa nowe opcjonalne pola, walidowane Zod: `intendedUse` i `intendedUseMonths`, z regułą "miesiące tylko przy sezonowo, od 1 do 11".

Odczyt: `lib/data/projects.ts` i `lib/db/queries.ts` dopisują do `Project` pola `envelopeParameters` i `foundationStatus`. Zapytanie jest jednym dodatkowym SELECT po `product_id` (bez N+1 w wynikach: listing wyników ich nie czyta).

**Key invariants**:
- `confirmed_by` nigdy nie jest pokazywane publicznie. Publicznie widać stan i datę potwierdzenia.
- Parametr nie jest "potwierdzony" bez `confirmed_at` i `confirmed_by` (CHECK w bazie).
- Brak wierszy oznacza brak sekcji i brak liczby w porównaniu ("Nie podano"), nigdy 0.
- Kombinacja przegroda plus wielkość jest zawsze poprawna (AC-2), więc strona nie musi rozstrzygać, czy "Uw drzwi" ma sens.
- Strona nigdy nie wnioskuje zgodności z przepisami z samych liczb. Ocena kraj po kraju zostaje wyłącznie w `product_compliance_assessment`.
- `foundation_status` ani `intended_use` nie zmieniają kategorii `mobilny` ani żadnego filtra wyników.

**Security model**: producent czyta i zapisuje wiersze tylko produktów swojej firmy (ten sam test własności co w `lib/producer-product-actions.ts`). Pola potwierdzenia ustawia wyłącznie administrator, sprawdzane po stronie serwera, nie ukryciem przycisku. Publicznie każdy widzi tylko dane produktów opublikowanych. Brak danych osobowych w nowych tabelach. Pola `intended_use` w zapytaniach należą do danych zapytania i dziedziczą jego dostęp. Zastrzeżenie prawne: treści nie mogą sugerować zgodności z przepisami bez potwierdzenia (AC-11, test w scenariuszach).

**Configuration required**: brak nowych zmiennych środowiskowych. Migracja idzie przez `npm run db:migrate` (także w workflow wdrożenia). Po dodaniu kluczy `messages/*.json` trzeba zrestartować `next dev`, bo serwer trzyma te pliki w pamięci (patrz AGENTS.md).

**Critical test scenarios**:
- Happy path: producent wpisuje U ściany 0,22 metodą obliczeń z datą, strona produktu pokazuje wartość, jednostkę, datę i "Deklaracja producenta, niepotwierdzona", verifies **AC-9**, **AC-11**
- Happy path: administrator potwierdza wiersz, strona pokazuje "Potwierdzone przez platformę", verifies **AC-10**, **AC-11**
- Failure case: producent zmienia wartość potwierdzonego wiersza, wiersz wraca do `self_reported` w tej samej instrukcji, verifies **AC-9**
- Failure case: dwa potwierdzenia z tą samą `version`, drugie zwraca `stale`, verifies **AC-10**
- Failure case: `door` z `rc_value` i `u_value` równe 9 są odrzucone przez bazę (CHECK) i przez Zod, verifies **AC-2**
- Failure case: zmiana wiersza na parę (`element`, `quantity`), która już istnieje, zwraca `duplicate`, a nie surowy błąd bazy, verifies **AC-9**
- Failure case: zmiana podkategorii kontenera z `mieszkalne` na inną czyści `foundation_status` i zapis się udaje, verifies **AC-5**
- Failure case: producent edytuje wiersz ze starą `version` po zmianie administratora i dostaje `stale`, verifies **AC-9**
- Failure case: dodanie wiersza do produktu rodziny `spa-modulowe` zwraca `family_not_supported`, verifies **AC-4**
- Failure case: `foundation_status` na `kontenery-modulowe` z podkategorią `gastronomiczne` jest odrzucone przez CHECK, verifies **AC-5**
- Failure case: `intended_use_months = 5` bez `seasonal` odrzucone, `seasonal` z 12 miesiącami odrzucone, verifies **AC-6**, **AC-7**
- Auth/permission: producent obcego produktu dostaje `unauthorized`, producent nie może ustawić `confirmation_status`, verifies **AC-18**
- Edge case: produkt bez wierszy, strona bez sekcji, porównanie pokazuje "Nie podano", verifies **AC-13**, **AC-15**
- Edge case: dom 52 m² z wierszami pokazuje notkę o progu 50 m², dom 120 m² nie, verifies **AC-14**
- Edge case: strona nie zawiera słów o zgodności z przepisami w sekcji izolacji, verifies **AC-11**
- Edge case: ocena zgodności dla BE, IT i FR zapisuje się, nazwy krajów mają tłumaczenia we wszystkich językach, verifies **AC-8**, **AC-16**
- Accessibility: rozwijany opis działa z klawiatury, stan potwierdzenia ma ikonę i tekst, verifies **AC-12**, **AC-17**

## Build plan

Podejście projektu to Tracer Bullet, więc najpierw cienki wątek przez wszystkie warstwy (baza, zapis administratora, odczyt, strona), potem pogrubianie.

1. [x] Migracja: nowe enumy (`envelope_element`, `envelope_quantity`, `envelope_method`, `foundation_status`, `intended_use`), tabela `product_envelope_parameter` z CHECK i unikatem, kolumna `product.foundation_status` z CHECK, dwie kolumny w `inquiry`, `project_request` i `bulk_product_inquiry`, wiersze `country` BE, IT, FR, trigger `audit_log_capture` dla nowej tabeli. Enumy są nowe (`CREATE TYPE`), więc problem z `ADD VALUE` w jednej transakcji nie występuje. satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-6**, **AC-8**
2. [x] Schemat Zod i typy (`lib/product-envelope-parameters.ts`): zakresy, reguła przegroda a wielkość, etykiety jednostek, lista przepisów na kraj. Rozszerzenie `countryCode` w `lib/product-compliance-assessment-specs.ts`. satisfies **AC-2**, **AC-8**
3. [x] Cienki wątek: akcje administratora (`lib/product-envelope-admin-actions.ts`), panel na `/internal/producers/[id]` do wpisania i potwierdzenia wiersza, odczyt w `lib/db/queries.ts` i `lib/data/projects.ts`, prosta sekcja `ProjectEnvelopeParameters` na `/project/[slug]` z zastrzeżeniem. Od tego momentu da się wpisać dane pilotażowe. satisfies **AC-10**, **AC-11**, **AC-18**
4. [x] Wyjaśnienia: klucze `EnvelopeParameters` w czterech plikach `messages/*.json`, opis pod etykietą i rozwijane "Co to znaczy?" (`details`), opis HLL i logiesfunctie pod oceną zgodności. satisfies **AC-12**, **AC-16**, **AC-17**
5. [x] Status posadowienia: akcja `setProductFoundationStatus`, wyświetlenie linii w sekcji, pole w panelu administratora. satisfies **AC-5**, **AC-11**
6. [x] Sekcja "Izolacja i posadowienie" w panelu producenta na ekranie edycji produktu, akcje producenta, reset potwierdzenia przy zmianie. satisfies **AC-4**, **AC-9**, **AC-18**
7. [x] Pole "Planowane użytkowanie" w trzech formularzach zapytania i w ich akcjach zapisu, wyświetlenie w widokach producenta i administratora. satisfies **AC-6**, **AC-7**
8. [x] Oceny zgodności dla BE, IT i FR: stała `COMPLIANCE_COUNTRY_CODES`, przegląd plik po pliku miejsc z `CountryCode` (zostają PL, DE, NL), filtr wybierajek krajów dostawy, żeby BE, IT i FR się w nich nie pojawiły, lista przepisów na kraj w formularzu administratora, tłumaczenia nazw krajów w `ProjectComplianceAssessments`. satisfies **AC-8**, **AC-16**
9. [x] Wiersze porównania w `ProjectCompareTable` i klucze w `lib/compare-rows.ts`. satisfies **AC-13**
10. [x] Notka o progu 50 m² w sekcji. satisfies **AC-14**
11. Testy: jednostkowe (Zod, akcje, reset potwierdzenia, `stale`), komponentowe (`ProjectEnvelopeParameters`, brak sekcji przy braku danych, brak słów o zgodności), baza (CHECK), E2E ścieżka producent wpisuje, administrator potwierdza, klient widzi. Test regresji: produkt bez danych bez zmian. satisfies **AC-15**, **AC-17**, wszystkie scenariusze
12. Przygotować dla pilota krótką listę pytań do producentów (skrócona karta ze str. 8 PDF) i wpisać dane 2 do 3 producentów przez ekran administratora. Wypromować zmiany na produkcję zwykłą migracją, bez ręcznego SQL (żadne dane tłumaczone nie wymagają `drizzle/_promote_*`). satisfies **AC-10**, **AC-15**

## Consequences

**Positive**:
- Klient dostaje pierwsze liczby izolacyjności na stronie, wyjaśnione po ludzku, i może porównać domy.
- Wzorzec potwierdzeń z spec 0065 jest używany ponownie, więc nic nie wygląda na potwierdzone bez administratora.
- Pola opcjonalne, więc zero regresji i zero blokady dla producentów z importów.
- Pole planowanego użytkowania daje producentowi daną, od której zależą progi sezonowe w Niemczech i Belgii.

**Negative / tradeoffs**:
- Największy koszt to zebranie liczb od producentów, bez automatyzacji. Sekcja może długo pozostać pusta przy większości produktów.
- Dodatkowe tłumaczenia w czterech językach i dodatkowy ekran w panelu producenta oraz administratora do utrzymania.
- Dwie rodziny (dom i kontener mieszkalny) są pilnowane przez aplikację, a nie przez bazę (AC-4), więc obejście akcji (ręczny SQL) może to złamać.
- Dane są datowane, a przepisy mają terminy. Platforma pokazuje tylko "stan na dzień" i nie wygasza wartości automatycznie, więc stare liczby zostają widoczne, dopóki ktoś ich nie zaktualizuje.
- Przepisy i opisy w oknach wyjaśnień są treścią własną ModularHub, bez niezależnej weryfikacji prawnej.

**Neutral**:
- `foundationOptions` (wolny tekst) zostaje obok `foundation_status`. Nie robimy migracji danych, bo nie da się ich pewnie zinterpretować.
- Kontenery gastronomiczne i usługowe, sauny i jacuzzi nie dostają tych parametrów. Tabela jest oparta o `product_id`, więc rozszerzenie na inne rodziny to zmiana reguły w AC-4, nie modelu.
- Mostki cieplne, region, gmina i strefa klimatyczna Włoch nie są polami na produkcie. Region i gmina żyją w danych zapytania, strefę ustala doradca z gminy.

## Migration plan

**Strategy**: no migration needed dla istniejących danych (zmiany tylko addytywne: nowe typy, nowa tabela, nowe kolumny nullable, wiersze słownika).
**Phases**:
1. Jedna migracja Drizzle (krok 1 planu budowy), uruchamiana `npm run db:migrate` i w workflow wdrożenia.
2. Kod odczytu i zapisu (kroki 2 do 10), który działa także na produkcie bez wierszy.
3. Pilotaż danych (krok 12), ręcznie przez ekran administratora.
**Rollback**: cofnięcie kodu. Nowe kolumny i tabela zostają nieużywane i nikomu nie szkodzą (nullable, bez wpływu na istniejące zapytania). Wiersze `country` BE, IT, FR mogą zostać.
**Risks**: migracja dotyka trzech tabel zapytań (dodanie nullable kolumn jest tanie); plik migracji nie może łączyć `ADD VALUE` z użyciem nowej wartości (tu go nie ma). CHECK `product_foundation_status_family_match` musi przejść na istniejących wierszach (wszystkie mają `NULL`, więc przejdzie).

## Follow-up

- [ ] Weryfikacja merytoryczna PDF `_docs/ModularHub_Porownanie_Izolacyjnosci_5_Krajow_PL.pdf` i tekstów wyjaśnień (w tym HLL, logiesfunctie i znaczenia "potwierdzone przez platformę") przez osobę znającą przepisy budowlane. To bramka: do czasu weryfikacji `ENVELOPE_SECTION_ENABLED` zostaje `false`, a po niej ktoś ustawia `true` (materiał własny, bez niezależnego przeglądu)
- [ ] Wybrać 2 do 3 producentów pilotażowych i wysłać skróconą listę pytań (U ścian, dachu, podłogi, Uw okien, Ug szyb, metoda, data, status stały lub tymczasowy)
- [ ] Zdecydować osobno, czy publikować karty krajów z PDF jako stronę wiedzy (nie jest częścią tej decyzji)
- [ ] Terminy zmian przepisów do przeglądu: Francja HLL od 01.01.2028, Flandria wyłączenia do 31.12.2026, Lombardia od 03.06.2026
- [ ] Rozważyć rozszerzenie na kontenery gastronomiczne i usługowe oraz sauny, jeśli pojawi się potrzeba (zmiana reguły w AC-4)
- [ ] Rozważyć skrót na karcie wyniku ("dane o izolacji"), jeśli klienci będą o to prosić
