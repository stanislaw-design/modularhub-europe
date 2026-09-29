# 0051. Powiadomienia e mail przy kluczowych zdarzeniach transakcyjnych

**Date**: 2026-09-26
**Status**: In Progress

## Summary

Klient dostaje e mail przy dwóch zdarzeniach, które już dzieją się na prawdziwym zapleczu: złożenie nowego zapytania (potwierdzenie) i nowa oferta producenta na zapytaniu bezpośrednim. Dwa kolejne zdarzenia ze scope funkcji 17, zmiana statusu realizacji i potwierdzenie płatności, nie mają jeszcze prawdziwego miejsca w kodzie (funkcje 16 i 12 są dopiero planowane), więc ich treść i reguła odbiorcy są tu w pełni zaprojektowane, ale wysyłka zostaje podłączona dopiero, gdy te dwie funkcje powstaną. Do tego e mail logowania (magic link, Auth.js) dostaje ten sam branded szablon i jeden spójny adres nadawcy z resztą, żeby wyglądał wiarygodnie i rzadziej trafiał do spam. Wszystkie pięć szablonów jest w HTML (react email), wysyłane przez Resend, którego już używa spec 0048, przez jeden wspólny, niski poziom moduł, który przejmuje też dzisiejszą wysyłkę e maili sprawy doradczej. Nowy ekran w panelu wewnętrznym (`internal/notifications`) pokazuje podgląd wszystkich pięciu szablonów na przykładowych danych.

> ⚠️ Uwaga zakresu: ten spec objął też e mail logowania i podgląd administracyjny na prośbę inżyniera po pierwszym przeglądzie draftu, poza pierwotnymi czterema zdarzeniami funkcji 17 scope. Oba są potraktowane jako część tej samej infrastruktury e mail (ten sam Resend, ten sam sender, ten sam react email), nie osobny spec, bo żadne z nich nie niesie własnej, niezależnej decyzji architektonicznej.

## Requirements

**User stories**:
- Jako klient, chcę dostać e mail potwierdzający, że moje zapytanie doszło, żebym nie musiał sam sprawdzać w aplikacji.
- Jako klient na starszym, bezpośrednim przepływie zapytania, chcę dostać e mail, gdy producent złoży ofertę, żebym wiedział, że czeka na mnie decyzja.
- Jako klient, chcę w przyszłości dostać e mail przy zmianie statusu realizacji i przy potwierdzeniu płatności (zaprojektowane teraz, podłączone gdy te funkcje powstaną).
- Jako klient albo producent logujący się linkiem, chcę dostać wiarygodnie wyglądający e mail logowania, żeby nie wylądował w spam i żebym mu ufał.
- Jako administrator, chcę zobaczyć podgląd każdego szablonu e maila w panelu wewnętrznym, żeby sprawdzić treść bez czekania na prawdziwe zdarzenie.

