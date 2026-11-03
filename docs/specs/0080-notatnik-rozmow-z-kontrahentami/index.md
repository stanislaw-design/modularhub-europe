# 0080. Notatnik rozmów z kontrahentami w panelu admina

**Date**: 2026-11-02
**Status**: Proposed

## Summary

Budujemy w panelu admina sekcję "Rozmowy": wspólny notatnik dla Stanisława i Artura, w którym każda firma (producent, dostawca, klient, partner) ma osoby kontaktowe, sprawy, dziennik rozmów i zadania z terminami. Status sprawy wylicza się sam z zadań, więc zawsze widać, na kogo czekamy. Notatnik niczego nie wykonuje w platformie (zapytania, oferty i duże zamówienia zostają tam, gdzie są), tylko opcjonalnie linkuje do tych rekordów. Rano przychodzi jeden wspólny mail z zadaniami na dziś i zaległymi. Model od początku przewiduje zapis z bota (WhatsApp lub Telegram), ale bota w tym specu nie budujemy.

## Requirements

**User stories**:
- Jako administrator chcę widzieć jednym rzutem oka, co jest dziś do zrobienia i na kogo czekamy, żeby żadna rozmowa z producentem nie utknęła niezauważona.
- Jako administrator chcę zapisać, co ustaliłem z producentem przez telefon, WhatsApp lub mail, razem z plikiem (np. wycena PDF), żeby drugi administrator zobaczył to samo.
- Jako administrator chcę prowadzić kilka równoległych spraw z jedną firmą (wycena łóżek, import katalogu, umowa), każdą z własnym statusem i zadaniami.
- Jako administrator chcę powiązać sprawę z rekordem na platformie (producent, duże zamówienie, case, produkt), żeby przejść do niego jednym kliknięciem, ale bez dublowania procesu.
- Jako administrator chcę założyć notatkę o firmie, która jeszcze nie ma konta na platformie, i połączyć ją z kontem później, bez utraty historii.
- Jako administrator chcę rano dostać mail z zadaniami na dziś i zaległymi, żeby nie musieć pamiętać o otwarciu panelu.

**Acceptance criteria** (kontrakt, każde kryterium da się sprawdzić osobno):

Dostęp i ogólne
- **AC-1**: Wszystkie ekrany `/internal/conversations/*`, route handler pobierania załącznika i każda akcja serwerowa tej sekcji są dostępne tylko dla sesji z rolą `admin`. Brak sesji przekierowuje do logowania, inna rola do tego samego miejsca, co pozostałe ekrany `/internal`. Akcja serwerowa wywołana bez roli `admin` niczego nie zapisuje.
- **AC-2**: Sekcja ma pozycję "Rozmowy" w menu bocznym panelu, wszystkie teksty są po polsku (jak reszta `/internal`), a statusy i rodzaje pokazują kolor razem z ikoną i tekstem, nigdy sam kolor.
- **AC-3**: Awaria jednego źródła danych na ekranie (np. odczyt statusu powiązanego rekordu platformy, podpisanie linku do załącznika) pokazuje to jedno miejsce jako niedostępne i nie psuje reszty strony.

Firmy i osoby
- **AC-4**: Można utworzyć, edytować, wyszukać i przefiltrować firmę (`partner`) z polami: nazwa (wymagana), rodzaj (producent, dostawca, klient, partner, inny), strona www, kraj, tagi, notatki. Lista jest stronicowana po 25, a wyszukiwanie, filtry i numer strony siedzą w parametrach adresu.
- **AC-5**: Przy tworzeniu firmy, której nazwa po normalizacji (wielkość liter, spacje) jest równa nazwie istniejącej firmy albo zawiera się w niej lub ją zawiera (w obu kierunkach, tylko dla nazw od 4 znaków), pokazuje się ostrzeżenie z listą podobnych firm, a zapis nadal jest możliwy.
- **AC-6**: Do firmy można dodać wiele osób kontaktowych (imię i nazwisko wymagane; rola, telefon, mail, preferowany kanał: telefon, WhatsApp, mail; język rozmowy: pl, en, de, nl; notatka o osobie), edytować je i usuwać (miękko). Telefon i mail żyją wyłącznie na osobie, nie na firmie.
- **AC-7**: Firmę można połączyć z producentem z platformy (`producer`), maksymalnie jedna firma na producenta, wybierając producenta z listy z wyszukiwaniem. Lista podpowiada producentów po mailu osoby kontaktowej i po nazwie. Połączenie można zdjąć, a firma i jej historia zostają. Karta połączonej firmy pokazuje NIP i status weryfikacji czytane z `producer`, a gdy producent został usunięty, pokazuje "konto niedostępne".
- **AC-8**: Firmę z otwartą sprawą lub otwartym zadaniem nie można zarchiwizować (`archived_at`), komunikat wskazuje, co blokuje. Zarchiwizowaną firmę widać po włączeniu filtru "archiwalne" i można ją przywrócić. Zarchiwizowana firma zachowuje połączenie z producentem, więc próba połączenia tego producenta z inną firmą kończy się czytelnym komunikatem z nazwą zarchiwizowanej firmy, a przywrócenie nigdy nie kończy się błędem unikalności. Archiwalne firmy nie wchodzą do widoku "Na dziś" ani do maila.

