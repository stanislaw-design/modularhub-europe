# 0024. Panel klienta

**Date**: 2026-09-03
**Status**: In Progress

## Summary

Ten spec dodaje panel klienta: miejsce, gdzie zalogowany klient widzi własne wysłane zapytania, zapisuje domy do ulubionych i porównuje je obok siebie, oraz podgląda i edytuje podstawowe dane konta. Dziś klient po wysłaniu zapytania nie ma dokąd wrócić, a przycisk "Ulubione" w nagłówku strony czeka wyłączony na tę funkcję. Trzy osobne podstrony pod wspólnym paskiem zakładek, budowane na już istniejącym koncie i sesji klienta (spec 0023), bez żadnej nowej kategorii danych osobowych.

## Context

Patrz [rationale.md](rationale.md) (Context, research nad porównywalnymi platformami, rozważane opcje struktury strony).

## Requirements

**User stories**:
- Jako klient, chcę zobaczyć listę własnych wysłanych zapytań ze statusem, żeby wiedzieć, na co czekam.
- Jako klient, chcę zapisać dom do ulubionych z wyników wyszukiwania lub ze strony szczegółów, żeby wrócić do niego później bez wysyłania zapytania.
- Jako klient, chcę porównać kilka ulubionych domów obok siebie, żeby łatwiej zdecydować, który mnie interesuje najbardziej.
- Jako klient, chcę zobaczyć i poprawić swoje imię i telefon, żeby dane kontaktowe na koncie były aktualne.
- Jako klient, chcę, żeby moje zapytania, ulubione i dane profilu widział wyłącznie ja, nikt inny.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: `/klient/panel/zapytania` pokazuje listę własnych wysłanych zapytań zalogowanego klienta (wybrane produkty, status, data), wyłącznie własnych.
- **AC-2**: Zalogowany klient może oznaczyć dowolny opublikowany produkt jako ulubiony (ikona serca na karcie wyników `/wyniki` lub na stronie szczegółów `/klient/projekt/[id]`) i cofnąć oznaczenie; stan jest trwale zapisany w bazie.
- **AC-3**: `/klient/panel/ulubione` pokazuje wszystkie ulubione produkty klienta; produkt, który stał się niedostępny (wycofany lub usunięty przez producenta), pozostaje na liście, oznaczony jako niedostępny, nie znika po cichu.
- **AC-4**: Niezalogowany odwiedzający klikający serce jest przekierowany do logowania lub rejestracji z zachowanym powrotem dokładnie do miejsca kliknięcia (ten sam wzorzec co bramka `/klient/zapytanie`, spec 0023 AC-5); to samo dla bezpośredniego wejścia na dowolną podstronę `/klient/panel/*`.
- **AC-5**: Zalogowany producent lub administrator próbujący wejść na dowolną podstronę `/klient/panel/*` jest przekierowany do swojej właściwej sekcji, nie widzi panelu klienta.
- **AC-6**: Zaznaczenie 2 lub więcej ulubionych (checkbox na karcie, maksymalnie 3 naraz) pokazuje tabelę porównawczą (metraż, cena, czas produkcji, standard wykończenia) na tej samej stronie `/klient/panel/ulubione`; wybór żyje w parametrze URL, przetrwa odświeżenie strony.
- **AC-7**: `/klient/panel/profil` pokazuje adres e mail klienta bez możliwości edycji oraz pozwala edytować imię i telefon; zapisana zmiana jest trwale zapisana w bazie i widoczna po odświeżeniu.
- **AC-8**: Błąd zapisu (oznaczenie ulubionego albo edycja profilu) pokazuje komunikat w miejscu z przyciskiem ponów, bez utraty wprowadzonych danych.
- **AC-9**: Nagłówek strony pokazuje włączony przycisk "Ulubione" prowadzący do `/klient/panel/ulubione`, a menu konta zalogowanego klienta zawiera link do `/klient/panel/profil`.
- **AC-10**: Każdy klient widzi i zmienia wyłącznie własne zapytania, ulubione i dane profilu; identyfikator klienta używany w każdym zapytaniu do bazy pochodzi z sesji, nigdy z wartości podanej przez przeglądarkę.
- **AC-11**: Pusta lista (brak wysłanych zapytań lub brak ulubionych) pokazuje przyjazny komunikat z linkiem powrotnym do `/wyniki`, nie błąd ani pustą stronę.