**Acceptance criteria** (kontrakt, każde kryterium osobno sprawdzalne):
- **AC-1**: Gdy klient złoży nowe zapytanie/sprawę (`lib/case-actions.ts`, gałąź `result.created`), klient dostaje e mail potwierdzający, wysłany asynchronicznie przez `after()` tak, że nie wydłuża czasu odpowiedzi samej akcji zapisu.
- **AC-2**: Gdy producent złoży nową ofertę na zapytaniu bezpośrednim (`lib/offer-actions.ts`, `submitOffer`, po istniejącym `trackEvent("offer_submitted", ...)`), klient (e mail z `inquiry.email`) dostaje e mail o nowej ofercie z linkiem do jej podglądu (strona `/inquiry`, ten sam parametr, którym ta strona już się posługuje), wysłany asynchronicznie przez `after()` tak, że nie wydłuża czasu odpowiedzi `submitOffer`.
- **AC-3**: Błąd wysyłki (brak `RESEND_API_KEY`, błąd odpowiedzi Resend, błąd renderowania szablonu, brakujący albo niepoprawny e mail odbiorcy) jest przechwycony, zgłoszony przez `captureError`, i nigdy nie blokuje ani nie failuje akcji, która go wywołała.
- **AC-4**: Każda próba wysyłki (sukces albo porażka) rejestruje osobne zdarzenie obserwowalności (`notification_email_sent` albo `notification_email_failed`) z typem zdarzenia i identyfikatorem powiązanej sprawy/oferty, niezależnie od istniejącego zdarzenia biznesowego (`case_created`, `offer_submitted`).
- **AC-5**: Każda udana wysyłka jest przywiązana 1:1 do id nowo wstawionego wiersza (nowej oferty, nowej sprawy). Ponowne złożenie oferty przez tego samego producenta na to samo zapytanie (`submitOffer` supersedujący starą aktywną ofertę, patrz Key invariants) poprawnie tworzy nowy wiersz oferty i wysyła nowy e mail, to nie jest duplikat, bo to legalnie inna oferta. Jedyny scenariusz, który naprawdę trzeba nie zdublować, jest wyścig dwóch równoczesnych submitów tego samego producenta na to samo zapytanie (błąd `23505`), który dziś w ogóle nie dochodzi do `trackEvent`/notyfikacji, bo cała transakcja się nie udaje i akcja zwraca błąd wcześniej.
- **AC-6**: Treść i reguła odbiorcy dla zmiany statusu realizacji i potwierdzenia płatności są w pełni zaprojektowane (temat, treść, kto jest odbiorcą, dokładne złączenie tabel do tego odbiorcy), ale bez żadnego wywołania wysyłki w kodzie, bo funkcje 16 i 12 jeszcze nie istnieją; `## Follow-up` wskazuje precyzyjnie, gdzie wpleść wywołanie, gdy te funkcje powstaną.
- **AC-7**: Wszystkie pięć szablonów to komponenty React Email renderowane do HTML (`@react-email/render`), wysyłane przez jeden wspólny, niski poziom moduł `lib/notifications/send.ts`. Dzisiejsze e maile sprawy ze spec 0048 (`lib/cases/notify.ts`) przechodzą na ten sam sender: ich treść i odbiorcy się nie zmieniają, ale od teraz każda ich wysyłka też rejestruje `notification_email_sent`/`notification_email_failed`, czego dziś nie robią (świadomy, drobny dodatek zachowania, nie regresja).
- **AC-8**: Locale wszystkich pięciu szablonów jest ustawione na `"pl"` na sztywno (dzisiaj tylko `pl` jest aktywne); rewizja przy aktywacji innych języków (spec 0028) jest zapisana w `## Follow-up`.
- **AC-9**: E mail logowania (magic link, `auth.ts`, dostawca `Resend` z `next-auth/providers/resend`) przestaje używać domyślnego, gołego HTML Auth.js i zamiast tego renderuje branded szablon React Email przez `sendVerificationRequest`, wysłany tym samym wspólnym senderem co pozostałe cztery zdarzenia.
- **AC-10**: Inaczej niż cztery zdarzenia biznesowe, błąd wysyłki e maila logowania NIE jest best effort: skoro to jedyna droga, którą użytkownik dostaje swój link, `sendVerificationRequest` przy błędzie rzuca dalej (Auth.js pokazuje wtedy swój ekran błędu), zamiast cicho połykać błąd jak przy `notifyClientOfNewOffer`/`notifyClientOfNewCase`.
- **AC-11**: Wszystkie pięć szablonów wysyła z jednego, spójnego adresu nadawcy (`RESEND_FROM_EMAIL`, dziś czytanego zarówno przez `auth.ts` jak i `lib/cases/notify.ts`, tylko z różnymi domyślnymi fallbackami gdy zmienna nie jest ustawiona); fallbacki są ujednolicone na jeden adres.
- **AC-12**: Nowy ekran `app/[locale]/internal/notifications` (dostęp tylko `session.user.role === "admin"`, ten sam wzorzec co `internal/products`, spec 0031 AC-9) pokazuje podgląd wszystkich pięciu szablonów (login, nowe zapytanie, nowa oferta, oba zaprojektowane bez podłączenia: status, płatność), każdy renderowany na przykładowych, fikcyjnych danych (nigdy na prawdziwym rekordzie klienta), z widocznym tematem i wyrenderowanym HTML.
- **AC-13**: Ekran podglądu jest tylko do odczytu: nie ma na nim przycisku "wyślij naprawdę"; służy wyłącznie do sprawdzenia treści.

