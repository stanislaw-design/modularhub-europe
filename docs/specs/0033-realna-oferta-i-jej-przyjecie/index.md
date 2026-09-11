# 0033. Realna oferta i jej przyjęcie

**Date**: 2026-09-10
**Status**: In Progress

## Summary

Ta decyzja podłącza prawdziwą ofertę producenta i jej przyjęcie przez klienta do bazy danych, zastępując dwa dzisiejsze, rozłączone mocki (formularz oferty producenta na `localStorage` i osobny ekran "wiążącej oferty" klienta, który w ogóle omija prawdziwe zapytanie). Tabele `offer`, `offer_item`, `order` i `order_stage_event` już istnieją w schemacie od spec 0018, ale nikt jeszcze do nich nie pisze. Ta funkcja to zmienia: producent odpowiada na realne zapytanie realną ofertą (cena za produkt, transport, montaż), klient ją widzi, przyjmuje lub odrzuca, a przyjęcie trwale tworzy zamówienie z pierwszym etapem realizacji.

## Requirements

**User stories**:
- Jako producent, chcę odpowiedzieć na realne zapytanie klienta realną ofertą (cena za mój produkt, transport, montaż), żeby moja odpowiedź faktycznie dotarła do klienta.
- Jako producent, chcę poprawić złożoną ofertę zanim klient zdecyduje, żeby naprawić pomyłkę bez proszenia klienta o nowe zapytanie.
- Jako klient, chcę zobaczyć wszystkie oferty złożone na moje zapytanie (czasem od kilku producentów naraz), żeby móc je porównać i wybrać.
- Jako klient, chcę przyjąć konkretną ofertę, żeby ruszyć dalej z zamówieniem.
- Jako klient, chcę też jawnie odrzucić ofertę, która mnie nie interesuje, żeby producent nie czekał w nieskończoność.
- Jako administrator, chcę widzieć status i szczegóły ofert przy każdym zapytaniu, żeby mieć pełny obraz bez wchodzenia w osobne ekrany.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):

