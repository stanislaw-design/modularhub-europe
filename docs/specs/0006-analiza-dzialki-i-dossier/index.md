# 0006. Analiza działki i dossier: panel klienta i bramka płatna per projekt

**Date**: 2026-08-14
**Status**: Accepted

## Summary

Klient dostaje nowy ekran, panel działki, gdzie wpisuje adres swojej działki raz i widzi listę domów, o które wcześniej pytał (od 1 do 3). Przy każdym domu może rozwinąć osobną, udawaną bramkę płatną: poda metraż działki, zobaczy cenę, kliknie zapłać (mock, bez prawdziwej płatności) i po chwili dostanie wynik, dopuszczone, warunkowo albo niedopuszczone, z uzasadnieniem. To pierwszy taki udawany krok płatny w projekcie, więc jego kształt (opis, cena, zapłać, przetwarzanie, wynik) zostanie później powtórzony jeden do jednego przy podobnym ekranie u producenta.

## Requirements

**User stories**:
- Jako klient, który wysłał już zapytanie o 1 do 3 domów, chcę w jednym miejscu sprawdzić, czy moja działka nadaje się pod każdy z tych domów, żeby łatwiej zarządzać kilkoma równoległymi ścieżkami naraz.
- Jako klient, chcę podać adres działki raz, a nie osobno przy każdym domu, żeby nie wpisywać tych samych danych kilka razy.
- Jako klient sprawdzający konkretny dom, chcę zobaczyć cenę usługi i zapłacić (na razie na niby) zanim zobaczę wynik, żeby rozumieć, że to płatna usługa.
- Jako klient, który dostał wynik dopuszczone albo warunkowo, chcę mieć od razu przycisk dalej do oferty wiążącej dla tego domu, żeby kontynuować ścieżkę zakupu.
- Jako klient, który dostał wynik niedopuszczone, chcę zobaczyć jasne uzasadnienie, żeby wiedzieć dlaczego ten dom odpada na mojej działce.
- Jako klient, który trafił na ten ekran z nieprawidłowym albo brakującym wyborem domów (np. wklejony link), chcę zostać łagodnie odesłany do wyników, zamiast zobaczyć błąd.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: `/pl/klient/dzialka` parsuje parametr `projects` (ten sam kształt co `parseInquiryProjectIds`: 1 do 3 znanych id, bez duplikatów); przy braku albo nieprawidłowym wyniku klient jest przekierowywany do `/pl/klient/wyniki` z zachowanymi `country`/`sizeMin`/`sizeMax` (jeśli były obecne), nigdy nie widzi błędu.
- **AC-2**: Na ekranie potwierdzenia zapytania (spec 0005) pojawia się nowy przycisk prowadzący do `/pl/klient/dzialka` z tymi samymi `projects` (i `country`/`sizeMin`/`sizeMax`, jeśli obecne); panel pokazuje jedno pole adresu działki (wymagane, wspólne dla wszystkich domów) oraz listę wybranych domów, jeden wiersz na dom.
- **AC-3**: Klik w wiersz domu rozwija jego własną bramkę (bez nawigacji, bez utraty stanu innych wierszy): stały opis zakresu analizy, stała cena usługi (z `lib/pricing.ts`, sformatowana tym samym wzorcem co dziś w `InquiryConfirmationCard`, `Intl.NumberFormat("pl-PL")` plus „€”), pole metrażu działki (wymagane, 100 do 100000 m²). Przycisk „Zapłać” tej bramki jest nieaktywny, dopóki adres z panelu jest pusty albo metraż jest pusty/poza zakresem.
- **AC-4**: Klik „Zapłać” przy poprawnych danych zapisuje w tej bramce (nie w panelu) migawkę aktualnego adresu i metrażu w chwili kliknięcia, pokazuje krótki stan „Przetwarzanie płatności” (mock, stałe opóźnienie ok. 1200 ms, nie losowe), a potem automatycznie stan wyniku, bez opuszczania panelu. Zmiana adresu w polu panelu później nie zmienia już zapisanej migawki tej bramki.
- **AC-5**: Stan wyniku pokazuje jeden z trzech statusów (dopuszczone / warunkowo / niedopuszczone) przez istniejący `StatusPill`, z uzasadnieniem tekstowym z `PlotAnalysisResult.reason`, oraz stały tekst zastrzeżenia: „To nie jest opinia prawna. Wynik to szacunkowa ocena na podstawie danych przykładowych, nie realna ekspertyza prawna ani budowlana.” (ten sam wzorzec zastrzeżenia co planowany dla funkcji 13, gotowość eksportowa producenta, która jeszcze nie istnieje; ta specyfikacja ustala treść jako pierwsza).
- **AC-6**: Przy statusie dopuszczone albo warunkowo wynik pokazuje przycisk „Przejdź do oferty wiążącej”, prowadzący do `/pl/klient/oferta?project=<id>&address=<adres migawki tej bramki>`. Adres w tym URL to zapisana migawka z AC-4, nie bieżąca wartość pola w panelu.
- **AC-7**: Przy statusie niedopuszczone wynik pokazuje tylko status i uzasadnienie, bez przycisku dalej.
- **AC-8**: Zapłacenie albo rozwinięcie bramki jednego domu nie zmienia ani nie resetuje stanu (fazy, metrażu, migawki adresu, wyniku) żadnego innego wiersza w tej samej wizycie.
- **AC-9**: Odświeżenie strony albo zamknięcie karty czyści cały wpisany stan (adres, metraże, wyniki płatności); nic nie jest trwale zapisywane, zgodnie z etapem Facade.
- **AC-10**: Panel spełnia WCAG 2.2 AA: dokładnie jeden prawdziwy H1, logiczna kolejność fokusa (pole adresu, potem wiersze domów po kolei, potem kontrolki wewnątrz rozwiniętego wiersza, z fokusem przenoszonym na zawartość wiersza przy rozwinięciu), `aria-expanded`/`aria-controls` na przycisku każdego wiersza, `aria-live="polite"` na obszarze wyniku bramki (żeby zmiana fazy `paying` → `result` była ogłoszona czytnikom ekranu bez przenoszenia fokusu), widoczny fokus (`.focus-ring`) na każdym elemencie interaktywnym.