## Decision

**Chosen option**: Nowy moduł `lib/notifications/`, wspólny niski poziom wysyłki (pełne porównanie opcji: `rationale.md`)

Nowy moduł `lib/notifications/` niesie szablony React Email i funkcje na zdarzenie; `lib/cases/notify.ts` przechodzi na wspólny sender bez zmiany własnego zachowania.

## Feature design

**Data model sketch**:
Brak nowych tabel i migracji. Wszystkie potrzebne dane już istnieją:
- Nowe zapytanie: `inquiry.email` (migawka `session.user.email` zapisana przy tworzeniu sprawy, `resolveRecipient` w `lib/cases/notify.ts` czyta z tego samego pola, nie z `users.email`).
- Nowa oferta: `offer.inquiryId` -> `inquiry.email`.
- Zmiana statusu realizacji (zaprojektowane, nie podłączone): `order.offerId` -> `offer.inquiryId` -> `inquiry.email`.
- Potwierdzenie płatności (zaprojektowane, nie podłączone): `payment.paidByUserId` -> `users.email` (FK bezpośredni, bez przechodzenia przez `order`/`inquiry`).
- Login (magic link): adres, który sam Auth.js już ma w parametrze wywołania `sendVerificationRequest` (`params.identifier`), żadne dodatkowe złączenie.

Jedyna zmiana typu to dodanie dwóch wartości do `EventName` (`lib/observability/types.ts`, unia TypeScript, nie enum w bazie): `"notification_email_sent"`, `"notification_email_failed"`. Rozróżnienie MIĘDZY pięcioma szablonami idzie przez zwykłą properties (`emailType: "login_link" | "new_inquiry_confirmation" | "new_offer" | "order_status_changed" | "payment_confirmed"`), nie przez osobną wartość `EventName` na każdy szablon, żeby dodanie szóstego e maila w przyszłości nie wymagało zmiany typu.

**State transitions**: brak (żadne z tych zdarzeń, łącznie z logowaniem, nie ma własnej maszyny stanów; są momentem w cyklu życia innej jednostki, sprawy/oferty/zamówienia/płatności/sesji).

**API surface** (funkcje serwerowe, nie endpointy HTTP):
| Funkcja | Wywoływana z | Kluczowe wejścia | Wyjście | Auth | Kluczowe błędy |
|---|---|---|---|---|---|
| `lib/notifications/send.ts: sendNotificationEmail` | wewnętrznie z funkcji zdarzeń poniżej i z `auth.ts` | `to`, `subject`, `html`, `emailType`, `entityId`, `distinctId` (id odbiorcy jeśli znany, inaczej id encji, np. `offerId`, tak jak istniejący fallback w `project-request-actions.ts`), `throwOnFailure?: boolean` (domyślnie `false`; `true` dla logowania, patrz AC-10) | `boolean` (wysłane/nie), albo rzuca gdy `throwOnFailure` | brak (server only, brak wejścia użytkownika) | błąd sieci Resend, odpowiedź nie ok |
| `lib/notifications/new-inquiry.ts: notifyClientOfNewCase` | `lib/case-actions.ts`, `after()` po `result.created` | `inquiryId: string` | `void` | brak | brak odbiorcy (sprawa nie znaleziona) |
| `lib/notifications/new-offer.ts: notifyClientOfNewOffer` | `lib/offer-actions.ts`, `submitOffer`, po `trackEvent("offer_submitted", ...)` | `offerId: string`, `inquiryId: string` | `void` | brak | brak `inquiry.email` |
| `lib/notifications/order-status.ts: notifyClientOfOrderStatusChange` (zaprojektowane, nie podłączone) | przyszła akcja zmiany statusu (funkcja 16) | `orderId: string`, `newStage: OrderStage` | `void` | brak | zaprojektowane niżej, patrz `## Follow-up` |
| `lib/notifications/payment.ts: notifyClientOfPaymentConfirmed` (zaprojektowane, nie podłączone) | przyszła akcja potwierdzenia płatności (funkcja 12) | `paymentId: string` | `void` | brak | zaprojektowane niżej, patrz `## Follow-up` |
| `auth.ts`: `Resend({ ..., sendVerificationRequest })` (nowy override) | Auth.js, w trakcie logowania linkiem | `identifier` (e mail), `url` (magic link) | `void`, rzuca przy błędzie (`throwOnFailure: true`) | wbudowane w Auth.js | wysyłka nieudana -> Auth.js pokazuje ekran błędu |
| `app/[locale]/internal/notifications/page.tsx` (nowa strona) | admin w przeglądarce | brak wejścia (lista statyczna) | wyrenderowany HTML + temat każdego z 5 szablonów, na danych fikcyjnych | `session.user.role === "admin"` | brak sesji/rola inna niż admin -> 404/redirect jak `internal/products` |