- **AC-1**: `/producent/panel/zapytania/[id]` pokazuje producentowi szczegóły zapytania (wyłącznie własne produkty z tego zapytania, dane kontaktowe klienta, kraj dostawy) i formularz oferty: cena domu osobno za każdy własny produkt w zapytaniu, plus pole transportu i pole montażu, oba wpisywane ręcznie.
- **AC-2**: Złożona oferta jest trwale zapisana w bazie (`offer` + `offer_item`, jeden wiersz `offer_item` na produkt) i widoczna po odświeżeniu strony.
- **AC-3**: Nowa oferta tego samego producenta na to samo zapytanie zastępuje poprzednią aktywną ofertę atomowo (stara → `superseded`, nowa → `active`); nigdy nie istnieją dwie aktywne jednocześnie.
- **AC-4**: Producent nie może złożyć ani zastąpić oferty, której poprzedni stan to `accepted`; próba zwraca czytelny błąd, nie cichy brak efektu. Egzekwowane atomowo na poziomie zapisu (warunkowy insert), nie tylko sprawdzeniem przed zapisem — patrz Key invariants, wyścig z akceptacją klienta.
- **AC-5**: Produkt, który stał się niedostępny (status inny niż `published` albo usunięty) między zapytaniem a ofertą, nadal może zostać wyceniony przez producenta; formularz oznacza go jako niedostępny zamiast go ukrywać.
- **AC-6**: `/klient/panel/zapytania/[id]` pokazuje klientowi wszystkie oferty złożone na to zapytanie (może być więcej niż jedna, od różnych producentów), każda z rozbiciem ceny (dom per produkt, transport, montaż, razem).
- **AC-7**: Klient może przyjąć jedną konkretną ofertę; przyjęcie atomowo tworzy `order` (stage początkowy `produkcja`) i pierwszy wiersz `order_stage_event`, ustawia `offer.status` na `accepted`, i zostaje na `/klient/panel/zapytania` z widocznym potwierdzeniem.
- **AC-8**: Klient może jawnie odrzucić ofertę (`offer.status` → `rejected`); zamyka to wyłącznie tę relację (to zapytanie, ten producent) — inne aktywne oferty od innych producentów na tym samym zapytaniu nie są tym dotknięte.
- **AC-9**: Przyjęcie i odrzucenie są ostateczne w tej funkcji; nie ma cofnięcia którejkolwiek decyzji (cofnięcie to zakres przyszłej funkcji płatności/realizacji).
- **AC-10**: `inquiry.status` przechodzi `open` → `offered`, gdy pierwszy producent na tym zapytaniu złoży aktywną ofertę; → `closed` dopiero, gdy KAŻDY producent na tym zapytaniu (czyli każdy `producer_id` obecny w `inquiry_item` tego zapytania) osiągnął stan końcowy (`accepted`, albo `rejected`/brak aktywnej oferty po decyzji klienta). Znana granica tej reguły: producent, który nigdy nie złoży żadnej oferty, nigdy formalnie nie osiąga stanu końcowego, więc `closed` może wtedy nigdy nie nastąpić automatycznie (patrz Key invariants i Follow up) — to świadomie zaakceptowane ograniczenie tej funkcji, nie błąd do naprawienia teraz.
- **AC-11**: Klient widzi wizualny sygnał nieprzeczytanej oferty (przy wierszu zapytania na `/klient/panel/zapytania` i zbiorczo przy odnośniku "Zapytania"); sygnał znika po otwarciu szczegółów tego zapytania.
- **AC-12**: Producent widzi symetryczny sygnał, gdy klient podjął decyzję (przyjął albo odrzucił); sygnał znika po wejściu na `/producent/panel/zapytania/[id]` po tej decyzji.
- **AC-13**: Tylko własne produkty producenta w danym zapytaniu trafiają do jego formularza i do `offer_item`; identyfikator producenta używany w każdym zapisie pochodzi z sesji, nigdy z wartości podanej przez przeglądarkę.
- **AC-14**: Klient może przyjąć albo odrzucić wyłącznie ofertę złożoną na jego własne zapytanie; identyfikator klienta pochodzi z sesji.
- **AC-15**: Kwoty (cena domu, transport, montaż) są walidowane jako `>= 0`, bez górnego limitu, wyłącznie w EUR.
- **AC-16**: Stare mockowe ścieżki (`/producent/zapytania`, `/producent/zapytania/oferta`, `/klient/oferta` i ich komponenty/`localStorage`) są usunięte w tym samym buildzie, razem ze wszystkimi trzema dzisiejszymi odnośnikami do nich (znalezione w cross checku, żaden nie ujęty wcześniej): przycisk na `/producent/panel` (`app/[locale]/producent/panel/page.tsx`) prowadzi teraz do `/producent/panel/zapytania`; `PlotAnalysisRow` (`components/klient/PlotAnalysisRow.tsx`) i domyślne przekierowanie na `/klient/realizacja` (`app/[locale]/klient/realizacja/page.tsx`) prowadzą teraz do `/klient/panel/zapytania` zamiast do usuniętego `/klient/oferta`. Sam ekran `/klient/realizacja` zostaje (wciąż mock, funkcja 16 wciąż niezaprojektowana), tylko traci naturalną ścieżkę wejścia z linku; patrz Consequences.
- **AC-17**: Wewnętrzny widok administratora `/internal/zapytania` pokazuje pełne szczegóły każdej oferty (producent, ceny, status) rozwijane przy wierszu zapytania.
- **AC-18**: `offer`, `offer_item`, `order` i `order_stage_event` mają ten sam trigger audytowy co `users`/`producer`/`client`/`inquiry`/`payment`/`document`.
- **AC-19**: Klient próbujący przyjąć albo odrzucić ofertę, która w międzyczasie przestała być aktywna (np. producent ją właśnie zastąpił), dostaje czytelny komunikat błędu z podpowiedzią odświeżenia, nie awarię ani cichy brak efektu.

## Decision

**Chosen option**: Option 3: Wymiana bezpośrednia (replace directly)

Oba dzisiejsze mocki (`localStorage` producenta, ekran wiążącej oferty klienta z pominięciem zapytania) są usuwane w tym samym buildzie, w którym rusza realna ścieżka oferty na już zaprojektowanym schemacie ze spec 0018 — bez okresu równoległego działania starej i nowej ścieżki.

## Rationale