## Decision

**Chosen option**: Option 2, panel klienta bez logowania z rozwijaną bramką płatną per dom.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Rationale

Pełne uzasadnienie, porównanie opcji i kontekst: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
- `Project` (istniejący): bez zmian.
- Nowy `PlotAnalysisResult` w `lib/data/types.ts`: `{ projectId: string; status: EligibilityStatus; reason: string }`. Ten sam kształt co dzisiejszy `EligibilityByCountry`, ale kluczowany tylko `projectId` (bez `countryCode`), bo to działka klienta, nie prawo kraju. Fixture `lib/data/fixtures/plot-analysis.ts` pokrywa każdy istniejący `Project.id`, tak jak `eligibility.ts` pokrywa dziś każdą parę projekt/kraj. Dostęp przez `getPlotAnalysisResult(projectId): Promise<PlotAnalysisResult | null>` w `lib/data/plot-analysis.ts`, ten sam wzorzec co `getEligibility`.
- Nowy `lib/pricing.ts`: stała `PLOT_ANALYSIS_PRICE_EUR` (liczba) plus `PLOT_ANALYSIS_CURRENCY` ("EUR"), współdzielona, gotowa do reużycia przez funkcję 14 u producenta.
- Nietrwały stan kliencki (bez zapisu, znika po odświeżeniu): `interface PlotAnalysisRequest { plotAreaM2: number | null; phase: "idle" | "paying" | "result"; paidAddress: string | null; paidAt: Date | null }` oraz `interface PlotDossierState { address: string; requests: Record<string, PlotAnalysisRequest> }`, jeden na `Project.id` z bieżącego `projects`. Żyje w jednym komponencie klienckim (`PlotDossierPanel`), nie w URL, nie w żadnym magazynie. Pole nazwane `plotAreaM2` (nie `floorAreaM2`), żeby nie kolidować znaczeniowo z istniejącym `Project.floorAreaM2` (metraż domu, nie działki). `paidAddress` to migawka `PlotDossierState.address` zapisana w chwili kliknięcia „Zapłać” dla tej bramki, niezależna od późniejszych zmian pola adresu w panelu (patrz AC-4).

