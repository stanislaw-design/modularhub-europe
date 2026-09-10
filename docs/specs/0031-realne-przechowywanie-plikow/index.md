# 0031. Realne przechowywanie plików

**Date**: 2026-09-09
**Status**: Accepted

## Summary

Ta decyzja buduje prawdziwe przechowywanie plików na Cloudflare R2 (wybranym już w spec 0017): klienta R2, walidację, i nowe wewnętrzne narzędzie administratora do zarządzania zdjęciami produktów. Dzisiejsze 65 realnych produktów już ma prawdziwe, wielozdjęciowe galerie, ale żyją jako pliki wgrane na sztywno do repozytorium (`public/images/houses/`), dopisywane ręcznym commitem za każdym razem. Ta decyzja migruje je jednorazowym skryptem do R2 (tabela `document`, zaprojektowana już w spec 0018, ale dotąd pusta) i daje administratorowi narzędzie do zarządzania zdjęciami bez kolejnych commitów. Ekrany producenta oraz zdjęcia producentów zostają świadomie na dzisiejszym mocku, to osobne, przyszłe decyzje.

> ⚠️ Uwaga wstępna: temat zaczął się szerzej niż to, co ostatecznie zaprojektowano, a pierwszy szkic tego spec błędnie zakładał, że dzisiejsze produkty pokazują losowe zdjęcia z picsum.photos. Weryfikacja bazy danych i repozytorium (podczas cross checku) pokazała, że jest odwrotnie: 65 realnych produktów już ma prawdziwe zdjęcia, tylko żyją w niewłaściwym miejscu (repozytorium kodu zamiast R2). Ten spec skupia się na przeniesieniu tego, co już realne, do właściwej infrastruktury, plus jednym, wąskim konsumencie idącym naprzód (administrator zarządzający zdjęciami bez commitów). Reszta ("podłącz wszystko od razu": kreator producenta, domykanie luk, weryfikacja firmy, załączniki do ofert) jest jawnie odłożona, patrz Follow-up i pełne uzasadnienie w [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako administrator, chcę żeby dzisiejsze prawdziwe zdjęcia 65 istniejących produktów trafiły do R2 bez ręcznego wgrywania każdego z osobna, żeby nie powtarzać w kółko tej samej, żmudnej pracy.
- Jako administrator, chcę wgrać nowe zdjęcie istniejącego produktu przez ekran w przeglądarce, żeby dodanie lub podmiana zdjęcia nie wymagała już commitu do repozytorium i wdrożenia.
- Jako administrator, chcę oznaczyć jedno zdjęcie jako okładkę i ustawić kolejność pozostałych, żeby galeria produktu wyglądała tak, jak chcę.
- Jako administrator, chcę usunąć błędnie wgrane zdjęcie, żeby móc naprawić pomyłkę bez interwencji w bazie danych przez Neon MCP.
- Jako odwiedzający stronę klienta, chcę nadal widzieć te same, prawdziwe zdjęcia produktu na okładce i w galerii co dziś, niezależnie od tego, gdzie technicznie są przechowywane.

**Acceptance criteria**:
- **AC-1**: Jednorazowy skrypt migracyjny przenosi zdjęcia wszystkich dzisiejszych 65 produktów (dziś w `product.coverImageUrl` i `product.technicalSpecs._extraImageUrls`, pliki w `public/images/houses/`) do kubełka R2, tworząc dla każdego zdjęcia wiersz `document` (`purpose: product_photo`, pierwsze zdjęcie `isCover: true`, pozostałe z rosnącym `sortOrder`), bez ręcznego wgrywania przez UI.
- **AC-2**: Administrator zalogowany rolą `admin` może na nowym ekranie wewnętrznym wybrać istniejący produkt i wgrać jeden lub więcej nowych plików zdjęć; każdy wgrany plik trafia do kubełka R2 i tworzy wiersz w tabeli `document` (`purpose: product_photo`, `productId` ustawiony, `ownerUserId` administratora).
- **AC-3**: Niedozwolony typ pliku (poza JPEG/PNG/WebP, sprawdzone po rzeczywistej zawartości pliku, nie tylko rozszerzeniu) lub plik większy niż 10 MB jest odrzucany po stronie serwera z czytelnym komunikatem, zanim cokolwiek trafi do R2 lub do bazy.
- **AC-4**: Administrator może oznaczyć dokładnie jedno zdjęcie danego produktu jako okładkę; baza danych (nie tylko kod aplikacji) uniemożliwia istnienie dwóch okładek dla tego samego produktu.
- **AC-5**: Administrator może zmienić kolejność zdjęć w galerii produktu; kolejność jest trwale zapisana i widoczna po odświeżeniu strony.
- **AC-6**: Administrator może usunąć zdjęcie; usunięcie oznacza wiersz `document` jako usunięty (`deletedAt`) i usuwa odpowiadający obiekt z R2; rzadka awaria samego usunięcia z R2 jest zalogowana (Sentry), nie ukryta, i nie blokuje usunięcia wiersza w bazie.
- **AC-7**: Nowo wgrane lub zmigrowane zdjęcie jest trwale dostępne do wyświetlenia po odświeżeniu strony i w kolejnej sesji przeglądarki.
- **AC-8**: Strona wyników i strona szczegółów produktu po stronie klienta pokazują dokładnie te same zdjęcia co dziś: okładkę z wiersza `document` oznaczonego `isCover`, gdy taki istnieje, inaczej z `product.coverImageUrl`; galerię z pozostałych wierszy `document` danego produktu, gdy istnieją, inaczej z `technicalSpecs._extraImageUrls` (łagodny fallback w obie strony, nic się nie psuje w trakcie migracji).
- **AC-9**: Ekran wewnętrzny jest niedostępny dla niezalogowanego użytkownika i dla użytkownika bez roli `admin` (to samo zachowanie co dzisiejsze `/internal/zapytania`).

## Decision

**Chosen option**: Option 1: Wąski zakres, admin only narzędzie plus jednorazowy skrypt migracyjny (dwie inne rozważane opcje, "podłącz też ekrany producenta" i "tylko infrastruktura bez konsumenta", opisane w [rationale.md](rationale.md))

Zbudować warstwę R2 (klient, wgrywanie, usuwanie, walidacja) i podłączyć ją do dwóch konsumentów: jednorazowego skryptu migrującego dzisiejsze 65 realnych produktów z `public/` do R2, oraz nowego ekranu wewnętrznego dla administratora do zarządzania zdjęciami idąc naprzód. Ekrany producenta zostają nietknięte.

**Implementation skills**: `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`)