**Key invariants**:
- Wysyłka e maila nigdy nie zmienia wyniku (`ok`/`error`) akcji, która go wywołała; każda funkcja notyfikacji łapie własne błędy i nigdy nie rzuca do wywołującego.
- Brak skonfigurowanego `RESEND_API_KEY` jest cichym "nie wysyłaj" (jak dzisiaj w `sendCaseEmail`), nie liczy się jako `notification_email_failed`; to zdarzenie jest tylko dla realnej próby wysyłki, która nie doszła.
- Każde z dwóch podłączonych zdarzeń woła funkcję notyfikacji z id nowo powstałego wiersza (id oferty, id sprawy), zawsze po tym, jak zapis do bazy się powiódł. `submitOffer` na to samo zapytanie od tego samego producenta drugi raz nie jest odrzucany: stara aktywna oferta dostaje `status = 'superseded'`, powstaje nowy wiersz oferty z nowym id, i to jest zamierzone, nowy e mail na nową ofertę, nie duplikat. Jedyny przypadek naprawdę zablokowany na poziomie bazy to wyścig dwóch równoczesnych submitów tego samego producenta na to samo zapytanie (`23505`); taki submit failuje przed dotarciem do `trackEvent`, więc nigdy nie dociera do notyfikacji.
- Logowanie jest jedynym z pięciu szablonów, gdzie błąd wysyłki NIE jest best effort (AC-10): `sendNotificationEmail` woła się z `throwOnFailure: true`, więc `sendVerificationRequest` przekazuje błąd dalej do Auth.js, zamiast łykać go jak przy pozostałych czterech. Uzasadnienie: brak innej drogi dostarczenia linku, więc cichy brak e maila zostawia użytkownika bez żadnej informacji, gorzej niż widoczny błąd logowania.
- Ekran podglądu (`internal/notifications`) nigdy nie czyta prawdziwego rekordu z bazy (żadnego prawdziwego `inquiryId`/`offerId`/adresu klienta); wszystkie pięć podglądów renderuje się na tych samych, na sztywno wpisanych danych fikcyjnych, więc panel administracyjny nie staje się dodatkową powierzchnią wycieku danych osobowych.

**Security model**:
Obie podłączone funkcje notyfikacji przyjmują tylko id już zweryfikowane przez wywołującą akcję (sesja i uprawnienia sprawdzone wcześniej w `submitAdvisoryInquiry`/`submitOffer`), same nie czytają żadnego wejścia użytkownika. Odbiorcą jest zawsze e mail już zapisany na zapytaniu/sprawie (`inquiry.email`), nigdy e mail podany na nowo w tym wywołaniu, więc nie da się tym mechanizmem wysłać e maila na dowolny adres. Login działa w ramach istniejącego mechanizmu Auth.js (odbiorca to `params.identifier`, ten sam co dziś).

