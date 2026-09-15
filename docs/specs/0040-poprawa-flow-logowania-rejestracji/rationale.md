# 0040. Poprawa flow logowania i rejestracji — rationale

## Context

Dziś rejestracja stoi na dwóch osobnych, niepowiązanych stronach: `/registration` (klient, imię/e mail/telefon) i `/producer/registration` (producent, nazwa/e mail/telefon/NIP/kraj/technologia), każda z osobnym adresem i własnym linkiem "Zaloguj się" z powrotem. Nagłówek strony (`SiteHeader`) pokazuje przycisk "Zacznij", który dla niezalogowanego odwiedzającego linkuje wprost do `/producer` (marketing producenta), nie do rejestracji w ogóle, więc odwiedzający szukający zwykłego konta klienta nie ma tam czego szukać. Strona logowania (`/login`) pokazuje link do rejestracji tylko w stanie błędu "nieznany e mail" (`LoginForm`, `state.status === "unknown-email"`), nie domyślnie.

Mechanizm logowania sam w sobie (link magiczny przez Resend, staging w `pending_registration` do chwili potwierdzenia e mailem, `users`/`client`/`producer` tworzone dopiero przy pierwszym udanym logowaniu) już istnieje i działa, zbudowany przez spec [0023](../0023-klient-na-realnym-zapleczu/index.md); ten spec go nie zmienia, tylko dokłada na niego nową warstwę UX i kilka nowych pól. Model danych klienta ma już pola `nip`/`company_name`/`b2b_verification_status` z spec [0037](../0037-model-danych-duzych-zamowien-b2b/index.md) (duże zamówienia B2B): dziś klient uzupełnia je dopiero później, w panelu, przez `submitClientB2bDetails` (`lib/project-quote-actions.ts`), gdy próbuje przyjąć wycenę na zamówienie 10 i więcej domów. Ten spec przenosi możliwość uzupełnienia tych samych pól na sam moment rejestracji, dla kogoś, kto od razu wie, że jest inwestorem.

Konsekwencja niezrobienia tego teraz: przycisk "Zacznij" dalej myli odwiedzających (kieruje wyłącznie do producenta), dwie osobne strony rejestracji dalej się rozjeżdżają wizualnie i UX owo, a inwestor, który chce zarejestrować się od razu jako podmiot gospodarczy, nadal musi najpierw założyć zwykłe konto, dowiedzieć się później, że B2B wymaga NIP, i wracać do panelu, żeby go uzupełnić.

## Options considered

### Option 1: Jedna wspólna trasa `/registration`, krok w parametrze URL `role`

Zamiast dwóch osobnych stron, `/registration` staje się jednym punktem wejścia: bez `role` pokazuje wybór, z `role=client`/`role=producer` pokazuje właściwy formularz. Zgodne z regułą projektu, że stan UI, który musi przeżyć zmianę widoku, idzie przez parametry URL.

**Pros**:
- Jeden adres do zapamiętania i linkowania, dokładnie to, o co poprosił zamawiający ("trasa ma być jedna /registration i ona rozdziela co dalej").
- Stan (wybrana rola, `callbackUrl`) przeżywa odświeżenie strony i działa z przyciskiem wstecz przeglądarki za darmo, bez własnej logiki nawigacji.

**Cons**:
- Wymaga przeniesienia formularza producenta z `app/[locale]/producer/registration/page.tsx` do wspólnej strony. Złagodzone w Decision niżej: zamiast usuwać starą stronę i aktualizować każde miejsce, które do niej linkuje (nawigacja, `BulkOrdersShowcase`, marketing producenta, `proxy.ts`, dwa istniejące testy), stara strona zostaje jako cienki `redirect()` na nowy adres, więc żadne z tamtych miejsc nie wymaga zmiany.

### Option 2: Zachowaj dwie osobne trasy, dodaj tylko lekki ekran wyboru

Nowy, trzeci, lekki ekran (np. `/rejestracja-wybor`) tylko linkuje dalej do dzisiejszych `/registration` i `/producer/registration`, bez zmiany ich adresów.

**Pros**:
- Mniejsza zmiana kodu: żadna z dzisiejszych dwóch stron nie rusza się z miejsca.

**Cons**:
- Trzy adresy zamiast jednego, sprzeczne wprost z tym, o co poprosił zamawiający.
- Link "zmień rolę" i wspólny `callbackUrl` między krokami wymagałyby własnej logiki przekazywania parametrów między trzema stronami zamiast jednej.

## Rationale

Opcja 1 wygrywa, bo dokładnie realizuje wprost wyrażoną wolę zamawiającego (jeden adres, rozgałęzienie w nim), i bo projekt ma już ustaloną regułę na dokładnie tę sytuację: stan, który musi przeżyć zmianę widoku, idzie przez parametr URL, nie przez osobne trasy czy współdzielony stan komponentu (reguła z `AGENTS.md`, zastosowana już w spec 0023 do bramki logowania na `/klient/zapytanie`). Opcja 2 dokłada trzeci adres zamiast redukować dwa do jednego, więc idzie pod prąd celu tej zmiany.

Model danych dla checkboxa "Inwestor" celowo nie dostaje własnej kolumny: `client.nip`/`client.company_name`/`client.b2b_verification_status` już istnieją (spec 0037) i mają już dokładnie tę regułę (oba pola wypełnione → `pending`), wdrożoną w `submitClientB2bDetails`. Nowa kolumna obok tego byłaby drugim, równoległym sposobem oznaczania tego samego faktu; checkbox przy rejestracji to tylko wcześniejszy moment wejścia do tego samego mechanizmu, nie nowa koncepcja.

Pole "skala produkcji" producenta dostaje własną, prostą kolumnę enum na `producer`, odrębną od `producer_capacity_profile.units_per_month` (który jest liczbą, wypełnianą później w panelu, spec 0037): to inny poziom szczegółowości (orientacyjny wybór przy rejestracji, nie dokładna liczba), zbierany w innym momencie cyklu życia konta, więc nie warto ich sztucznie łączyć w jedno pole.