**State transitions**:
- Każdy wiersz domu, niezależnie od innych: `idle` → `paying` (po kliknięciu „Zapłać” z poprawnym adresem i metrażem; w tym momencie `paidAddress` zostaje zapisany jako migawka bieżącego adresu panelu) → `result` (po stałym mockowym opóźnieniu ok. 1200 ms). Jednokierunkowo w ramach wizyty, bez powrotu do `idle`.
- Panel jako całość nie ma własnej maszyny stanów, to zbiór niezależnych `PlotAnalysisRequest` w jednym `Record`.

**API surface** (interfejs stron, brak backendu, ten sam wzorzec co w spec 0004 i 0005):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| URL → panel działki | Nawigacja z potwierdzenia zapytania albo bezpośredni URL | `projects` (1 do 3 znanych id, wymagany), opcjonalnie `country`/`sizeMin`/`sizeMax` | Panel z listą domów, albo łagodne przekierowanie do wyników | Brak | Nieprawidłowy/brakujący `projects` → redirect do `/pl/klient/wyniki` (satisfies AC-1) |
| Pole adresu (panel) | Wpisanie tekstu | Adres (string, wymagany przed zapłaceniem którejkolwiek bramki) | Lokalny stan `PlotDossierState.address` | Brak | Puste pole blokuje „Zapłać” na każdej bramce (satisfies AC-3) |
| Rozwinięcie wiersza domu | Klik na wiersz | `project.id` | Rozwinięta bramka: opis, cena, pole metrażu | Brak | Nie dotyczy |
| Formularz bramki → „Zapłać” | Submit (klient, bez przeładowania) | `plotAreaM2` (100 do 100000, wymagany), `address` (z panelu, w chwili kliknięcia) | Migawka `paidAddress`, faza `paying` (mock), potem `result` | Brak | Submit zablokowany, dopóki metraż poza zakresem albo adres pusty (satisfies AC-3) |
| `getPlotAnalysisResult(projectId)` | Wywołanie po zakończeniu `paying` | `projectId` | `PlotAnalysisResult` (status + reason) | Nie dotyczy | Brak wpisu w fixture (np. nowy projekt dodany bez odpowiadającego wpisu) traktowany jak `blocked` z ogólnym powodem, nigdy błąd (satisfies AC-5) |
| Wynik → „Przejdź do oferty wiążącej” | Klik (tylko `approved`/`conditional`) | `project.id`, `paidAddress` tej bramki | Nawigacja do `/pl/klient/oferta?project=<id>&address=<adres migawki>` | Brak | Przycisk ukryty przy `blocked` (satisfies AC-6, AC-7) |

**Key invariants**:
- `plotAreaM2` zawsze w przedziale domkniętym 100 do 100000, zanim bramka przejdzie w fazę `paying`.
- `paidAddress` niepuste i niezmienne dla dowolnej bramki w fazie `paying` albo `result`, ustawione raz jako migawka w chwili kliknięcia „Zapłać”; późniejsza edycja pola adresu w panelu nie dotyka już opłaconych bramek.
- Każdy `projectId` w `PlotDossierState.requests` odpowiada realnemu, znanemu `Project.id` z bieżącego `projects` (ta sama walidacja co `parseInquiryProjectIds`).
- Cena usługi (`PLOT_ANALYSIS_PRICE_EUR`) jest jedna, stała dla wszystkich domów i klientów na tym etapie.
- Wynik (`PlotAnalysisResult.status`/`reason`) zależy tylko od `projectId`; adres i metraż wpisane przez klienta nie wpływają na wynik na tym etapie (mock, patrz Consequences).