## Options considered

Patrz [rationale.md](rationale.md), sekcja Options considered (trzy osobne podstrony pod wspólnym layoutem, jedna strona z sekcjami, jedna strona z zakładkami JS).

## Decision

**Chosen option**: Option 1: Trzy osobne podstrony pod wspólnym layoutem panelu

`/klient/panel/zapytania`, `/klient/panel/ulubione`, `/klient/panel/profil`, każda osobnym Server Component pobierającym tylko swoje dane, spięte wspólnym `layout.tsx` z paskiem zakładek; ta sama bramka sesji (brak sesji lub zła rola) na wszystkich trzech.

**Implementation skills**: `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `authjs-skills` (`gocallum/nextjs16-agent-skills`, `.agents/skills/authjs-skills/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Rationale

Patrz [rationale.md](rationale.md), sekcja Rationale.

## Feature design

**Data model sketch**:

Jedna nowa tabela, reszta modelu (spec 0018/0023) nietknięta:

| Tabela | Pole | Typ | Wymagane | Uwaga |
|---|---|---|---|---|
| `favorite` | `client_id` | uuid, FK → `client.id` | tak | Część klucza unikalnego z `product_id`. |
| `favorite` | `product_id` | uuid, FK → `product.id` | tak | Część klucza unikalnego z `client_id`. |
| `favorite` | `created_at` | timestamp | tak (domyślnie teraz) | Do sortowania od najnowszych. |

Ograniczenie: unikalny indeks na (`client_id`, `product_id`) — jeden klient nie może dodać tego samego produktu dwa razy. Trigger audytu `favorite_audit` (ten sam wzorzec co `users`/`client`/`inquiry`/`producer`/`payment`/`document`, spec 0018 migracja 0002).

Profil czyta i zapisuje istniejące pola `users.name` / `users.phone` (już wymagane, spec 0023); `users.email` pozostaje tylko do odczytu w tej funkcji.

**API surface**:

| Trasa / akcja | Typ | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `/klient/panel/zapytania` | Strona | brak (sesja) | lista własnych zapytań z pozycjami i statusem | sesja, rola `client` | brak sesji/zła rola → przekierowanie |
| `/klient/panel/ulubione` | Strona | parametr URL `compare` (id produktów) | lista ulubionych, opcjonalna tabela porównawcza | sesja, rola `client` | jw. |
| `/klient/panel/profil` | Strona | brak (sesja) | e mail (podgląd), imię, telefon | sesja, rola `client` | jw. |
| `toggleFavorite` | Akcja serwerowa | id produktu, docelowy stan (`favorited: boolean`) | potwierdzony stan | sesja, rola `client` | brak sesji → przekierowanie z powrotem; błąd zapisu → komunikat w miejscu i ponów |
| `updateProfile` | Akcja serwerowa | imię, telefon | potwierdzenie | sesja, rola `client` | puste pole → walidacja w miejscu; błąd zapisu → komunikat w miejscu i ponów |

