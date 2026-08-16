# 0007. Realizacja: oś statusów zamówienia (widok klienta)

**Date**: 2026-08-14
**Status**: Accepted

## Summary

Klient, który zaakceptował ofertę wiążącą, dostaje nowy ekran pokazujący postęp jego zamówienia: pięć etapów w stałej kolejności (produkcja, transport, montaż, odbiór, gwarancja), z aktualnym etapem wyróżnionym, datą i listą dokumentów przy każdym osiągniętym etapie. Dane są mockowe, jedna trwała pozycja na projekt, bez logowania i bez prawdziwego zapisu. Ta specyfikacja tworzy też pierwszy współdzielony komponent osi statusów (`StageTimeline`), tak żeby przyszły ekran realizacji u producenta (funkcja 16) wyglądał spójnie, zamiast wymyślać własny wzorzec.

## Requirements

**User stories**:
- Jako klient, który właśnie zaakceptował ofertę wiążącą, chcę od razu zobaczyć link do śledzenia realizacji, żeby wiedzieć, co dalej.
- Jako klient śledzący swoje zamówienie, chcę zobaczyć wszystkie etapy realizacji w kolejności i ten, w którym jestem teraz, żeby rozumieć, na jakim jestem etapie całej drogi.
- Jako klient na etapie już osiągniętym, chcę zobaczyć jego datę i listę dokumentów, żeby mieć dowód i papiery z tego etapu.
- Jako klient, którego zamówienie doszło do ostatniego etapu (gwarancja), chcę zobaczyć jasny sygnał, że zamówienie jest zrealizowane, a nie tylko kolejny podświetlony wiersz.
- Jako klient, który trafił na ten ekran bez zaakceptowanej oferty (np. wklejony link), chcę zostać łagodnie odesłany do właściwego kroku, zamiast zobaczyć błąd.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: `/pl/klient/realizacja` parsuje parametr `project` (jedno znane id projektu, wymagany). Brak albo nieznane id przekierowuje łagodnie do `/pl/klient/wyniki`, nigdy nie pokazuje błędu.
- **AC-2**: Gdy `project` jest znany, ale nie ma dla niego wpisu `FulfillmentOrder` (oferta nie została jeszcze zaakceptowana), strona przekierowuje do `/pl/klient/oferta?project=<id>` zamiast renderować oś statusów.
- **AC-3**: Gdy `FulfillmentOrder` istnieje, strona pokazuje krótki nagłówek (nazwa projektu, producent, metraż, ta sama gęstość informacji co nagłówek `BindingOfferView`), a bezpośrednio pod nim oś pięciu etapów w stałej kolejności: produkcja, transport, montaż, odbiór, gwarancja.
- **AC-4**: Dokładnie jeden etap jest wizualnie oznaczony jako „aktualny” (zgodnie z `FulfillmentOrder.currentStage`); każdy etap przed nim w kolejności jest oznaczony jako „ukończony”, każdy po nim jako „nadchodzący”. Rozróżnienie wizualne nie opiera się wyłącznie na kolorze, tylko na ikonie i tekście (ta sama zasada co `StatusPill`, `docs/design.md` sekcja 7).
- **AC-5**: Etapy ukończone i aktualny pokazują swoją datę osiągnięcia (`reachedAt`), sformatowaną tym samym wzorcem co inne daty w projekcie (`Intl.DateTimeFormat("pl-PL")`). Etapy nadchodzące nie pokazują daty, tylko etykietę „nadchodzący”.
- **AC-6**: Etapy ukończone i aktualny pokazują swoją listę dokumentów (nazwa plus ikona zależna od typu pliku i nieaktywna/mockowa ikona pobierania, bez prawdziwego pliku pod spodem). Etapy nadchodzące nie pokazują żadnej listy dokumentów.
- **AC-7**: Gdy `currentStage` to ostatni etap (gwarancja), strona dodatkowo pokazuje baner/komunikat ukończenia zamówienia, odrębny od zwykłego wyróżnienia „aktualnego” etapu.
- **AC-8**: Stan zaakceptowanej oferty w `BindingOfferView` zastępuje dzisiejszy tekst zastępczy prawdziwym linkiem/przyciskiem „Śledź realizację” prowadzącym do `/pl/klient/realizacja?project=<id>`.
- **AC-9**: Strona zawiera link powrotny do `/pl/klient/oferta?project=<id>`, tym samym wzorcem co dzisiejsze linki powrotne na `/dzialka` i `/oferta`.
- **AC-10**: Strona spełnia WCAG 2.2 AA: dokładnie jeden prawdziwy H1, logiczna kolejność fokusa (nagłówek, potem etapy osi po kolei), stan każdego etapu komunikowany ikoną i tekstem, nigdy samym kolorem, widoczny fokus (`.focus-ring`) na każdym elemencie interaktywnym.