Pełne uzasadnienie, rozważane opcje i kontekst badawczy: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Cztery tabele już istnieją w schemacie (spec 0018), tutaj zaczynają być realnie zapisywane; dwie nowe kolumny na `offer` dla sygnału przeczytane/nieprzeczytane (AC-11, AC-12).

| Tabela | Pole | Typ | Wymagane | Uwaga |
|---|---|---|---|---|
| `offer` | `id`, `inquiry_id`, `producer_id`, `currency`, `installation_price_cents`, `transport_price_cents`, `status`, `submitted_at`, `created_at` | (istniejące) | — | Unikalny indeks `(inquiry_id, producer_id)` WHERE `status = 'active'` (spec 0018), już wymusza AC-3 na poziomie bazy. |
| `offer` | `client_viewed_at` | timestamp, nullable | nie | NOWE. Kiedy klient otworzył szczegóły tej oferty (AC-11). |
| `offer` | `producer_decision_viewed_at` | timestamp, nullable | nie | NOWE. Kiedy producent zobaczył decyzję klienta; zerowane przy każdej zmianie `status` na `accepted`/`rejected` (AC-12). |
| `offer_item` | `offer_id`, `product_id`, `house_price_cents`, `created_at` | (istniejące) | — | Klucz złożony `(offer_id, product_id)`. Jeden wiersz na produkt tego producenta w tym zapytaniu. |
| `order` | `id`, `offer_id`, `current_stage`, `created_at`, `updated_at` | (istniejące) | — | `offer_id` unikalny (1:1); istnieje wyłącznie gdy `offer.status = 'accepted'`. `current_stage` domyślnie `produkcja`. |
| `order_stage_event` | `id`, `order_id`, `stage`, `reached_at`, `changed_by_user_id`, `note`, `created_at` | (istniejące) | — | Pierwszy wiersz zapisywany razem z `order` (AC-7). |

Relacje: `inquiry` 1:N `offer` (jedna aktywna na parę z `producer`) → `offer` 1:N `offer_item` → `offer` 1:1 `order` (tylko gdy `accepted`) → `order` 1:N `order_stage_event`.

**State transitions**:

`offer.status`: `active` → `accepted` (klient przyjmuje, AC-7) | `active` → `rejected` (klient odrzuca, AC-8) | `active` → `superseded` (producent składa nową ofertę, AC-3). Z `accepted` nie ma wyjścia w tej funkcji (AC-4, AC-9); z `rejected` producent może złożyć nową aktywną ofertę (nowy wiersz `active`, stary zostaje `rejected` do wglądu).

`inquiry.status`: `open` → `offered` (pierwsza aktywna oferta na zapytaniu) → `closed` (każdy producent na zapytaniu osiągnął stan końcowy, AC-10). Liczone jako agregat przy każdym zapisie `offer`, nie osobna maszyna stanów per relacja (`offer.status` już to niesie per producenta).

**API surface**:

| Akcja / trasa | Typ | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `/producent/panel/zapytania/[id]` | Strona | brak (sesja + parametr trasy) | zapytanie, własne pozycje, aktualna/poprzednie oferty | sesja, rola `producer`, zapytanie musi mieć pozycję tego producenta | brak sesji/zła rola → przekierowanie; brak dostępu do zapytania → 404 |
| `submitOffer` | Akcja serwerowa | `inquiryId`, `items: {productId, housePriceCents}[]`, `transportPriceCents`, `installationPriceCents` | potwierdzona oferta | sesja, rola `producer`, `producerId` z sesji | poprzednia oferta `accepted` → błąd (AC-4); cena ujemna → walidacja w miejscu |
| `/klient/panel/zapytania/[id]` | Strona | brak (sesja + parametr trasy) | zapytanie, wszystkie oferty na nie, rozbicie cen | sesja, rola `client`, zapytanie musi należeć do klienta | brak sesji/zła rola → przekierowanie; nie własne zapytanie → 404 |
| `respondToOffer` | Akcja serwerowa | `offerId`, `decision: "accepted" \| "rejected"` | potwierdzony nowy stan | sesja, rola `client`, oferta musi należeć do własnego zapytania | oferta już nie `active` (wyścig, AC-19) → błąd z podpowiedzią odświeżenia |