**Security model**:
Strona publiczna, bez logowania, spójnie z resztą ścieżki klienta. Adres i metraż żyją wyłącznie w lokalnym stanie komponentu klienckiego na czas wizyty, nigdzie nie są trwale zapisywane, znikają przy odświeżeniu albo zamknięciu karty, tak jak dane kontaktowe w spec 0005. Wyjątek świadomy, nie przeoczenie: migawka adresu (`paidAddress`) tej konkretnej bramki jest przenoszona dalej w parametrze URL do `/pl/klient/oferta`, tym samym mechanizmem co dziś `country`/`sizeMin`/`sizeMax` między `/wyniki` a `/zapytanie`; to nawigacja między stronami tej samej wizyty, nie wysyłka do zewnętrznego systemu ani trwały zapis. Widoczne zastrzeżenie przy każdym wyniku, treść w AC-5. Brak zakresu zgodności regulacyjnej, bo żadne realne dane osobowe nie opuszczają przeglądarki poza tą nawigacją wewnątrz aplikacji.

**Configuration required**:
Brak nowych zmiennych środowiskowych; mockowa płatność nie łączy się z żadnym prawdziwym dostawcą.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: wpisz adres, rozwiń dom A, podaj metraż w zakresie, kliknij „Zapłać”, zobacz stan przetwarzania, potem wynik dopuszczone z przyciskiem dalej do oferty, sprawdza **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**.
- Przypadek brzegowy: „Zapłać” zostaje nieaktywne przy pustym adresie albo metrażu poza zakresem 100 do 100000, sprawdza **AC-3**.
- Przypadek brzegowy: bezpośrednie wejście na `/pl/klient/dzialka?projects=nieznane-id` przekierowuje do wyników, sprawdza **AC-1**.
- Przypadek brzegowy: zapłacenie za dom A nie zmienia stanu (fazy, metrażu) domu B w tym samym panelu, sprawdza **AC-8**.
- Treść: wynik niedopuszczone pokazuje status, uzasadnienie i zastrzeżenie prawne, bez przycisku dalej, sprawdza **AC-5**, **AC-7**.
- Przypadek brzegowy: zmiana adresu w polu panelu po tym, jak dom A ma już wynik, nie zmienia URL-a ani wyniku, do którego prowadzi przycisk „Przejdź do oferty” dla domu A, sprawdza **AC-4**, **AC-6**.
- Auth/permission: brak logowania, strona i wszystkie jej interakcje dostępne dla każdego odwiedzającego bez konta, sprawdza **AC-1**.

## Build plan

1. Dodaj `PlotAnalysisResult` do `lib/data/types.ts`, fixture `lib/data/fixtures/plot-analysis.ts` (jeden wpis na każdy `Project.id`) i `getPlotAnalysisResult()` w `lib/data/plot-analysis.ts`, satisfies **AC-5**
2. Dodaj `lib/pricing.ts` ze stałą ceną i walutą usługi, satisfies **AC-3**
3. Zbuduj `app/[locale]/klient/dzialka/page.tsx` (serwerowy): parsuje `projects` przez `parseInquiryProjectIds()` na tle znanych id, przy nieprawidłowym wyniku przekierowuje do wyników z zachowanym `country`/`sizeMin`/`sizeMax`, przy prawidłowym pobiera wybrane domy, satisfies **AC-1**
4. Zbuduj `components/klient/PlotDossierPanel.tsx` (kliencki): trzyma `PlotDossierState`, pole adresu, renderuje listę domów z osadzonym `PlotAnalysisRow` na każdy, satisfies **AC-2**, **AC-8**, **AC-9**
5. Zbuduj `components/klient/PlotAnalysisRow.tsx` (kliencki, element akordeonu): faza `idle` (opis zakresu, cena sformatowana `Intl.NumberFormat("pl-PL")` plus „€”, pole metrażu `plotAreaM2`), faza `paying` (mockowy stan przetwarzania, stałe opóźnienie ok. 1200 ms, zapisanie migawki `paidAddress`), faza `result` (`StatusPill`, uzasadnienie, stały tekst zastrzeżenia z AC-5, przycisk dalej przy `approved`/`conditional` używający `paidAddress`), satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**
6. Dodaj przycisk „Sprawdź działkę” na stanie potwierdzenia w `components/klient/InquiryFlow.tsx`, prowadzący do `/pl/klient/dzialka?projects=...` (plus przepisane `country`/`sizeMin`/`sizeMax`), satisfies **AC-2**
7. Przejście dostępności: jeden H1 na `/dzialka`, kolejność fokusa (adres, wiersze domów, kontrolki rozwiniętej bramki, fokus na zawartość przy rozwinięciu), `aria-expanded`/`aria-controls` na przycisku wiersza, `aria-live="polite"` na obszarze wyniku bramki, `.focus-ring` na każdym elemencie interaktywnym, weryfikacja WCAG 2.2 AA, satisfies **AC-10**

