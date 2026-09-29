# Rationale: 0051 Powiadomienia e mail przy kluczowych zdarzeniach transakcyjnych

## Context

Funkcja 17 scope epiki Produkcja ("Powiadomienia e mail") wymienia cztery zdarzenia: nowe zapytanie, nowa oferta, zmiana statusu realizacji, potwierdzenie płatności. W praktyce dwa z nich stoją na fundamencie, który jeszcze nie istnieje na prawdziwym zapleczu: funkcja 16 ("Realizacja i statusy na prawdziwym zapleczu") i funkcja 12 ("Realne płatności") mają status "planned" w `docs/scope/produkcja.md`. Projektowanie wysyłki e maila na zdarzeniu, którego nie ma jeszcze w kodzie, oznacza albo zgadywanie kształtu przyszłej akcji, albo zaprojektowanie samej treści bez podłączenia. Ten spec bierze drugą drogę.

Zarządzany przepływ doradczy (spec 0048) już wysyła e mail Resendem przy nowej sprawie (do doradcy, `notifyAdvisorOfNewCase`) i przy nowej wiadomości (do klienta albo doradcy, `notifyMessageRecipient`), w `lib/cases/notify.ts`, tekstem, best effort: błąd wysyłki nigdy nie blokuje głównej akcji, tylko trafia do `captureError`. Ta sama sprawa dzisiaj nie wysyła potwierdzenia do klienta, który właśnie złożył zapytanie, tylko alarmuje doradcę.

Osobno od sprawy doradczej istnieje starszy, bezpośredni przepływ zapytanie -> oferta (`lib/offer-actions.ts`, oznaczony w kodzie jako `legacy_direct`, dla zapytań poza nowym przepływem sprawy, spec 0048 AC-34). Producent składa tam ofertę, `offer_submitted` już jest śledzony jako zdarzenie biznesowe (PostHog, `lib/offer-actions.ts:176`), ale klient nie dostaje żadnego e maila, że oferta czeka.

Treść tych e maili ma być HTML, nie zwykły tekst jak dzisiejsze e maile sprawy, bo są bardziej klientofacing niż wewnętrzny alert do doradcy. Nie ma jeszcze w projekcie żadnego narzędzia do budowania HTML e maili (`react-email` nie jest zainstalowane).

Po pierwszym przeglądzie draftu inżynier poszerzył zakres o dwie rzeczy w tej samej infrastrukturze: e mail logowania (`auth.ts`, dostawca `Resend` z `next-auth/providers/resend`) dziś wysyła domyślny, gołym HTML Auth.js e mail, z osobnego adresu nadawcy (`logowanie@modularhub.eu` fallback) niż e maile sprawy (`powiadomienia@modularhub.eu` fallback); cel to mniejsze ryzyko trafienia do spam i większa wiarygodność. Oraz podgląd administracyjny wszystkich szablonów, żeby móc sprawdzić treść bez czekania na prawdziwe zdarzenie; projekt ma już wzorzec ekranów wewnętrznych (`app/[locale]/internal/products`, `/cases`, `/inquiries`, wszystkie zabezpieczone `session.user.role === "admin"`, spec 0031 AC-9), więc nowy ekran `internal/notifications` idzie tym samym wzorcem, nie wymaga nowej decyzji o dostępie.

## Options considered

### Option 1: Rozbudować `lib/cases/notify.ts` bezpośrednio

Dodać nowe funkcje wysyłki od razu w `lib/cases/notify.ts`, obok istniejących `sendCaseEmail`, `notifyAdvisorOfNewCase`, `notifyMessageRecipient`, zamiast wydzielać nowy moduł.

**Pros**:
- Zero nowych plików, jedno miejsce do przeczytania dla każdego e maila w projekcie.

**Cons**:
- Miesza dwa różne światy: e maile sprawy doradczej (spec 0048, tekstowe, wewnętrzne dla doradcy) i e maile klientofacing HTML dla zdarzeń poza sprawą (oferta na starszym przepływie bezpośrednim). Nazwa `cases/` już nie opisuje treści modułu.

### Option 2: Nowy moduł `lib/notifications/`, wspólny niski poziom wysyłki (wybrane)

Wydzielić surowe wywołanie Resend (dzisiaj zaszyte w `sendCaseEmail`) do `lib/notifications/send.ts`. `lib/cases/notify.ts` woła ten wspólny sender wewnątrz swojego istniejącego `sendCaseEmail`, bez zmiany sygnatury ani zachowania. Nowe szablony i funkcje zdarzeń (nowe zapytanie, nowa oferta, plus zaprojektowane bez podłączenia: status, płatność) żyją w `lib/notifications/`.

**Pros**:
- Jedna implementacja rozmowy z Resend (obsługa błędu, `captureError`) używana przez oba światy, żadnego duplikowania fetcha.
- Nazwa modułu opisuje treść: `notifications/` dla zdarzeń biznesowych poza sprawą, `cases/` zostaje dla sprawy doradczej.

**Cons**:
- Mały refaktor istniejącego, działającego kodu (`sendCaseEmail`), więc wymaga testu regresyjnego na spec 0048, żeby nie zepsuć czegoś, co już działa. (Zaadresowane w build planie: refaktor jest ostatnim krokiem, po dwóch pełnych nitkach koniec do końca, nie pierwszym.)
- Sama biblioteka `react-email` niesie własne ryzyko niezależnie od tej opcji: `render()` z `@react-email/render` jest asynchroniczny (łatwo zapomnieć `await`), a renderowanie komponentu React w server action może kolidować z bundlowaniem Next.js (`react-dom/server` pod maską). Zaadresowane build planem krok 8 (`npm run build` po dodaniu szablonów) i podziałem zależności (CLI jako devDependency, runtime jako dependency).

