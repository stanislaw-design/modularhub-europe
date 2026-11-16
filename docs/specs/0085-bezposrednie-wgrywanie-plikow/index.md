# 0085. Bezpośrednie wgrywanie plików do R2 (załączniki zapytań i PDF oferty)

**Date**: 2026-11-13
**Status**: In Progress

## Summary

Dziś plik idzie z przeglądarki przez funkcję serwerową do R2, a Vercel odrzuca żądania powyżej około 4,5 MB, więc większy PDF kończy się ogólnym błędem. Ta zmiana wysyła plik prosto z przeglądarki do prywatnego R2 przez krótko ważny, podpisany adres, a serwer tylko wydaje adres i potem potwierdza plik. Obejmuje załączniki zapytań (spec 0070 część D) i PDF oferty producenta (spec 0063). Nowa tabela `upload_intent` pamięta rozpoczęte wgrania, więc sprzątanie, limity gościa i podwójne potwierdzenie mają jedno miejsce. Limit 20 MB na plik zostaje.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako inwestor (klient albo gość z tokenem) chcę wgrać do zapytania plik do 20 MB, żeby producent dostał pełny projekt, a nie skompresowany.
- Jako doradca (admin) chcę dodać duży plik do zapytania w imieniu klienta bez błędu "nie udało się zapisać pliku".
- Jako producent chcę dołączyć do oferty PDF do 20 MB, bo oferta z rzutami często jest większa niż 4,5 MB.
- Jako zespół ModularHub chcę, żeby po nieudanych wgraniach nie zostawały obiekty w R2, i żeby znikały też pliki skasowane dawno temu.