**Key invariants**:
- `favorite` jest kluczowany parą (`client_id`, `product_id`), unikalny. `toggleFavorite` NIE robi sprawdzenia i osobnej akcji (sprawdź, potem wstaw/usuń) — to wyścig przy dwóch szybkich kliknięciach albo ponowieniu po błędzie. Zamiast tego przyjmuje docelowy stan (`favorited: true/false`, wyprowadzony z tego, co przeglądarka aktualnie pokazuje) i wykonuje jedną, idempotentną operację: `favorited: true` → `INSERT ... ON CONFLICT (client_id, product_id) DO NOTHING`, `favorited: false` → `DELETE`. Dwa identyczne wywołania z rzędu nigdy nie rzucają błędu ani nie tworzą duplikatu (twarde usunięcie przy `false`, nie miękkie — cofnięcie ulubionego nie jest zdarzeniem biznesowym wymagającym historii, w przeciwieństwie do zapytania).
- Serce jest linkiem do `/logowanie?callbackUrl=<bieżąca ścieżka i parametry>` (tak jak dziś odczytywane przez `usePathname`/`useSearchParams`), gdy nie ma sesji — nie wywołuje wtedy w ogóle `toggleFavorite`. Dopiero przy sesji z rolą `client` staje się przyciskiem wywołującym akcję serwerową. To rozwiązuje AC-4 dla serca na `/wyniki` (gdzie strona ma dziś aktywne filtry w URL, nie tylko na stronie szczegółów).
- Ulubiony produkt, który stał się niedostępny (status inny niż `published`, albo `deletedAt` ustawiony), NIE jest usuwany z `favorite`; strona czyta bieżący stan produktu przy renderowaniu i pokazuje kartę jako niedostępną zamiast filtrować wiersz (AC-3), zarówno na głównej liście, jak i wewnątrz tabeli porównawczej, jeśli akurat jest zaznaczony do porównania — nigdy nie znika po cichu z żadnego z dwóch widoków.
- Każde zapytanie do bazy w tej funkcji jest filtrowane po `client.id` wyprowadzonym z sesji (`auth()`), nigdy po identyfikatorze podanym przez przeglądarkę — ten sam wzorzec co `submitInquiry` (spec 0023 Key invariants).
- Wybór do porównania na `/klient/panel/ulubione` żyje wyłącznie w parametrze URL (np. `?compare=id1,id2,id3`), maksymalnie 3 jednocześnie (ten sam limit co zaznaczanie do zapytania na `/wyniki`), zgodnie z zasadą z `AGENTS.md` o stanie UI przetrwałym zmianę trasy przez parametry URL, nie stan komponentu. Strona waliduje ten parametr po stronie serwera (odrzuca id spoza własnych ulubionych klienta, usuwa duplikaty, ucina powyżej 3) zamiast ufać mu wprost; wartość niepoprawna albo pusta po walidacji łagodnie pokazuje samą listę bez tabeli porównawczej, nie błąd (ten sam wzorzec łagodnego fallbacku co `family` w spec 0023 AC-4).
- Mapowanie wiersza `product` na typ `Project`, na którym stoi lista ulubionych i tabela porównawcza, jest dziś sprawdzone tylko dla rodziny `dom` (odziedziczone ograniczenie ze spec 0023 Key invariants) — ulubiony produkt spa modułowe/pergola (gdy realne dane tych rodzin powstaną) nie ma dziś gwarancji poprawnego mapowania pól w tej samej tabeli/porównaniu, patrz Follow up.
- Lista ulubionych sortowana od najnowszych (najpóźniej dodany pierwszy); bez limitu liczby ulubionych na start.
- E mail w profilu zostaje nieedytowalny w tej funkcji; to tożsamość logowania (link magiczny), zmiana wymagałaby nowej weryfikacji (patrz Follow up).

**Security model**:
- Rola `client`: widzi i zmienia wyłącznie własne zapytania, ulubione i dane profilu.
- Rola `producer`/`admin`: przekierowani do swojej sekcji przy próbie wejścia na dowolną podstronę `/klient/panel/*`, ten sam wzorzec co bramka `/klient/zapytanie` (spec 0023 AC-5).
- Niezalogowany: przekierowany do logowania z zachowanym powrotem, ten sam wzorzec co bramka `/klient/zapytanie`.
- RODO: profil pokazuje i pozwala zmienić już zbierane dane osobowe (imię, telefon); nie dodaje nowej kategorii danych do zbierania. Funkcja 5 (RODO i zgodność prawna) zostaje osobną, wciąż niezaprojektowaną decyzją (to samo zastrzeżenie co spec 0023 Security model).

