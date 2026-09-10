# 0032. Panel producenta

**Date**: 2026-09-10
**Status**: In Progress

## Summary

Ten spec daje producentowi prawdziwe konto zamiast dzisiejszego formularza NIP w adresie strony. Producent loguje się linkiem mailowym (mechanizm już istnieje od spec 0023) i trafia do nowego, chronionego panelu pod `/producent/panel/*`: widzi dane swojej firmy z bazy, zarządza swoim katalogiem produktów (dodawanie, edycja, usuwanie, zdjęcia) i podgląda własne zapytania od klientów. Dzisiejsza mockowa ścieżka (formularz NIP, dane w `localStorage` przeglądarki) znika całkowicie, zastąpiona w tym samym buildzie. Trzy ekrany, które dziś i tak pokazują wyłącznie przykładowe dane (gotowość eksportowa, weryfikacja firmy, wypłata), zostają, ale wyraźnie oznaczone jako wersja demonstracyjna, do czasu aż dostaną własną, osobną decyzję.

## Context

Pełny opis problemu, przegląd dzisiejszego stanu kodu i uzasadnienie wyboru: patrz [rationale.md](rationale.md).

## Requirements

**User stories**:
- Jako producent, chcę założyć konto i zalogować się mailem, żeby moje dane firmy i produkty były trwale zapisane, nie tylko w mojej przeglądarce.
- Jako producent, chcę zobaczyć dane swojej firmy (nazwa, NIP, kraje dostawy, technologia, status weryfikacji) od razu po zalogowaniu, żeby wiedzieć, że to naprawdę moje konto.
- Jako producent, chcę dodawać, edytować i usuwać własne produkty w katalogu zapisanym w bazie, żeby moja oferta była trwała i widoczna dla wszystkich klientów, nie tylko w mojej przeglądarce.
- Jako producent, chcę wgrywać zdjęcia swoich produktów, żeby klient widział prawdziwy dom, nie placeholder.
- Jako producent, chcę zobaczyć, które moje produkty ktoś zapytał, żeby wiedzieć, na co czekam, bez widzenia produktów innych producentów w tym samym zapytaniu.
- Jako producent, chcę, żeby moje dane i produkty widział i zmieniał wyłącznie ja, nikt inny.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Wejście na dowolną podstronę `/producent/panel/*` bez sesji przekierowuje do `/logowanie?callbackUrl=<powrót>`; sesja z rolą `client` przekierowuje do `/klient/panel`; sesja z rolą `admin` przekierowuje do `/internal/zapytania` (ten sam wzorzec co `requirePanelClientSession`, spec 0024 AC-4, AC-5).
- **AC-2**: `/producent/panel` (strona główna) pokazuje dane firmy zalogowanego producenta z bazy: nazwa, NIP, kraje dostawy, technologia, status weryfikacji firmy. Wyłącznie podgląd, bez edycji w tej funkcji.
- **AC-3**: `/producent/panel/produkty` pokazuje listę własnych produktów zalogowanego producenta (nazwa, rodzina, status, data dodania), pobraną z tabeli `product` filtrowaną po `producerId` z sesji. Pusta lista pokazuje przyjazny stan z przyciskiem "Dodaj produkt", nie błąd.
- **AC-4**: Kreator (siedem istniejących kroków plus zakładki tłumaczeń PL/EN/NL z kroku podstawowego) zapisuje nowy produkt bezpośrednio do tabeli `product` (plus `product_translation` dla EN/NL), z `producerId` wyprowadzonym z sesji. Zapisanie kompletnego produktu z co najmniej jednym zdjęciem ustawia `status: published` od razu (samoobsługa, bez moderacji); bez zdjęcia zapis jest zablokowany z czytelnym komunikatem na kroku Podsumowania.
- **AC-5**: Producent może edytować własny, wcześniej zapisany produkt (ten sam siedmiokrokowy kreator, wypełniony danymi); może to zrobić wyłącznie dla produktu, którego `producerId` zgadza się z jego sesją. Zapisana zmiana jest widoczna od razu, produkt zostaje `published`.
- **AC-6**: Producent może usunąć własny produkt (miękkie usunięcie, `deletedAt`) przez modal potwierdzenia (ten sam wzorzec co spec 0016 AC-10); usunięty produkt znika z jego katalogu i z `/wyniki`, rekord zostaje w bazie.
- **AC-7**: Producent może wgrywać, usuwać i ustawiać zdjęcie okładkowe dla własnych produktów (reużywa magazyn R2 i tabelę `document` ze spec 0031), z tą samą kontrolą własności co AC-5 (nie może dotknąć zdjęcia cudzego produktu).
- **AC-8**: `/producent/panel/zapytania` pokazuje zapytania zawierające co najmniej jeden własny produkt producenta; lista nazw produktów w każdym wierszu pokazuje wyłącznie te należące do tego producenta, nigdy produkty innych producentów w tym samym zapytaniu. Wyłącznie podgląd, bez odpowiedzi ofertą (osobna, przyszła funkcja 11).
- **AC-9**: Rejestracja nowego producenta (`/producent/rejestracja`, już istniejąca) po potwierdzeniu mailem linkiem magicznym ląduje w kreatorze "Dodaj pierwszy produkt", tak jak dziś ląduje w mockowym kreatorze.
- **AC-10**: `/producent` (root, bez sesji) pokazuje treść marketingową (dlaczego ModularHub Europe) z wezwaniami do działania "Zarejestruj się" i "Zaloguj się"; sesja z rolą `producer` trafiająca na `/producent` jest przekierowana prosto do `/producent/panel`.
- **AC-11**: Cztery ekrany czytające dziś globalny mock (`/producent/gotowosc-eksportowa`, `/producent/weryfikacja-firmy`, `/producent/realizacje` wraz z zagnieżdżonymi `/domykanie-luk` i `/realizacja`, oraz `/producent/zapytania` z mockowym formularzem złożenia oferty) zostają dostępne z linkiem w panelu, każdy z widocznym oznaczeniem "wersja demonstracyjna" — nie są to jeszcze dane tego konkretnego producenta. `/producent/zapytania` (stary, mock) zostaje odróżniony nazwą/opisem od nowego `/producent/panel/zapytania` (AC-8, realny, tylko odczyt), żeby nie wyglądały jak dwie wersje tego samego ekranu.
- **AC-12**: Dzisiejsza mockowa ścieżka producenta ograniczona do konta i katalogu (formularz NIP na starym `/producent`, `/producent/produkty`, `/producent/projekt` na `localStorage`, plus `lib/producer-products.ts`, `lib/producer-project-draft.ts`, `lib/producer-registration-storage.ts`) jest w całości usunięta w tym samym buildzie; lokalny podgląd producenta na `/klient/wyniki` (spec 0016 AC-11, `lib/local-client-projects.ts`) jest usunięty razem z nią, w pełni zastąpiony realną publikacją (AC-4). Cztery ekrany z AC-11 (gotowość eksportowa, weryfikacja firmy, realizacje/domykanie luk/realizacja, zapytania mock) NIE są usuwane, tylko oznaczone.
- **AC-13**: Każde zapytanie do bazy i każda mutacja w tej funkcji filtruje po `producer.id` wyprowadzonym z sesji (`auth()` → `producer.userId`), nigdy po identyfikatorze podanym przez przeglądarkę; próba edycji/usunięcia/wgrania zdjęcia dla produktu należącego do innego producenta kończy się odmową, nie cichym sukcesem.
- **AC-14**: Błąd zapisu (produkt, zdjęcie) pokazuje komunikat w miejscu z możliwością ponowienia, bez utraty wprowadzonych danych (ten sam wzorzec co spec 0016 AC-5, AC-13).
- **AC-15**: Nowe i zmienione ekrany spełniają WCAG 2.2 AA: jeden prawdziwy H1 na stronę, logiczna kolejność fokusa, widoczny fokus, poprawny modal (Headless UI `Dialog`, focus trap, Esc).