## Decision

**Chosen option**: Option 2, nowy współdzielony komponent `StageTimeline` w `components/ui/`.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Rationale

Pełne uzasadnienie i kontekst: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
- `FulfillmentStageName` (nowy typ w `lib/data/types.ts`): `"produkcja" | "transport" | "montaz" | "odbior" | "gwarancja"`, stała kolejność.
- `FulfillmentDocument` (zagnieżdżony): `{ name: string; type: "pdf" | "image" }`. `type` wybiera ikonę przy mockowej ikonie pobierania.
- `FulfillmentStage` (zagnieżdżony): `{ name: FulfillmentStageName; reachedAt: string | null; documents: FulfillmentDocument[] }`. `reachedAt` to data ISO albo `null` dla etapów nadchodzących; `documents` puste dla etapów nadchodzących.
- `FulfillmentOrder` (nowy, główny): `{ projectId: string; currentStage: FulfillmentStageName; stages: FulfillmentStage[] }`. `projectId` to klucz główny i FK do `Project.id`, jeden `FulfillmentOrder` na projekt (1:1) na tym etapie Facade. `stages` zawsze dokładnie 5 wpisów w stałej kolejności.
- Nowa fixture `lib/data/fixtures/fulfillment.ts` (jeden wpis `FulfillmentOrder` na wybrane `Project.id`, w tym co najmniej jeden na etapie `gwarancja` dla scenariusza banera ukończenia), dostęp przez `getFulfillmentOrder(projectId): Promise<FulfillmentOrder | null>` w `lib/data/fulfillment.ts`, ten sam wzorzec co `getPlotAnalysisResult`.

**State transitions**:
- Kolejność etapów jest stała: `produkcja → transport → montaz → odbior → gwarancja`. `currentStage` dzieli listę na ukończone (przed nim, `reachedAt` ustawione), aktualny (`reachedAt` ustawione) i nadchodzące (po nim, `reachedAt` puste, `documents` puste).
- Brak przejść wyzwalanych przez klienta w tym etapie Facade; to statyczny odczyt migawki z fixture, nie żywa maszyna stanów.

**API surface** (interfejs stron, brak backendu, ten sam wzorzec co w spec 0004, 0005, 0006):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| URL → strona realizacji | Klik „Śledź realizację” z zaakceptowanej oferty, albo bezpośredni URL | `project` (znane id, wymagany) | Oś statusów zamówienia, albo łagodne przekierowanie | Brak | Brak/nieznany `project` → redirect do `/pl/klient/wyniki` (satisfies AC-1) |
| `getFulfillmentOrder(projectId)` | Wywołanie serwerowe przy renderze strony | `projectId` | `FulfillmentOrder` albo `null` | Nie dotyczy | `null` (oferta nie zaakceptowana) → redirect do `/pl/klient/oferta?project=<id>`, nigdy błąd (satisfies AC-2) |
| Zaakceptowana oferta → „Śledź realizację” | Klik (po `acceptedAt !== null` w `BindingOfferView`) | `project.id` | Nawigacja do `/pl/klient/realizacja?project=<id>` | Brak | Nie dotyczy (satisfies AC-8) |
| Link powrotny | Klik „Wróć do oferty” | `project.id` | Nawigacja do `/pl/klient/oferta?project=<id>` | Brak | Nie dotyczy (satisfies AC-9) |

