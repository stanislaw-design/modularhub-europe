# 0063. Opcjonalny PDF wyceny w tablicy ogłoszeń B2B

**Date**: 2026-10-03
**Status**: In Progress

## Summary

Ta decyzja pozwala producentowi dołączyć do swojej wyceny (na tablicy ogłoszeń B2B, spec 0062) opcjonalny plik PDF, który sam przygotował w Canvie, PowerPoincie czy Wordzie, z pełną wolnością wizualną i wizualizacjami. Aplikacja tylko przechowuje ten plik w osobnym, prywatnym magazynie i kontroluje, kto może go zobaczyć: zawsze inwestor, który otrzymał tę wycenę, i producent, który ją złożył, nigdy konkurencyjny producent. Liczbowe pola wyceny (cena, czas realizacji) zostają wymagane i są dodatkiem, nie zamiennikiem PDF-a.

## Context

Patrz [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako producent, chcę dołączyć do swojej wyceny plik PDF przygotowany samemu (wizualizacje, oferta graficzna), żeby nie ograniczać się do suchych liczb w formularzu.
- Jako inwestor, chcę od razu po złożeniu wyceny zobaczyć dołączony PDF, żeby ocenić ofertę, zanim zdecyduję, którą przyjąć.
- Jako producent, chcę mieć pewność, że żaden konkurencyjny producent nie zobaczy mojego PDF-a, bo zawiera moje warunki handlowe.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: `submitProjectQuote` (bez zmian w sygnaturze wejścia) zwraca w wyniku `quoteId` nowo utworzonej wyceny, dla obu ścieżek (`project_request` i `bulk_product_inquiry`).
- **AC-2**: Nowa akcja serwerowa `uploadProjectQuotePdf(quoteId, file)` pozwala producentowi, który jest właścicielem tej wyceny, wgrać do niej plik PDF, wyłącznie gdy status tej wyceny to `active`; odmawia producentowi, który nie jest jej właścicielem, i odmawia, gdy status wyceny nie jest już `active`.
- **AC-3**: Powtórne wgranie na tę samą, wciąż `active` wycenę zastępuje poprzedni plik atomowo (stary wiersz `document` miękko usunięty, nowy wstawiony, w jednym `db.batch`), ten sam wzorzec co `uploadProductSalesPdf`.
- **AC-4**: Plik jest walidowany tym samym mechanizmem co dzisiejsze PDF-y dokumentowe (`validateDocumentPdf`: sygnatura `%PDF-`, obecność `%%EOF`, brak `/Encrypt`), rozszerzonym o parametr maksymalnego rozmiaru; dla tej wyceny limit to 20 MB, plik pusty albo większy jest odrzucany.
- **AC-5**: Migracja dodaje `document.project_quote_id` (nullable, FK do `project_quote.id`), nową wartość enum `project_quote_pdf` na `document_purpose`, i częściowy indeks unikalny `document_one_quote_pdf_per_quote` na `project_quote_id` gdzie `purpose = 'project_quote_pdf' AND deleted_at IS NULL`.
- **AC-6**: Nowy moduł `lib/storage/private-r2-client.ts` wgrywa ten plik do osobnego, prywatnego kubełka R2 (jurysdykcja UE, ten sam wzorzec endpointu co `r2-client.ts`), nigdy do publicznego `R2_BUCKET_NAME`; wgrywanie idzie przez serwer, bez CORS (żadny kod przeglądarki nie wgrywa PUT-em bezpośrednio).
- **AC-7**: Nowa akcja serwerowa `getProjectQuotePdfUrl(quoteId)` generuje świeży, podpisany URL do odczytu (`@aws-sdk/s3-request-presigner`, TTL 10 minut) dopiero po sprawdzeniu, że wołający jest albo inwestorem właścicielem nadrzędnego `project_request`/`bulk_product_inquiry`, albo producentem właścicielem tej samej wyceny; dla każdego innego wołającego (w tym innego producenta) zwraca ten sam błąd „nie znaleziono”, niezależnie od tego, czy wycena istnieje.
- **AC-8**: `getProjectQuotesForProducer` i `getProjectRequestsWithQuotesForClient` (spec 0062) dostają dodatkowe, nullable pole wskazujące, czy wycena ma dołączony PDF (bez samego URL-a; URL powstaje osobno, na żądanie, przez AC-7).
- **AC-9**: Inwestor widzi PDF (przez akcję z AC-7) od razu po złożeniu wyceny, dla każdej swojej wyceny niezależnie od statusu (`active`/`superseded`/`accepted`/`rejected`) — nigdy zamaskowany do momentu akceptacji, w przeciwieństwie do kontaktu inwestora (spec 0062).
- **AC-10**: Producent nigdy nie może pobrać PDF-a innego producenta złożonego na to samo zapytanie; sprawdzone wywołaniem `getProjectQuotePdfUrl` bezpośrednio (nie tylko przez bramkę ekranu).
- **AC-11** (zmienione po pierwszym przebiegu buildu, patrz rationale.md): `QuoteForm` pozwala wybrać plik PDF w tym samym kroku co cenę, nie osobnym: jedno kliknięcie „Wyślij wycenę” zapisuje wycenę i, jeśli producent wybrał plik, wgrywa go automatycznie zaraz po tym, bez drugiego kliknięcia. Nieudane wgranie PDF-a (np. plik za duży) nie cofa zapisanej wyceny — producent widzi potwierdzenie złożenia wyceny, komunikat błędu, i krok ponowienia wgrania. Ekran własnych wycen producenta (`/producer/panel/board-quotes`) i ekran otrzymanych wycen klienta pokazują przycisk „Pobierz PDF”, gdy plik istnieje. Wszystko z tłumaczeniami pl/en/nl/de i WCAG 2.2 AA.
- **AC-12** (znalezione przez cross check): `next.config.ts` ustawia `experimental.serverActions.bodySizeLimit` na wartość pokrywającą 20 MB (np. `”24mb”`, z zapasem na narzut multipart); bez tego akcje serwerowe Next.js 16 odrzucają żądanie powyżej domyślnego 1 MB, zanim walidacja z AC-4 w ogóle zobaczy plik. Zweryfikowane end to end (prawdziwe żądanie HTTP przez przeglądarkę/Playwright, nie samo wywołanie funkcji w teście jednostkowym, bo ten limit żyje w warstwie transportu, nie w kodzie akcji).
- **AC-13** (znalezione przez cross check): sprawdzenie `status = 'active'` przy wgrywaniu/zastępowaniu PDF-a (AC-2, AC-3) jest atomowe względem równoległej akceptacji tej samej wyceny: miękkie usunięcie starego dokumentu i wstawienie nowego są warunkowane `WHERE EXISTS (SELECT 1 FROM project_quote WHERE id = ... AND producer_id = ... AND status = 'active')` w tym samym batchu, ten sam wzorzec co `WHERE NOT EXISTS` w `submitProjectQuote`; przegrana wyścigu zwraca czytelny błąd, nie cichy sukces na już nieaktywnej wycenie.

## Options considered

Patrz [rationale.md](rationale.md): trzy opcje rozważone dla sposobu udostępniania pliku (podpisany URL na żądanie, route handler przez serwer, publiczny kubełek z nieodgadywalnym kluczem).

## Decision

**Chosen option**: Option 1: podpisany, krótkoterminowy URL do odczytu, generowany na żądanie przez akcję serwerową, z osobnego prywatnego kubełka R2.

**Implementation skills**: `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`)