Sprawy i zadania
- **AC-9**: Firma może mieć wiele spraw. Sprawa ma tytuł (wymagany), właściciela (aktywny administrator) i opcjonalny szablon. Sprawa nie ma typu. Utworzenie sprawy z szablonu tworzy listę zadań z szablonu, z terminami liczonymi od dnia utworzenia, a zadania "po naszej stronie" trafiają do właściciela sprawy.
- **AC-10**: Zadanie ma tytuł (wymagany), opcjonalny opis, opcjonalny termin (sama data, strefa Europe/Warsaw), osobę odpowiedzialną (administrator albo strona zewnętrzna z opcjonalną osobą kontaktową tej firmy) i status: otwarte, zrobione, anulowane. Zadanie można przypiąć do sprawy lub zostawić przy samej firmie. Zadanie można edytować, odhaczyć, anulować i otworzyć ponownie.
- **AC-11**: Status sprawy nie jest zapisany, tylko wyliczany przy odczycie: zamknięta, gdy ustawione `closed_at`; w przeciwnym razie "czekamy na nas", gdy jest otwarte zadanie dla administratora; w przeciwnym razie "czekamy na nich", gdy jest otwarte zadanie zewnętrzne; w przeciwnym razie "otwarta". Zmiana zadania natychmiast zmienia widoczny status.
- **AC-12**: Zamknięcie sprawy z otwartymi zadaniami wymaga wyboru dla każdego z nich: zrobione albo anulowane. Zamknięcie i rozstrzygnięcie zadań wykonuje się atomowo. Zamkniętą sprawę można otworzyć ponownie (czyści `closed_at`), a zadania anulowane wcześniej zostają anulowane.
- **AC-22**: W zamkniętej sprawie nie można utworzyć zadania ani otworzyć ponownie istniejącego (komunikat prosi o otwarcie sprawy). Zamknięta sprawa nigdy nie ma otwartego zadania, więc nic z niej nie trafia do "Na dziś" ani do maila.

Dziennik i załączniki
- **AC-13**: Wpis w dzienniku ma: firmę, opcjonalną sprawę, opcjonalną osobę kontaktową, autora (zalogowany administrator, ustawiany po stronie serwera), datę zdarzenia (domyślnie teraz, można wstecz; data i godzina z formularza są interpretowane w strefie Europe/Warsaw po stronie serwera), kierunek (my do nich, oni do nas, notatka wewnętrzna), kanał (telefon, WhatsApp, mail, spotkanie, platforma, inne), treść (wymagana) i źródło (web lub bot, w tym specu zawsze web). Każdy administrator może edytować i usuwać (miękko) każdy wpis. Edytowany wpis pokazuje adnotację "edytowano".
- **AC-14**: Do wpisu można dołączyć do 5 plików: PDF oraz JPEG, PNG lub WebP, do 20 MB każdy, rozpoznawane po bajtach pliku, nie po rozszerzeniu. Plik trafia do prywatnego kubełka R2 bezpośrednio z przeglądarki przez krótko ważny podpisany adres do zapisu (omija limit ciała żądania funkcji Vercela, około 4,5 MB), a dopiero akcja potwierdzająca sprawdza rozmiar i sygnaturę pliku, liczbę plików na wpis i dodaje wiersz; plik niespełniający wymagań jest usuwany z kubełka. Klucze w R2 są nieprzejrzyste (bez nazw firm i osób). Pobranie następuje przez route handler dostępny tylko dla administratora, który odpowiada przekierowaniem (`Cache-Control: no-store`) na świeży, krótko ważny podpisany adres z nagłówkiem pobierania (`attachment`, bezpieczna nazwa pliku, zapisany typ MIME). Załącznik usuniętego wpisu zwraca 404. Żaden publiczny adres pliku nigdy nie powstaje.

Widoki i wprowadzanie
- **AC-15**: Ekran "Na dziś" (strona startowa sekcji) pokazuje otwarte zadania w rozłącznych sekcjach, w tej kolejności: zaległe i na dziś (tylko zadania administratorów), czekamy na nich (zadania zewnętrzne z terminem), bez terminu (oba rodzaje). Zadanie trafia do pierwszej pasującej sekcji. Przełącznik "moje" i "wszystkie" (domyślnie moje) działa tak: zadanie administratora jest moje, gdy jest przypisane do mnie; zadanie zewnętrzne jest moje, gdy jestem właścicielem jego sprawy, a bez sprawy, gdy je utworzyłem. Każdy wiersz linkuje do firmy i sprawy. Dzień "dziś" liczy się w strefie Europe/Warsaw. Właściciel lub osoba przypisana, która przestała być aktywnym administratorem, jest pokazana jako "nieaktywny administrator", a zadanie nie znika po cichu.
- **AC-16**: Karta firmy pokazuje osoby, sprawy (ze statusem wyliczonym, filtr otwarte i wszystkie), dziennik firmy (wszystkie wpisy, filtr po sprawie) i zadania. Karta sprawy pokazuje zadania, dziennik sprawy, właściciela, status, link do rekordu platformy i akcję zamknięcia.
- **AC-17**: Szybki wpis dostępny z każdego ekranu sekcji (okno dialogowe) zapisuje jednym formularzem: firmę (istniejącą lub nową), opcjonalnie sprawę (istniejącą lub nową z szablonem), wpis w dzienniku i opcjonalnie jedno lub więcej zadań następnych. Zapis jest atomowy: albo powstaje wszystko, albo nic.