**Acceptance criteria** (kontrakt, każde kryterium można sprawdzić osobno):
- **AC-1**: Klient, gość z ważnym `uploadToken` i admin wgrywają do zapytania PDF 15 MB oraz obraz 15 MB na wdrożeniu Vercel (staging, a po wydaniu produkcja). Plik nie przechodzi przez funkcję serwerową, a wiersz pliku powstaje i plik da się pobrać podpisanym linkiem (AC-30 z 0070).
- **AC-2**: Wgranie ma dwa kroki serwerowe: `requestInquiryAttachmentUpload` wydaje podpisany adres do zapisu (PUT, ważny 15 minut) pod kluczem tymczasowym `uploads/<uuid>`, a `confirmInquiryAttachment` po sprawdzeniu pliku kopiuje go na klucz ostateczny i dopiero wtedy dodaje wiersz do `inquiry_attachment`. Bez potwierdzenia wiersz nie powstaje, a plik nigdy nie jest widoczny dla producenta.
- **AC-3**: Prośba o adres sprawdza to, co dziś sprawdza wgranie (spec 0070 AC-28, AC-29, AC-32): admin, klient właściciel albo ważny `uploadToken`; dla klienta i gościa zapytanie aktywne, bez wyboru oferty, przed terminem i przed publikacją podsumowania; `confirmedNoContactData` od klienta i gościa; typ MIME z listy (PDF, JPEG, PNG, WebP) i zadeklarowany rozmiar od 1 bajta do 20 MB; limity 10 plików i 60 MB liczone razem z wgraniami rozpoczętymi w ciągu ostatnich 15 minut i jeszcze niezużytymi (czyli takimi, których adres nadal działa); dzienny limit bajtów gościa liczony tak samo. Ponowna prośba o ten sam plik (ten sam wywołujący, cel, nazwa i rozmiar) unieważnia poprzedni niezużyty zamiar i usuwa jego obiekt, więc ponowienie nie zajmuje drugiego miejsca w limicie. Brak dostępu i nieistniejące zapytanie dają ten sam komunikat.
- **AC-4**: Obiekt większy niż 20 MB nigdy nie zostaje przyjęty, niezależnie od tego, czy R2 egzekwuje podpisaną długość. `confirmInquiryAttachment` bierze rozmiar z HEAD, wymaga równości z deklaracją i czyta obiekt z twardym limitem `maxBytes` (nie ufa samemu HEAD). Niezgodny obiekt jest usuwany. Adres jest dodatkowo podpisany na deklarowany typ treści i długość; czy R2 odrzuca PUT o innej długości, rozstrzyga test `curl` w zadaniu 3, a wynik wchodzi do tej specyfikacji.
- **AC-5**: Potwierdzenie sprawdza zawartość: PDF jest pobierany w całości do funkcji i przechodzi `validateDocumentPdf` (dla zapytań z `rejectActiveContent: true`, dla PDF oferty tak jak dziś, bez tej opcji), a obraz sprawdza sygnatura pierwszych bajtów (`detectImageMimeType`). Plik odrzucony jest usuwany z R2, a zamiar zostaje zużyty i oczyszczony.
- **AC-6**: Potwierdzenie działa w stałej kolejności: sprawdza uprawnienia i powiązanie zamiaru, potem HEAD, potem zawartość i ETag, potem kopiuje obiekt na klucz ostateczny (`CopyObject` z warunkiem `If-Match` na ETag zwalidowanej wersji), i dopiero na końcu jednym poleceniem SQL zużywa zamiar i wstawia wiersz (`WITH c AS (UPDATE upload_intent SET consumed_at = now() WHERE id = ? AND consumed_at IS NULL AND expires_at > now() RETURNING ...) INSERT ... SELECT ... FROM c`). Dwa równoległe potwierdzenia tego samego zamiaru dają jeden wiersz. Zamiar potwierdza tylko ten sam wywołujący (porównanie `actor_user_id` dla admina, klienta i producenta, a dla gościa token zgodny z celem zapisanym w zamiarze), a `purpose` zamiaru musi pasować do wywołanej akcji.
- **AC-7**: Potwierdzenie sprawdza stan zapytania od nowa (wciąż aktywne, bez wyboru oferty). Zużycie zamiaru, wiersz pliku i `attachments_changed_at` zapisują się razem (dla admina przez `withAdminActor`), a wyzwalacz z `drizzle/0059` pozostaje ostateczną granicą limitów. Błąd wyzwalacza cofa też zużycie zamiaru, usuwa obiekt ostateczny i zwraca ten sam kod błędu co dziś (`closed`, `limit_count`, `limit_size`, `limit_stored`); zamiar zostaje do ponowienia do czasu wygaśnięcia.
- **AC-8**: PDF oferty: producent wgrywa plik do 20 MB tą samą parą kroków (`requestProjectQuotePdfUpload`, `confirmProjectQuotePdfUpload`). Potwierdzenie wykonuje dotychczasową atomową podmianę jako jedno polecenie SQL (zużycie zamiaru, miękkie usunięcie starego dokumentu i wstawienie nowego w jednym `WITH`, warunek `status = 'active'` i właściciel oferty w samym SQL, spec 0063 AC-13). Błędy mają kody: `no_access`, `quote_inactive` (dziś `RACE_ERROR`), `too_large`, `invalid_type`, `not_uploaded`, `expired`, `file_rejected`, `generic`. Nazwa pliku w `document` jest oczyszczona (dziś trafia tam surowe `file.name`). `QuoteForm` i `ProjectQuotePdfUploadStep` używają nowych kroków.
- **AC-9**: Zadanie `/api/cron/uploads-cleanup` (co godzinę, `Authorization: Bearer ${CRON_SECRET}`) robi cztery rzeczy: usuwa z R2 obiekty tymczasowe zamiarów niezużytych, wygasłych od ponad 15 minut, najpierw zajmując wiersz warunkowo (`UPDATE ... SET purged_at = now() WHERE consumed_at IS NULL AND purged_at IS NULL AND expires_at < now() - interval '15 minutes' RETURNING r2_key`), a przy błędzie usunięcia cofając `purged_at`, żeby następne uruchomienie ponowiło; usuwa klucze tymczasowe wszystkich zamiarów starszych niż 1 godzina niezależnie od stanu (usuwanie jest idempotentne, to sprząta ponowny PUT po potwierdzeniu); usuwa z R2 obiekty plików zapytań z `deleted_at` starszym niż 30 dni i ustawia ich `purged_at` (spec 0070 zadanie 17, którego dziś brak w `vercel.json`); usuwa z `upload_intent` wiersze zużyte lub oczyszczone starsze niż 7 dni. Błąd jednego obiektu nie przerywa pętli i trafia do Sentry, a powtórne uruchomienie jest bezpieczne.
- **AC-10**: Akcje `uploadInquiryAttachment` i `uploadProjectQuotePdf` (przyjmujące `File`) są usunięte w tym samym wydaniu, w którym uploadery przechodzą na nową ścieżkę. W kodzie nie ma już ścieżki wgrywania pliku przez funkcję serwerową dla tych dwóch przypadków. Karta otwarta przed wdrożeniem pokaże błąd i wymaga odświeżenia; jest to akceptowane, bo i tak każdy plik powyżej 4,5 MB kończył się błędem.
- **AC-11**: Uploadery w przeglądarce (zapytań oraz PDF oferty w `QuoteForm` i `ProjectQuotePdfUploadStep`) pokazują postęp per plik i błąd per plik z przyciskiem "Spróbuj ponownie". Rozróżniają: odmowę wydania adresu (kod błędu z serwera), błąd wysyłki do R2 (`upload_failed`: brak CORS albo sieć) i błąd potwierdzenia (potwierdzenie ponawia się do 2 razy, potem plik trzeba wgrać jeszcze raz). Błąd jednego pliku nie cofa zapytania ani pozostałych plików. Wszystkie nowe teksty są w pl, en, de i nl.
- **AC-12**: Na prywatnym buckecie R2 jest reguła CORS dla PUT z domeny produkcyjnej, staging i `http://localhost:3000`, z nagłówkiem `Content-Type` (przeglądarka sama ustawia `Content-Length`, więc nie wymaga wpisu). Sprawdzenie i ewentualne dodanie reguły jest krokiem zero w planie budowy.
- **AC-13**: Zdarzenie `inquiry_attachment_uploaded` i błędy do Sentry działają jak dziś, bez nazwy pliku i bez adresu e mail. Nowe kody błędów mają teksty w czterech językach.
- **AC-14**: Ponowny PUT pod ten sam podpisany adres po potwierdzeniu nie zmienia zapisanego pliku: klucz ostateczny jest kopią zwalidowanego obiektu, a podpis nie sięga tego klucza. Obiekt, który ktoś mimo to zostawi pod kluczem tymczasowym, sprząta zadanie z AC-9.