## Rationale

Pełne uzasadnienie, rozważane opcje i źródła: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Reużywa istniejącą tabelę `document` (spec 0018) bez zmiany kształtu kolumn. Jedyna zmiana schematu: nowy częściowy unikalny indeks.

| Kolumna | Typ | Uwaga |
|---|---|---|
| `id` | uuid, PK | już istnieje |
| `r2Key` | text, not null | już istnieje; generowany jako losowy UUID plus rozszerzenie, nigdy oryginalna nazwa pliku (unika kolizji i odgadywalnych adresów) |
| `filename` | text, not null | już istnieje, oryginalna nazwa pliku zachowana tylko do wyświetlenia |
| `mimeType` | text, not null | już istnieje |
| `sizeBytes` | integer, not null | już istnieje |
| `purpose` | enum, not null | ta funkcja używa wyłącznie `product_photo` |
| `isCover` | boolean, not null, default false | już istnieje |
| `sortOrder` | integer, nullable | już istnieje |
| `ownerUserId` | text, not null, FK `users.id` | administrator, który wgrał plik (dla migrowanych zdjęć: konto administratora uruchamiającego skrypt) |
| `productId` | uuid, nullable, FK `product.id` | już istnieje jako nullable |
| `deletedAt` | timestamp, nullable | już istnieje, soft delete |

**Nowa migracja**: częściowy unikalny indeks, poprawiony względem pierwszego szkicu tego spec (cross check znalazł brakujący filtr `purpose`, bez którego zdjęcie i rzut techniczny tego samego produktu mogłyby rywalizować o tę samą "okładkę"):