## Rationale

Patrz [rationale.md](rationale.md) (pełne uzasadnienie i rozważone opcje; `/develop` go nie potrzebuje).

## Feature design

**Data model sketch**:

| Tabela | Zmiana | Pole | Typ | Uwagi |
|---|---|---|---|---|
| `document` | ADD | `project_quote_id` | `uuid`, nullable, FK → `project_quote.id` | Ustawiane wyłącznie dla `purpose = 'project_quote_pdf'`; `NULL` dla każdego innego purpose, tak jak dzisiejsze `productId`/`productVariantId`/`orderStageEventId`/`producerId`. Bez `ON DELETE CASCADE` — `project_quote` nigdy nie jest usuwana, tylko zmienia status. |
| `document_purpose` (enum) | ADD VALUE | `project_quote_pdf` | — | Ten sam wzorzec `ALTER TYPE ... ADD VALUE` co `product_sales_pdf` (spec 0050). |
| `document` | ADD INDEX | `document_one_quote_pdf_per_quote` | częściowy indeks unikalny na `project_quote_id` gdzie `purpose = 'project_quote_pdf' AND deleted_at IS NULL` | Najwyżej jeden aktywny plik na wycenę; rewizja wyceny to nowy wiersz `project_quote` (AC-3 nie dotyczy nowego wiersza), więc nigdy nie koliduje. |