## Consequences

**Positive**:
- Realizuje wprost prośbę o miejsce, gdzie klientowi „łatwiej zarządzać” kilkoma sprawdzeniami naraz, bez czekania na prawdziwe logowanie.
- Ustala pierwszy „udawany krok płatny” (opis, cena, zapłać, przetwarzanie, wynik), który funkcja 14 u producenta odtworzy jeden do jednego.
- Zero nowych zależności wizualnych, cały ekran stoi na dzisiejszym `StatusPill`, `Card`, `Button`, `Input` i słowniku `EligibilityStatus`.

**Negative / tradeoffs**:
- Zakres szerszy niż jednolinijkowy opis funkcji 8 w dzisiejszym `docs/scope/scope.md` (jeden ekran bramki): ta specyfikacja dodaje cały panel jako punkt wejścia, zgodnie z wyraźną prośbą zamawiającego.
- Bez prawdziwego logowania panel istnieje tylko na czas wizyty: klient, który wróci następnego dnia tym samym linkiem, zacznie od nowa (pusty adres, brak wyników).
- Metraż działki wpisywany osobno przy każdym domu, mimo że fizycznie to jedna działka, to świadomy skrót zaakceptowany przez zamawiającego, nie twierdzenie o modelowej dokładności.
- Wynik (`PlotAnalysisResult`) zależy tylko od `projectId`, nie od adresu ani metrażu, które klient faktycznie wpisuje: to czysty mock etapu Facade, nie symulacja prawdziwej analizy terenu; klient tego nie widzi, ale przyszły czytelnik kodu powinien.

**Neutral**:
- `lib/pricing.ts` to pierwszy współdzielony moduł cenowy w projekcie; funkcja 14 powinna go reużyć zamiast definiować własną stałą.
- `/pl/klient/oferta` (funkcja 9) jeszcze nie istnieje; ta specyfikacja ustala tylko jej kontrakt wejściowy (`project`, `address`), tak jak spec 0003 ustaliła kontrakt wyników zanim strona wyników powstała.

## Follow-up

- [ ] Zaktualizuj opis funkcji 8 w `docs/scope/scope.md` przy najbliższym `/scope`: dzisiejszy jednolinijkowy opis („ekran płatnej bramki”) nie wspomina panelu klienta, który ta specyfikacja dodaje jako punkt wejścia.
- [ ] Gdy funkcja 9 (oferta wiążąca) dostanie własną specyfikację albo zostanie zbudowana, potwierdź kontrakt `/pl/klient/oferta?project=<id>&address=<adres>` ustalony tutaj.
- [ ] Gdy funkcja 13 (gotowość eksportowa producenta) dostanie własną specyfikację, reużyj dosłowny tekst zastrzeżenia prawnego ustalony w AC-5 tej specyfikacji, zamiast wymyślać nowy; to ta specyfikacja ustala treść jako pierwsza, nie odwrotnie.
- [ ] Gdy funkcja 14 (domykanie luk, producent) dostanie własną specyfikację, reużyj `lib/pricing.ts` (wzorzec współdzielonej stałej) oraz kształt fazy `idle → paying → result` ustalony tutaj, zgodnie z opisem funkcji 14 w scope („ten sam wzorzec co analiza działki klienta”).
- [ ] Gdy powstanie prawdziwe konto klienta i logowanie (Deferred: prawdziwe logowanie i role), zdecyduj, czy stan panelu (adres, metraże, wyniki) staje się trwały per konto zamiast nietrwały per wizyta.
- [ ] `lucide-icons` konwencje wciąż nie są w głównym `AGENTS.md` w sekcji `## Agent skills`, mimo że skill jest zainstalowany i używany (np. w `StatusPill`) oraz potrzebny tutaj (ikony w akordeonie i stanie przetwarzania); to samo zauważyła już specyfikacja 0005, nic się od tamtej pory nie zmieniło.