## Options considered

Patrz [rationale.md](rationale.md).

## Decision

**Chosen option**: Option 3, zastąpienie bezpośrednie: nowy panel na sesji i realnej bazie, stara mockowa ścieżka usunięta w tym samym buildzie.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `authjs-skills` (`gocallum/nextjs16-agent-skills`, `.agents/skills/authjs-skills/`) · `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Rationale

Patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Zero nowych tabel. Wszystko już istnieje (spec 0018, 0022, 0031):

| Tabela | Użycie w tej funkcji |
|---|---|
| `producer` | Dane konta (AC-2); `userId` już łączy z `users` (rola `producer`) od spec 0023 |
| `producerDeliveryCountry` | Kraje dostawy na stronie głównej panelu (AC-2) |
| `product` | Katalog własny (AC-3, AC-4, AC-5, AC-6), filtrowany/zapisywany po `producerId` |
| `productTranslation` | Nazwa/opis EN/NL (AC-4), już zaprojektowana w spec 0028, dziś nieużywana do zapisu z kreatora |
| `document` | Zdjęcia produktu (AC-7), ten sam kształt co admin (spec 0031), teraz też pisany przez producenta |
| `inquiry` / `inquiryItem` | Podgląd własnych zapytań (AC-8), filtrowany przez `product.producerId` |

**State transitions**:

Produkt: `nieistniejący` → `published` (AC-4, natychmiast po zapisaniu kompletnego produktu z co najmniej jednym zdjęciem, bez stanu pośredniego `draft` widocznego producentowi) → `published, zmieniony` (AC-5, edycja zostaje `published`) → `usunięty` (AC-6, miękkie usunięcie). Status weryfikacji firmy (`producer.verificationStatus`) pozostaje wyłącznie do odczytu w tej funkcji, jego zmiana to zakres przyszłej funkcji 19.

**API surface**:

| Trasa / akcja | Typ | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `/producent` | Strona | brak (sesja opcjonalna) | marketing + CTA, albo przekierowanie do panelu | brak | sesja `producer` → przekierowanie do `/producent/panel` (AC-10) |
| `/producent/panel/*` | Layout | brak (sesja) | pasek zakładek (Konto / Produkty / Zapytania) + wyloguj | sesja, rola `producer` | brak sesji/zła rola → przekierowanie (AC-1) |
| `/producent/panel` | Strona | brak (sesja) | dane firmy z bazy | sesja, rola `producer` | jw. |
| `/producent/panel/produkty` | Strona | brak (sesja) | lista własnych produktów albo stan pusty | sesja, rola `producer` | jw. |
| `/producent/panel/projekt` | Strona | brak (sesja) | kreator nowego produktu | sesja, rola `producer` | jw. |
| `/producent/panel/produkty/[id]/edytuj` | Strona | `id` produktu | kreator wypełniony danymi | sesja, rola `producer`, właściciel `id` | cudzy/nieistniejący `id` → przekierowanie do listy (AC-13) |
| `createProduct` | Akcja serwerowa | kompletny szkic (7 kroków), min. 1 zdjęcie | nowy wiersz `product` (+ `product_translation`), `status: published` | sesja, rola `producer` | brak zdjęcia → blokada na Podsumowaniu (AC-4); błąd zapisu → komunikat + ponów (AC-14) |
| `updateProduct` | Akcja serwerowa | `id`, kompletny szkic | zaktualizowany wiersz | sesja, rola `producer`, właściciel `id` | jw., plus cudzy `id` → odmowa (AC-13) |
| `deleteProduct` | Akcja serwerowa | `id` | `deletedAt` ustawiony | sesja, rola `producer`, właściciel `id` | jw. |
| Akcje zdjęć producenta | Akcje serwerowe | `productId`/`documentId`, plik | wiersz `document` / potwierdzenie | sesja, rola `producer`, właściciel produktu | jw. (mirror `lib/product-photo-actions.ts`, patrz Key invariants) |
| `/producent/panel/zapytania` | Strona | brak (sesja) | własne zapytania, tylko nazwy własnych produktów | sesja, rola `producer` | jw. |

**Key invariants**:
- `producerId` używany w każdym zapytaniu/mutacji tej funkcji pochodzi wyłącznie z `getProducerIdForUser(session.user.id)` (nowa funkcja, mirror `getClientIdForUser`, spec 0024), nigdy z wartości podanej przez przeglądarkę (URL, ukryte pole formularza) — AC-13. Sesja z rolą `producer`, dla której `getProducerIdForUser` zwraca `null` (nie powinno się zdarzyć przy dzisiejszym `createUser`, ale broniona jawnie), jest traktowana jak brak sesji: przekierowanie z komunikatem zamiast crasha.
- Preferowany kształt implementacji dla akcji zdjęć: rozszerz `lib/product-photo-actions.ts` o parametr rozstrzygający własność (admin: dowolny produkt; producent: tylko własny, przez `producerId` z sesji) zamiast pisać trzy niemal identyczne nowe akcje obok istniejących — ta sama logika `db.batch` na okładce (spec 0031) nie powinna istnieć w dwóch miejscach, które mogą się rozjechać.
- Każda mutacja produktu/zdjęcia (`updateProduct`, `deleteProduct`, akcje zdjęć) najpierw sprawdza, że `product.producerId` zgadza się z `producerId` z sesji; niezgodność zwraca odmowę (ten sam kształt `ActionResult` co `lib/product-photo-actions.ts`), nigdy cichy sukces ani wyjątek nieprzechwycony. Dla akcji zdjęć własność jest ustalana przez `document.productId → product.producerId` (nigdy przez `document.producerId`, osobną kolumnę tej samej tabeli używaną przez inne `purpose`, np. `producer_photo`/`company_verification`); wiersz `document` z `productId IS NULL` jest zawsze odrzucany w tych akcjach, nie tylko po cichu pomijany.
- Zapis nowego produktu tworzy wiersz `product` w stanie roboczym przy pierwszym wejściu do kreatora (ten sam wzorzec co dzisiejszy szkic w toku, spec 0008), żeby zdjęcia (AC-7) miały do czego się podpiąć przed końcowym "Zapisz projekt" — zdjęcia wymagają istniejącego `product.id` (`document.productId` jest kluczem obcym). Dopiero "Zapisz projekt" na kroku Podsumowania (z kompletnymi polami i co najmniej jednym zdjęciem) ustawia `status: published`; porzucony szkic bez finalizacji zostaje jako `draft`, niewidoczny na `/wyniki` (już dziś filtrowane po `status = 'published'`) i sprzątany tym samym mechanizmem co dzisiejszy szkic kreatora (bez specjalnej migracji, bo nigdy nie był publiczny).
- Pierwsze wgrane zdjęcie produktu automatycznie staje się okładką (`isCover: true`), żeby nowo dodany produkt zawsze miał poprawną okładkę na `/wyniki` bez dodatkowego kroku producenta; kolejne zdjęcia i ręczna zmiana okładki działają tak jak dziś w `ProductPhotoManager` (spec 0031).
- Zapis `product`+`product_translation` w `createProduct`/`updateProduct` używa `db.batch(...)`, nie `db.transaction` (driver `neon-http` w tym repo nie wspiera interaktywnych transakcji wielu zapytań, `lib/db/AGENTS.md`) — ten sam wzorzec co `setCoverPhoto` w `lib/product-photo-actions.ts`, żeby ponowienie po błędzie (AC-14) nie mogło zostawić produktu bez tłumaczenia albo podwoić wiersza.
- Wymóg zdjęcia do publikacji (AC-4) obowiązuje wyłącznie w nowej ścieżce producenta (kreator na sesji); nie jest egzekwowany wstecznie na istniejących, ręcznie zasianych przez Neon MCP produktach (dziś część bez pełnej galerii) — one zostają `published` bez zmian.
- `getInquiriesForProducer(producerId)`: ten sam kształt wiersza co `getAllInquiriesWithItems`/`getInquiriesForClient`, ale `productNames` filtrowane do `product.producerId = producerId` w samym zapytaniu (nie po stronie klienta), więc odpowiedź z bazy nigdy nie niesie nazw cudzych produktów (AC-8, prywatność konkurencyjna).
- Kreator (`ProjectWizard`/`ProductEditWizard`) zostaje wizualnie ten sam (siedem kroków + zakładki tłumaczeń), ale krok zdjęć (`ProjectWizardFilesStep`, dziś `components/ui/FileUpload.tsx`, mockowy, nie trzyma prawdziwego pliku) jest przebudowany, nie tylko przepięty: musi trzymać realny `File` w pamięci i wywoływać akcje zdjęć z AC-7 od razu przy wyborze pliku (ten sam wzorzec co `ProductPhotoManager`, spec 0031), nie dopiero przy końcowym zapisie. Poza tym krokiem zmienia się wyłącznie warstwa zapisu: `lib/producer-products.ts` (localStorage) zastąpione akcjami serwerowymi opisanymi wyżej; walidacja kompletności kroku i schemat `technicalSpecs` per rodzina (`getTechnicalSpecsSchema`, spec 0022) zostają bez zmian.
- `/wyniki` (`lib/data/projects.ts`, `getProjects`) dziś filtruje wyłącznie `status = 'published'` i `family`, bez `product.deletedAt IS NULL` — usunięty produkt (AC-6) zostałby więc nadal widoczny, dopóki ten filtr nie zostanie dodany (Build plan zadanie 3).
- Usunięcie mockowej ścieżki (AC-12) obejmuje też jej testy (`pierwszy-projekt.spec.ts`, `rejestracja-producenta.spec.ts` i jednostkowe testy usuwanych plików `lib/`); nowe testy na sesji i realnej bazie to osobne uruchomienie `/test` po tym buildzie, nie część tego spec u — patrz Consequences (ryzyko przejściowej luki w pokryciu testami).

**Security model**:
- Rola `producer`: widzi i zmienia wyłącznie własne dane firmy, produkty, zdjęcia i zapytania (filtrowane po `producerId` z sesji, AC-13).
- Rola `client`/`admin`: przekierowani do swojej sekcji przy próbie wejścia na `/producent/panel/*` (AC-1), ten sam wzorzec co `requirePanelClientSession`.
- Niezalogowany: przekierowany do logowania z zachowanym powrotem (AC-1).
- Samoobsługowa publikacja bez moderacji (AC-4) jest świadomym ryzykiem tego etapu (brak panelu admina/moderacji, funkcja 18 wciąż niezaprojektowana) — patrz Consequences.
- RODO: panel pokazuje i pozwala tylko odczytać już zbierane dane osobowe/biznesowe producenta (nazwa, NIP, telefon); nie dodaje nowej kategorii danych. Funkcja 5 (RODO i zgodność prawna) zostaje osobną, wciąż niezaprojektowaną decyzją (to samo zastrzeżenie co spec 0023/0024 Security model).

**Critical test scenarios**:
- Happy path: nowy producent rejestruje się, potwierdza mailem, ląduje w kreatorze, dodaje pierwszy produkt ze zdjęciem, widzi go w `/producent/panel/produkty` i na `/wyniki`; dodaje drugi produkt, edytuje pierwszy, usuwa drugi. Weryfikuje **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-9**.
- Happy path: producent widzi na `/producent/panel/zapytania` zapytanie, które zawiera jego produkt razem z produktem innego producenta, i widzi w wierszu wyłącznie nazwę własnego produktu. Weryfikuje **AC-8**.
- Failure case: zapis produktu bez zdjęcia jest zablokowany na Podsumowaniu z czytelnym komunikatem; zapis kończy się przejściowym błędem bazy → komunikat w miejscu z przyciskiem ponów, dane w kreatorze nie znikają. Weryfikuje **AC-4**, **AC-14**.
- Auth/permission: niezalogowany wchodzący na `/producent/panel` trafia do logowania i wraca dokładnie tam po zalogowaniu; zalogowany klient wchodzący na `/producent/panel/produkty` trafia do `/klient/panel`; producent A próbujący edytować URL em produkt producenta B dostaje odmowę, nie cudze dane. Weryfikuje **AC-1**, **AC-13**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet epiki Produkcja (locked decision, `docs/scope/produkcja.md`): najpierw jeden cienki, w pełni prawdziwy wątek od sesji do jednego ekranu z prawdziwymi danymi, potem pogrubienie o resztę katalogu, zdjęcia, zapytania, i dopiero na końcu sprzątanie starej ścieżki (żeby nie zostać bez działającej ścieżki producenta w połowie buildu).

1. `getProducerIdForUser(userId)` i `getProducerProfile(producerId)` w `lib/db/queries.ts` (mirror `getClientIdForUser`); `requirePanelProducerSession(locale, selfHref)` w `lib/panel-session.ts` (mirror `requirePanelClientSession`, przekierowania AC-1); wspólny layout `/producent/panel/*` (pasek zakładek + wyloguj, ten sam wzorzec co `/klient/panel/layout.tsx`); strona główna `/producent/panel` z danymi firmy, satisfies **AC-1**, **AC-2**
2. Przepięcie rejestracji: `/producent/rejestracja` (bez zmian w formularzu) ląduje po potwierdzeniu w `/producent/panel/projekt` zamiast dzisiejszego domyślnego celu; `/producent` (root) przepisany na treść marketingową z przekierowaniem sesji `producer`, satisfies **AC-9**, **AC-10**
3. Akcje serwerowe `createProduct`/`updateProduct`/`deleteProduct` (`lib/producer-product-actions.ts`, ownership check z Key invariants, `db.batch` na `product`+`product_translation`, tworzenie wiersza roboczego przy wejściu do kreatora, wymóg min. 1 zdjęcia do publikacji); `getProductsForProducer` (już istnieje) podłączony do `/producent/panel/produkty`; dodaj filtr `isNull(product.deletedAt)` do `getProjects` (`lib/data/projects.ts`), dziś nieobecny, żeby miękko usunięty produkt faktycznie znikał z `/wyniki`; kreator (`ProjectWizard`/`ProductEditWizard`) przepięty z `lib/producer-products.ts` na te akcje, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-14**
4. Akcje zdjęć producenta (`uploadProducerProductPhoto`/`deleteProducerProductPhoto`/`setProducerProductCoverPhoto`, mirror `lib/product-photo-actions.ts` z ownership checkiem po `document.productId → product.producerId` zamiast bramki admina) i przebudowa kroku zdjęć kreatora (realny `File`, upload od razu przy wyborze pliku, pierwsze zdjęcie auto okładką), satisfies **AC-7**
5. `getInquiriesForProducer(producerId)` (mirror `getInquiriesForClient`, filtr `productNames` po własnym `producerId`) i strona `/producent/panel/zapytania`, satisfies **AC-8**
6. Oznaczenie "wersja demonstracyjna" na czterech ekranach mock (`gotowosc-eksportowa`, `weryfikacja-firmy`, `realizacje` + zagnieżdżone `domykanie-luk`/`realizacja`, oraz `zapytania` z mockowym formularzem oferty, wyraźnie odróżniony nazwą od nowego `panel/zapytania`) plus link do nich z panelu, satisfies **AC-11**
7. Usunięcie starej ścieżki: stary `/producent/produkty`, `/producent/projekt` (mock), `lib/producer-products.ts`, `lib/producer-project-draft.ts`, `lib/producer-registration-storage.ts`, `lib/local-client-projects.ts` i jego wpięcie w `ResultsSelection.tsx`/`ResultCard.tsx`/`PopularHomes.tsx` (spec 0016 AC-11, superseded), `components/producent/ProducerCatalogLookupForm.tsx` (doraźna łatka na NIP z tej samej sesji, teraz zbędna); aktualizacja `ProducerHeader.tsx` o prawdziwe menu konta (wyloguj, link do panelu) zamiast dzisiejszych wyłączonych przycisków, satisfies **AC-12**

## Consequences

**Positive**:
- Producent ma pierwszy raz prawdziwe konto: dane i katalog przetrwają zmianę przeglądarki, urządzenia, czy wyczyszczenie danych lokalnych.
- Realny model danych (spec 0018/0022) i magazyn plików (spec 0031) okazują się gotowe pod ten panel bez żadnej zmiany schematu — tylko nowe zapytania/akcje nad tym, co już jest.
- Jedna, spójna ścieżka producenta w repo zamiast dwóch (mock i real) żyjących obok siebie.

**Negative / tradeoffs**:
- Samoobsługowa publikacja bez moderacji (AC-4): każdy zarejestrowany producent może natychmiast pokazać produkt prawdziwym klientom bez żadnej kontroli jakości, bo panel admina (funkcja 18) wciąż nie istnieje. Świadomie zaakceptowane ryzyko na tym etapie, do rewizji, gdy funkcja 18 powstanie.
- Duży build za jednym razem: usuwa kilka plików `lib/`, dwie strony i ich testy jednostkowe/e2e naraz, zamiast stopniowego wygaszania (patrz rationale.md, Option 2 odrzucona). Brak drogi odwrotu poza revertem całego PR.
- Usunięcie testów starej ścieżki wyprzedza napisanie nowych (osobne `/test` po tym buildzie, patrz Build plan zadanie 7 i Follow up) — między tymi dwoma krokami pokrycie testami ścieżki producenta jest chwilowo niższe niż dziś, nie wyższe; świadomie zaakceptowane, żeby nie pisać testów na kod, który i tak zaraz zniknie.
- Trzy ekrany (gotowość eksportowa, weryfikacja firmy, realizacje) zostają na mocku, tylko wyraźniej oznaczone — nie stają się prawdziwe w tej funkcji, więc demo dla inwestorów pokazujące te ekrany nadal pokazuje przykładowe dane, nie dane akurat zalogowanego producenta.
- Istniejący, ręcznie zasiani przez Neon MCP producenci (Castro, Steel House, Budman, Cocomodule…) nie dostają w tej funkcji własnego konta ani ścieżki "odbierz swoje konto" — testowanie idzie na nowym, samodzielnie zarejestrowanym koncie (patrz Follow up).

**Neutral**:
- `EventName` w `lib/observability/types.ts` zyskuje `product_updated`/`product_deleted` obok już istniejącego, dotąd nieużywanego `product_added` (teraz wreszcie wywoływanego).
- Kreator (`ProjectWizard`, jego siedem kroków) zostaje wizualnie bez zmian — zmienia się wyłącznie to, dokąd zapisuje.

## Follow-up

- [ ] Uruchom `/test panel producenta` od razu po tym buildzie (nie w jego trakcie) — stare testy ścieżki producenta znikają razem z mockiem w zadaniu 7, nowe testy na sesji/realnej bazie są świadomie osobnym krokiem (patrz Consequences, przejściowa luka w pokryciu).
- [ ] Ścieżka "podłącz konto do istniejącego, ręcznie zasianego producenta" (Castro, Steel House, Budman, Cocomodule…): dziś świadomie poza zakresem (patrz Consequences); Ty sam zdecydowałeś, że na razie zostawiasz to tak jak jest, z możliwością późniejszej ręcznej zmiany `producer.userId` przez Neon MCP, zanim ci producenci zaczną obsługiwać zamówienia.
- [ ] Statystyki/analityka dla producenta (np. liczba zapytań w czasie, popularność produktów) — wspomniane w rozmowie projektowej, świadomie odłożone do przemyślenia jako osobna, przyszła decyzja.
- [ ] Edycja profilu firmy (nazwa, telefon, kraje dostawy) przez producenta — dziś tylko podgląd (AC-2); jeśli okaże się potrzebna, to osobna, przyszła decyzja (ten sam wzorzec odłożenia co edycja e-maila w spec 0024 Follow up).
- [ ] Gdy funkcja 11 (Realna oferta), 16 (Realizacja i statusy) i 19 (Weryfikacja firmy) dostaną własne decyzje `/architect`, każda z nich powinna też zdjąć oznaczenie "wersja demonstracyjna" z odpowiadającego jej ekranu w tym panelu i podłączyć go pod sesję producenta z tej funkcji.
- [ ] Gdy funkcja 18 (Panel administracyjny) powstanie, rozważ, czy samoobsługowa publikacja bez moderacji (AC-4, Consequences) powinna zostać, czy nowe produkty powinny trafiać do kolejki do zatwierdzenia zamiast prosto na `published`.