## Decision

**Chosen option**: Option 1: bezpośrednie wgrywanie podpisanym adresem z tabelą zamiarów w bazie.

Plik leci z przeglądarki do prywatnego R2, a dwa kroki serwerowe (prośba i potwierdzenie) pilnują uprawnień, limitów i zawartości, przy czym stan rozpoczętego wgrania trzyma tabela `upload_intent`.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Feature design

**Data model**: jedna nowa tabela `upload_intent`, bez zmian w `inquiry_attachment` i `document`.

| Pole | Typ | Zasada |
|---|---|---|
| `id` | uuid, klucz główny | domyślnie losowy |
| `purpose` | text, NOT NULL | CHECK: `inquiry_attachment` albo `project_quote_pdf` |
| `project_request_id` | uuid, null, klucz obcy | cel dla `inquiry_attachment` |
| `bulk_product_inquiry_id` | uuid, null, klucz obcy | cel dla `inquiry_attachment` |
| `project_quote_id` | uuid, null, klucz obcy | cel dla `project_quote_pdf` |
| `actor_kind` | text, NOT NULL | CHECK: `staff`, `client`, `guest`, `producer` |
| `actor_user_id` | text, null, klucz obcy do `users` | puste dla gościa (CHECK jak w `inquiry_attachment`) |
| `r2_key` | text, NOT NULL, unikalny | losowy klucz tymczasowy `uploads/<uuid>`; klucz ostateczny powstaje przy potwierdzeniu i trafia do wiersza pliku |
| `mime_type` | text, NOT NULL | zadeklarowany typ |
| `declared_size_bytes` | integer, NOT NULL | CHECK: od 1 do 20 MB |
| `filename` | text, NOT NULL | oczyszczona nazwa (jak `sanitizeAttachmentFilename`) |
| `consent_confirmed` | boolean, NOT NULL, domyślnie false | prawda, gdy klient lub gość potwierdził brak danych kontaktowych |
| `created_at` | timestamptz, NOT NULL | domyślnie `now()` |
| `expires_at` | timestamptz, NOT NULL | `created_at` plus 1 godzina |
| `consumed_at` | timestamptz, null | ustawiane przy potwierdzeniu albo odrzuceniu |
| `purged_at` | timestamptz, null | ustawiane, gdy obiekt usunięto z R2 |