**Key invariants**:
- `stages` ma zawsze dokładnie 5 wpisów, w stałej kolejności zgodnej z sekwencją `FulfillmentStageName`.
- `currentStage` jest zawsze jedną z 5 nazw; etapy przed nim (wg pozycji w sekwencji) mają niepuste `reachedAt`, etap na jego pozycji ma niepuste `reachedAt`, etapy po nim mają puste `reachedAt` i puste `documents`.
- Każdy `Project.id` ma co najwyżej jeden `FulfillmentOrder` w tym etapie Facade (relacja 1:1).
- `getFulfillmentOrder` to czysty odczyt; nie istnieje żadna ścieżka zapisu w tym etapie.

**Security model**:
Strona publiczna, bez logowania, spójnie z resztą ścieżki klienta. Brak zakresu zgodności regulacyjnej: dokumenty i daty są mockowe, żadne dodatkowe realne dane osobowe nie pojawiają się tutaj ponad to, co już pokazuje `/oferta`.

**Configuration required**:
Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: zaakceptuj ofertę na `/oferta`, kliknij „Śledź realizację”, trafiasz na `/pl/klient/realizacja?project=<id>`, widzisz 5 etapów w kolejności, właściwy wyróżniony jako aktualny, daty i dokumenty na etapach ukończonych/aktualnym, sprawdza **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-8**.
- Przypadek brzegowy: bezpośrednie wejście na `/pl/klient/realizacja?project=nieznane-id` przekierowuje do `/pl/klient/wyniki`, bez błędu, sprawdza **AC-1**.
- Przypadek brzegowy: wejście na `/pl/klient/realizacja?project=<znane id bez FulfillmentOrder>` przekierowuje do `/pl/klient/oferta?project=<id>`, sprawdza **AC-2**.
- Treść: zamówienie z `currentStage: "gwarancja"` pokazuje dodatkowy baner ukończenia obok zwykłego wyróżnienia etapu, sprawdza **AC-7**.
- Auth/permission: brak logowania, strona dostępna dla każdego odwiedzającego ze znanym `project`, tak jak reszta ścieżki klienta, sprawdza **AC-1**.

## Build plan

1. Dodaj `FulfillmentStageName`, `FulfillmentDocument`, `FulfillmentStage`, `FulfillmentOrder` do `lib/data/types.ts`, nową fixture `lib/data/fixtures/fulfillment.ts` i `getFulfillmentOrder()` w `lib/data/fulfillment.ts`, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**
2. Zbuduj `components/ui/StageTimeline.tsx`: ogólny, prezentacyjny komponent bazowy (lista etapów z etykietą, statusem ukończony/aktualny/nadchodzący, opcjonalną datą, opcjonalnymi dokumentami) plus podkomponent wiersza dokumentu (nazwa, ikona wg typu, nieaktywna ikona pobierania), bez wiedzy specyficznej dla realizacji domów, satisfies **AC-4**, **AC-5**, **AC-6**
3. Zbuduj `app/[locale]/klient/realizacja/page.tsx` (serwerowy): parsuje `project` na tle znanych id, brak/nieznany → redirect do `/pl/klient/wyniki`; znany bez `FulfillmentOrder` → redirect do `/pl/klient/oferta?project=<id>`; w przeciwnym razie renderuje nagłówek, `StageTimeline`, baner ukończenia (gdy `currentStage === "gwarancja"`) i link powrotny, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-7**, **AC-9**
4. Zaktualizuj `components/klient/BindingOfferView.tsx`: zastąp akapit zastępczy w stanie zaakceptowanym prawdziwym linkiem „Śledź realizację” do `/${locale}/klient/realizacja?project=${project.id}`, satisfies **AC-8**
5. Przejście dostępności: jeden H1 na `/realizacja`, kolejność fokusa (nagłówek, potem etapy po kolei), ikona plus tekst zamiast samego koloru na każdym stanie etapu, `.focus-ring` na każdym elemencie interaktywnym, weryfikacja WCAG 2.2 AA, satisfies **AC-10**