**Key invariants**:
- **Wyścig producenta przeciw akceptacji klienta (AC-4, znaleziony w cross checku).** Częściowy unikalny indeks na `offer` obejmuje tylko `status = 'active'`, nie `accepted` — więc samo sprawdzenie "czy poprzednia oferta ma status accepted" przed zapisem nie jest bezpieczne, klient mógłby zaakceptować dokładnie między odczytem a zapisem. `submitOffer` dlatego NIE wstawia nowej oferty wprost: insert jest zagwarantowany warunkowo, jednym zdaniem SQL, `INSERT INTO offer (...) SELECT ... WHERE NOT EXISTS (SELECT 1 FROM offer WHERE inquiry_id = X AND producer_id = Y AND status = 'accepted')`, w tym samym `db.batch` co supersede starej `active` oferty. Po zapisie serwer sprawdza liczbę wstawionych wierszy: `0` → zwraca błąd AC-4 (oferta już zaakceptowana), `1` → sukces.
- `submitOffer` łapie też wyjątek unikalnego indeksu `offer_active_per_inquiry_producer` (kod Postgres `23505`, może wystąpić przy dwóch kartach/zakładkach tego samego producenta wysyłających ofertę naraz) i tłumaczy go na czytelny komunikat "spróbuj ponownie", nigdy na surowy błąd 500.
- **`db.batch` jest atomowe, ale NIE warunkowe** (`lib/db/AGENTS.md`: ten driver nie wspiera `db.transaction`) — polecenia w jednym batchu nie zatrzymują się nawzajem, więc `respondToOffer` NIE może zapisać `offer.status` i `order` w jednym batchu z założeniem, że zerowy rowcount pierwszego zatrzyma drugi. Zamiast tego dwa kroki: **krok 1**, pojedyncze zdanie `UPDATE offer SET status = 'accepted' WHERE id = X AND status = 'active' RETURNING id`; `0` wierszy → od razu zwraca błąd AC-19 (oferta już nieaktywna), żaden `order` nigdy nie powstaje. **Krok 2** (tylko gdy krok 1 zwrócił 1 wiersz): `db.batch` wstawiający `order` (z `id` wygenerowanym w aplikacji, `crypto.randomUUID()`, bo żadne polecenie w batchu nie może odczytać wygenerowanego id innego polecenia z tego samego batcha) i pierwszy `order_stage_event`, odwołujący się do tego samego, znanego z góry `order.id`.
- **Odzyskiwanie po częściowej awarii.** Krok 1 i krok 2 nie są jedną atomową operacją (ograniczenie sterownika), więc teoretycznie krok 1 może się powieść, a krok 2 zawiedzie (np. utrata sieci) — `offer.status = 'accepted'` bez `order`. `respondToOffer` na początku sprawdza dokładnie ten stan (oferta `accepted`, ale `order.offer_id` nie istnieje) i w takim wypadku dokańcza wyłącznie krok 2, nie próbuje ponownie zmieniać już poprawnego statusu.
- `producerId` i `clientId` używane w każdym zapisie tej funkcji pochodzą z sesji (`auth()` → `getProducerIdForUser`/`getClientIdForUser`), nigdy z wartości podanej przez przeglądarkę, ten sam wzorzec co `submitInquiry`/`toggleFavorite` (spec 0023/0024).
- `offer_item` przyjmuje wyłącznie `productId` należące jednocześnie do tego producenta (`product.producerId`) i do tego zapytania (`inquiry_item.product_id`); serwer waliduje przecięcie, nie ufa liście przysłanej z formularza.
- Agregat `inquiry.status` liczony jest po każdym zapisie `offer`: `closed` tylko gdy dla KAŻDEGO `producer_id` z `inquiry_item` istnieje `offer` w stanie `accepted` albo (`rejected` i brak żadnej `active`). **Znana, zaakceptowana granica** (cross check): producent, który nigdy nie złoży żadnej oferty, nie ma w ogóle wiersza `offer`, więc jego relacja nigdy nie osiąga stanu końcowego — `inquiry.status` może wtedy trwale zostać na `offered` (albo `open`, jeśli żaden producent jeszcze nie odpowiedział). Ta funkcja nie dodaje mechanizmu przypomnień/limitu czasu dla milczącego producenta; to naturalne rozszerzenie dopiero z funkcją 17 (powiadomienia e mail), patrz Follow up.
- Klient może przyjąć oferty od różnych producentów na tym samym zapytaniu (świadomie: koszyk klienta, spec 0005/0023, dopuszcza produkty od kilku producentów naraz) — jedno zapytanie może więc skończyć z więcej niż jednym `order`, po jednym na każdego producenta, którego ofertę klient przyjął. To zamierzone, nie błąd.
- Sygnał nieprzeczytane/przeczytane (`client_viewed_at`, `producer_decision_viewed_at`) ustawiany jest bezpośrednio przy renderze strony szczegółów, ale wyłącznie w ścieżce faktycznej nawigacji (np. w akcji/handlerze wywołanym po wejściu na stronę), nigdy w miejscu, które Next.js mógłby prefetchować przy samym najechaniu na link; zapis jest idempotentny (no op gdy pole już ustawione), więc trigger audytowy odpala się najwyżej raz na ofertę.
- Zdarzenia PostHog (`lib/observability/`, jedyna sankcjonowana ścieżka, patrz `AGENTS.md`): `offer_submitted`, `offer_accepted`, `offer_rejected`, dopisane do `lib/observability/types.ts`, ten sam wzorzec co `product_favorited` (spec 0024).