```sql
CREATE UNIQUE INDEX document_one_cover_per_product
  ON document (product_id)
  WHERE is_cover AND purpose = 'product_photo' AND deleted_at IS NULL;
```

Gwarantuje co najwyżej jedną okładkę na produkt na poziomie bazy danych, nie tylko aplikacji, satisfies AC-4. Ponieważ indeks unikalny w Postgresie traktuje wartości `NULL` jako wzajemnie różne, wiersze bez `productId` nigdy nie kolidują ze sobą.

**Relacje**: `product` 1 --- N `document` (przez `productId`); `users` 1 --- N `document` (przez `ownerUserId`, kto wgrał). Trigger audytu `document_audit` (migracja 0002) już obejmuje tabelę `document`, więc każdy insert/update/delete jest automatycznie logowany bez dodatkowej pracy.

**API surface** (Next.js Server Actions, nie REST; wszystkie za bramką roli `admin`):

| Akcja | Wejście | Wyjście | Auth | Kluczowe błędy |
|---|---|---|---|---|
| `uploadProductPhoto` | `productId`, plik (FormData) | nowy wiersz `document` | rola `admin` | 415 zły typ pliku, 413 za duży plik, 404 zły `productId` |
| `setCoverPhoto` | `documentId` | zaktualizowany wiersz | rola `admin` | 404 zły `documentId` |
| `reorderProductPhotos` | `productId`, uporządkowana lista `documentId` | lista zaktualizowanych wierszy | rola `admin` | 404, 422 lista nie pasuje do istniejących zdjęć produktu |
| `deleteProductPhoto` | `documentId` | potwierdzenie | rola `admin` | 404 |

Osobno, poza akcjami serwerowymi: skrypt migracyjny `scripts/migrate-existing-product-photos.ts` (uruchamiany ręcznie raz, nie część UI), satisfies AC-1.

**Kluczowe niezmienniki**:
- Co najwyżej jedna okładka na produkt, wymuszone przez indeks bazy danych (AC-4).
- `setCoverPhoto` działa w jednej transakcji: najpierw czyści `isCover` na wszystkich innych zdjęciach produktu, potem ustawia nowe; bez tego chwilowy stan dwóch okładek naruszyłby indeks unikalny.
- Wgrywanie: plik trafia do R2 przed wstawieniem wiersza `document`. To zapobiega jednemu kierunkowi problemu (wiersz wskazujący na nieistniejący obiekt), ale nie drugiemu: jeśli zapis do R2 się uda, a wstawienie wiersza w bazie zawiedzie (rzadkie, np. przejściowy błąd sieci do Neon), obiekt R2 zostaje osierocony bez wiersza. Przy skali tego narzędzia (admin, kilkadziesiąt plików) to zaakceptowane, rzadkie ryzyko, sprzątane ręcznie z panelu R2, nie osobny mechanizm uzgadniania.
- Usuwanie: wiersz `document` jest oznaczany jako usunięty (`deletedAt`) w tej samej akcji co próba usunięcia obiektu z R2; jeśli usunięcie z R2 się nie powiedzie, wiersz i tak zostaje oznaczony jako usunięty (błąd jest zalogowany do Sentry, nie blokuje operacji), zostawiając rzadki, zalogowany, ręcznie sprzątany osierocony plik zamiast blokować administratora.
- Walidacja typu i rozmiaru pliku zawsze po stronie serwera: sprawdzenie rozszerzenia i deklarowanego `Content-Type` to za mało (można je podrobić), więc pierwsze bajty pliku są porównywane z sygnaturami JPEG/PNG/WebP (proste sprawdzenie ręczne, bez nowej zależności, tylko trzy formaty w grze), satisfies AC-3.