Granica z platformą
- **AC-18**: Sprawa i zadanie mogą mieć opcjonalny link do rekordu platformy: producent, duże zamówienie (projekt), duże zamówienie (zapytanie o produkt), case, produkt. Link jest klikalny i pokazuje bieżący status rekordu czytany z platformy, niczego nie kopiuje. Gdy rekord zniknął lub odczyt się nie udał, link pokazuje "rekord niedostępny" (AC-3). Narzędzie nigdy nie zapisuje do żadnej istniejącej tabeli platformy i nie wywołuje akcji platformy.

Mail i dane startowe
- **AC-19**: Cron `/api/cron/conversations-digest` (raz dziennie, produkcja) wysyła jeden wspólny mail do wszystkich aktywnych administratorów (rola `admin`, konto nieusunięte i niezablokowane) z zadaniami zaległymi i na dziś, pogrupowanymi według osoby odpowiedzialnej (każdy administrator osobno, zadania zewnętrzne pod właścicielem sprawy lub autorem, według reguły "moje" z AC-15), z liczbą zadań bez terminu i linkiem do "Na dziś". Gdy nie ma żadnego zadania zaległego ani na dziś, mail nie jest wysyłany. Endpoint odmawia bez poprawnego `Authorization: Bearer ${CRON_SECRET}`. Dwukrotne uruchomienie tego samego dnia (data w Europe/Warsaw) nie wysyła drugiego maila, a nieudana wysyłka nie zużywa dnia: kolejne uruchomienie może spróbować ponownie.
- **AC-20**: Jednorazowy skrypt tworzy firmę dla każdego obecnego producenta z platformy (nazwa, kraj, rodzaj producent, link do producenta) oraz jedną osobę kontaktową z danych jego konta. Osobę kontaktową skrypt tworzy tylko wtedy, gdy w tym samym przebiegu powstała firma (brak naturalnego klucza kontaktu), a gdy konto nie ma imienia, używa nazwy producenta. Skrypt jest idempotentny (powtórka nie tworzy ani firm, ani kontaktów drugi raz), najpierw uruchamiany na bazie deweloperskiej, a dla produkcji generuje plik SQL do ręcznego uruchomienia.

Gotowość pod bota
- **AC-21**: Zapis wpisów, zadań i spraw przechodzi przez funkcje domenowe w `lib/conversations/`, które przyjmują autora jako parametr i nie zależą od sesji ani formularza. Te pliki mają `import "server-only"` i nigdy `"use server"` (inaczej każda funkcja stałaby się publicznym wejściem, w którym wołający wybiera autora i omija bramkę). Tylko pliki akcji mają `"use server"` i są cienką warstwą: bramka roli, autor z sesji, wywołanie funkcji domenowej. Kolumna `source` odróżnia wpis z bota od wpisu z formularza.

<!-- Każde AC jest przypisane do zadań w ## Build plan, a scenariusze testowe w ## Feature design wskazują AC. -->

## Decision

**Chosen option**: Option 1: własna sekcja w panelu admina z modelem firma, osoba, sprawa, wpis, zadanie

Budujemy notatnik rozmów jako sekcję `/internal/conversations` na istniejącym stosie (Next.js 16, Drizzle, Neon, prywatny R2, nadawca maili, cron), z modelem opartym o sprawy i zadania zamiast sztywnego lejka, i z opcjonalnymi linkami do rekordów platformy.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) · `zod` (`pproenca/dot-skills`, `.agents/skills/zod/`) · `aws-sdk-js-v3-usage` (`aws/agent-toolkit-for-aws`, `.agents/skills/aws-sdk-js-v3-usage/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`)

## Rationale

Uzasadnienie i rozważone opcje: patrz [rationale.md](rationale.md).

## Feature design

**Nazewnictwo**: firma to `partner` (w interfejsie "Firma" lub "Kontrahent"), żeby uniknąć pomyłki z pojęciem organizacji z innych miejsc. Folder tras `conversations`, tabele z przedrostkiem `crm_`. Wszystkie tabele mają `created_at` (domyślnie now), a miękkie usuwanie to `deleted_at` (konwencja `lib/db`).

**Data model sketch**:

| Tabela | Klucz | Pola (`*` wymagane) | Ograniczenia |
|---|---|---|---|
| `crm_partner` | `id` uuid | `name`*, `kind`* (`producent`, `dostawca`, `klient`, `partner`, `inny`), `website`, `country_code` (FK `country.code`), `tags` text[] (domyślnie pusta), `notes`, `producer_id` (FK `producer.id`, uuid), `created_by`* (FK `users.id`, tekst), `updated_at`*, `archived_at` | CHECK na `kind`. Unikalny częściowy `producer_id` WHERE `producer_id IS NOT NULL` (archiwizacja nie zwalnia producenta, więc przywrócenie nie może zderzyć się z inną firmą). Indeks na `lower(name)` (porównania równości; wyszukiwanie "zawiera" idzie przez `ILIKE`, przy tej skali bez indeksu) |
| `crm_contact` | `id` | `partner_id`* (FK), `name`*, `role`, `phone`, `email`, `preferred_channel` (`phone`, `whatsapp`, `email`), `language` (`pl`, `en`, `de`, `nl`), `note`, `updated_at`*, `deleted_at` | CHECK na wartości. UNIQUE (`id`, `partner_id`) pod klucze złożone |
| `crm_thread` | `id` | `partner_id`* (FK), `title`*, `owner_user_id`* (FK `users.id`), `template_key`, `closed_at`, `closed_by` (FK `users.id`), `link_kind`, `link_id`, `updated_at`* | brak usuwania spraw (zamyka się je). UNIQUE (`id`, `partner_id`). CHECK: `link_kind` i `link_id` oba puste albo oba ustawione; `closed_at` i `closed_by` oba puste albo oba ustawione |
| `crm_entry` | `id` | `partner_id`*, `thread_id`, `contact_id`, `author_user_id`* (FK `users.id`), `occurred_at`* (timestamptz), `direction`* (`outbound`, `inbound`, `internal`), `channel`* (`phone`, `whatsapp`, `email`, `meeting`, `platform`, `other`), `body`*, `source`* (`web`, `bot`, domyślnie `web`), `edited_at`, `deleted_at` | Zwykły FK `partner_id` do `crm_partner` oraz FK złożone (`thread_id`, `partner_id`) do `crm_thread` i (`contact_id`, `partner_id`) do `crm_contact` (złożone są pomijane, gdy pierwsza kolumna jest pusta, więc zwykły FK jest konieczny). Indeksy (`partner_id`, `occurred_at` malejąco) i (`thread_id`, `occurred_at`) |
| `crm_entry_attachment` | `id` | `entry_id`* (FK), `r2_key`*, `filename`*, `mime_type`*, `size_bytes`*, `uploaded_by`* (FK `users.id`), `deleted_at` | CHECK `size_bytes` ≤ 20971520 i `mime_type` w dozwolonej liście |
| `crm_task` | `id` | `partner_id`*, `thread_id`, `title`*, `note`, `due_date` (date), `assignee_kind`* (`user`, `external`), `assignee_user_id` (FK `users.id`), `external_contact_id`, `status`* (`open`, `done`, `cancelled`, domyślnie `open`), `completed_at`, `completed_by` (FK `users.id`), `created_by`* (FK `users.id`), `link_kind`, `link_id`, `updated_at`* | Zwykły FK `partner_id` do `crm_partner` oraz FK złożone (`thread_id`, `partner_id`) i (`external_contact_id`, `partner_id`). Brak `deleted_at` (zadanie się anuluje). CHECK: `assignee_kind='user'` wymaga `assignee_user_id` i zabrania `external_contact_id`; `assignee_kind='external'` zabrania `assignee_user_id`. CHECK linku jak w sprawie. Częściowy indeks (`due_date`) WHERE `status='open'` |
| `crm_digest_log` | `digest_date` date (data Europe/Warsaw, liczona w SQL jako `(now() AT TIME ZONE 'Europe/Warsaw')::date`) | `claimed_at`*, `sent_at`, `recipient_count` | Najpierw sprawdzamy `RESEND_API_KEY` i adresatów, potem wiersz jest zajmowany (`ON CONFLICT DO NOTHING RETURNING`, wzór `claimNotification`, spec 0070), mail wysyła się tylko, gdy wiersz powstał. Po udanej wysyłce ustawiamy `sent_at`; po błędzie wysyłki wiersz jest usuwany i błąd idzie do `captureError`, więc kolejne uruchomienie próbuje ponownie |

Typy kluczy: wszystkie kolumny wskazujące na `users` są tekstem (`users.id` to tekst), `producer_id` jest uuid. Tagi to kolumna tablicowa, bez osobnej tabeli. `link_kind` ∈ `producer`, `project_request`, `bulk_product_inquiry`, `case`, `product`. Ograniczenia typu CHECK na tekście, nie enumy Postgresa (enumu nie da się cofnąć, konwencja `lib/db`). `link_id` to tekst (część identyfikatorów w platformie to uuid, część tekst).

**Relacje**: `crm_partner` 1:N `crm_contact`, `crm_thread`, `crm_entry`, `crm_task`. `crm_thread` 1:N `crm_entry` i `crm_task` (przypięcie opcjonalne, dlatego `partner_id` jest też na wpisie i zadaniu). `crm_entry` 1:N `crm_entry_attachment`. `crm_partner` N:1 `producer` (opcjonalnie). `crm_task` N:1 `crm_contact` (tylko strona zewnętrzna).

**Szablony spraw** (stałe w `lib/conversations/templates.ts`, nie tabela; nowy szablon to zmiana pliku i wdrożenie): każdy szablon ma klucz, nazwę i listę zadań (`title`, `dueOffsetDays`, `side`: `us` lub `external`). Start z trzema szablonami:
- `rfq` "Zapytanie ofertowe": wysłać zapytanie (us, 0 dni), odpowiedź z wyceną (external, 5), sprawdzić odpowiedź i wrócić z pytaniami (us, 7).
- `catalog-import` "Import katalogu producenta": materiały i specyfikacje od producenta (external, 7), potwierdzić prawa do zdjęć (us, 7), zaimportować do bazy deweloperskiej (us, 10), producent sprawdza dane (external, 14), publikacja na produkcji (us, 16).
- `terms` "Umowa i warunki": przygotować warunki (us, 0), akceptacja producenta (external, 7), podpisanie (us, 10).

**State transitions**:
- Zadanie: `open` do `done` albo `cancelled`; `done` i `cancelled` wracają do `open` (czyści `completed_at`, `completed_by`).
- Sprawa (wyświetlany status, nie zapisany): `zamknięta` (jest `closed_at`) ma pierwszeństwo; potem `czekamy na nas` (otwarte zadanie `user`), potem `czekamy na nich` (otwarte zadanie `external`), potem `otwarta`. Zamknięcie ustawia `closed_at` i `closed_by`, ponowne otwarcie je czyści.