**Critical test scenarios**:
- Happy path: klient dodaje dom do ulubionych z `/wyniki`, widzi go na `/klient/panel/ulubione`, zaznacza go razem z drugim ulubionym i widzi tabelę porównawczą; wchodzi na `/klient/panel/zapytania` i widzi wcześniej wysłane zapytanie ze statusem; edytuje telefon na `/klient/panel/profil` i widzi zmianę po odświeżeniu. Weryfikuje **AC-1**, **AC-2**, **AC-6**, **AC-7**.
- Failure case: zapis edycji profilu albo przełączenie ulubionego kończy się przejściowym błędem → komunikat w miejscu z przyciskiem ponów, wprowadzone dane nie znikają. Weryfikuje **AC-8**.
- Auth/permission: niezalogowany klikający serce jest przekierowany do logowania i wraca dokładnie tam po zalogowaniu; zalogowany producent wchodzący na `/klient/panel/zapytania` jest przekierowany do swojej sekcji. Weryfikuje **AC-4**, **AC-5**, **AC-10**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet epiki: najpierw jeden pełny, cienki wątek (ulubione, bo nagłówek już ma na to gotowe miejsce), potem pogrubienie o zapytania, profil i porównanie.

1. [x] Migracja: nowa tabela `favorite` (`client_id`, `product_id`, `created_at`, unikalna para `client_id`+`product_id`) plus trigger audytu `favorite_audit` (ten sam wzorzec co pozostałe tabele z danymi osobowymi/biznesowymi, spec 0018); dodaj `product_favorited` do listy zdarzeń w `lib/observability/types.ts`, satisfies **AC-2**, **AC-10**
2. [x] Wspólny layout `/klient/panel/*` (pasek zakładek Zapytania / Ulubione / Profil) plus bramka sesji: brak sesji → przekierowanie do logowania z powrotem; sesja spoza roli `client` → przekierowanie do własnej sekcji, satisfies **AC-4**, **AC-5**
3. [x] Akcja serwerowa `toggleFavorite` (docelowy stan wyprowadzony z UI, idempotentny insert z `ON CONFLICT DO NOTHING` albo delete na parze wyprowadzonej z sesji — nigdy sprawdź-potem-zapisz, patrz Key invariants; wywołanie `trackEvent('product_favorited', …)`, błąd zapisu → komunikat w miejscu i ponów) i nowa afordancja serca (ikona `Heart`, ten sam wzorzec co dzisiejszy `Checkbox` zaznaczenia) na `ResultCard` oraz na stronie szczegółów projektu; bez sesji serce jest linkiem do logowania z zachowanym powrotem (bieżąca ścieżka i parametry URL), nie wywołuje akcji, satisfies **AC-2**, **AC-4**, **AC-8**, **AC-10**
4. [x] Zapytanie `getFavoritesForClient` (złączenie `favorite`+`product`+`producer`, mapowanie na istniejący typ `Project` jak w `lib/data/projects.ts`) i strona `/klient/panel/ulubione`: lista, karta oznaczona jako niedostępna dla produktu spoza `published`/usuniętego, pusty stan z linkiem do `/wyniki`, satisfies **AC-2**, **AC-3**, **AC-11**
5. [x] Włącz istniejący przycisk "Ulubione" w `SiteHeader` (link do `/klient/panel/ulubione`) i dodaj link do `/klient/panel/profil` w menu konta zalogowanego klienta, satisfies **AC-9**
6. [x] Checkbox zaznaczenia (maksymalnie 3) na kartach `/klient/panel/ulubione`, stan w parametrze URL `compare` walidowanym po stronie serwera (odrzucenie cudzych/niepoprawnych id, łagodny fallback do samej listy, patrz Key invariants), tabela porównawcza (metraż, cena, czas produkcji, standard wykończenia) renderowana przy 2 lub więcej zaznaczonych, z tym samym oznaczeniem "niedostępne" co główna lista, satisfies **AC-6**
7. [x] Zapytanie `getInquiriesForClient` (jak `getAllInquiriesWithItems`, filtrowane po `client.id` z sesji) i strona `/klient/panel/zapytania`: tabela własnych zapytań, pusty stan z linkiem do `/wyniki`, satisfies **AC-1**, **AC-10**, **AC-11**
8. [x] Akcja serwerowa `updateProfile` (aktualizacja `users.name`/`users.phone` dla zalogowanego klienta) i strona `/klient/panel/profil`: podgląd e mail, formularz imię/telefon, stan błędu w miejscu z przyciskiem ponów, satisfies **AC-7**, **AC-8**, **AC-10**