Jedyna nowa powierzchnia autoryzacji to `app/[locale]/internal/notifications`: dostęp tylko `session.user.role === "admin"` (wzorzec spec 0031 AC-9, ten sam co `internal/products`), strona wyłącznie do odczytu, dane fikcyjne, żadnego prawdziwego rekordu klienta w podglądzie.

**Configuration required**:
Brak nowych zmiennych środowiskowych; `RESEND_API_KEY` i `RESEND_FROM_EMAIL` już istnieją (spec 0048). Nowe zależności npm: `@react-email/components` i `@react-email/render` jako zwykłe `dependencies` (potrzebne w runtime, przy każdym renderze szablonu); `react-email` (sam CLI/podglądarka) jako `devDependency`, bo w runtime nie jest wołany. `render()` z `@react-email/render` jest asynchroniczny, funkcje wysyłki muszą na niego `await`ować.

**Critical test scenarios** (każdy odwołuje się do kryterium w `## Requirements`):
- Happy path: `submitOffer` zapisuje ofertę, `notifyClientOfNewOffer` woła zamockowany `fetch` do Resend z prawidłowym `to`/`subject`/HTML, weryfikuje **AC-2**, **AC-7**.
- Happy path: `submitAdvisoryInquiry` z `result.created` woła `notifyClientOfNewCase` obok istniejącego `notifyAdvisorOfNewCase`, weryfikuje **AC-1**.
- Failure case: `fetch` do Resend zwraca błąd sieci albo status nie ok; `submitOffer` mimo to zwraca `{ ok: true }`, `captureError` i `notification_email_failed` są wywołane, weryfikuje **AC-3**, **AC-4**.
- Failure case: `RESEND_API_KEY` nieustawione; wysyłka jest no opem, żadne `notification_email_failed` nie leci, weryfikuje **AC-3**.
- Powtórna oferta: drugi `submitOffer` tego samego producenta na to samo zapytanie supersedu je starą ofertę i wysyła nowy, osobny e mail (nie duplikat), weryfikuje **AC-5**.
- Regresja spec 0048: istniejące testy `lib/cases/notify.ts` (nowa sprawa do doradcy, nowa wiadomość) przechodzą bez zmiany treści/odbiorcy po przejściu na wspólny sender, i teraz też rejestrują `notification_email_sent`, weryfikuje **AC-7**.
- Login happy path: `sendVerificationRequest` renderuje `LoginLinkEmail`, woła wspólny sender, e mail wychodzi z tego samego `RESEND_FROM_EMAIL` co pozostałe cztery, weryfikuje **AC-9**, **AC-11**.
- Login failure: wspólny sender zwraca błąd; `sendVerificationRequest` rzuca dalej (nie łyka błędu), Auth.js pokazuje swój ekran błędu, weryfikuje **AC-10**.
- Podgląd admina: użytkownik bez roli `admin` dostaje ten sam efekt co na `internal/products` (404/redirect); administrator widzi wszystkich pięć szablonów wyrenderowanych na danych fikcyjnych, żaden fetch do bazy nie leci, weryfikuje **AC-12**, **AC-13**.

## Build plan

Kolejność jedna cienka nitka na raz (build approach epiki Produkcja, Tracer Bullet): najpierw jedno zdarzenie od zależności po test, zanim dotknięty zostanie działający kod spec 0048.