### Option 3: Zewnętrzny serwis powiadomień (kolejka + worker)

Zbudować osobną kolejkę zdarzeń (np. tabela `notification_queue` + worker), która konsumuje zdarzenia i wysyła e maile asynchronicznie, niezależnie od żądania HTTP.

**Pros**:
- Odporne na chwilową niedostępność Resend, wysyłka może być retry'owana przez worker bez ponownego wywołania akcji użytkownika.

**Cons**:
- Nowa infrastruktura (kolejka, worker, tabela) na cztery e maile transakcyjne o niskiej częstotliwości; koszt operacyjny nieproporcjonalny do problemu, którego dziś nie ma (best effort + `captureError` już wystarcza spec 0048).

## Rationale

Option 1 psuje czytelność nazw modułów: `cases/` przestałoby znaczyć "sprawa doradcza" i zaczęłoby znaczyć "wszystkie e maile w projekcie", co myli następnego czytającego, kto szuka kodu sprawy. Option 3 rozwiązuje problem, którego dzisiejsza skala (cztery zdarzenia transakcyjne, niska częstotliwość) nie ma; spec 0048 już udowodnił, że best effort plus `captureError` wystarcza dla e maili sprawy, więc te same zasady bez nowej infrastruktury wystarczą i tutaj. Option 2 daje jedno miejsce prawdy dla rozmowy z Resend (dzisiaj tylko w `sendCaseEmail`), więc przyszła zmiana dostawcy albo dodanie nowego zdarzenia nie wymaga kopiowania fetcha po raz trzeci.

## Evidence: audyt zdarzeń i zależności (zebrany podczas projektowania)

- `lib/observability/types.ts` już definiuje `"offer_submitted"`, `"payment_completed"`, `"order_status_changed"`, `"case_created"` w `EventName`. Grep po całym repo (`.ts`) pokazuje, że tylko `offer_submitted`, `project_quote_submitted` i inne rzeczywiście wywoływane są w kodzie produkcyjnym; `payment_completed` i `order_status_changed` istnieją tylko jako wartości typu, nigdy wywołane, co potwierdza status "planned" funkcji 12 i 16 w scope.
- `lib/offer-actions.ts:176`: `trackEvent("offer_submitted", { inquiryId, offerId }, session.user.id)` w prawdziwej, produkcyjnej akcji `submitOffer` (feature 11, done), wołany bez `after()` (dodać w build planie, patrz index.md krok 4). Ten sam plik oznacza cały przepływ jako `LEGACY_STAGE = "legacy_direct"` (linia 25), potwierdzając, że to inny przepływ niż sprawa doradcza spec 0048.
- Poprawka po cross checku: `submitOffer` NIE odrzuca zwykłego powtórnego złożenia oferty przez tego samego producenta unique indexem. Stara aktywna oferta dostaje `status = 'superseded'` (linie 140 do 143), a nowy wiersz oferty i tak się wstawia (linie 144 do 150), więc druga oferta tego samego producenta na to samo zapytanie legalnie tworzy nowy wiersz i powinna wysłać nowy e mail. Unique index (`23505`) chroni tylko przed dwoma równoczesnymi submitami tego samego producenta naraz (wyścig), nie przed zwykłym, sekwencyjnym powtórnym złożeniem. Pierwsza wersja tego spec błędnie opisywała to jako scenariusz do zdublowania (AC-5), poprawione w index.md.
- Odbiorca "nowe zapytanie" to `inquiry.email`, nie `users.email`: `lib/case-actions.ts:82 do 84` kopiuje `session.user.email` do `contact.email` przekazanego w `createAdvisoryCase`, `lib/cases/notify.ts`'s `resolveRecipient` czyta z powrotem `inquiry.email` (nie z tabeli `users`) dla roli klienta.
- Odbiorca "potwierdzenie płatności" jest prostszy niż pierwsza wersja tego spec zakładała: `payment.paidByUserId` (`lib/db/schema.ts:1405 do 1407`) to FK bezpośredni do `users.id`, więc odbiorca to `users.email` bez przechodzenia przez `order`/`inquiry`. Odbiorca "zmiana statusu realizacji" to `order.offerId` (`lib/db/schema.ts:1160 do 1163`) -> `offer.inquiryId` -> `inquiry.email`.
- `lib/case-actions.ts:96 do 99`: `if (result.created) { trackEvent("case_created", ...); after(() => notifyAdvisorOfNewCase(result.inquiryId)); }`, dokładne miejsce, gdzie dołoży się `notifyClientOfNewCase`.
- `lib/db/schema.ts`: `order` (linia 1155) i `orderStageEvent` (linia 1169) już istnieją (feature 2, done), więc przyszłe podłączenie funkcji 16 ma gotowe tabele do złączenia; `payment` (linia 1396) z `paymentStatusEnum` (`pending`, `paid`, `failed`, `refunded`) też już istnieje.
- Namespace tłumaczeń `CaseEmail` (`messages/pl.json` linia 1801) jest już przetłumaczony w `pl.json`, `en.json`, `nl.json`, `de.json` mimo że tylko `pl` jest aktywne (spec 0028 konwencja); nowy namespace dla tych czterech zdarzeń powinien pójść tą samą ścieżką.