## Consequences

**Positive**:
- Klient ma pierwszy raz powód, żeby wrócić na platformę po wysłaniu zapytania: widzi status i może dalej przeglądać albo porównywać ulubione domy.
- Przycisk "Ulubione" w nagłówku, dziś wyłączony i martwy, wreszcie coś robi.
- Nowa tabela `favorite` i jej trigger audytu idą tym samym, już sprawdzonym wzorcem co reszta modelu danych (spec 0018) — żadnego nowego mechanizmu do nauczenia się.

**Negative / tradeoffs**:
- Trzy osobne podstrony i wspólny layout to więcej plików niż jedna strona z sekcjami; koszt zaakceptowany w zamian za to, że każda podstrona pobiera z bazy tylko to, czego naprawdę potrzebuje.
- Lista ulubionych i zapytań nie jest paginowana w tej wersji (dziś realistycznie kilka, nie setki wpisów na klienta); przy realnym wzroście wolumenu wymaga dołożenia paginacji (patrz Follow up).
- Zapisane wyszukiwania z alertami, bardzo częste na porównywalnych portalach nieruchomości (patrz research w rationale.md), zostają świadomie poza zakresem, bo wymagają infrastruktury e mail, której dziś nie ma (funkcja 17, jeszcze niezbudowana); klient nie dostanie dziś powiadomienia o nowym dopasowanym domu.
- RODO i zgodność prawna (funkcja 5) nadal nie są rozwiązane; ta funkcja pokazuje i pozwala zmieniać już zbierane dane osobowe, nie dodaje nowej kategorii, ale nie zamyka tego ryzyka.

**Neutral**:
- Ósmy typ zdarzenia PostHog (`product_favorited`) dołącza do siedmiu istniejących w `lib/observability/types.ts`.
- E mail w profilu zostaje nieedytowalny w tej funkcji; zmiana e maila (wymagająca nowej weryfikacji linkiem magicznym) to świadomie osobna, przyszła decyzja.

## Follow-up

- [ ] Rozszerz mapowanie `product` → `Project` o spa modułowe i pergolę, zanim realne dane tych rodzin trafią do ulubionych (dziedziczone ograniczenie ze spec 0023 Follow up); do tego czasu ulubiony/porównywany produkt spoza rodziny `dom` nie ma gwarancji poprawnego wyświetlenia w tej funkcji.
- [ ] Rozważ paginację `/klient/panel/zapytania` i `/klient/panel/ulubione`, gdy realny wolumen na klienta to uzasadni (dziś świadomie pominięta, patrz Consequences).
- [ ] Zapisane wyszukiwania z alertami e mail (częsty wzorzec na portalach nieruchomości, patrz research w rationale.md) czekają na infrastrukturę e mail z funkcji 17 (Powiadomienia e mail); zaprojektuj jako osobną funkcję, gdy 17 będzie gotowa.
- [ ] Edycja e maila w profilu (z nową weryfikacją linkiem magicznym) to świadomie osobna, przyszła decyzja, jeśli klienci będą jej potrzebować.
- [ ] Funkcja 5 (RODO i zgodność prawna) zostaje pilniejsza z każdą kolejną funkcją pokazującą dane osobowe; brak zmian tutaj, ale przypomnienie zostaje aktualne (to samo zastrzeżenie co spec 0023 Follow up).