**Security model**:
- Rola `producer`: widzi i zapisuje wyłącznie oferty na własne produkty; nigdy nie widzi cen ani obecności innych producentów na tym samym zapytaniu (ten sam wzorzec izolacji co `getInquiriesForProducer`, spec 0032 AC-8).
- Rola `client`: widzi i zmienia wyłącznie oferty na własne zapytania.
- Rola `admin`: podgląd pełnych szczegółów każdej oferty na `/internal/zapytania` (AC-17), bez prawa zapisu w tej funkcji.
- RODO: żadna nowa kategoria danych osobowych (ceny i statusy to dane transakcyjne, nie osobowe); trigger audytowy (AC-18) rozszerza już ustalony wzorzec zgodności ze spec 0018 na te cztery tabele.

**Critical test scenarios** (każdy mapuje na kryterium w `## Requirements`):
- Happy path: producent składa ofertę na jeden własny produkt, klient widzi ją na `/klient/panel/zapytania/[id]`, przyjmuje ją, powstaje `order` ze stanem `produkcja`. Weryfikuje **AC-1**, **AC-2**, **AC-6**, **AC-7**, **AC-13**, **AC-14**.
- Wielu producentów: zapytanie z produktami od dwóch producentów, każdy składa własną ofertę niezależnie, klient przyjmuje jedną i odrzuca drugą; pierwsza relacja się zamyka, druga zostaje nietknięta aż klient zadecyduje. Weryfikuje **AC-6**, **AC-7**, **AC-8**, **AC-10**.
- Rewizja: producent składa drugą ofertę zanim klient zdecyduje; stara oferta znika z aktywnych, nowa jest tą, którą widzi klient. Weryfikuje **AC-3**.
- Wyścig: klient klika przyjmij dokładnie w chwili, gdy producent zastępuje ofertę nową; klient dostaje czytelny błąd zamiast przyjęcia nieaktualnej oferty. Weryfikuje **AC-19**.
- Wyścig odwrotny: klient przyjmuje ofertę dokładnie w chwili, gdy producent (np. w drugiej karcie) próbuje złożyć nową; przyjęcie klienta wygrywa, producent dostaje błąd AC-4 zamiast cichego nadpisania zaakceptowanej oferty. Weryfikuje **AC-4**.
- Auth/permission: producent B próbuje złożyć ofertę na produkt producenta A w tym samym zapytaniu (podstawiony `productId`) → serwer odrzuca; klient B próbuje odpowiedzieć na ofertę należącą do zapytania klienta A → 404/odmowa. Weryfikuje **AC-13**, **AC-14**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet projektu (`AGENTS.md`): najpierw jeden cienki wątek od zapytania do zamówienia, potem pogrubienie (rewizja, odrzucenie, agregat statusu, sygnały, sprzątanie, panel admina).