Relacja: `document` N:1 `project_quote` (opcjonalna, wypełniana tylko dla tego jednego purpose), ten sam kształt co istniejąca `document` N:1 `product`.

`ownerUserId` nowych wierszy to zawsze id wgrywającego producenta, tak jak dla każdego innego purpose.

**State transitions**:

`project_quote.status` bez zmian (`active` → `superseded`/`accepted`/`rejected`, spec 0062/0037). PDF można wgrać lub zastąpić wyłącznie, gdy status to `active` (AC-2); po przejściu w inny status plik zostaje przypisany na trwałe (miękkie usunięcie jak każdy inny `document`, AC przyjęte w rozmowie z inżynierem), nigdy nie jest dalej zamieniany.

**API surface**:

| Powierzchnia | Typ | Kluczowe dane wejściowe | Kluczowe dane wyjściowe | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `submitProjectQuote` (zmieniona, `lib/project-quote-actions.ts`) | Istniejąca akcja, bez zmian sygnatury wejścia | bez zmian | `{ ok, error?, quoteId? }` | bez zmian (sesja producenta) | bez zmian |
| `uploadProjectQuotePdf` (nowa, `lib/project-quote-actions.ts`) | Akcja serwerowa | `quoteId`, `file: File` | `{ ok, error?, documentId? }` | sesja producenta + `project_quote.producerId` = wołający + `status = 'active'` | odmowa gdy nie właściciel, odmowa gdy status ≠ `active`, błąd walidacji pliku (AC-4) |
| `getProjectQuotePdfUrl` (nowa, `lib/project-quote-actions.ts`) | Akcja serwerowa | `quoteId` | `{ ok, error?, url? }`, URL świeży, TTL 10 minut | sesja klienta właściciela nadrzędnego zapytania LUB sesja producenta właściciela wyceny | ten sam błąd „nie znaleziono” dla nieistniejącej wyceny i dla braku uprawnień (AC-7, AC-10) |
| `getProjectQuotesForProducer` (zmieniona, `lib/db/queries.ts`) | Odczyt | bez zmian | + `hasPdf: boolean` | bez zmian | — |
| `getProjectRequestsWithQuotesForClient` (zmieniona, `lib/db/queries.ts`) | Odczyt | bez zmian | + `hasPdf: boolean` na każdej wycenie | bez zmian | — |

Wywołanie (zmienione, AC-11): `QuoteForm` woła `submitProjectQuote` i, gdy producent wybrał plik, zaraz po sukcesie woła `uploadProjectQuotePdf(quoteId, file)` samo, w tym samym handlerze submit — dwa osobne wywołania serwera jak w pierwszej wersji tego spec, ale sekwencyjne w jednym kliknięciu, nie w dwóch osobnych ekranach/krokach użytkownika.