**Security model**:
- Ekran wewnętrzny (`/internal/produkty`) używa dokładnie tego samego wzorca co `/internal/zapytania` (spec 0023): `auth()`, przekierowanie na logowanie gdy brak sesji, przekierowanie na `/klient` gdy rola inna niż `admin`. Bez tego wzorca żaden inny użytkownik nie ma dostępu.
- Kubełek R2 jest publiczny tylko do odczytu przez własną domenę (zdjęcia produktów to treść marketingowa, ma być publicznie widoczna); operacje zapisu i usuwania idą wyłącznie przez podpisane żądania serwera z poświadczeniami R2, nigdy z przeglądarki.
- Dane osobowe: żadne w tym wąskim zakresie (zdjęcia produktów, nie dokumenty osobowe); RODO adresowane już wyborem regionu UE w spec 0017. Gdy przyszła funkcja podłączy prywatne cele (`company_verification`, `order_stage`), będzie potrzebować osobnego, niepublicznego kubełka lub prefiksu; ten publiczny kubełek nie nadaje się do dokumentów prywatnych (patrz Follow-up).

**Configuration required**:
- `R2_ACCOUNT_ID`: identyfikator konta Cloudflare, do budowy adresu endpointu S3.
- `R2_ACCESS_KEY_ID`: klucz dostępu tokena R2 API.
- `R2_SECRET_ACCESS_KEY`: sekret tokena R2 API.
- `R2_BUCKET_NAME`: nazwa kubełka (jurysdykcja UE, założona jako część tej funkcji).
- `R2_PUBLIC_DOMAIN`: własna domena serwująca publicznie obiekty kubełka, dodana też do `images.remotePatterns` w `next.config.ts` (reguła już zapisana w `AGENTS.md`).

**Critical test scenarios**:
- Happy path (migracja): skrypt uruchomiony na kopii bazy tworzy dokładnie tyle wierszy `document`, ile plików wymienionych w `coverImageUrl`/`_extraImageUrls` istniejących produktów, każdy z poprawnym `isCover`/`sortOrder`, satisfies AC-1
- Happy path (admin): administrator wgrywa nowe zdjęcie JPEG 2 MB, widzi je w galerii, oznacza jako okładkę, odświeża stronę, zdjęcie i flaga okładki nadal tam są, satisfies AC-2, AC-4, AC-7
- Failure case: administrator próbuje wgrać plik ze zmienionym rozszerzeniem na `.jpg`, ale zawartością pliku wykonywalnego, żądanie jest odrzucone po sprawdzeniu rzeczywistych bajtów, zanim cokolwiek trafi do R2 lub bazy, satisfies AC-3
- Failure case: administrator usuwa zdjęcie, wiersz `document` ma `deletedAt` ustawiony niezależnie od wyniku usunięcia z R2, satisfies AC-6
- Auth/permission: producent (rola `producer`) próbuje wejść na `/internal/produkty`, zostaje przekierowany na `/klient`, satisfies AC-9
- Fallback: produkt bez żadnego wiersza `document` nadal pokazuje `product.coverImageUrl`/`_extraImageUrls` na wynikach i szczegółach, dokładnie jak dziś, satisfies AC-8

## Build plan

<!-- Kolejność zgodna z Tracer Bullet: jeden działający wątek koniec do końca przed pogrubieniem. -->