1. Migracja: dwie nowe kolumny na `offer` (`client_viewed_at`, `producer_decision_viewed_at`) i cztery triggery audytowe (`offer_audit`, `offer_item_audit`, `order_audit`, `order_stage_event_audit`), satisfies **AC-18**
2. Warstwa danych: `lib/db/queries.ts` — funkcje odczytu ofert per zapytanie (dla producenta: własne pozycje + aktualna/poprzednie oferty; dla klienta: wszystkie oferty na zapytanie; rozszerzenie istniejących zapytań o `productId`, nie tylko nazwę), satisfies **AC-1**, **AC-6**, **AC-13**, **AC-14**
3. Cienki wątek producent → klient → zamówienie: `submitOffer` (jedna oferta, jeden produkt, warunkowy insert opisany w Key invariants zamiast gołego `db.batch` insert), strona `/producent/panel/zapytania/[id]` z formularzem; `respondToOffer` (`accepted`, dwustopniowy zapis: warunkowy `UPDATE` osobno, potem `db.batch` order+pierwszy `order_stage_event` z `order.id` wygenerowanym w aplikacji), strona `/klient/panel/zapytania/[id]`, satisfies **AC-1**, **AC-2**, **AC-6**, **AC-7**, **AC-13**, **AC-14**, **AC-15**
4. Pogrubienie, rewizja i blokady: kilka produktów na ofertę, rewizja zastępująca starą aktywną ofertę (ten sam warunkowy insert co task 3, teraz z realnym drugim wywołaniem do przetestowania), blokada rewizji po `accepted` (AC-4, w tym oba kierunki wyścigu z Critical test scenarios), obsługa `23505` na drugiej karcie/zakładce, oznaczenie produktu niedostępnego w formularzu, satisfies **AC-3**, **AC-4**, **AC-5**
5. Pogrubienie, odrzucenie i agregat statusu: `respondToOffer` (`rejected`), przeliczenie `inquiry.status` (`open`/`offered`/`closed`) po każdym zapisie `offer` (w tym znana granica milczącego producenta, patrz Key invariants), odzyskiwanie po częściowej awarii kroku 2 z `respondToOffer`, czytelny błąd przy próbie odpowiedzi na nieaktywną już ofertę, satisfies **AC-8**, **AC-9**, **AC-10**, **AC-19**
6. Sygnały nieprzeczytane/przeczytane po obu stronach (znacznik przy wierszu + zbiorczy przy "Zapytania", ustawianie `client_viewed_at`/`producer_decision_viewed_at` wyłącznie w ścieżce faktycznej nawigacji, nie w czymś, co Next.js mógłby prefetchować) i zdarzenia PostHog (`offer_submitted`, `offer_accepted`, `offer_rejected`), satisfies **AC-11**, **AC-12**
7. Sprzątanie: usunięcie `/producent/zapytania/*`, `/klient/oferta/*`, `ProducerInquiryList`/`ProducerInquiryRow`/`ProducerOfferForm`/`BindingOfferView`, `lib/producer-offers.ts` i ich testów, plus naprawa trzech dzisiejszych odnośników do tych ścieżek (`app/[locale]/producent/panel/page.tsx`, `components/klient/PlotAnalysisRow.tsx`, `app/[locale]/klient/realizacja/page.tsx`, patrz AC-16), satisfies **AC-16**
8. Panel administratora: rozwijane szczegóły oferty (producent, ceny, status) przy wierszu na `/internal/zapytania`, satisfies **AC-17**

## Migration plan

**Strategy**: brak migracji danych (no data migration needed) — `offer`/`offer_item`/`order`/`order_stage_event` mają dziś zero wierszy, więc nie ma nic do przekształcenia; jedyna zmiana schematu to dwie nowe nullable kolumny na `offer` i cztery nowe triggery audytowe, jedna migracja w przód, w pełni odwracalna cofnięciem commita. Stare mockowe ścieżki są usuwane bezpośrednio (replace directly, nie strangler): działają dziś wyłącznie na danych przykładowych/`localStorage`, więc nie ma żywego ruchu do migrowania, ten sam wzorzec co retirement starej ścieżki NIP producenta w spec 0032.
**Phases**:
1. Migracja: dwie kolumny na `offer` + cztery triggery audytowe (`offer_audit`, `offer_item_audit`, `order_audit`, `order_stage_event_audit`), ta sama funkcja `audit_log_capture()` co reszta projektu; już naprawiona w migracji `drizzle/0007_fix_favorite_audit_trigger.sql` dla tabel bez własnej kolumny `id` (`favorite`), więc bezpiecznie obsłuży też złożony klucz `offer_item` bez dalszych zmian tej funkcji.
2. Kod: nowe akcje serwerowe i strony (producent, klient, admin), stare mocki usunięte w tym samym commicie/PR.
**Rollback**: cofnięcie migracji usuwa dwie kolumny i cztery triggery (bez utraty danych, bo nie ma jeszcze żadnych wierszy w tych tabelach); cofnięcie kodu przywraca stare mocki z historii gita, jeśli kiedykolwiek potrzebne.
**Risks**: żaden — brak żywych danych do przekształcenia to najniższe możliwe ryzyko migracji w tym projekcie.