CHECK na celu: dla `inquiry_attachment` dokładnie jedno z `project_request_id` i `bulk_product_inquiry_id` jest ustawione, a `project_quote_id` puste; dla `project_quote_pdf` tylko `project_quote_id`. Indeksy: unikalny `r2_key`; częściowy po `expires_at` dla wierszy z `consumed_at IS NULL AND purged_at IS NULL`; po celu (każda z trzech kolumn, częściowy) do liczenia rozpoczętych wgrań.

**State transitions** (zamiar): utworzony, potem albo zużyty (`consumed_at`, plik przyjęty), albo odrzucony (`consumed_at` i `purged_at`, plik niezgodny), albo wygasły (po `expires_at`, sprząta zadanie czyszczące i ustawia `purged_at`).

**API surface** (akcje serwerowe, `"use server"`, kod domenowy w plikach `server-only`):

| Akcja | Wejście | Wynik | Kto | Główne błędy |
|---|---|---|---|---|
| `requestInquiryAttachmentUpload` | `kind`, `inquiryId`, `{ filename, mimeType, sizeBytes }`, `{ uploadToken?, confirmedNoContactData? }` | `intentId`, `uploadUrl`, `expiresAt` | admin, klient właściciel, gość z tokenem | `no_access`, `consent_required`, `invalid_type`, `too_large`, `limit_count`, `limit_size`, `limit_stored`, `closed`, `guest_daily_limit`, `generic` |
| `confirmInquiryAttachment` | `intentId`, `{ uploadToken? }` | `attachmentId` | ten sam wywołujący co przy prośbie | `no_access`, `not_uploaded`, `expired`, `file_rejected`, `closed`, `limit_*`, `generic` |
| `requestProjectQuotePdfUpload` | `quoteId`, `{ filename, sizeBytes }` | `intentId`, `uploadUrl`, `expiresAt` | producent właściciel oferty | `no_access`, `quote_inactive`, `too_large`, `invalid_type`, `generic` |
| `confirmProjectQuotePdfUpload` | `intentId` | `documentId` | ten sam producent | `no_access`, `not_uploaded`, `expired`, `file_rejected`, `quote_inactive`, `generic` |
| `GET /api/cron/uploads-cleanup` | nagłówek `Authorization: Bearer ${CRON_SECRET}` | liczniki: oczyszczone zamiary, oczyszczone pliki, usunięte wiersze | tylko cron | 401 bez sekretu (brak `CRON_SECRET` oznacza zawsze 401) |

Pomocnicze moduły: `lib/storage/direct-upload.ts` (`server-only`: tworzenie, zużywanie i oczyszczanie zamiarów, liczenie rozpoczętych wgrań, funkcja sprzątająca wołana przez zadanie), rozszerzony `lib/storage/private-r2-client.ts` (`buildSignedUploadUrl` z opcjonalną długością w podpisie, bez zmiany zachowania dla `lib/conversations`; nowe `readPrivateObjectBytes(key, maxBytes)` z pełnym pobraniem, twardym limitem i ETag; nowe `copyPrivateObject(from, to, ifMatchEtag)`) oraz `lib/storage/direct-upload-client.ts` (kod przeglądarki: wysyłka PUT przez `XMLHttpRequest` z postępem). Klucze tymczasowe mają prefiks `uploads/`, a ostateczne prefiks celu, np. `inquiry-attachments/<uuid><rozszerzenie>` i `quote-pdfs/<uuid>.pdf`, bez nazw osób i firm. Istniejące pliki zostają pod starymi kluczami.