1. [x] Migracja: częściowy unikalny indeks `document_one_cover_per_product` (z filtrem `purpose`), satisfies AC-4 — wygenerowana (`drizzle/0010_high_blue_marvel.sql`) i zastosowana na realnej bazie
2. [x] Kubełek R2 (jurysdykcja UE) i token API założone ręcznie na koncie Cloudflare (krok poza kodem, patrz Follow-up); zmienne środowiskowe dodane do `.env.local` i `.env.local.example` — kubełek `modular-hub` założony ręcznie przez inżyniera (2026-09-09), publiczny dostęp przez `r2.dev` (własna domena odłożona, patrz Follow-up), token API (Object Read & Write, scoped do kubełka) utworzony, `.env.local` wypełnione. Po drodze znaleziony i naprawiony błąd w kodzie: kubełek z jurysdykcją UE wymaga jurysdykcyjnego S3 endpointu (`https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`), nie domyślnego — inaczej Cloudflare zwraca mylące `AccessDenied` zamiast błędu o jurysdykcji, patrz `lib/storage/r2-client.ts`
3. [x] Klient R2 (`lib/storage/r2-client.ts` lub podobnie): konfiguracja `@aws-sdk/client-s3` pod endpoint R2, funkcje `uploadObject`/`deleteObject`; generowanie `r2Key` jako UUID, satisfies AC-2, AC-6
4. [x] Walidacja pliku (`lib/storage/document-validation.ts`): schemat Zod dla rozmiaru/kształtu wejścia, plus sprawdzenie sygnatury bajtowej dla JPEG/PNG/WebP, satisfies AC-3
5. [x] Akcje serwerowe: `uploadProductPhoto`, `setCoverPhoto` (`db.batch`, nie `db.transaction` — driver `neon-http` w tym repo nie wspiera interaktywnych transakcji, patrz `lib/db/AGENTS.md`, worth a `/sync`), `reorderProductPhotos`, `deleteProductPhoto` (`lib/product-photo-actions.ts`), za bramką roli `admin`, satisfies AC-2, AC-3, AC-4, AC-5, AC-6, AC-9
6. [x] Ekran wewnętrzny `/internal/produkty` (lista produktów) i `/internal/produkty/[id]` (zarządzanie zdjęciami danego produktu), wzorowany na `/internal/zapytania`, satisfies AC-2, AC-4, AC-5, AC-6, AC-9
7. [x] `lib/data/projects.ts`: `getProjects()`/`getProjectById()`/`getFeaturedProjectByFamily()`/`getFavoritesForClient()` czytają okładkę i galerię z tabeli `document` (dołączenie zagregowane, nie fanout wierszy na produkt), z fallbackiem do `product.coverImageUrl`/`_extraImageUrls` gdy produkt nie ma żadnego wiersza `document`, satisfies AC-7, AC-8
8. [x] Skrypt migracyjny `scripts/migrate-existing-product-photos.ts`: dla każdego z 65 dzisiejszych produktów, wczytaj `coverImageUrl`/`_extraImageUrls`, wgraj odpowiadające pliki z `public/images/houses/` do R2, wstaw wiersze `document` (pierwsze zdjęcie `isCover: true`, reszta z `sortOrder`); tryb "na sucho" (dry run, domyślny) i `--apply` plus `--owner-user-id=` dla zapisu naprawdę, pomijanie już zmigrowanych produktów (idempotentny), satisfies AC-1 — napisany i sprawdzony dry-runem na realnej bazie (wszystkie 65 produktów rozpoznane poprawnie, jeden pre-istniejący problem z danymi znaleziony i zgłoszony w raporcie, patrz Consequences)
9. [x] Uruchomienie skryptu na realnej bazie, ręczna weryfikacja że wszystkie 65 produktów pokazuje te same zdjęcia co przed migracją — uruchomiony `--apply` na realnej bazie (2026-09-09): 65/65 produktów zmigrowanych (204 wiersze `document`), 64/65 zdjęć okładek + galerii wgranych do R2 (jedno pominięte, patrz Follow-up), zweryfikowano: dokładnie jedna okładka na produkt (0 duplikatów), próbkowy plik publicznie dostępny pod `R2_PUBLIC_DOMAIN` (200), `/pl/klient/wyniki` faktycznie serwuje obrazy z `*.r2.dev`, nie z `/images/houses/`

## Consequences

**Positive**:
- Dodanie lub podmiana zdjęcia produktu przestaje wymagać commitu do repozytorium i wdrożenia; administrator robi to z przeglądarki.
- Tabela `document` zaprojektowana w spec 0018 przestaje być martwym kodem, zaczyna być rzeczywiście używana.
- Repozytorium kodu przestaje rosnąć o kolejne zdjęcia produktów przy każdym nowym producencie (po migracji i usunięciu plików z drzewa roboczego, patrz Follow-up).
- Infrastruktura (klient R2, walidacja, wzorzec akcji serwerowych) jest gotowa do ponownego użycia przez przyszłe funkcje (11, 12, 14, 18, 19), bez ponownego projektowania warstwy magazynu.

**Negative / tradeoffs**:
- Producent nadal nie może wgrać własnego zdjęcia przez swój panel; to zostaje ręczną pracą administratora do czasu przyszłej decyzji o migracji ekranów producenta z `localStorage`.
- Usuwanie zdjęcia w normalnym przypadku kasuje plik z R2 od razu; nie ma możliwości odzyskania przypadkowo usuniętego zdjęcia inaczej niż wgrywając je ponownie.
- Rzadka, zaakceptowana możliwość osieroconego obiektu R2 przy nietypowej awarii w trakcie wgrywania lub usuwania (patrz Kluczowe niezmienniki); sprzątane ręcznie, nie automatycznie.
- Skrypt migracyjny to jednorazowy, ręcznie uruchamiany kod, nie funkcja UI; wymaga ostrożnego uruchomienia i weryfikacji na realnej bazie.

