# 0023. Klient na realnym zapleczu

**Date**: 2026-09-03
**Status**: In Progress

## Summary

Ten spec przenosi ścieżkę klienta z dzisiejszych danych mockowych na prawdziwe zaplecze: klient i producent zakładają realne konta (logowanie linkiem magicznym, bez hasła), wyniki wyszukiwania są czytane z bazy zamiast z fixture'ów, a wysłane zapytanie jest trwale zapisane i widoczne w prostym, wewnętrznym widoku. Producent i produkt na start są dodane ręcznie przez Ciebie, z pomocą Neon MCP, na bazie prawdziwych danych od pierwszych producentów. To jeden, spójny wątek przez wszystkie warstwy (logowanie, dane, zapytanie), zgodnie z podejściem Tracer Bullet tej epiki, zanim kolejne funkcje go pogrubią.

## Context

> ⚠️ Uwaga wstępna: kolumna na zdjęcie produktu (`coverImageUrl`, zwykły URL tekstowy) świadomie omija dzisiejszą decyzję o przechowywaniu plików (spec 0017, Cloudflare R2), bo Slice 5 (funkcja 13) jeszcze nie istnieje. To celowe i tymczasowe rozwiązanie, nie pomyłka, ale wymaga migracji, gdy prawdziwe przechowywanie plików powstanie (patrz Follow up).

Dziś cała ścieżka klienta stoi na danych mockowych: `lib/data/projects.ts` czyta statyczną tablicę fixture, `InquiryFlow` po wysłaniu zapytania tylko pokazuje kartę potwierdzenia po stronie przeglądarki, bez żadnego zapisu, znikającą po odświeżeniu strony. Auth.js w wersji 5 został wybrany jako sposób logowania (spec 0017), ale nigdy nie został podłączony do żadnej trasy w kodzie (`next-auth` nie jest nawet zainstalowany). Pełny model danych produkcyjnych już istnieje w `lib/db/schema.ts` (spec 0018, rozszerzony przez spec 0022), z 21 tabelami gotowymi, ale pustymi: konta, sesje, klient, producent, produkt, zapytanie, pozycja zapytania. Nic nie stoi na przeszkodzie, by zacząć z nich korzystać, ale dotąd nic z nich nie korzysta: inwestorzy oglądający dziś ścieżkę klienta widzą twarde, przykładowe projekty i zapytanie, które nie przetrwa odświeżenia strony.

Epika Produkcja została przepriorytetyzowana (2026-09-02), żeby ta funkcja poszła przed automatyzacją strony producenta, bo to ścieżkę klienta oglądają dziś inwestorzy, a pierwsze oferty i tak robi ręcznie zamawiający. Siły w grze: model danych jest już ustalony i nie wolno go tu przeprojektowywać; pytania o stabilność Auth.js i metodę logowania zostały świadomie zostawione jako blokujące w spec 0017, do rozstrzygnięcia tuż przed napisaniem kodu logowania; a prawdziwego przechowywania plików jeszcze nie ma, więc pierwszy prawdziwy produkt potrzebuje tymczasowego rozwiązania na zdjęcie. Konsekwencja niepodjęcia tej decyzji teraz: demo dla inwestorów pokazuje dane z fixture'ów bez końca, a każda kolejna funkcja (oferty, płatności, pliki) nie ma się do czego podłączyć.

## Requirements