## Consequences

**Positive**:
- Pierwszy realny zapis do `order` w historii projektu; funkcje 12 (płatności) i 16 (realizacja) dostają wreszcie prawdziwe dane, na których mogą stanąć.
- Usuwa realny, właśnie zgłoszony bloker: producent może odpowiedzieć na prawdziwe zapytanie.
- Jedna spójna ścieżka ofertowa zamiast dwóch rozłącznych mocków; mniej kodu do utrzymania, nie więcej.

**Negative / tradeoffs**:
- Transport i montaż zostają ręcznie wpisywane przez producenta aż do funkcji 15; realna oferta niesie więc nieco fikcyjną precyzję cenową do tego czasu (jawnie oznaczone w Context, nie ukryte).
- Przyjęcie oferty tworzy prawdziwe, trwałe zamówienie bez żadnej płatności ani prawnie wiążącej umowy za nim stojącej (funkcja 12 wciąż zaplanowana, nie zbudowana) — inaczej niż dzisiejszy mock, klient nie zobaczy już etykiety "to demonstracyjna oferta", więc ryzyko pomylenia "przyjąłem ofertę" z "zapłaciłem/podpisałem" rośnie; patrz Follow up.
- Brak powiadomień e mail (funkcja 17 wciąż zaplanowana) oznacza, że klient i producent muszą sami wracać do panelu, żeby zobaczyć nowość; wizualny sygnał (AC-11, AC-12) łagodzi to tylko częściowo.
- Zapytanie, na które choć jeden producent nigdy nie odpowie, może nigdy formalnie nie osiągnąć `closed` (patrz Key invariants); to świadomie zaakceptowana, nie rozwiązana w tej funkcji granica.
- `/klient/realizacja` (wciąż mock, funkcja 16 dalej niezaprojektowana) traci swoją jedyną dzisiejszą ścieżkę wejścia z linku, gdy `/klient/oferta` znika (AC-16 przenosi te linki na `/klient/panel/zapytania`); strona zostaje w kodzie i wciąż działa pod bezpośrednim adresem URL, po prostu nic już naturalnie tam nie prowadzi, dopóki funkcja 16 nie da jej realnego miejsca.

**Neutral**:
- Dwie nowe kolumny i cztery triggery to jedyna zmiana schematu; reszta modelu (spec 0018) zostaje bez zmian, zaprojektowana już wcześniej dokładnie pod tę funkcję.

## Follow-up

- [ ] Gdy funkcja 17 (powiadomienia e mail) powstanie, rozważyć też przypomnienie/limit czasu dla producenta, który nigdy nie odpowiedział na zapytanie (dziś: `inquiry.status` może trwale zostać w `offered`, patrz Key invariants i Consequences).
- [ ] Rozważyć krótki komunikat/disclaimer przy przyjęciu oferty ("to tworzy zamówienie śledzone statusem, nie jest jeszcze prawnie wiążącą umową ani płatnością"), analogiczny do dzisiejszego mockowego zastrzeżenia, dopóki funkcja 12 (realne płatności) i ewentualna prawna rama (funkcja 5, RODO i zgodność prawna) nie powstaną. Nie ujęte jako AC w tej funkcji, bo to decyzja treści/UX, nie zachowania.
- [ ] Gdy funkcja 15 (realna wycena transportu) powstanie, zastąpić ręczne pole transportu w formularzu producenta realnym wyliczeniem; ręczne pole montażu może zostać, jeśli funkcja 15 nie obejmie montażu.
- [ ] Gdy funkcja 17 (powiadomienia e mail) powstanie, dodać e mail przy złożeniu oferty i przy decyzji klienta, uzupełniając dzisiejszy wyłącznie wizualny sygnał (AC-11, AC-12).