1. Dodać `@react-email/components`, `@react-email/render` (dependencies) i `react-email` (devDependency) do `package.json`, satisfies AC-7
2. Dodać `"notification_email_sent"`, `"notification_email_failed"` do `EventName` (`lib/observability/types.ts`), musi być przed krokiem 3, satisfies AC-4
3. Dodać namespace tłumaczeń dla treści e maili (temat/treść po polsku, plus odpowiadające klucze w en/nl/de jak dzisiejszy `CaseEmail`, zgodnie z konwencją spec 0028) dla pięciu szablonów (login, nowe zapytanie, nowa oferta, status, płatność), satisfies AC-6, AC-8, AC-9
4. Nitka 1 (nowa oferta), koniec do końca: `lib/notifications/send.ts` (własny, jeszcze niewspółdzielony sender, z parametrem `throwOnFailure`), szablon React Email `NewOfferEmail`, `lib/notifications/new-offer.ts: notifyClientOfNewOffer` (złączenie `offer.inquiryId` -> `inquiry.email`), podłączenie w `lib/offer-actions.ts` w `after()` po `trackEvent("offer_submitted", ...)`, plus testy (sukces, błąd Resend, brak klucza, powtórna oferta), satisfies AC-2, AC-3, AC-4, AC-5, AC-7, AC-8
5. Nitka 2 (potwierdzenie zapytania), koniec do końca: szablon React Email `NewInquiryConfirmationEmail`, `lib/notifications/new-inquiry.ts: notifyClientOfNewCase` (odbiorca `inquiry.email`, ta sama migawka co `resolveRecipient` już czyta), podłączenie w `lib/case-actions.ts` w `after()` obok `notifyAdvisorOfNewCase`, plus test, satisfies AC-1, AC-8
6. Refaktor: przenieść surowe wywołanie Resend z `sendCaseEmail` (`lib/cases/notify.ts`) do tego samego `lib/notifications/send.ts`, tak że wszystkie trzy funkcje (nowa oferta, nowe zapytanie, e maile sprawy spec 0048) współdzielą jeden sender; ujednolicić domyślny fallback adresu nadawcy (dziś różny w `auth.ts` i `notify.ts`) na jeden adres; regresyjny test potwierdza, że istniejące testy `notify.ts` przechodzą bez zmiany treści/odbiorcy, i że teraz też rejestrują `notification_email_sent`, satisfies AC-7, AC-11
7. Nitka 3 (login), koniec do końca: szablon React Email `LoginLinkEmail`, `auth.ts` dostaje `sendVerificationRequest` który renderuje szablon i woła wspólny sender z `throwOnFailure: true`, plus testy (sukces, i że błąd wysyłki rzuca dalej zamiast być połknięty), satisfies AC-9, AC-10, AC-11
8. Zaprojektować (bez podłączenia) szablon i funkcję dla zmiany statusu realizacji (`lib/notifications/order-status.ts`, odbiorca przez `order.offerId` -> `offer.inquiryId` -> `inquiry.email`) i dla potwierdzenia płatności (`lib/notifications/payment.ts`, odbiorca przez `payment.paidByUserId` -> `users.email`), bez testów (nie ma jeszcze wywołującej akcji), satisfies AC-6
9. Zbudować `app/[locale]/internal/notifications/page.tsx` (guard `session.user.role === "admin"`, wzorzec `internal/products`), renderujący wszystkich pięć szablonów na danych fikcyjnych, z testem na brak dostępu bez roli admin, satisfies AC-12, AC-13
10. `npm run build` z nowymi szablonami React Email w drzewie, żeby wykluczyć znane konflikty `react-dom/server` w server actions Next.js, satisfies AC-7

## Consequences

**Positive**:
- Klient przestaje musieć sam sprawdzać aplikację po złożeniu zapytania albo po ofercie; dwa z czterech zdarzeń scope funkcji 17 są gotowe.
- Wspólny `lib/notifications/send.ts` czyni przyszłe dodanie kolejnego szablonu (albo zmianę dostawcy) kwestią jednej nowej funkcji, nie kopiowania fetcha.
- E mail logowania przestaje wyglądać jak gołe Auth.js domyślne, i wszystkie sześć miejsc wysyłki (login + 5 zdarzeń notyfikacji) dzieli jeden adres nadawcy, co samo w sobie poprawia spójność (mniej sygnałów spamowych niż dwa różne adresy z tej samej domeny).
- Administrator może sprawdzić treść każdego szablonu bez czekania na prawdziwe zdarzenie i bez ryzyka wysłania testowego e maila do prawdziwego klienta.