**User stories**:
- Jako klient, chcę założyć konto i zalogować się linkiem wysłanym na e mail, żeby móc wysłać zapytanie bez hasła do zapamiętania.
- Jako klient, chcę przeglądać wyniki wyszukiwania oparte o prawdziwe dane producentów, żeby widzieć rzeczywistą ofertę platformy, nie przykładowe dane.
- Jako klient, chcę wysłać zapytanie o wybrane produkty i mieć pewność, że zostało trwale zapisane, żeby producent (dziś Ty, ręcznie) mógł na nie odpowiedzieć.
- Jako producent, chcę założyć konto i zalogować się tak samo jak klient, żeby moje realne konto istniało na platformie, nawet zanim mój panel jest w pełni podłączony.
- Jako administrator (Ty), chcę zobaczyć listę wysłanych zapytań w prostym widoku wewnętrznym, żeby wiedzieć, na co odpowiedzieć.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Przynajmniej jeden prawdziwy producent (profil: NIP, nazwa, kraj, technologia) i jego produkt rodziny `dom` (opublikowany) istnieją w bazie, dodane ręcznie przez Neon MCP na bazie prawdziwych danych dostarczonych przez Ciebie.
- **AC-2**: Nowy klient może założyć konto (formularz: imię/nazwa, telefon) i zalogować się linkiem magicznym wysłanym e mailem, bez hasła.
- **AC-3**: Nowy producent może założyć konto (formularz: nazwa, telefon, NIP, kraj, technologia) i zalogować się tym samym mechanizmem co klient.
- **AC-4**: Strona wyników (`/wyniki`) czyta opublikowane produkty rodziny `dom` z bazy danych, nie z fixture'ów, dla wylogowanego i zalogowanego odwiedzającego jednakowo; przełącznik rodziny produktu (dom / spa modułowe / pergola) filtruje wyniki przez parametr URL `family`, domyślnie `dom`. Dla spa modułowe/pergola, bez jeszcze zasianych produktów w tej funkcji, przełącznik pokazuje dzisiejszy łagodny pusty stan (`EmptyResults`), nie błąd.
- **AC-5**: Niezalogowany odwiedzający wchodzący na `/klient/zapytanie` jest przekierowany do logowania/rejestracji z zachowanym docelowym adresem (wybrane produkty i parametry wyszukiwania), a po zalogowaniu wraca dokładnie tam. Zalogowany producent lub administrator trafiający na tę stronę jest przekierowany do swojej właściwej sekcji, nie widzi formularza zapytania klienta.
- **AC-6**: Wysłane zapytanie (migawka danych kontaktowych, wybrane produkty, kraj dostawy) jest trwale zapisane w bazie, powiązane z kontem zalogowanego klienta, nie tylko pokazane jako potwierdzenie po stronie przeglądarki.
- **AC-7**: Gdy zapis zapytania do bazy się nie powiedzie (przejściowy błąd), klient widzi komunikat błędu w miejscu i przycisk ponów, a wypełniony formularz nie znika.
- **AC-8**: Przycisk wysłania zapytania blokuje się po pierwszym kliknięciu; ponowne wysłanie tego samego zapytania (ten sam klucz idempotencji wygenerowany przy otwarciu formularza, patrz AC-7) nie tworzy drugiego wiersza w bazie, nawet po realnym ponowieniu po błędzie.
- **AC-9**: Konto z rolą administratora (Twoje własne, oznaczone ręcznie) widzi nowy widok wewnętrzny (`/internal/zapytania`, wewnątrz segmentu locale) z listą wszystkich wysłanych zapytań (kontakt, wybrane produkty, kraj dostawy, status, data); każde inne konto lub niezalogowany odwiedzający ma odmówiony dostęp.
- **AC-10**: Karta produktu na wynikach pokazuje prawdziwe zdjęcie z nowej, opcjonalnej kolumny adresu URL na produkcie, z łagodnym zachowaniem, gdy zdjęcie nie jest ustawione.
- **AC-11**: Żądanie linku logowania dla e maila bez wcześniejszej rejestracji pokazuje komunikat z prośbą o rejestrację, zamiast wysłać link albo założyć puste konto.

## Decision

**Chosen option**: Option 1: Zbuduj cały wątek teraz, jako jeden spójny build (logowanie, dane, zapytanie)

Cała ścieżka: rejestracja i logowanie klienta i producenta linkiem magicznym (Resend), ręczne zasianie pierwszego producenta i produktu przez Neon MCP, przełączenie `/wyniki` na czytanie z bazy z filtrem rodziny produktu, i trwały zapis zapytania z prostym widokiem wewnętrznym dla roli administratora, zbudowane razem, jako jeden przyrost.