## Consequences

**Positive**:
- Zamyka ślepy zaułek pozostawiony przez funkcję 9: klient po akceptacji oferty ma wreszcie dokąd pójść dalej.
- Ustala współdzielony komponent `StageTimeline` w `components/ui/` od razu, więc funkcja 16 (producent) reużyje dokładnie tego wzorca wizualnego, który `docs/scope/scope.md` wprost nazywa jako wspólny, zamiast dwóch niezależnie wymyślonych osi statusów.
- Zero nowych zależności; cały ekran stoi na dzisiejszym zestawie ikon (`lucide-react`) i tokenach z `docs/design.md`.

**Negative / tradeoffs**:
- Ogólny `StageTimeline` w `components/ui/` to odrobinę większy koszt projektowy z góry (komponent musi być na tyle ogólny, żeby pasował też producentowi) niż wersja tylko dla tego ekranu; uzasadnione tym, że reużycie jest już nazwane w scope, nie spekulacyjne.
- Postęp zamówienia jest w całości autorski na poziomie fixture per projekt; nie ma sposobu, żeby ktoś oglądający demo „przesunął” zamówienie na żywo (brak panelu admina), zgodnie z etapem Facade, ale realne ograniczenie przy prezentacji na żywo.
- Przekierowanie „brak `FulfillmentOrder`” do `/oferta` zakłada, że każda zaakceptowana oferta ma odpowiadający wpis w fixture; dziś akceptacja w `BindingOfferView` to tylko `useState`, nic nie jest trwale zapisywane, więc realny klient po akceptacji trafi na to, co fixture akurat definiuje dla tego projektu, nie dosłownie na „swoje” świeżo zaakceptowane zamówienie. To to samo ograniczenie „akceptacja nie jest naprawdę zapisywana”, które ma już funkcja 9 (Deferred: prawdziwy model danych i baza), nie nowe.

**Neutral**:
- `lib/data/fulfillment.ts` i jego fixture to czwarty moduł danych mockowych per projekt (po `eligibility.ts`, `plot-analysis.ts`, `projects.ts`), ten sam wzorzec funkcji asynchronicznej zgodnie z `AGENTS.md`.
- `components/ui/StageTimeline.tsx` to nowy dodatek do biblioteki komponentów bazowych, wykraczający poza pierwotny zakres spec 0002; udokumentowanie go w tabeli komponentów `docs/design.md` zostawione jako Follow-up.

## Follow-up

- [ ] Dodaj `StageTimeline` do tabeli komponentów w `docs/design.md` (wzorem wiersza `StatusPill`) przy najbliższym `/sync`, bo to nowy komponent bazowy w `components/ui/`.
- [ ] Gdy funkcja 16 (Realizacja i wypłata, producent) dostanie własną specyfikację, reużyj `components/ui/StageTimeline` oraz kształt `FulfillmentOrder`/`FulfillmentStage` ustalony tutaj zamiast definiować je od nowa, zgodnie z wyraźnym zapisem w `docs/scope/scope.md`.
- [ ] `lucide-icons` konwencje wciąż nie są w głównym `AGENTS.md` w sekcji `## Agent skills`, mimo że skill jest zainstalowany i używany ponownie tutaj (ikony etapów i dokumentów); spec 0005 i 0006 już to zauważyły, nic się od tamtej pory nie zmieniło.