**Key invariants**:
- `document.projectQuoteId` jest ustawiane wyłącznie dla `purpose = 'project_quote_pdf'`, nigdy dla żadnego innego purpose.
- `uploadProjectQuotePdf` sprawdza własność wyceny i jej status `active` wewnątrz samej akcji serwerowej, nie tylko przez bramkę ekranu — ta sama zasada co `submitProjectQuote` AC-13 ze spec 0062, bo akcja jest wołalna niezależnie od UI. Ten sam `status = 'active'` jest też warunkiem samego zapisu w bazie (AC-13), nie tylko wcześniejszym odczytem — odczyt i zapis mogą się rozjechać pod równoległym `acceptProjectQuote`.
- Każdy odczyt dokumentu wyceny (wgrywanie, zastąpienie, generowanie URL-a) filtruje `deletedAt IS NULL`; miękko usunięty dokument nigdy nie jest traktowany jako aktywny plik tej wyceny.
- `getProjectQuotePdfUrl` nigdy nie zwraca różnego błędu dla „wycena nie istnieje” i „wycena istnieje, ale nie masz dostępu” — ten sam wzorzec braku przecieku co `evaluateCaseAccess` (`lib/cases/access.ts`). `NULL` w `project_request.clientId`/`bulkProductInquiry.clientId` (zapytanie złożone zanim `linkRequestsToClientOnLogin` je dowiązało, spec 0037 AC-7) nigdy nie jest traktowane jako dopasowanie do żadnego wołającego klienta — brak powiązania to zawsze odmowa, nie przepustka.
- Podpisany URL jest generowany na nowo przy każdym wywołaniu `getProjectQuotePdfUrl`, nigdy zapisywany ani cache'owany; krótki TTL (10 minut) ogranicza okno, w którym przechwycony link działałby, bez kosztu użyteczności, bo klient i producent zawsze dostają świeży link przy własnym kliknięciu. To nie chroni przed tym, że inwestor sam przekaże pobrany plik dalej — to już poza kontrolą aplikacji, zawsze było.
- Podpisany URL ustawia `ResponseContentDisposition`/`ResponseCacheControl: private, no-store`, żeby pośrednicy/przeglądarka nie trzymali go w pamięci podręcznej po wygaśnięciu TTL.
- Sam URL (zawiera podpis w query string) nigdy nie trafia do logów ani zdarzeń analitycznych; jeśli wywołanie `getProjectQuotePdfUrl` jest kiedyś opakowane `trackEvent`/`captureError`, payload niesie `quoteId`, nigdy zwrócony `url` (ten sam wzorzec oczyszczania co `lib/observability/scrub.ts`, spec 0048).
- Plik PDF w prywatnym kubełku nigdy nie jest serwowany przez publiczną domenę ani przez `buildPublicUrl` (`r2-client.ts`); jedyna droga odczytu to `getProjectQuotePdfUrl`.
- Zastąpienie PDF-a na tej samej wycenie (AC-3) działa tylko, gdy `status = 'active'`; po `superseded`/`accepted`/`rejected` plik jest trwały.

**Security model**:
- Kompletna granica bezpieczeństwa tej funkcji: inwestor właściciel nadrzędnego `project_request`/`bulk_product_inquiry` ORAZ producent właściciel tej konkretnej wyceny, nic poza tym (żadna rola admina w tej wersji, patrz Follow-up).
- Zgodność RODO: bez zmian względem podstawy prawnej ze spec 0037/0062 (art. 6 ust. 1 lit. b) — to rozszerzenie istniejącego przepływu wyceny, nie nowy cel przetwarzania. Prywatny kubełek i podpisany URL są dodatkową ochroną techniczną danych handlowych (ceny, warunki), nie zmieniają podstawy prawnej.
- Plik PDF nie jest skanowany antywirusowo ani parsowany pod liczbę stron, zgodnie z dzisiejszym traktowaniem `product_sales_pdf`/`product_specification` (oba idą prosto do magazynu po samej walidacji sygnatury); ten sam, już przyjęty poziom ryzyka, nie nowy.