**Key invariants**:
- Wiersz w `inquiry_attachment` albo nowy `document` oferty powstaje tylko dla zamiaru zużytego przez potwierdzenie, którego obiekt w R2 przeszedł kontrolę rozmiaru i zawartości.
- Każdy obiekt tymczasowy ma zamiar, który zadanie czyszczące usunie w ciągu około 2 godzin od utworzenia zamiaru (1 godzina ważności plus kwadrans zapasu plus jedno uruchomienie co godzinę). Obiekt pod kluczem ostatecznym jest zawsze kopią zwalidowanego obiektu i ma wiersz; podpisany adres nie sięga klucza ostatecznego, więc ponowny PUT nie zmienia zapisanego pliku.
- Jeden zamiar daje najwyżej jeden plik.
- Limity 10 plików i 60 MB zapytania oraz dzienny limit gościa obowiązują także wgrania rozpoczęte w ciągu ostatnich 15 minut; wyzwalacz w bazie zostaje ostateczną granicą przy zapisie pliku.
- Podpisany adres dotyczy jednego klucza, jednego typu i jednej długości i wygasa po 15 minutach; nieprzyznany plik jest nieczytelny publicznie, bo bucket jest prywatny.

**Security model**:
- Uprawnienia są takie jak dziś (spec 0070 AC-28 do AC-33) i sprawdzane dwa razy: przy prośbie i przy potwierdzeniu. Zamiar zapisuje, kto go utworzył. Potwierdzić może tylko ten sam wywołujący: admin, klient i producent muszą mieć ten sam `actor_user_id` (admin A nie potwierdzi zamiaru admina B), a gość musi mieć token zgodny z celem zapisanym w zamiarze (`kind` i `inquiryId` bierzemy z wiersza, nie z wejścia). `purpose` zamiaru musi pasować do akcji, więc zamiaru PDF oferty nie da się potwierdzić jako załącznika i odwrotnie.
- Gość: `uploadToken` (HMAC, 2 godziny) musi być ważny przy prośbie i przy potwierdzeniu. Wygasły token przy potwierdzeniu zostawia obiekt do sprzątania i pokazuje komunikat o ponownym dodaniu pliku.
- Zgoda AC-32 (brak danych kontaktowych w plikach) jest wymagana przy prośbie od klienta i gościa i zapisana w `consent_confirmed`. Potwierdzenie bez zapisanej zgody dla klienta lub gościa jest odrzucane.
- Cudzy klucz nie przejdzie: potwierdzenie przyjmuje tylko `intentId`, a klucz bierze z wiersza zamiaru. Klucz jest losowy i nigdy nie jest zwracany inaczej niż w podpisanym adresie.
- Zakres danych osobowych jak w 0070 (pliki mogą zawierać dane inwestora). Niepotwierdzone obiekty znikają w około 2 godziny.
- Reguła CORS pozwala tylko na PUT z wymienionych domen. Podpisany adres działa bez ciasteczek, więc CORS nie otwiera niczego ponad podpis.

**Configuration required**:
- Brak nowych zmiennych środowiskowych. Używane: `R2_ACCOUNT_ID`, `PRIVATE_R2_BUCKET_NAME`, `PRIVATE_R2_ACCESS_KEY_ID`, `PRIVATE_R2_SECRET_ACCESS_KEY`, `GUEST_UPLOAD_DAILY_BYTES`, `CRON_SECRET`.
- Reguła CORS na prywatnym buckecie (panel Cloudflare, jurisdiction EU): `AllowedOrigins` domena produkcyjna, domena staging i `http://localhost:3000`; `AllowedMethods` `PUT`; `AllowedHeaders` `Content-Type`; `MaxAgeSeconds` 3600.
- Wpis w `vercel.json` (`crons`): `/api/cron/uploads-cleanup`, harmonogram `0 * * * *` (co godzinę, Vercel Pro, tylko produkcja).
- Migracja `drizzle/0072_*` z tabelą `upload_intent`; po dodaniu nowych kluczy tłumaczeń restart `next dev`.

