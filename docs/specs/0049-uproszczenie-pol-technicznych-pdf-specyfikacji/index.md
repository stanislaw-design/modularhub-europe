# 0049. Uproszczenie pól technicznych domu i pobieranie PDF specyfikacji

**Date**: 2026-09-22
**Status**: In Progress

## Summary

Dziewięć szczegółowych pól technicznych domu (budowa ściany, izolacja, klasa okien, odporność ogniowa, odporność na wiatr, wymiary transportowe, wymagania dźwigu, minimalna szerokość działki, opis zakresu usług) znika z kreatora producenta, z importu PDF oraz ze strony produktu widocznej klientowi. Zamiast tego producent może wgrać jeden plik PDF ze specyfikacją, a klient go pobiera. Dane już zapisane w bazie dla istniejących produktów zostają nietknięte, tylko przestają być widoczne. Powód: te dziewięć pól rozbija na osobne, klikalne wpisy coś, co w praktyce jest jednym opisowym akapitem, i to właśnie czyni kreator (także z asystentem AI ze spec 0047) zbyt rozbudowanym.

## Requirements

**User stories**:
- Jako producent, chcę wypełniać krok techniczny kreatora bez dziewięciu drobnych pól, których i tak nie da się sensownie oddzielić od opisu standardu, żeby dodanie projektu było szybsze.
- Jako producent, chcę wgrać jeden plik PDF ze specyfikacją domu, żeby klient miał dostęp do pełnego szczegółu bez zmuszania mnie do ręcznego rozbijania go na formularz.
- Jako klient, chcę pobrać PDF ze specyfikacją domu z karty produktu, jeśli producent go udostępnił.

**Acceptance criteria**:
- **AC-1**: Krok techniczny kreatora producenta (rodzina `dom`) nie zbiera już pięciu pól jsonb (wallBuildUp, insulation, windowClass, fireResistance, windResistance) ani czterech pól logistycznych (transportDimensions, craneRequirements, minPlotWidthM, serviceScopeDescription).
- **AC-2**: Te same dziewięć pól znika z `HOUSE_AI_FIELD_CATALOG` (spec 0047): asystent AI nigdy ich nie proponuje, ekran przeglądu ich nie pokazuje.
- **AC-3**: Te same dziewięć pól znika ze strony produktu widocznej klientowi (`ProjectTechnicalSpecs.tsx`, `ProjectLogistics.tsx`).
- **AC-4**: heatSource, ventilation, heatTransferCoefficients (klasa energetyczna), structuralWarrantyYears, installationWarrantyYears oraz simplifiedPermitEligible zostają zbierane, wyciągane przez AI i wyświetlane dokładnie tak jak dziś, bez zmian.
- **AC-5**: Wartości już zapisane w bazie dla tych dziewięciu pól, dla wszystkich istniejących produktów, zostają nietknięte. Żadna migracja ich nie usuwa ani nie przekształca.
- **AC-6**: Producent może wgrać dokładnie jeden plik PDF specyfikacji na produkt (rodzina `dom`) z kroku „pliki" kreatora, do 10 MB, wyłącznie PDF, zwalidowany po sygnaturze bajtowej i nagłówku, nie tylko po rozszerzeniu czy zadeklarowanym typie MIME.
- **AC-7**: Wgranie nowego pliku specyfikacji zastępuje poprzedni atomowo (stary wiersz miękko usunięty, nowy wstawiony w jednym zapisie wsadowym), a stary plik znika z magazynu R2.
- **AC-8**: Producent może usunąć plik specyfikacji bez wgrywania nowego.
- **AC-9**: Gdy plik specyfikacji istnieje, strona produktu klienta pokazuje sekcję „pobierz PDF ze specyfikacją"; gdy pliku nie ma, ta sekcja się nie pojawia.
- **AC-10**: Pobranie pliku specyfikacji jest publiczne, bez wymogu logowania, spójnie z resztą treści marketingowej produktu.
- **AC-11**: Nieprawidłowy plik (zły typ, uszkodzona zawartość, powyżej 10 MB) jest odrzucany przed zapisem do magazynu, z jasnym komunikatem błędu.