**API surface** (akcje serwerowe z bramką roli `admin`, plus trzy route handlery):

| Wejście | Rodzaj | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `createPartner`, `updatePartner` | akcja | name, kind, website, countryCode, tags, notes | id, ewentualne podobne firmy | admin | walidacja, `ostrzeżenie o duplikacie` (nie błąd) |
| `archivePartner`, `restorePartner` | akcja | partnerId | ok | admin | blokada: otwarte sprawy lub zadania, wylicza je |
| `linkPartnerProducer`, `unlinkPartnerProducer` | akcja | partnerId, producerId | ok | admin | producent już połączony z inną firmą |
| `createContact`, `updateContact`, `deleteContact` | akcja | partnerId, name, role, phone, email, preferredChannel, language, note | id | admin | walidacja, obce `partnerId` |
| `createThread`, `updateThread` | akcja | partnerId, title, ownerUserId, templateKey, link | id, utworzone zadania | admin | właściciel nie jest aktywnym adminem, nieznany szablon |
| `closeThread`, `reopenThread` | akcja | threadId, decyzje dla otwartych zadań (`done` lub `cancelled`) | ok | admin | brak decyzji dla otwartego zadania, sprawa już zamknięta |
| `createEntry`, `updateEntry`, `deleteEntry` | akcja | partnerId, threadId, contactId, occurredAt, direction, channel, body | id | admin | niezgodne `threadId` i `partnerId`, pusta treść |
| `requestEntryAttachmentUpload` | akcja | entryId, filename, deklarowany mime, rozmiar | klucz R2, podpisany adres do zapisu (PUT, ważny kilka minut) | admin | zły typ lub rozmiar, ponad 5 plików na wpis |
| `confirmEntryAttachment`, `deleteEntryAttachment` | akcja | entryId, klucz R2 | id załącznika | admin | brak obiektu, rozmiar lub sygnatura (zakresowy odczyt pierwszych bajtów) niezgodne z deklaracją, przekroczony limit pięciu plików; przy każdym z tych błędów obiekt jest usuwany z R2 |
| `createTask`, `updateTask`, `setTaskStatus` | akcja | partnerId, threadId, title, dueDate, assignee, link, status | id | admin | niezgodna strona, obca osoba kontaktowa |
| `createQuickEntry` | akcja | firma (id lub nowa), sprawa (id lub nowa z szablonem), wpis, lista zadań | id firmy, sprawy, wpisu | admin | atomowa porażka: nic się nie zapisuje |
| `GET /[locale]/internal/conversations/attachments/[id]` | route handler | id załącznika | przekierowanie 302 na podpisany adres (`Cache-Control: no-store`) | admin | 404 gdy brak, załącznik lub wpis usunięty; brak roli |
| `GET /api/cron/conversations-digest` | cron | nagłówek `Authorization` | podsumowanie wysyłki | `CRON_SECRET` | 401 bez sekretu |

Trasy ekranów: `/[locale]/internal/conversations` (Na dziś), `.../partners` (lista firm), `.../partners/[id]` (karta firmy), `.../threads/[id]` (karta sprawy). Linki do platformy budują adres z `link_kind`: producent do ekranu producenta w `/internal/producers`, duże zamówienie do `/internal/large-orders/[id]?kind=request|product`, case do `/internal/cases/[id]`, produkt do `/internal/products/[id]` (dokładne ścieżki sprawdzić w kodzie przy budowie).

**Key invariants**:
- Status sprawy jest zawsze wyliczany, nigdy zapisywany. Pierwszeństwo: zamknięta, czekamy na nas, czekamy na nich, otwarta.
- Wpis i zadanie przypięte do sprawy (lub osoby) mają `partner_id` zgodny z `partner_id` sprawy (osoby), wymuszone kluczem złożonym w bazie.
- Zadanie `user` ma `assignee_user_id` i nie ma osoby kontaktowej; zadanie `external` nie ma `assignee_user_id`.
- `link_kind` i `link_id` ustawione razem lub wcale; link jest tylko wskaźnikiem, w żadnej kolumnie nie kopiujemy danych platformy.
- Najwyżej jedna aktywna firma na producenta.
- `author_user_id` i `created_by` ustawia serwer z sesji (lub funkcja domenowa z parametru dla bota), nigdy pole formularza.
- Zapisy wielotabelowe (szybki wpis, zamknięcie sprawy, utworzenie sprawy z szablonem) idą przez `db.batch`, nie `db.transaction` (konwencja sterownika `neon-http`). Wszystkie identyfikatory nowych wierszy (firma, sprawa, wpis, zadania z szablonu) generuje aplikacja (`crypto.randomUUID()`) przed batchem, a cała walidacja Zod odbywa się przed nim.
- Zamknięcie sprawy to jedno zapytanie `UPDATE crm_thread SET closed_at ... WHERE closed_at IS NULL AND NOT EXISTS (otwarte zadania poza rozstrzygniętymi)` w tym samym batchu co rozstrzygnięcie zadań; akcja sprawdza liczbę zmienionych wierszy i odrzuca zamknięcie, gdy w międzyczasie powstało nowe otwarte zadanie. Tworzenie i ponowne otwieranie zadania ma w zapytaniu warunek `thread.closed_at IS NULL` (AC-22).
- Strefa Europe/Warsaw: Vercel działa w UTC, więc data i godzina z formularza są konwertowane z Europe/Warsaw na serwerze, "dziś" liczy się w SQL jako `(now() AT TIME ZONE 'Europe/Warsaw')::date`, a terminy z szablonów to arytmetyka na datach, nie dodawanie 24 godzin.
- Aktywny administrator: `users.role = 'admin'`, `deleted_at IS NULL`, `blocked_at IS NULL`.
- Daty "dziś" i "zaległe" liczy się w Europe/Warsaw, `due_date` to zwykła data.