**Critical test scenarios**:
- Gość z tokenem wgrywa PDF 15 MB na staging: powstaje wiersz, plik da się pobrać podpisanym linkiem, funkcja serwerowa nigdy nie dostała ciała pliku, verifies **AC-1**, **AC-2**
- Klient, admin i producent wgrywają plik 15 MB (zapytanie i oferta), verifies **AC-1**, **AC-8**
- Dwa równoległe potwierdzenia tego samego zamiaru dają jeden wiersz, verifies **AC-6**
- Ponowny PUT pod ten sam adres po potwierdzeniu nie zmienia zapisanego pliku (klucz ostateczny bez zmian, obiekt tymczasowy sprzątnięty), verifies **AC-14**
- Admin A nie potwierdzi zamiaru admina B, a zamiar PDF oferty nie potwierdzi się jako załącznik zapytania ani odwrotnie, verifies **AC-6**
- Ponowna prośba o ten sam plik unieważnia poprzedni zamiar i nie zajmuje drugiego miejsca w limicie, verifies **AC-3**, **AC-11**
- Potwierdzenie przed wysłaniem pliku daje `not_uploaded`, a zamiar zostaje do ponowienia, verifies **AC-2**, **AC-11**
- Plik o rozmiarze innym niż deklaracja albo powyżej 20 MB jest usunięty z R2 i odrzucony, verifies **AC-4**
- Obraz nazwany `.pdf` i PDF z `/JS` (zapytanie) oraz zaszyfrowany PDF są odrzucone i usunięte, verifies **AC-5**
- Klient wybiera ofertę między prośbą a potwierdzeniem: potwierdzenie daje `closed`, obiekt usunięty, verifies **AC-7**
- Wyzwalacz limitu przy potwierdzeniu usuwa obiekt ostateczny, cofa zużycie zamiaru i zwraca `limit_count`, verifies **AC-7**
- Gość bez zgody, bez tokenu i z tokenem innego zapytania dostaje odmowę przy prośbie i przy potwierdzeniu, verifies **AC-3**, **AC-6**
- Dzienny limit gościa liczy rozpoczęte wgrania, verifies **AC-3**
- Zadanie czyszczące usuwa obiekt wygasłego zamiaru, obiekt pliku skasowanego 31 dni temu, stare wiersze zamiarów, a błąd jednego obiektu nie przerywa pętli; drugie uruchomienie nic nie psuje; bez `CRON_SECRET` odmowa, verifies **AC-9**
- Podmiana PDF oferty zachowuje atomowość (przegrany wyścig nie kasuje starego pliku), verifies **AC-8**
- Test na staging bez reguły CORS pokazuje błąd `upload_failed` z czytelnym tekstem, verifies **AC-11**, **AC-12**
- Test spójności kluczy tłumaczeń (pl, en, de, nl) przechodzi, verifies **AC-11**, **AC-13**

## Build plan

Podejście projektu to Tracer Bullet (cienki, prawdziwy wątek przez wszystkie warstwy, potem pogrubianie), więc najpierw dowód na jednym przypadku, potem reszta.