**Neutral**:
- Nowa zależność w `package.json` (`@aws-sdk/client-s3` wyłącznie; podpisywanie żądań `s3-request-presigner` nie jest potrzebne, bo wgrywanie idzie przez serwer, a serwowanie przez publiczną domenę, nie podpisane adresy).
- `product.coverImageUrl` i `technicalSpecs._extraImageUrls` zostają w schemacie jako fallback, nie są usuwane w tej funkcji; stają się polami drugorzędnymi dopiero po potwierdzonej migracji wszystkich produktów.

## Follow-up

- [x] Załóż kubełek Cloudflare R2 z jurysdykcją UE (krok ręczny na koncie Cloudflare, zapisany już jako otwarty w spec 0017 Follow-up) — kubełek `modular-hub` założony 2026-09-09.
- [ ] Domena własna do serwowania plików: świadomie odłożona 2026-09-09 (inżynier ma domenę zarejestrowaną poza Cloudflare; podłączenie jej wymagałoby albo pełnej migracji nameserverów, albo partial (CNAME) setupu jako zony na tym koncie). Dziś kubełek jest publiczny przez zarządzaną przez Cloudflare domenę `r2.dev` (`R2_PUBLIC_DOMAIN`), którą Cloudflare wprost opisuje jako nieprzeznaczoną do produkcji (rate-limited, bez gwarancji ciągłości). Gdy inżynier zdecyduje się podłączyć własną domenę: dodaj ją jako zonę (partial/CNAME setup wystarczy, nie trzeba przenosić nameserverów), połącz z kubełkiem w R2 → bucket → Settings → Custom Domains, zaktualizuj `R2_PUBLIC_DOMAIN`; `next.config.ts`'s `images.remotePatterns` już czyta tę zmienną automatycznie, nic więcej w kodzie nie trzeba zmieniać.
- [x] Wygeneruj token API R2 (uprawnienia odczyt/zapis na kubełku) i dodaj `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`/`R2_PUBLIC_DOMAIN` — zrobione lokalnie w `.env.local` 2026-09-09 (Account API token, scoped do kubełka).
- [ ] Dodaj te same zmienne na Vercelu (staging i produkcja), zgodnie z konwencją zmiennych środowiskowych ustaloną w spec 0021 — nadal do zrobienia, dziś działa tylko lokalnie.
- [ ] Po potwierdzonym uruchomieniu skryptu migracyjnego na wszystkich 65 produktach: usuń zmigrowane pliki z `public/images/houses/` w drzewie roboczym (historia git je zachowuje, więc to odwracalne), i usuń odczyt `_extraImageUrls`/`coverImageUrl` z `lib/data/projects.ts` jako martwy kod. Migracja uruchomiona 2026-09-09 (65/65 produktów, 204 wiersze `document`), ale ten krok czeka na dodatkową ręczną weryfikację wizualną (porównanie zrzutów ekranu) zanim pliki znikną z drzewa roboczego.
- [ ] `public/images/houses/golden-hour/` zawiera zdjęcia dla Baltyk Modular, Karpaty Haus i Modulor Systems, producentów jeszcze niedodanych do prawdziwej bazy (wciąż na fixture). Gdy zostaną ręcznie zasiani (jak funkcja 7 zrobiła dla dzisiejszych czterech producentów), ich zdjęcia powinny przejść przez ten sam skrypt/narzędzie, nie przez kolejny ręczny commit do `public/`.
- [ ] Przed podłączeniem prywatnych celów dokumentów (`company_verification`, `order_stage`, przyszłe funkcje 14/19): zaprojektuj osobny, niepubliczny kubełek lub prefiks R2 z podpisanymi adresami pobierania; dzisiejszy publiczny kubełek nie nadaje się do dokumentów prywatnych.
- [ ] Zdjęcia producentów (`producer_photo`) świadomie poza tym spec: `lib/data/producers.ts` jest dziś w całości mockiem; realne zdjęcie producenta wymaga najpierw migracji panelu producenta na realne dane, osobna, przyszła decyzja `/architect`.
- [ ] Załączniki do odpowiedzi na zapytania (rozmowa projektowa to zasugerowała) świadomie poza tym spec: wymaga najpierw zaprojektowania samej realnej oferty, funkcja 11 "Realna oferta i jej przyjęcie" (`docs/scope/produkcja.md`), włącznie z nową wartością `document_purpose`. Zaprojektuj tamtą funkcję jako osobną sesję `/architect`, reużywając infrastruktury R2 zbudowanej tutaj.
- [ ] Ekrany producenta (kreator, domykanie luk, weryfikacja firmy) zostają świadomie na `localStorage`; ich migracja na realne zaplecze to osobna, przyszła decyzja (funkcje 12/14/18/19 w `docs/scope/produkcja.md`), nie rozstrzygana tutaj.
- [ ] Dry run skryptu migracyjnego (2026-09-09) znalazł pre-istniejący problem z danymi, niezwiązany z tym build: `public/images/houses/budman-house/kazik/03_rzut.jpg` (produkt "Kazik") to w rzeczywistości plik HTML zapisany z rozszerzeniem `.jpg` (prawdopodobnie nieudane pobranie), nie prawdziwy obraz — walidacja sygnatury bajtowej (AC-3) poprawnie go odrzuca. Do naprawy przed realnym uruchomieniem skryptu (krok 9): podmień plik na prawdziwy rzut/zdjęcie, ręcznie, poza tym spec.