**Security model**:
- Wyłącznie rola `admin`; wszyscy administratorzy widzą i mogą zmieniać wszystko (zgodnie z decyzją). Bramka sesji powtórzona w każdej stronie, akcji i route handlerze (wzór `app/[locale]/internal/AGENTS.md`).
- Zakres danych osobowych: telefony i maile osób kontaktowych w firmach (dane biznesowe, RODO obowiązuje). Baza Neon i R2 są w UE. Zmiany nie trafiają do `audit_log` (decyzja inżyniera): odpowiedzialność dają `created_by`, `author_user_id`, `completed_by`, `closed_by`.
- Załączniki zawierają ceny i wyceny, więc leżą w prywatnym kubełku, a pobranie wymaga sesji admina i daje krótko ważny podpisany adres.
- Notatnik nie ma ścieżki dostępu dla klienta ani producenta.

**Configuration required**: brak nowych zmiennych, ale jedna zmiana konfiguracji prywatnego kubełka R2: reguła CORS zezwalająca na `PUT` z adresów panelu (produkcja i podglądy), bo wgrywanie idzie z przeglądarki (kubełek dziś nie ma CORS, bo upload szedł przez serwer; uwaga z `lib/storage/AGENTS.md` o nagłówku `cf-r2-jurisdiction: eu` przy konfiguracji przez API). Używane istniejące: `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (opcjonalna), `R2_ACCOUNT_ID`, `PRIVATE_R2_BUCKET_NAME`, `PRIVATE_R2_ACCESS_KEY_ID`, `PRIVATE_R2_SECRET_ACCESS_KEY`. Nowa wartość w unii `NotificationEmailType` (`crm_daily_digest`). Nowy wpis w `vercel.json`: `/api/cron/conversations-digest` o 05:00 UTC (06:00 zimą, 07:00 latem w Polsce). Cron działa tylko na produkcji.

**Failure modes**:
- Awaria odczytu statusu powiązanego rekordu platformy: link działa, status pokazuje "niedostępny" (AC-3, AC-18).
- Przesyłanie pliku zawiodło po zapisie wpisu: wpis zostaje, plik trzeba dodać ponownie. Obiekt wgrany do R2, ale niepotwierdzony (użytkownik zamknął kartę), nie ma wiersza w bazie i zostaje w kubełku jako sierota; akcja potwierdzająca usuwa obiekty, które nie przeszły walidacji, a sprzątanie sierot starszych niż doba jest w Follow-up.
- Brak `RESEND_API_KEY` lub brak adresatów: cron zwraca informację o pominięciu, bez wyjątku (konwencja nadawcy), i nie zajmuje wiersza `crm_digest_log`, więc dzień nie jest "zużyty". Błąd samej wysyłki usuwa zajęty wiersz i idzie do `captureError`, więc kolejne uruchomienie spróbuje ponownie.
- Dwóch administratorów edytuje ten sam rekord naraz: wygrywa ostatni zapis (`updated_at` jest odświeżany), co przy dwóch osobach jest akceptowane.
- Pliki nie przechodzą przez funkcję serwerową (limit ciała żądania funkcji Vercela to około 4,5 MB niezależnie od `bodySizeLimit`), tylko lecą z przeglądarki prosto do prywatnego R2 przez podpisany adres; serwer sprawdza je dopiero przy potwierdzeniu.
- Równoległe uruchomienie crona dwa razy: drugi nie wysyła, bo `crm_digest_log` ma już wiersz na ten dzień.

**Observability**: błędy cron, wgrywania i podpisywania linków idą przez `captureError` z `lib/observability/` (nigdy bezpośrednio do Sentry). Brak zdarzeń analitycznych PostHog: to narzędzie wewnętrzne, nie lejek produktowy.

**Critical test scenarios** (każdy wskazuje kryterium):
- Happy path: administrator tworzy firmę, osobę, sprawę z szablonem `rfq`, dopisuje wpis z PDF, odhacza zadanie, a status sprawy przechodzi `czekamy na nas`, `czekamy na nich`, `otwarta`, verifies **AC-4**, **AC-6**, **AC-9**, **AC-11**, **AC-13**, **AC-14**
- Happy path: szybki wpis tworzy nową firmę, nową sprawę, wpis i dwa zadania w jednym zapisie, verifies **AC-17**
- Failure case: szybki wpis, w którym ostatni krok łamie ograniczenie bazy (np. osoba kontaktowa innej firmy jako strona zewnętrzna zadania), nie zostawia po sobie firmy, sprawy ani wpisu (błąd musi wyjść z bazy, nie z walidacji Zod, inaczej test niczego nie dowodzi), verifies **AC-17**
- Failure case: utworzenie zadania w zamkniętej sprawie jest odrzucone, a zamknięcie sprawy w chwili, gdy powstało nowe otwarte zadanie, jest odrzucone, verifies **AC-12**, **AC-22**
- Edge case: wpis z datą tuż po północy w Warsaw i zadanie z szablonu utworzone o 00:30 czasu polskiego dostają właściwą datę (nie datę UTC), verifies **AC-9**, **AC-13**, **AC-15**
- Edge case: cron po nieudanej wysyłce nie zostawia zajętego dnia, a po udanej drugie uruchomienie nic nie wysyła, verifies **AC-19**
- Edge case: przywrócenie zarchiwizowanej firmy połączonej z producentem nigdy nie kończy się błędem unikalności, a próba połączenia tego producenta z inną firmą daje czytelny komunikat, verifies **AC-8**
- Auth/permission: wywołanie funkcji domenowej nie jest możliwe jako akcja serwerowa (pliki `lib/conversations/` mają `server-only`), a pobranie załącznika usuniętego wpisu daje 404, verifies **AC-14**, **AC-21**
- Failure case: zamknięcie sprawy z otwartym zadaniem bez decyzji jest odrzucone, a z decyzjami atomowo zamyka i rozstrzyga, verifies **AC-12**
- Failure case: wpis z `thread_id` obcej firmy odrzuca baza (klucz złożony), verifies **AC-13**
- Failure case: plik z rozszerzeniem `.pdf`, ale bez sygnatury PDF, jest odrzucony; plik powyżej 20 MB odrzucony, verifies **AC-14**
- Failure case: cron odpalony dwa razy tego samego dnia wysyła jeden mail; bez zaległych i dzisiejszych zadań nie wysyła nic, verifies **AC-19**
- Failure case: link do usuniętego producenta lub rekordu platformy pokazuje "niedostępny" i nie przewraca ekranu, verifies **AC-3**, **AC-7**, **AC-18**
- Failure case: powtórne uruchomienie importu producentów nie tworzy duplikatów, verifies **AC-20**
- Auth/permission: konto `client` i `producer` oraz brak sesji nie wchodzą na żaden ekran, nie wywołają żadnej akcji i nie pobiorą załącznika; cron bez sekretu dostaje 401, verifies **AC-1**, **AC-19**
- Edge case: archiwizacja firmy z otwartym zadaniem jest zablokowana z komunikatem, verifies **AC-8**
- Edge case: tworzenie firmy o podobnej nazwie pokazuje ostrzeżenie, ale zapis przechodzi, verifies **AC-5**

## Build plan

Podejście: root `AGENTS.md` zapisuje dla projektu Facade (pełny interfejs na danych przykładowych), ale to narzędzie produkcyjne, w którym model danych jest produktem, a danych przykładowych nie ma sensu rysować. Zakładam więc Tracer Bullet: najpierw cienki pionowy kawałek od bazy po ekran (firma, wpis), potem pogrubianie. Do potwierdzenia przy `/develop`, jeśli wolisz inny.

1. Migracja i schemat Drizzle dla wszystkich siedmiu tabel (klucze złożone, CHECK, indeksy, `crm_digest_log`); `db:generate`, weryfikacja na gałęzi Neon (hand written elementy), satisfies **AC-4**, **AC-6**, **AC-9**, **AC-10**, **AC-13**, **AC-14**, **AC-19**
2. Warstwa domenowa `lib/conversations/`: `queries.ts` (listy, karta, "Na dziś", status wyliczany), funkcje zapisu przyjmujące autora jako parametr, `templates.ts`, schematy Zod; testy jednostkowe statusu, szablonów i niezmienników, satisfies **AC-9**, **AC-11**, **AC-21**
3. Cienki pionowy kawałek: pozycja "Rozmowy" w `InternalSidebar`, trasa `conversations` z bramką, lista firm z tworzeniem, karta firmy z dodawaniem wpisu (bez plików), satisfies **AC-1**, **AC-2**, **AC-4**, **AC-13**
4. Wyszukiwanie, filtry, stronicowanie listy firm w parametrach adresu oraz ostrzeżenie o duplikatach, satisfies **AC-4**, **AC-5**
5. Osoby kontaktowe: dodawanie, edycja, miękkie usuwanie na karcie firmy, satisfies **AC-6**
6. Sprawy i zadania: tworzenie sprawy (z szablonem lub bez), karta sprawy, zadania z przypisaniem do administratora lub strony zewnętrznej, blokada zadań w zamkniętej sprawie, status wyliczany i pigułka statusu (kolor, ikona, tekst), satisfies **AC-9**, **AC-10**, **AC-11**, **AC-16**, **AC-22**
7. Zamykanie i ponowne otwieranie sprawy (okno z decyzjami dla otwartych zadań, warunkowy `UPDATE` w `db.batch` ze sprawdzeniem liczby zmienionych wierszy), satisfies **AC-12**, **AC-22**
8. Ekran "Na dziś" z sekcjami i przełącznikiem moje lub wszystkie, satisfies **AC-15**
9. Okno szybkiego wpisu (Headless UI) z atomowym `createQuickEntry`, satisfies **AC-17**
10. Załączniki: najpierw reguła CORS `PUT` na prywatnym kubełku i krótki test na podglądzie Vercela dużym plikiem (sprawdza, że wgrywanie omija limit 4,5 MB); `requestEntryAttachmentUpload` (podpisany `PUT`), `confirmEntryAttachment` (zakresowy odczyt pierwszych bajtów, walidatory z `lib/storage`, limit pięciu na wpis, usunięcie obiektu przy porażce), route handler pobierania z podpisanym adresem i nagłówkami, satisfies **AC-14**
11. Linki do rekordów platformy: wybór rekordu z wyszukiwaniem (producent i produkt po nazwie, duże zamówienie i case z listy ostatnich i po id), resolver adresu i statusu z niezależną obsługą błędu, satisfies **AC-3**, **AC-18**
12. Połączenie firmy z producentem (wybór, podpowiedzi po mailu osoby i nazwie, NIP i weryfikacja z `producer`, odłączanie), archiwizacja i przywracanie firmy, satisfies **AC-7**, **AC-8**
13. Dzienny mail (claim po sprawdzeniu klucza i adresatów, usunięcie wiersza po błędzie wysyłki): `lib/notifications/conversations-digest.ts` (wzór `large-order-team.ts`), szablon i teksty, nowa wartość `NotificationEmailType`, cron `app/api/cron/conversations-digest/route.ts`, wpis w `vercel.json`, claim przez `crm_digest_log`, satisfies **AC-19**
14. Skrypt `scripts/` importu producentów jako firm (baza deweloperska, flaga generująca SQL do `drizzle/_promote_*` dla produkcji; kontakt tworzony tylko razem z firmą w tym samym zapytaniu, `ON CONFLICT` z powtórzonym warunkiem częściowego indeksu), satisfies **AC-20**
15. Testy: komponentowe dla okna szybkiego wpisu i zamykania sprawy, integracyjne dla bramki roli na akcjach, jeden test E2E ścieżki firma, sprawa, wpis, zadanie (uruchamiany z `DATABASE_URL`, patrz root `AGENTS.md`), satisfies **AC-1**, **AC-3**, **AC-12**, **AC-17**
16. Dokumentacja kontekstu przez `/sync`: nowy `lib/conversations/AGENTS.md`, wiersz w root `AGENTS.md` (sekcja Context files), wzmianka w `app/[locale]/internal/AGENTS.md`, satisfies **AC-21**

## Consequences

**Positive**:
- Jedno miejsce prawdy o rozmowach z producentami dla dwóch osób; zawsze widać, na kogo czekamy i co jest zaległe.
- Model sprawa plus zadanie znosi sztywny lejek, więc łóżka od Kristola, import katalogu i umowa mieszczą się w tej samej strukturze.
- Brak zależności od zewnętrznego narzędzia i jego cennika; linki do platformy działają w jednym kliknięciu.
- Funkcje domenowe niezależne od sesji i kolumna `source` odblokowują bota bez zmiany schematu.

**Negative / tradeoffs**:
- Własny kod do utrzymania, z siedmioma nowymi tabelami, tam gdzie gotowy CRM dałby część tego od ręki.
- Wszystkie zapisy edycji i usuwania wpisów są dostępne dla obu administratorów i nie trafiają do `audit_log`; przy dwóch zaufanych osobach to akceptowalne, ale nie ma śladu, kto co zmienił poza polami autora.
- Dane osobowe osób kontaktowych (RODO) przechowywane bez automatycznego terminu retencji; usunięcie na żądanie trzeba robić ręcznie (Follow-up).
- Status wyliczany z zadań wymaga dyscypliny: sprawa bez żadnego otwartego zadania pokazuje się jako "otwarta", nie jako "czekamy", więc łatwo ją przeoczyć.
- Szablony w kodzie wymagają wdrożenia przy każdej zmianie listy zadań.
- Mail dzienny o stałej godzinie UTC przesuwa się o godzinę wraz z czasem letnim.
- Wgrywanie z przeglądarki wymaga reguły CORS na prywatnym kubełku i zostawia możliwość sierot (obiekty bez wiersza), których sprzątanie jest w Follow-up; w zamian omija twardy limit ciała żądania funkcji Vercela.

**Neutral**:
- Nowy katalog `lib/conversations/` i nowa nawigacja w panelu wymagają wpisu w `AGENTS.md`.
- Nowa wartość w `NotificationEmailType` i nowa przestrzeń nazw komunikatów dla maila (sprawdzić, czy test zgodności tłumaczeń wymaga wpisów w innych językach).
- Panel pozostaje wyłącznie po polsku.

## Follow-up

- [ ] Bot (WhatsApp lub Telegram) zapisujący wpisy i zadania z wiadomości tekstowych i głosówek: osobny spec; wymaga tabeli "numer telefonu do administratora" i wyboru kanału
- [ ] Procedura usunięcia danych osobowych osoby kontaktowej na żądanie (twarde usunięcie) i ewentualny termin retencji
- [ ] Import arkusza `tmp/sauna-producers/producenci-saun.xlsx` jako firm (leady), po tym jak model sprawdzi się na kilku producentach
- [ ] Sprzątanie obiektów R2 bez wiersza w bazie (niepotwierdzone wgrania starsze niż doba) oraz plików usuniętych wpisów, np. regułą cyklu życia lub zadaniem cron
- [ ] Zaproponować osobny spec lub poprawkę dla spec 0063, jeśli test na podglądzie pokaże, że wgrywanie PDF wyceny przez akcję serwerową ma ten sam limit około 4,5 MB na Vercelu
- [ ] Dodać wiersz do scope (`docs/scope/produkcja.md`) i podlinkować spec 0080, po zatwierdzeniu
- [ ] Zapewnić `/sync` aktualizację kontekstu: `lib/conversations/AGENTS.md`, root `AGENTS.md`, `app/[locale]/internal/AGENTS.md`
- [ ] Rozważyć mail dzienny w czasie lokalnym zamiast stałej godziny UTC, gdyby przesunięcie o czas letni przeszkadzało