1. [ ] Krok zero: sprawdź w panelu Cloudflare i dodaj regułę CORS na prywatnym buckecie dla domeny produkcyjnej, staging i localhost, satisfies **AC-12**
2. [x] Migracja i schemat Drizzle dla `upload_intent` (CHECK, indeksy, unikalny `r2_key`), test schematu, `db:generate` i sprawdzenie na gałęzi Neon, satisfies **AC-6**, **AC-9**
3. [x] Klient prywatnego R2: `buildSignedUploadUrl` z opcjonalną długością w podpisie (`signableHeaders`), `readPrivateObjectBytes` z limitem i ETag, `copyPrivateObject` z `If-Match`, testy jednostkowe oraz test `curl` na staging, czy R2 egzekwuje podpisaną długość (wynik wpisać do tej specyfikacji), satisfies **AC-4**, **AC-5**, **AC-6**
4. [x] `lib/storage/direct-upload.ts`: tworzenie zamiaru, atomowe zużycie, liczenie rozpoczętych wgrań, usunięcie obiektu i oznaczenie jako oczyszczony, satisfies **AC-2**, **AC-6**
5. [x] Cienki przekrój dla załączników zapytań: `requestInquiryAttachmentUpload` i `confirmInquiryAttachment` (uprawnienia z wiązaniem do wywołującego, token gościa, zgoda, limity z oknem 15 minut, klucz tymczasowy, walidacja, kopia na klucz ostateczny, zużycie zamiaru i zapis jednym poleceniem SQL), `direct-upload-client.ts` i podpięcie w `InquiryAttachmentUploader` dla jednego pliku; test 15 MB na staging jako gość i jako admin, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-14**
6. [x] Pogrubienie uploaderów (zapytań oraz PDF oferty w `QuoteForm` i `ProjectQuotePdfUploadStep`): postęp, błędy per plik, ponowienie potwierdzenia do 2 razy, rozróżnienie `upload_failed`, tłumaczenia w czterech językach, zdarzenia i Sentry, satisfies **AC-11**, **AC-13**
7. [x] Zadanie czyszczące (wchodzi na produkcję razem z zadaniem 5, nie później, żeby sieroty się nie zbierały): funkcja sprzątająca z warunkowym zajęciem wiersza i cofnięciem przy błędzie, trasa `/api/cron/uploads-cleanup`, wpis w `vercel.json`, testy włącznie z 30 dniami od `deleted_at`, satisfies **AC-9**
8. [x] PDF oferty: `requestProjectQuotePdfUpload` i `confirmProjectQuotePdfUpload` z dotychczasową atomową podmianą w jednym `WITH`, kodami błędów i oczyszczoną nazwą pliku, przełączenie `QuoteForm` i `ProjectQuotePdfUploadStep`, test wyścigu, satisfies **AC-8**
9. [ ] Testy: scenariusze jednostkowe i test Playwright (z `DATABASE_URL`, zgodnie z regułą z `AGENTS.md`), test na staging dla pliku powyżej 4,5 MB, satisfies **AC-1** do **AC-9**
10. [x] Usunięcie `uploadInquiryAttachment` i `uploadProjectQuotePdf` oraz ich testów w tym samym wydaniu co zadania 5 i 8, satisfies **AC-10**

## Consequences

**Positive**:
- Pliki do 20 MB działają niezależnie od limitu żądania funkcji Vercela, także PDF oferty producenta.
- Jedno miejsce prawdy o rozpoczętych wgraniach rozwiązuje limit dzienny gościa, wyścig dwóch potwierdzeń i sprzątanie sierot.
- Zadanie czyszczące zamyka też lukę ze spec 0070: skasowane pliki w końcu znikają z R2.
- Wspólny mechanizm bezpośredniego wgrywania można później użyć dla innych plików.

**Negative / tradeoffs**:
- Wgranie ma dwa kroki i trzy elementy do utrzymania (akcje, tabela, zadanie czyszczące) zamiast jednej akcji.
- Plik trafia do R2, zanim go sprawdzimy. Zła zawartość jest usuwana po potwierdzeniu, a niepotwierdzona po około 2 godzinach.
- Wgrywanie zależy od reguły CORS. Bez niej każdy plik daje `upload_failed`, a nowe domeny (np. podgląd Vercela) trzeba dopisać.
- Potwierdzenie pobiera cały PDF do funkcji (do 20 MB) i trzyma go w pamięci na czas walidacji.
- Potwierdzenie robi dodatkową operację `CopyObject` w R2 (po stronie R2, plik nie wraca przez funkcję), a klucz tymczasowy wymaga sprzątania.
- Podpisana długość nie jest dla mnie potwierdzona jako egzekwowana przez R2; do czasu testu liczy się kontrola HEAD i wygasanie.