**Negative / tradeoffs**:
- Funkcja 17 formalnie zostaje częściowo zamknięta: dwa z czterech zdarzeń nie wysyłają nic, dopóki funkcje 16 i 12 nie powstaną; ktoś czytający tylko `## Requirements` bez `## Follow-up` może pomyśleć, że wszystkie cztery już działają.
- Nowa zależność (`react-email`) w projekcie, który dziś nie ma żadnego narzędzia HTML e mail; koszt utrzymania małej, ale realnej biblioteki więcej, plus ryzyko, że renderowanie komponentu React w server action (przez `react-dom/server` pod maską) koliduje z bundlowaniem Next.js, patrz Build plan krok 8.
- Refaktor `sendCaseEmail` dotyka działającego kodu ze spec 0048; błąd w refaktorze mógłby zepsuć e maile sprawy doradczej, które dziś działają (dlatego ten refaktor jest ostatnim krokiem, po dwóch przejściach end to end, nie pierwszym).
- Wszystkie e maile wysyłane przez wspólny sender (w tym dzisiejsze e maile sprawy) od teraz rejestrują `notification_email_sent`/`notification_email_failed` w PostHog, czego dziś nie robią; nowe zdarzenia w panelu PostHog, nie regresja, ale widoczna zmiana.
- Kod poprawia tylko treść i spójność nadawcy; sam nie poprawia dostarczalności na poziomie DNS (SPF/DKIM/DMARC domeny `modularhub.eu`). Bez tego administracyjnego kroku w Resend/u rejestratora domeny, cel "mniej trafiania do spam" jest osiągnięty tylko częściowo, patrz `## Follow-up`.
- Login przestaje być best effort (AC-10): błąd wysyłki teraz aktywnie pokazuje użytkownikowi ekran błędu Auth.js, zamiast ciszej porażki jak dziś (dziś Auth.js i tak swój domyślny e mail wysyła bez tej obsługi, więc to nowe zachowanie, nie regresja, ale warte przetestowania na żywo przed uznaniem funkcji za gotową).

**Neutral**:
- Locale wszystkich pięciu szablonów na sztywno `"pl"`; żadna logika wyboru języka nie jest dodana teraz.

## Follow-up

- [ ] Gdy funkcja 16 (Realizacja i statusy na prawdziwym zapleczu) powstanie: podłączyć `lib/notifications/order-status.ts: notifyClientOfOrderStatusChange` w akcji, która zapisuje nowy `order_stage_event`, tuż po tym miejscu, gdzie ta akcja woła (albo powinna wołać) `trackEvent("order_status_changed", ...)`
- [ ] Gdy funkcja 12 (Realne płatności) powstanie: podłączyć `lib/notifications/payment.ts: notifyClientOfPaymentConfirmed` w akcji, która zapisuje `payment.status = 'paid'`, tuż po tym miejscu, gdzie ta akcja woła (albo powinna wołać) `trackEvent("payment_completed", ...)`
- [ ] Przy aktywacji innych języków (spec 0028): zamienić locale na sztywno `"pl"` w tych pięciu szablonach na realną wartość, tam gdzie akcja wywołująca już ją ma (np. `data.locale` w `submitAdvisoryInquiry`)
- [ ] Żaden zainstalowany community skill nie pokrywa dzisiaj Resend/React Email; rozważyć poszukanie jednego, jeśli powiadomienia e mail rozrosną się poza te pięć szablonów
- [ ] Skonfigurować SPF/DKIM/DMARC dla domeny `modularhub.eu` w Resend (Verify Domain) i u rejestratora DNS; to jest krok poza kodem, ale bez niego branded szablon i spójny nadawca tylko częściowo realizują cel "mniej trafiania do spam" z tego spec
- [ ] Zastąpić przykładowe dane kontaktowe w stopce (`SUPPORT_EMAIL`, `SUPPORT_PHONE`, `COMPANY_ADDRESS_LINES` w `lib/notifications/templates/contact.ts`) prawdziwym adresem, telefonem i adresem firmy przed startem (design feedback, dodane po pierwszym przeglądzie)

## Rationale

Pełny kontekst, porównanie opcji i uzasadnienie: patrz `rationale.md`.