**Implementation skills**: `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) · `authjs-skills` (`gocallum/nextjs16-agent-skills`, `.agents/skills/authjs-skills/`)

## Rationale

Reasoning i rozważane opcje: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Cały model już istnieje (spec 0018, rozszerzony przez spec 0022): `users` / `accounts` / `sessions` / `verification_tokens` (tabele Auth.js), `client`, `producer`, `product`, `product_country_eligibility`, `inquiry`, `inquiry_item`. Ta funkcja dodaje:

| Tabela | Nowe pole | Typ | Wymagane | Uwaga |
|---|---|---|---|---|
| `product` | `cover_image_url` | text | nie (nullable) | Tymczasowe, zwykły URL zewnętrzny (ten sam wzorzec co dzisiejsze `picsum.photos` w danych mockowych), zastąpione realnym przechowywaniem plików (R2) w Slice 5 (funkcja 13). |
| `users` | `phone` | text | tak | Brakowało w dzisiejszym schemacie (spec 0018 przewidział tylko migawkę telefonu na `inquiry`, nie stałe pole konta); wspólne dla klienta i producenta, zbierane raz przy rejestracji. |
| `inquiry` | `idempotency_key` | text, unique (nullable) | nie | Generowany po stronie przeglądarki przy otwarciu formularza zapytania; ponowne wysłanie z tym samym kluczem (po błędzie, AC-7) nie tworzy drugiego wiersza (AC-8). |

Jedna zupełnie nowa, mała tabela:

| Tabela | Pola | Cel |
|---|---|---|
| `pending_registration` | `email` (text, primary key), `role` (`role` enum), `payload` (jsonb: imię/nazwa, telefon, i dla producenta NIP/kraj/technologia), `created_at` | Trzyma dane z formularza rejestracji do chwili potwierdzenia e maila (patrz Key invariants niżej); usuwana po skutecznym pierwszym logowaniu. |

**Key invariants**:
- Formularz rejestracji NIE zapisuje od razu do `users`/`client`/`producer`. Zapisuje do `pending_registration` (kluczowane e mailem) i wysyła link magiczny. Wiersze `users`+`client`/`producer` powstają dopiero przy pierwszym udanym logowaniu (kliknięcie linku), z danych z `pending_registration`, która jest wtedy kasowana. To zapobiega zajęciu cudzego NIP albo e maila przez niepotwierdzone konto (formularz sam w sobie nie rezerwuje niczego trwałego).
- Żądanie linku logowania (nie rejestracji) jest wysyłane tylko dla e maila, dla którego istnieje już wiersz `users` (konto zarejestrowane i potwierdzone wcześniej) **lub** oczekujący `pending_registration`. Dla zupełnie nieznanego e maila aplikacja pokazuje komunikat "załóż konto" zamiast wywołać `signIn` — to też chroni przed domyślnym zachowaniem adaptera Auth.js, który przy nieznanym e mailu próbowałby utworzyć pusty wiersz `users` i złamałby ograniczenie `NOT NULL` na `role` (kolumna nie ma wartości domyślnej, celowo, spec 0018).
- Każdy wiersz `inquiry`/`inquiry_item` powstaje wyłącznie przez akcję `submitInquiry`, zawsze powiązany z `client.id` wyprowadzonym z uwierzytelnionej sesji, nigdy z identyfikatorem podanym przez klienta wprost (chroni przed podszyciem się pod innego klienta).
- Rola (`users.role`) jest ustalana raz, w chwili potwierdzenia rejestracji, przez to, który formularz został wysłany (klient albo producent); nigdy nie jest polem wybieralnym przez użytkownika, i nigdy nie może przyjąć wartości `admin` przez kod aplikacji — rola administratora jest ustawiana wyłącznie ręcznie, przez Neon MCP.
- Autoryzacja jest w całości po stronie aplikacji (sprawdzenie roli/id z sesji w akcjach serwerowych i komponentach stron), zgodnie z konwencją już ustaloną w spec 0018 (AC-5), nie przez Row Level Security Postgresa.
- Auth.js działa wyłącznie w kontekstach Node.js po stronie serwera (akcje serwerowe, handler trasy, komponenty serwerowe); `proxy.ts` (Edge runtime, przekierowania locale) pozostaje nietknięty — żadna logika sesji nie działa na Edge.
- `lib/data/projects.ts`'s cztery funkcje (`getProjects`, `getProjectById`, `getFeaturedProjectByFamily`, `getEligibilityByCountry`) są jedynym punktem, przez który każda strona klienta (`wyniki`, `zapytanie`, `dzialka`, `projekt/[id]`) czyta produkty. Ta funkcja zamienia ich ciała z odczytu fixture'a na odczyt z bazy, zachowując dokładnie te same sygnatury i kształt `Project` (zgodnie z regułą z `AGENTS.md` o wymianie warstwy danych bez zmiany sygnatur) — żadna z tych stron nie wymaga osobnej zmiany poza `wyniki` (przełącznik rodziny) i `zapytanie` (bramka logowania).
- Mapowanie wiersza `product` na istniejący typ `Project` (`lib/data/types.ts`) jest budowane i sprawdzone tylko dla rodziny `dom` w tej funkcji — jedyne realne, zasiane dane (AC-1) są rodziny `dom`. Pola typu `Project` specyficzne dla domu (np. `wallBuildUp`, `windowClass`) nie mają dziś odpowiednika w `product.technicalSpecs` dla spa/pergoli (spec 0022 rozdzielił te rodziny); pełne mapowanie dla spa modułowe/pergola zostaje świadomym Follow up, do czasu aż realne dane tych rodzin faktycznie powstaną.

**API surface**:

| Trasa / akcja | Typ | Kluczowe wejście | Kluczowe wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| `/api/auth/[...nextauth]` | Route handler Auth.js | parametry callback dostawcy | ciasteczko sesji | brak (wewnętrzne Auth.js) | wygasły/nieprawidłowy token |
| `registerClient` | Akcja serwerowa | imię, e mail, telefon | zapisuje do `pending_registration`, wysyła link magiczny z `callbackUrl`, przekierowanie na "sprawdź e mail" | brak (publiczne) | zajęty (potwierdzony) e mail, nieprawidłowy e mail |
| `registerProducer` | Akcja serwerowa | nazwa, e mail, telefon, NIP, kraj, technologia | jak wyżej | brak (publiczne) | zajęty (potwierdzony) NIP/e mail, nieprawidłowy e mail |
| `requestLogin` | Akcja serwerowa | e mail | wysyła link magiczny z `callbackUrl`, jeśli e mail znany (AC-11) | brak (publiczne) | e mail nieznany → komunikat "załóż konto", nie błąd |
| `/klient/wyniki` | Strona (odczyt z bazy) | `family`, `country`, `sizeMin`, `sizeMax` (URL) | lista opublikowanych produktów danej rodziny | brak (publiczne) | nieprawidłowa wartość → łagodny fallback (jak dziś, spec 0004) |
| `/klient/zapytanie` | Strona | wybrane produkty, parametry wyszukiwania | formularz kontaktowy albo przekierowanie do logowania (`callbackUrl` = ten sam URL) | wymaga sesji, rola `client` | brak sesji → przekierowanie z powrotem po zalogowaniu; zła rola → przekierowanie do własnej sekcji |
| `submitInquiry` | Akcja serwerowa | kontakt, id produktów, kraj dostawy, klucz idempotencji | id zapytania, potwierdzenie | wymaga sesji, rola `client` | błąd zapisu → komunikat w miejscu i ponów (ten sam klucz, bez duplikatu); nieprawidłowe id produktu → łagodny fallback (jak dziś) |
| `/pl/internal/zapytania` (wewnątrz `[locale]`) | Strona | brak | tabela wszystkich zapytań i pozycji | wymaga sesji, rola `admin` | brak sesji/zła rola → odmowa dostępu |

**Security model**:
- Publiczne: przeglądanie `/wyniki`, rejestracja, wysłanie linku magicznego.
- Rola `client`: może wysyłać zapytania wyłącznie jako Ty sam(a); nie widzi cudzych zapytań ani widoku wewnętrznego.
- Rola `producer`: może się zalogować (ta funkcja dowozi tylko sam działający mechanizm logowania); żadnego widoku danych specyficznego dla producenta ta funkcja nie buduje poza tym — dzisiejszy kreator produktu (spec 0016) zostaje nietknięty, na `localStorage`.
- Rola `admin`: wyłącznie Twoje własne konto, oznaczone ręcznie; widzi `/internal/zapytania`. Żadna ścieżka samoobsługowa do zostania administratorem nie istnieje w aplikacji.
- RODO: e mail i telefon to dane osobowe płynące teraz przez Resend (podmiot z siedzibą w USA, ten sam typ zastrzeżenia co przy Neon/Cloudflare/Vercel w spec 0017) i zapisywane w Neon (region UE, ustalone wcześniej). Ta funkcja nie buduje żadnego nowego mechanizmu zgodności — spec 0005 (RODO i zgodność prawna) zostaje osobną, wciąż niezaprojektowaną funkcją; patrz Consequences i Follow up.

**Configuration required**:
- `AUTH_SECRET`: sekret podpisujący sesje Auth.js.
- `RESEND_API_KEY`: klucz API do wysyłki linków magicznych przez Resend.
- `AUTH_URL`: bazowy adres używany przez Auth.js do budowania linków callback, osobny na dev/staging/produkcję (spec 0019).

**Critical test scenarios**:
- Happy path: zasiewasz prawdziwego producenta i produkt, nowy klient rejestruje się, loguje linkiem magicznym, przegląda `/wyniki` (rodzina dom, prawdziwe dane), wybiera produkt, wysyła zapytanie, widzi potwierdzenie; zapytanie pojawia się w `/internal/zapytania` pod kontem administratora. Weryfikuje **AC-1** do **AC-6**, **AC-9**.
- Failure case: zapis zapytania do bazy się nie powiedzie (symulowany błąd) → komunikat w miejscu i ponów, formularz nie traci danych. Weryfikuje **AC-7**.
- Auth/permission: konto klienta próbujące wejść na `/internal/zapytania` ma odmówiony dostęp; niezalogowany odwiedzający wchodzący bezpośrednio na `/klient/zapytanie` jest przekierowany do logowania i wraca z zachowanym wyborem. Weryfikuje **AC-5**, **AC-9**.

## Build plan

Kolejność zgodna z podejściem Tracer Bullet epiki (jeden prawdziwy wątek przez wszystkie warstwy, potem pogrubianie).

1. [x] Migracja: dodaj nullable `product.cover_image_url` (text), wymaganą `users.phone` (text), nullable unique `inquiry.idempotency_key` (text), i nową małą tabelę `pending_registration` (email PK, role, payload jsonb, created_at), satisfies **AC-8**, **AC-10**
2. [x] Podłącz Auth.js w wersji 5 (wersja przypięta dokładnie w `package.json`, nie zakres `^`/`beta` szeroki, patrz Follow up): dostawca e mail (Resend) do linków magicznych, `DrizzleAdapter` na istniejących tabelach `users`/`accounts`/`sessions`/`verification_tokens`, zmienne `AUTH_SECRET`/`RESEND_API_KEY`/`AUTH_URL`, handler trasy `app/api/auth/[...nextauth]/route.ts` (poza segmentem `[locale]`), satisfies **AC-2**, **AC-3**
3. [x] Zbuduj `requestLogin` (sprawdza istnienie `users`/`pending_registration` dla e maila przed wysłaniem linku, inaczej komunikat "załóż konto") i haczyk po stronie logowania (np. `events.signIn`/własny `createUser` adaptera), który przy pierwszym udanym logowaniu odczytuje `pending_registration` po e mailu, tworzy `users`(z `role`+`phone`)+`client`/`producer`, i kasuje wiersz `pending_registration`, satisfies **AC-2**, **AC-3**, **AC-11**
4. [x] Zbuduj formularze rejestracji (klient: imię/telefon; producent: nazwa/telefon/NIP/kraj/technologia) jako akcje serwerowe zapisujące do `pending_registration` (nie od razu do `users`/`client`/`producer`, patrz Key invariants), potem wysyłające link magiczny z `callbackUrl` wskazującym na stronę, z której klient przyszedł, satisfies **AC-2**, **AC-3**
5. Zasiej ręcznie jednego prawdziwego producenta i jego produkt rodziny `dom` (z `cover_image_url`) przez Neon MCP, na bazie danych dostarczonych przez Ciebie, satisfies **AC-1**
6. [x] Zamień ciała czterech funkcji w `lib/data/projects.ts` (`getProjects`, `getProjectById`, `getFeaturedProjectByFamily`, `getEligibilityByCountry`) z odczytu fixture'a na odczyt z `product`+`product_country_eligibility`, mapując wiersz `product` na istniejący typ `Project` (mapowanie sprawdzone dla rodziny `dom`, patrz Key invariants); sygnatury zostają identyczne, więc `wyniki`, `zapytanie`, `dzialka`, `projekt/[id]` nie wymagają zmian poza tym, co niżej. Dodaj przełącznik rodziny (dom/spa modułowe/pergola) na `/wyniki` jako parametr URL `family`, domyślnie `dom`, satisfies **AC-4**, **AC-6** (pośrednio, przez spójne id między stronami)
7. [x] Zagrodź `/klient/zapytanie` sprawdzeniem sesji: brak sesji → przekierowanie do logowania/rejestracji z `callbackUrl` z powrotem na ten sam URL po sukcesie; sesja z rolą inną niż `client` → przekierowanie do własnej sekcji, satisfies **AC-5**
8. [x] Zbuduj akcję serwerową `submitInquiry`: generuje/przyjmuje klucz idempotencji z przeglądarki, zapisuje `inquiry`+`inquiry_item` powiązane z zalogowanym klientem (upsert bezpieczny na `idempotency_key`, żeby ponów nie tworzył duplikatu), zastępując dzisiejsze potwierdzenie tylko po stronie przeglądarki w `InquiryFlow`; dodaj stan błędu w miejscu z przyciskiem ponów i blokadę przycisku po pierwszym kliknięciu, satisfies **AC-6**, **AC-7**, **AC-8**
9. [x] Zbuduj trasę `app/[locale]/internal/zapytania/page.tsx`: sprawdzenie sesji dla roli `admin`, prosta tabela czytająca wszystkie zapytania z pozycjami i produktami, satisfies **AC-9**
10. Oznacz ręcznie swoje własne, zasiane konto rolą `admin` przez Neon MCP, satisfies **AC-9**

## Consequences

**Positive**:
- Ścieżka klienta pokazywana inwestorom stoi teraz na prawdziwych kontach i prawdziwych danych od początku do końca, pierwszy raz, nie tylko na klikalnej makiecie.
- Każda kolejna funkcja epiki (oferty, płatności, pliki, realizacja) ma się do czego podłączyć: prawdziwe logowanie i prawdziwe zapytanie już istnieją, zamiast doklejać logowanie później.
- Ręczne zasiewanie danych przez Neon MCP oznacza, że pierwsze dane producenta i produktu na platformie są sprawdzone przez człowieka, wartościowe na pierwsze demo dla inwestorów.

**Negative / tradeoffs**:
- Kolumna na zdjęcie produktu omija dzisiejszą decyzję o przechowywaniu plików (spec 0017, Cloudflare R2); wymaga migracji, gdy Slice 5 (funkcja 13) powstanie, inaczej staje się drugą, nieudokumentowaną ścieżką na zdjęcia.
- Producent może się zalogować, ale nie ma jeszcze prawdziwego panelu opartego o ten schemat; dzisiejszy kreator produktu (spec 0016) zostaje na `localStorage`, więc prawdziwe konto producenta i jego (wciąż fikcyjne) dane produktu żyją w dwóch rozłączonych miejscach do czasu kolejnej funkcji.
- RODO i zgodność prawna (baner zgody, polityka prywatności, udokumentowana podstawa prawna) nie są rozwiązane przez tę funkcję; prawdziwe dane osobowe zaczynają płynąć, zanim ta decyzja (funkcja 5) powstanie.
- Auth.js w wersji 5 formalnie zostaje w becie (potwierdzone bieżącym sprawdzeniem); bezpieczne dla tego zestawu narzędzi *pod warunkiem* przypięcia dokładnej wersji i testu dymnego przed poleganiem na nim dalej (patrz Follow up) — to nie jest w pełni zamknięte ryzyko, tylko świadomie zaakceptowane i zmniejszone.
- Rejestracja przez `pending_registration` (zamiast od razu zapisywać do `users`/`client`/`producer`) to dodatkowy, mały mechanizm stanu przejściowego, nie tylko formularz plus e mail; chroni przed zajęciem cudzego NIP/e maila przed potwierdzeniem, kosztem jednej dodatkowej tabeli i jednego dodatkowego haczyka w przepływie logowania.
- Link magiczny otwarty na innym urządzeniu/przeglądarce niż ta, z której klient zaczął, loguje to drugie urządzenie i tam ląduje na `callbackUrl` — pierwsza karta zostaje niezalogowana. To zaakceptowane ograniczenie logowania linkiem magicznym w tej funkcji, nie rozwiązane (typowe dla tego mechanizmu wszędzie).
- Mapowanie produktu z bazy na istniejący typ `Project` jest sprawdzone tylko dla rodziny `dom`; przełącznik rodziny na `/wyniki` istnieje i działa, ale spa modułowe/pergola pokazują pusty wynik do czasu, aż realne dane tych rodzin i ich mapowanie faktycznie powstaną (Follow up).
- Filtrowanie po rodzinie produktu na `/wyniki` zostaje dodane teraz, przed funkcją 8 ("dopracowanie wyszukiwania i wyników"), więc część zakresu tamtej przyszłej funkcji jest już pokryta, zawężając jej pozostały zakres.

**Neutral**:
- Dwie nowe zmienne środowiskowe (`AUTH_SECRET`, `RESEND_API_KEY`) dołączają do `DATABASE_URL` w `.env.local`, a później do konfiguracji środowisk Vercela (spec 0019).
- Reguła w głównym `AGENTS.md` ("No database, no login, no real payments in this stage") staje się nieprawdziwa dla logowania i bazy danych po wdrożeniu tej funkcji; oznaczone do aktualizacji przez `/sync`, zgodnie z Follow up już zapisanym w spec 0017.

## Follow-up

- [ ] Przenieś `product.cover_image_url` na prawdziwe przechowywanie plików (Cloudflare R2, dokumenty) po zbudowaniu Slice 5 (funkcja 13); usuń lub przeznacz kolumnę inaczej wtedy.
- [ ] Zaprojektuj prawdziwy panel producenta, gdy zapytania oparte o bazę danych po stronie producenta będą potrzebne; dziś logowanie producenta tylko dowozi sam mechanizm, kreator produktu (spec 0016) zostaje na `localStorage`.
- [ ] Funkcja 5 (RODO i zgodność prawna) jest teraz pilniejsza: ta funkcja zaczyna zbierać prawdziwe imię/e mail/telefon, zanim udokumentowana podstawa prawna, baner zgody czy polityka prywatności istnieją.
- [ ] Zaktualizuj regułę w głównym `AGENTS.md` ("No database, no login, no real payments in this stage") po wdrożeniu tej funkcji (zadanie dla `/sync`, zgodnie z Follow up już zapisanym w spec 0017).
- [ ] Potwierdź, że oznaczenie "Critical Risk" skanera bezpieczeństwa dla skilla `authjs-skills` (Follow up spec 0017) jest wyjaśnione, zanim logowanie oprze się na nim dalej.
- [ ] Podpisz umowę powierzenia danych (DPA) z Resend i dodaj go do listy podwykonawców przetwarzania obok Neon/Cloudflare/Vercel (ten sam wzorzec co Follow up spec 0017 dla innych dostawców).
- [ ] Przypnij dokładną wersję `next-auth@beta` w `package.json` (nie zakres), i zrób test dymny pełnego logowania (rejestracja → link magiczny → sesja → wylogowanie) na żywo przed poleganiem na nim dalej; beta oznacza możliwe zmiany łamiące między wydaniami.
- [ ] Rozszerz mapowanie `product` → `Project` (i sam typ `Project`, dziś zakładający wyłącznie dom) o spa modułowe i pergolę, gdy realne dane tych rodzin faktycznie zostaną zasiane; do tego czasu przełącznik rodziny na `/wyniki` pokazuje dla nich tylko pusty wynik.

## References

**Project sources** (verifiable, w tym repo):
- `AGENTS.md` (root), reguła: funkcje dostępu do danych są asynchroniczne od początku (basis dla zachowania `async` w nowym zapytaniu `lib/db/queries.ts`).
- `AGENTS.md` (root), reguła: stan UI, który musi przetrwać zmianę trasy (kraj, wielkość, wybrane produkty), idzie przez parametry URL, nie współdzielony stan komponentu (basis dla zachowania wyboru klienta przez przekierowanie logowania, AC-5).
- spec [0017](../0017-zaplecze-produkcyjne/index.md) (basis: wybór Auth.js w wersji 5, sesje w bazie danych, i jego blokujące Follow up o metodzie logowania i stabilności, rozstrzygnięte w tej funkcji).
- spec [0018](../0018-prawdziwy-model-danych/index.md), AC-5 (basis: konwencja autoryzacji po stronie aplikacji zamiast Row Level Security, zastosowana wprost w tej funkcji).
- spec [0022](../0022-rodziny-produktow-i-kategorie/index.md) (basis: pole `family` i istniejący model podkategorii, na którym stoi przełącznik rodziny produktu na `/wyniki`).
- spec [0004](../0004-wyniki-z-filtrem-prawnym/index.md), AC-5/AC-6 (basis: konwencja łagodnego fallbacku dla nieprawidłowego parametru URL, zastosowana też do parametru `family`).

**Practices & standards**:
- Bezpieczny wzorzec migracji bazy danych w działającym systemie: dodaj kolumnę jako nullable, bez wymuszania `NOT NULL` bez wartości domyślnej (basis: nowa kolumna `cover_image_url`).

**Links** (web verified):
- Auth.js, instalacja: [authjs.dev/getting-started/installation](https://authjs.dev/getting-started/installation)
- Auth.js, referencja Next.js: [authjs.dev/reference/nextjs](https://authjs.dev/reference/nextjs)
- Auth.js, adapter Drizzle: [authjs.dev/getting-started/adapters/drizzle](https://authjs.dev/getting-started/adapters/drizzle)
- Dyskusja o gotowości produkcyjnej Auth.js w wersji 5: [github.com/nextauthjs/next-auth/discussions/9511](https://github.com/nextauthjs/next-auth/discussions/9511)
- Auth.js, lista wydań: [github.com/nextauthjs/next-auth/releases](https://github.com/nextauthjs/next-auth/releases)
- Auth.js, znane ograniczenia Edge runtime: [github.com/nextauthjs/next-auth/issues/9242](https://github.com/nextauthjs/next-auth/issues/9242)