**Configuration required**:
- `PRIVATE_R2_BUCKET_NAME`, `PRIVATE_R2_ACCESS_KEY_ID`, `PRIVATE_R2_SECRET_ACCESS_KEY`: nowy, generyczny prywatny kubełek (jurysdykcja UE), reużywa `R2_ACCOUNT_ID` istniejącego już w `.env.local`. **Manualny krok przed kodem** (Build plan #1): zweryfikować w panelu Cloudflare, czy dawny bucket po usuniętej funkcji importu PDF (spec 0047, zmienna `AI_PRIVATE_R2_BUCKET_NAME`) wciąż istnieje; jeśli tak, przemianować/wskazać go przez te nowe, generyczne zmienne; jeśli nie, założyć nowy kubełek i parę kluczy.
- `next.config.ts`: `experimental.serverActions.bodySizeLimit` (np. `"24mb"`), bez którego Next.js 16 odrzuca na poziomie transportu każde żądanie akcji serwerowej powyżej 1 MB, zanim walidacja pliku w ogóle zobaczy bajty (AC-12, znalezione przez cross check). Globalna zmiana (dotyczy każdej akcji serwerowej, nie tylko tej), ale jedyny sposób zostać przy „wgrywanie przez serwer, bez CORS", który inżynier wybrał wprost w rozmowie. Efekt uboczny: najpewniej naprawia też dzisiejszy, nigdy nieprzetestowany na realnym rozmiarze limit dla `uploadProductSalesPdf`/`uploadProductSpecificationPdf` (patrz Follow-up).
- Brak nowej zależności npm: `@aws-sdk/s3-request-presigner` jest już w `package.json` (został po spec 0047, mimo że kod który go używał został usunięty w spec 0050).

**Critical test scenarios** (każdy odwołuje się do kryterium w `## Requirements`):
- Happy path: producent składa wycenę, wgrywa PDF, inwestor od razu widzi i pobiera plik przez świeży podpisany URL; weryfikuje **AC-1, AC-2, AC-6, AC-7, AC-9**.
- Zastąpienie: producent wgrywa drugi PDF na tę samą, wciąż `active` wycenę; stary dokument zostaje miękko usunięty, nowy widoczny; weryfikuje **AC-3**.
- Odmowa (status): producent próbuje wgrać PDF na wycenę, która już nie jest `active` (np. `superseded`); odmowa; weryfikuje **AC-2**.
- Odmowa (własność): producent B próbuje wgrać PDF albo pobrać URL dla wyceny producenta A; odmowa w obu przypadkach, bez przecieku istnienia; weryfikuje **AC-2, AC-7, AC-10**.
- Odmowa (nieistniejąca wycena): wołanie `getProjectQuotePdfUrl` dla nieistniejącego `quoteId` zwraca ten sam błąd co odmowa z powodu braku uprawnień; weryfikuje **AC-7**.
- Walidacja pliku: plik bez sygnatury `%PDF-`, plik zaszyfrowany, i plik większy niż 20 MB są odrzucane; weryfikuje **AC-4**.
- Rozmiar przez prawdziwą granicę transportu: upload pliku powyżej 1 MB (domyślny limit Next.js) i poniżej 20 MB kończy się sukcesem, zweryfikowane testem end to end (Playwright, prawdziwe żądanie HTTP), nie samym wywołaniem funkcji akcji w Vitest, bo właśnie to ukryłoby regresję; weryfikuje **AC-12**.
- Wyścig (zastąpienie kontra akceptacja): `acceptProjectQuote` i `uploadProjectQuotePdf` tej samej wyceny wywołane równolegle — co najwyżej jedno się powiedzie w sposób zmieniający stan, drugie dostaje czytelny błąd, nigdy cichy, niepoprawny sukces; weryfikuje **AC-13**.
- Widoczność bez akceptacji: inwestor pobiera PDF wyceny o statusie `active` (nie `accepted`) — w przeciwieństwie do kontaktu inwestora (spec 0062), PDF nie jest maskowany do akceptacji; weryfikuje **AC-9**.
- Listy: `getProjectQuotesForProducer`/`getProjectRequestsWithQuotesForClient` zwracają `hasPdf = false` dla wyceny bez pliku i `true` po wgraniu, bez samego URL-a w tej odpowiedzi; weryfikuje **AC-8**.

## Build plan

Epika Produkcja, podejście Tracer Bullet (`docs/scope/produkcja.md`, ten sam wzorzec co spec 0062): najpierw jeden, prawdziwy wątek od wgrania przez producenta do pobrania przez klienta, zanim dogrubimy listy, UI i tłumaczenia.

1. Manualny krok wstępny: zweryfikować w Cloudflare, czy `AI_PRIVATE_R2_BUCKET_NAME` (spec 0047) wciąż istnieje; reużyć go pod nowymi, generycznymi zmiennymi `PRIVATE_R2_*` jeśli tak, inaczej założyć nowy prywatny kubełek (jurysdykcja UE) i parę kluczy; zaktualizować `.env.local`/`.env.local.example`. Satisfies **AC-6** (prerequisite)
2. Migracja: `document.project_quote_id` (nullable FK), nowa wartość enum `project_quote_pdf`, indeks `document_one_quote_pdf_per_quote`. Satisfies **AC-5**
3. `next.config.ts`: ustawić `experimental.serverActions.bodySizeLimit` (np. `”24mb”`), znalezione przez cross check jako blokujące — bez tego żadne z poniższych zadań wgrywania nie zadziała dla pliku powyżej 1 MB. Satisfies **AC-12**
4. `lib/storage/private-r2-client.ts`: nowy klient S3 pod jurysdykcyjny endpoint prywatnego kubełka (ten sam wzorzec co `r2-client.ts`), funkcja wgrywania i `buildSignedDownloadUrl(key, ttlSeconds)` przez `getSignedUrl`/`GetObjectCommand` z `@aws-sdk/s3-request-presigner`, z `ResponseContentDisposition`/`ResponseCacheControl: private, no-store` na podpisanym URL-u. Satisfies **AC-6, AC-7**
5. Rozszerzyć `validateDocumentPdf` (`lib/storage/document-pdf-validation.ts`) o opcjonalny parametr `maxBytes` (domyślnie zostaje dzisiejsze 10 MB dla istniejących wołających). Satisfies **AC-4**
6. `submitProjectQuote`: zwróć `quoteId` w wyniku, obie ścieżki. Satisfies **AC-1**
7. `uploadProjectQuotePdf(quoteId, file)`: sprawdzenie własności i statusu `active` wewnątrz akcji, walidacja (limit 20 MB), wgranie do prywatnego kubełka, `db.batch` z miękkim usunięciem starego i wstawieniem nowego wiersza `document` warunkowanym `WHERE EXISTS (... status = 'active' ...)` w tym samym batchu (nie samym wcześniejszym odczytem), błąd czytelny przy przegranym wyścigu z `acceptProjectQuote`. Satisfies **AC-2, AC-3, AC-13**
8. `getProjectQuotePdfUrl(quoteId)`: sprawdzenie, że wołający jest właścicielem klientem (z niepustym, dopasowanym `clientId`) LUB właścicielem producentem, ten sam błąd dla „nie znaleziono” i „brak dostępu”, odczyt dokumentu filtrowany `deletedAt IS NULL`, zwrócenie świeżego podpisanego URL, nigdy logowanego/wysyłanego do observability. Satisfies **AC-7, AC-9, AC-10**
9. Rozszerzyć `getProjectQuotesForProducer`/`getProjectRequestsWithQuotesForClient` (`lib/db/queries.ts`) o `hasPdf` przez `LEFT JOIN` na `document` filtrowany po `purpose`/`deletedAt`. Satisfies **AC-8**
10. UI (zmienione, patrz rationale.md): pole wyboru pliku PDF w tym samym formularzu co cena w `QuoteForm.tsx`; po udanym `submitProjectQuote` (zwrócony `quoteId`), jeśli plik wybrany, formularz automatycznie woła `uploadProjectQuotePdf(quoteId, file)` w tym samym submit, bez drugiego kliknięcia producenta. Nieudane wgranie nie cofa zapisanej wyceny: pokazuje błąd plus krok ponowienia (`ProjectQuotePdfUploadStep`, reużyty, z opcjonalnym `initialFilename` gdy wgranie od razu się powiodło). Przycisk „Pobierz PDF” na `/producer/panel/board-quotes` i na ekranie wycen klienta (woła `getProjectQuotePdfUrl`, otwiera wynik) bez zmian. Satisfies **AC-11**
11. Tłumaczenia pl/en/nl/de nowych napisów, przegląd dostępności WCAG 2.2 AA. Satisfies **AC-11**
12. Testy: `validateDocumentPdf` z `maxBytes`, `uploadProjectQuotePdf` (własność, status, zastąpienie, wyścig z akceptacją), `getProjectQuotePdfUrl` (klient właściciel, klient z niepowiązanym `clientId = NULL` odmówiony, producent właściciel, inny producent odmówiony bez przecieku, nieistniejąca wycena), rozszerzone zapytania odczytu, `submitProjectQuote.quoteId`, test komponentu `QuoteForm`, i jeden test Playwright wgrywający plik powyżej 1 MB (prawdziwa granica transportu, nie wywołanie funkcji w Vitest). Satisfies wszystkie powyższe AC

## Consequences

**Positive**:
- Producent zachowuje pełną wolność wizualną (Canva/PowerPoint/Word) bez budowania przez ModularHub kreatora wizualnego w aplikacji.
- Liczbowe pola wyceny zostają jedynym źródłem prawdy do sortowania/porównania wycen w panelu klienta; PDF jest zaufanym dodatkiem, nie zagraża dzisiejszej logice.
- Reużywa dojrzały wzorzec `document`/R2 zamiast wprowadzać nowy paradygmat przechowywania plików.
- Generyczne nazwy `PRIVATE_R2_*` (nie wąskie, nie powiązane z tą jedną funkcją) od razu obsłużą przyszłe prywatne purpose (`company_verification`, pliki spraw ze spec 0048) bez kolejnej zmiennej środowiskowej.
- Jeden połączony krok (AC-11) usuwa ryzyko porzucenia: producent, który wybrał plik, nie musi pamiętać wrócić na osobny ekran, żeby go wgrać.

**Negative / tradeoffs**:
- Drugi prywatny kubełek (nawet jeśli reużyty) to nowa powierzchnia operacyjna: własne poświadczenia, własny sprawdzian jurysdykcji, brak dzisiaj health checku na `/internal/monitoring` (patrz Follow-up).
- Brak skanowania antywirusowego i brak limitu liczby stron; ten sam, już przyjęty w projekcie poziom ryzyka co `product_sales_pdf`/`product_specification`, nie nowy, ale wciąż realny dla pliku widzianego przez realnego inwestora B2B.
- PDF zostaje opcjonalny bez żadnego nudge'a systemowego; producent, który o nim zapomni, nie dostaje żadnego sygnału.
- Łącząc wybór pliku z formularzem ceny (AC-11), nieudane wgranie PDF-a (np. plik za duży) musi mieć osobną, czytelną ścieżkę błędu, która nie sugeruje, że cała wycena się nie powiodła — `QuoteForm` pokazuje sukces wyceny i osobny komunikat błędu PDF-a plus krok ponowienia w tym samym miejscu, nieco bardziej złożone niż prosty formularz, ale unika fałszywego cofnięcia udanej wyceny.

**Neutral**:
- Rewizja wyceny (nowe wywołanie `submitProjectQuote`) zaczyna bez PDF-a, nawet jeśli zastąpiona wycena go miała; producent musi go wgrać ponownie, jeśli wciąż aktualny.
- Pliki po `superseded`/`rejected` wycenach zostają w magazynie na trwałe (miękkie usunięcie, nie fizyczne); brak polityki retencji/czyszczenia w tej wersji, tak jak dla każdego innego purpose dziś.
- `submitProjectQuote` wysyła e-mail do inwestora (`notifyContactOfNewQuote`) zanim `uploadProjectQuotePdf` zdąży się zakończyć (AC-1/AC-2 to wciąż dwa osobne wywołania serwera, `QuoteForm` woła je sekwencyjnie jedno po drugim). Pierwotnie (AC-11 w pierwszej wersji tego spec) to dwuetapowy wzorzec UI był świadomym wyborem, ten sam co `uploadProductSalesPdf` po utworzeniu produktu; po zmianie na jeden połączony krok (patrz rationale.md) okno na "e mail bez PDF-a" jest dużo krótsze (milisekundy/sekundy w tym samym submit, nie czas do ewentualnego powrotu producenta na osobny ekran), ale teoretycznie wciąż istnieje — inwestor może otworzyć e-mail i kliknąć „Pobierz PDF”, zanim drugie wywołanie serwera zdąży się zakończyć.
- Dwa równoległe wgrania tej samej wyceny mogą zostawić jeden osierocony obiekt w prywatnym R2 (ten, którego wstawienie przegrywa unikalny indeks); nieszkodliwe, zgodne z dzisiejszym zachowaniem `uploadProductSalesPdf`.

## Follow-up

- [ ] Dodać health check prywatnego kubełka do `/internal/monitoring` (spec 0055), mirror `checkR2Health` dla publicznego; świadomie poza zakresem tego spec.
- [ ] Rozważyć dostęp administratora (`/internal`) do PDF-a każdej wyceny do rozstrzygania sporów; świadomie odłożone w tej wersji (inżynier potwierdził brak takiej potrzeby teraz).
- [ ] `lib/storage/AGENTS.md` nie opisuje jeszcze nowego `private-r2-client.ts` ani generycznej konwencji `PRIVATE_R2_*`; do uzupełnienia przez `/sync` po zbudowaniu.
- [ ] Rozważyć skanowanie antywirusowe lub limit liczby stron dla PDF-ów dokumentowych (ta i istniejące purpose), jeśli w praktyce pojawi się nadużycie; świadomie nie budowane teraz.
- [ ] Sprawdzić, czy dzisiejsze `uploadProductSalesPdf`/`uploadProductSpecificationPdf` (spec 0049/0050) faktycznie działały dla plików powyżej 1 MB przed tym spec — Next.js 16 domyślnie odrzuca akcje serwerowe powyżej 1 MB, a `next.config.ts` nigdy tego nie podnosił (znalezione przez cross check tego spec, Build plan #3 naprawia to przy okazji dla całej aplikacji, ale warto potwierdzić, czy ktoś już trafił na ten limit w praktyce).

## Migration plan

**Strategy**: bez feature flagu (nowa, opcjonalna zdolność, zero wpływu na istniejące dane); fazowana wyłącznie z powodu zewnętrznej, manualnej zależności (kubełek R2), nie z powodu ryzyka danych.

**Phases**:
1. Manualny: zweryfikować/założyć prywatny kubełek R2 i jego poświadczenia (Build plan #1), ustawić `PRIVATE_R2_*` na każdym środowisku.
2. Migracja: dodać `document.project_quote_id` (nullable), nową wartość enum, częściowy indeks unikalny. Bezpieczne na istniejących wierszach (kolumna nullable, enum ADD VALUE, indeks częściowy nie dotyczy istniejących danych).
3. Kod: wdrożyć nowe akcje i UI. Bezpieczne do wdrożenia dopiero po fazie 1 i 2 — bez prywatnego kubełka `uploadProjectQuotePdf`/`getProjectQuotePdfUrl` rzuciłyby błąd środowiskowy przy pierwszym wywołaniu (ten sam wzorzec co `R2_ACCOUNT_ID` w `r2-client.ts`), nie przy migracji.

**Rollback**: fazy 2 i 3 odwracalne przez revert commita (nowa kolumna/enum zostają nieszkodliwie, jeśli nieużywane). Faza 1 nie jest kodem, więc nie ma rollbacku kodu — jeśli bucket trzeba zmienić później, to kolejna zmiana konfiguracji, nie migracja.

**Risks**: faza 3 wdrożona przed fazą 1 ukończoną oznacza, że nowe akcje rzucają błąd środowiskowy przy pierwszym wywołaniu (brak `PRIVATE_R2_BUCKET_NAME`) — nieszkodliwe (nikt jeszcze nie korzysta z funkcji), ale do uniknięcia kolejnością wdrożenia.