## Decision

**Chosen option**: Opcja 1: Ukryj pola w UI, zostaw dane w bazie, dodaj PDF specyfikacji

Dziewięć pól technicznych znika z kreatora producenta, z katalogu pól asystenta AI i ze strony produktu klienta, bez żadnej migracji usuwającej dane; w ich miejsce dochodzi jeden plik PDF specyfikacji na produkt, wgrywany w kroku „pliki" kreatora i pobieralny publicznie z karty produktu.

**Implementation skills**: `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`)

## Rationale

Dokładne porównanie opcji i uzasadnienie decyzji znajduje się w [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Reużycie istniejącej tabeli `document` (spec 0031), zero nowych tabel.

| Pole | Typ | Uwagi |
|---|---|---|
| `purpose` | enum | nowa wartość `product_specification` w `document_purpose` |
| `productId` | uuid, FK → product | wymagane dla tego purpose |
| `productVariantId` | uuid, FK → product_variant, nullable | zawsze `NULL` dla tego purpose (jeden plik na produkt, nie na wariant) |
| `r2Key`, `filename`, `mimeType`, `sizeBytes` | jak dziś | bez zmian w kształcie |
| `ownerUserId`, `producerId` | jak dziś | właściciel |
| `deletedAt` | timestamptz, nullable | miękkie usunięcie przy zastąpieniu lub usunięciu |

Nowe ograniczenie: częściowy unikalny indeks `document_one_specification_per_product` na `(product_id)` gdzie `purpose = 'product_specification' AND deleted_at IS NULL`, ten sam wzorzec co istniejący `document_one_cover_per_product`.

**API surface**:

| Akcja | Typ | Kluczowe wejście | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `uploadProductSpecificationPdf` | Server Action | `productId`, plik | `documentId`, `url` | producent, właściciel produktu | zły typ lub sygnatura pliku, plik powyżej 10 MB, produkt nie należy do producenta |
| `deleteProductSpecificationPdf` | Server Action | `documentId` | potwierdzenie | producent, właściciel dokumentu | dokument nie istnieje lub należy do innego producenta |
| odczyt na stronie edycji i stronie klienta | rozszerzenie istniejących zapytań (`getProducerProductForEdit`, `getProjectById`) | `productId` | `{ id, filename, url } \| null` | jak dziś dla tych zapytań | brak (zwraca `null`, gdy nie ma pliku) |

**Key invariants**:
- Najwyżej jeden aktywny (`deletedAt IS NULL`) dokument `product_specification` na produkt, wymuszone częściowym indeksem unikalnym.
- Wgranie nowego pliku i miękkie usunięcie starego dzieje się w jednym `db.batch(...)` (sterownik `neon-http` nie wspiera `db.transaction`, patrz `lib/db/AGENTS.md`), żeby nie było okna bez pliku albo z dwoma aktywnymi naraz.
- Walidacja pliku (sygnatura `%PDF-`, obecność `%%EOF`, brak `/Encrypt`, limit 10 MB) dzieje się przed zapisem do R2, nie po.

**Security model**:
- Zapis (upload, usunięcie): tylko producent będący właścicielem produktu, ten sam wzorzec autoryzacji co `uploadFloorPlan`/`deleteFloorPlan` (`lib/product-photo-actions.ts`).
- Odczyt (pobranie pliku): publiczny, bez logowania, ten sam publiczny bucket R2 co zdjęcia i rzuty (żadne dane osobowe klienta w tym dokumencie, to materiał marketingowy producenta z jego własnej woli).

**Configuration required**: brak nowych zmiennych środowiskowych, reużycie istniejącej konfiguracji R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN`).

**Critical test scenarios**:
- Happy path: producent wgrywa poprawny PDF, klient widzi i pobiera go z karty produktu, weryfikuje **AC-6**, **AC-9**, **AC-10**.
- Zastąpienie: producent wgrywa drugi PDF, pierwszy znika z bazy i z R2, nowy jest jedynym aktywnym, weryfikuje **AC-7**.
- Błąd walidacji: plik z rozszerzeniem `.pdf`, ale bez poprawnej sygnatury bajtowej, jest odrzucony przed zapisem do R2, weryfikuje **AC-11**.
- Autoryzacja: producent B nie może usunąć ani zastąpić pliku specyfikacji produktu należącego do producenta A, weryfikuje bezpieczeństwo modelu wyżej.
- Regresja: pola heatSource, ventilation, heatTransferCoefficients nadal przechodzą pełną ścieżkę kreator, import AI, strona klienta bez zmian, weryfikuje **AC-4**.

## Build plan

Podejście budowy tej epiki to Tracer Bullet (jeden prawdziwy wątek przez wszystkie warstwy, potem pogrubianie). Zadanie 1 to migracja (zawsze pierwsza dla zmiany modelu danych), zadania 2 do 4 usuwają pola równolegle w trzech miejscach (kreator, katalog AI, strona klienta), bo są od siebie niezależne i każde samo w sobie jest małym, kompletnym wątkiem. Zadania 5 do 8 budują nową zdolność PDF od zapisu do odczytu, jako osobny, kompletny wątek end to end.

1. [x] Migracja: dodaj wartość `product_specification` do `document_purpose`, dodaj częściowy indeks unikalny `document_one_specification_per_product`, satisfies **AC-6**, **AC-7** (`drizzle/0028_wet_colonel_america.sql`, zastosowana i zweryfikowana na żywej bazie)
2. [x] Usuń pięć pól jsonb (wallBuildUp, insulation, windowClass, fireResistance, windResistance) z `TECHNICAL_FIELDS_BY_FAMILY.dom` (`lib/producer-project-draft.ts`) i z `ProjectWizardTechnicalStep.tsx` (cztery pola logistyczne, transportDimensions, craneRequirements, minPlotWidthM, serviceScopeDescription, są tam wpisane wprost, nie przez pętlę), zrób odpowiadające pięć kluczy `.optional()` w schemacie `dom` w `lib/product-technical-specs.ts`, satisfies **AC-1**, **AC-5**
3. [x] Usuń tych samych dziewięć wpisów z `HOUSE_AI_FIELD_CATALOG` (`lib/house-ai-field-catalog.ts`); ekstrakcja AI (`lib/ai/house-project-extraction.ts`) i ekran przeglądu automatycznie przestają o nie pytać, bo obie strony czytają katalog dynamicznie, satisfies **AC-2**
4. [x] Usuń odpowiadające wiersze z `components/klient/ProjectTechnicalSpecs.tsx` i `components/klient/ProjectLogistics.tsx`, satisfies **AC-3**, **AC-4** (regresja pozostałych pól)
5. [x] Napisz `lib/storage/document-pdf-validation.ts`: sygnatura `%PDF-`, `%%EOF`, brak `/Encrypt`, limit 10 MB, adaptacja logiki sygnatury z `lib/storage/ai-source-pdf-validation.ts` bez części dla prywatnej kwarantanny (ClamAV, liczba stron, deduplikacja SHA 256), satisfies **AC-11**
6. [x] Dodaj `uploadProductSpecificationPdf` i `deleteProductSpecificationPdf` do `lib/product-photo-actions.ts`, ten sam wzorzec własności co `uploadFloorPlan`/`deleteFloorPlan`, zastąpienie przez `db.batch([miękkie usunięcie starego, wstawienie nowego])`, satisfies **AC-6**, **AC-7**, **AC-8**
7. [x] Dodaj sekcję „Specyfikacja PDF" do `ProjectWizardFilesStep.tsx` (jeden plik, zastąpienie, usunięcie) i rozszerz odczyt w `app/[locale]/producer/panel/products/[id]/edit/page.tsx` oraz `ProductEditWizard.tsx`/`ProjectWizard.tsx` o wstępną wartość pliku specyfikacji, satisfies **AC-6**, **AC-7**, **AC-8** (nowy komponent `components/producent/ProducerSpecificationPdfUploadStep.tsx`)
8. [x] Rozszerz `lib/data/projects.ts`/`lib/db/queries.ts` (`getProjectById`) o dokument specyfikacji i dodaj sekcję pobierania na stronie produktu klienta, satisfies **AC-9**, **AC-10** — zbudowane jako rozszerzenie istniejącego `components/klient/ProjectDocumentsAndFaq.tsx` (jego "Dokumenty" połowa już czekała na pierwsze prawdziwe źródło dokumentu), nie nowy, osobny komponent jak wariant B sugerował w opisie zadania; `getProductSpecificationPdfForAdmin` dodane do `lib/db/queries.ts` dla strony edycji producenta

## Consequences

**Positive**:
- Krok techniczny kreatora traci dziewięć pól z trzynastu, realnie krótszy formularz dla producenta.
- Ekran przeglądu importu AI traci dziewięć potencjalnych punktów decyzyjnych na wariant, mniej klikania nawet przy dużym projekcie.
- Producent może po prostu wgrać gotowy PDF zamiast ręcznie przepisywać jego treść do formularza.

**Negative / tradeoffs**:
- Klient traci możliwość porównania tych dziewięciu cech między projektami w jednym, spójnym formacie strony; musi otworzyć PDF każdego producenta osobno, jeśli chce porównać np. odporność na wiatr.
- Jeśli producent nie wgra PDF specyfikacji, te informacje znikają z karty produktu całkowicie, bez żadnego zamiennika.
- Dwa równoległe źródła informacji technicznej (trzy pola strukturalne plus PDF) mogą wyglądać niespójnie, dopóki większość producentów nie wgra swoich plików.

**Neutral**:
- Dane 65 istniejących produktów dla tych dziewięciu pól zostają w bazie, ale stają się martwe (nieczytane, niepisane); ewentualne przyszłe przywrócenie tych pól znajdzie je gotowe, nie trzeba będzie ich odtwarzać.
- Stare wiersze `ai_field_decision`/`ai_field_candidate` z przeszłych sesji importu, które odnoszą się do usuniętych ścieżek pól, zostają w bazie jako martwe dane; nic ich nie czyta ponownie, bo katalog już ich nie zna.

## Follow-up

- [ ] **Zmienione przez spec 0050**: `installationWarrantyYears` (AC-4 tej specyfikacji, "gwarancja montażu") znika też z kreatora i strony klienta, tym samym niedestrukcyjnym wzorcem co dziewięć pól tego spec. Patrz [0050](../0050-uproszczone-dodawanie-projektu-domu/index.md) AC-17.
- [ ] Zachęcić (poza tym spec, np. przez e-mail albo baner w panelu) obecnych producentów do wgrania PDF specyfikacji dla swoich już opublikowanych produktów, skoro dane strukturalne przestają być widoczne
- [ ] Rozważyć to samo uproszczenie dla rodzin `spa-modulowe` i `kontenery-modulowe`, jeśli ich pola techniczne mają podobny charakter; poza zakresem tego spec, dotyczy wyłącznie rodziny `dom`
- [ ] Niezawodność ekstrakcji AI dla pozycji kosztowych i etapów harmonogramu wariantu (osobny, zaobserwowany w tej samej sesji testowej problem) jest świadomie poza zakresem tego spec i wymaga osobnej pracy nad promptem w `lib/ai/house-project-extraction.ts`