**Neutral**:
- Istniejące pliki zostają pod starymi kluczami, a odczyt (`getInquiryAttachmentUrl`, link pobrania oferty) się nie zmienia.
- Zdania w spec 0070 część D (punkt 2 o "limicie ciała 24 MB", punkt 6 o zapisie przez `uploadPrivateObject`) i w spec 0063 AC-12 staną się nieaktualne po wdrożeniu; `/sync` ma je poprawić. Reguła w `lib/storage/AGENTS.md` "uploady zawsze idą przez serwer" przestaje być prawdziwa dla prywatnego bucketu.
- Konfiguracja `bodySizeLimit` 24 MB w `next.config.ts` zostaje, dopóki inne akcje serwerowe przyjmują duże ciała.

## Migration plan

**Strategy**: strangler (nowa ścieżka obok starej, potem usunięcie starej).
**Phases**:
1. Migracja `upload_intent` na dev i prod (tylko dodanie tabeli, bez zmiany działania) oraz reguła CORS. To musi być zrobione przed wdrożeniem kodu, który z nich korzysta.
2. Jedno wydanie: nowe akcje, uploadery, zadanie czyszczące, przełączenie `QuoteForm` i usunięcie starych akcji. Test pliku powyżej 4,5 MB na staging przed produkcją. Karta otwarta przed wdrożeniem pokaże błąd i wymaga odświeżenia.
**Rollback**: cofnięcie wydania przywraca stare akcje razem ze starym uploaderem. Tabela `upload_intent` i zadanie czyszczące są nieszkodliwe bez nowych akcji.
**Risks**: R2 może ignorować podpisaną długość pliku (wtedy zostaje kontrola HEAD i wygasanie, patrz Follow-up); brak albo błąd w regule CORS blokuje wszystkie wgrania; domena podglądu Vercela spoza listy CORS nie przetestuje wgrywania, więc test dużego pliku robimy na staging.

## Follow-up

- [ ] Odchylenie od AC-8 przy budowie: podmiana PDF oferty to dwa polecenia SQL w jednej transakcji (`db.batch`: miękkie usunięcie starego, potem `WITH` zużywające zamiar i wstawiające nowy), a nie jedno `WITH`, bo częściowy indeks unikalny "jeden aktywny PDF na ofertę" sprawdza się wiersz po wierszu i przy jednym poleceniu zależałby od kolejności zapisów. Gwarancje te same (warunek `active` i właściciel w samym SQL, jeden dokument na zamiar). Poprawić tekst AC-8 w `/architect`.
- [ ] Zapisać wynik testu `curl` (zadanie 3): czy R2 odrzuca PUT o długości innej niż podpisana. Specyfikacja jest bezpieczna w obu przypadkach (kontrola HEAD, twardy limit przy pobraniu i klucz tymczasowy), ale wynik rozstrzyga, czy potrzebny jest krótszy czas ważności adresu.
- [ ] Ta sama luka (ponowny PUT pod ten sam klucz po potwierdzeniu) jest w `lib/conversations/attachments.ts` (spec 0080). Naprawić tym samym wzorcem: klucz tymczasowy i kopia na klucz ostateczny.
- [ ] Miękko usunięte PDF oferty (`document.deleted_at`) i stare wersje zastąpione przy podmianie nigdy nie znikają z R2. Dopisać do zadania czyszczącego albo osobnej specyfikacji.
- [ ] Po wdrożeniu `/sync`: poprawić zdania w spec 0070 część D i spec 0063 AC-12 oraz regułę w `lib/storage/AGENTS.md`, dopisać do niego kroki bezpośredniego wgrywania i tabelę `upload_intent`.
- [ ] Sprawdzić, czy inne akcje serwerowe przyjmują `File` (zdjęcia produktów w adminie, dokumenty producenta, import) i czy też mogą przekroczyć 4,5 MB; jeśli tak, przenieść je na wspólny mechanizm.
- [ ] Rozważyć usunięcie `bodySizeLimit` 24 MB i `proxyClientMaxBodySize` z `next.config.ts`, gdy żadna akcja nie przyjmuje już dużego ciała.
- [ ] Skaner danych kontaktowych i antywirusowy plików (Follow-up spec 0070) wpiąć w potwierdzenie, bo tam plik jest już w całości w pamięci funkcji.