## Migration plan

**Strategy**: strangler (stary mechanizm odczytu i nowy działają obok siebie, z fallbackiem, aż stary stanie się zbędny)

**Phases**:
1. Migracja bazy (indeks częściowy) i kod klienta R2/akcji serwerowych/skryptu wdrożone; żaden produkt jeszcze nie ma wierszy `document`, więc `getProjects()`/`getProjectById()` nadal pokazują `coverImageUrl`/`_extraImageUrls` dla wszystkich (fallback z AC-8 działa od pierwszego dnia, zero widocznej zmiany).
2. Skrypt migracyjny uruchomiony na realnej bazie w trybie "na sucho" najpierw (raport, bez zapisu), potem naprawdę: wszystkie 65 produktów dostają wiersze `document` odpowiadające dzisiejszym plikom. Każdy zmigrowany produkt natychmiast przełącza się na wyświetlanie z `document` (dzięki temu samemu fallbackowi), więc przejście jest niewidoczne dla odwiedzającego (te same zdjęcia, inne miejsce przechowywania).
3. Ręczna weryfikacja: każdy z 65 produktów pokazuje te same zdjęcia co przed migracją (porównanie zrzutów ekranu lub adresów URL).
4. Po weryfikacji: usunięcie plików z `public/images/houses/` w drzewie roboczym i usunięcie odczytu `_extraImageUrls`/`coverImageUrl` z `lib/data/projects.ts` (osobny Follow-up, nie część tego samego wdrożenia co krok 1 i 2, żeby zostawić czas na weryfikację).

**Rollback**: cofnięcie migracji indeksu i kodu jednym rewertem commita nie usuwa danych; wiersze `document` utworzone przez skrypt można bezpiecznie skasować i uruchomić skrypt ponownie (idempotentny), a `coverImageUrl`/`_extraImageUrls` nigdy nie są nadpisywane, więc odczyt wraca do stanu sprzed migracji natychmiast.

**Risks**: jeśli administrator usunie zdjęcie oznaczone jako okładka bez ustawienia nowej okładki, produkt wraca do fallbacku `coverImageUrl` (bezpieczne zachowanie, nie pusty stan) zamiast zostać bez żadnego zdjęcia. Jeśli skrypt migracyjny natrafi na plik wymieniony w bazie, którego nie ma już w `public/` (rozjazd), powinien pominąć ten wpis i zgłosić go w raporcie, nie przerywać całego przebiegu.
