# 0005. Zapytanie / shortlista: wybór projektów i wysyłka zapytania

**Date**: 2026-08-14
**Status**: Accepted

## Summary

Klient zaznacza od 1 do 3 domów na stronie wyników i wysyła jedno zapytanie, w tym samym narzuconym przez platformę szablonie dla każdego wybranego domu. Zaznaczanie dzieje się wprost na kartach wyników, a wysyłka prowadzi na nowy adres z krótkim formularzem kontaktowym i, zaraz po nim, ekranem potwierdzenia. Nic nie jest naprawdę wysyłane ani zapisywane, to mock zgodny z etapem Facade projektu. Ta specyfikacja ustala pierwszy mechanizm działania na karcie wyniku, który spec 0004 świadomie zostawił otwarty.

## Requirements

**User stories**:
- Jako klient przeglądający wyniki, chcę zaznaczyć od 1 do 3 interesujących mnie domów, żeby wysłać do ich producentów jedno zapytanie.
- Jako klient, który zaznaczył już 3 domy, chcę widzieć, że limit został osiągnięty, żeby nie próbować dodać więcej.
- Jako klient gotowy wysłać zapytanie, chcę podać swoje dane kontaktowe raz, żeby nie wypełniać ich osobno dla każdego wybranego domu.
- Jako klient, który wysłał zapytanie, chcę zobaczyć potwierdzenie z tym samym szablonem dla każdego wybranego domu, żeby mieć pewność, że dotarło do wszystkich producentów.
- Jako klient, który trafił na adres formularza albo potwierdzenia z nieprawidłowym lub brakującym wyborem projektów (np. wklejony link), chcę zostać łagodnie odesłany z powrotem do wyników, zamiast zobaczyć błąd.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Na `/pl/klient/wyniki` każda karta wyniku (`ResultCard`) ma checkbox pozwalający zaznaczyć projekt do zapytania; zaznaczenie lub odznaczenie nie nawiguje i nie zmienia URL wyników.
- **AC-2**: Gdy co najmniej 1 projekt jest zaznaczony, na dole ekranu pojawia się widoczny, przypięty pasek akcji z liczbą zaznaczonych projektów (np. "Zaznaczono: 2/3") i przyciskiem "Wyślij zapytanie"; przy 0 zaznaczonych pasek się nie pokazuje.
- **AC-3**: Gdy zaznaczone są już 3 projekty, checkboxy pozostałych, niezaznaczonych kart są wyłączone z podpowiedzią o limicie; odznaczenie jednej z 3 kart natychmiast odblokowuje pozostałe.
- **AC-4**: Kliknięcie "Wyślij zapytanie" nawiguje do `/pl/klient/zapytanie` z identyfikatorami zaznaczonych projektów w parametrze `projects` (plus przepisanymi `country`/`sizeMin`/`sizeMax`, jeśli były obecne na wynikach); żadne dane kontaktowe nie trafiają do URL.
- **AC-5**: Strona `/pl/klient/zapytanie` parsuje `projects`: usuwa duplikaty, odrzuca identyfikatory niepasujące do żadnego istniejącego projektu, i akceptuje wynik tylko gdy po czyszczeniu zostaje od 1 do 3 identyfikatorów; w przeciwnym razie klient jest przekierowywany z powrotem do `/pl/klient/wyniki` z zachowanymi `country`/`sizeMin`/`sizeMax` (jeśli były obecne).
- **AC-6**: Przy prawidłowym wyborze strona renderuje formularz kontaktowy z polami imię, e-mail, telefon, wszystkie wymagane (e-mail dodatkowo zwalidowany formatem); przycisk wysyłki jest nieaktywny, dopóki wszystkie pola nie są poprawnie wypełnione.
- **AC-7**: Wysłanie formularza (bez przeładowania strony, ten sam adres) natychmiast pokazuje stan potwierdzenia: dla każdego zaznaczonego projektu osobny blok w tym samym szablonie (zdjęcie, nazwa, producent, widełki cenowe, stały tekst komunikatu do producenta, status "Wysłano" z datą i godziną, mock).
- **AC-8**: Stan potwierdzenia pokazuje jeden przycisk drugorzędny "Wróć do wyników" prowadzący do `/pl/klient/wyniki` z zachowanymi `country`/`sizeMin`/`sizeMax` (jeśli były obecne); parametr `projects` się nie przenosi.
- **AC-9**: Strona `/pl/klient/zapytanie` spełnia WCAG 2.2 AA: dokładnie jeden prawdziwy H1, logiczna kolejność fokusa (checkboxy na kartach, potem pasek akcji, potem formularz, potem link powrotu), widoczny fokus (`.focus-ring`) na każdym elemencie interaktywnym.

## Decision

**Chosen option**: Option 1, zaznaczanie wprost na kartach wyników plus jeden nowy adres łączący formularz kontaktowy i potwierdzenie jako dwie fazy tego samego widoku.

Klient zaznacza projekty bezpośrednio na `/wyniki`, a "Wyślij zapytanie" prowadzi na `/zapytanie`, gdzie ten sam widok najpierw pokazuje formularz kontaktowy, a po submit, bez nawigacji, stan potwierdzenia.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Rationale

Pełne uzasadnienie, porównanie opcji i kontekst: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
- Brak nowej trwałej encji, zgodnie z etapem Facade (brak bazy danych, brak logowania).
- Nowy plik `lib/inquiry.ts`, ten sam wzorzec co `lib/results-filters.ts` (parsowana kształt, nie encja):
  - `parseInquiryProjectIds(rawProjects: string | string[] | undefined, knownIds: Set<string>): string[] | null` — usuwa duplikaty, odrzuca id spoza `knownIds`, zwraca `string[]` o długości 1 do 3 albo `null`, gdy po czyszczeniu zostaje 0 albo nadal więcej niż 3.
  - `interface InquiryContact { name: string; email: string; phone: string }` — wszystkie pola wymagane, bez trwałości.
- Referencja do `Project.id` jest walidowana przy parsowaniu (`knownIds`), nie na poziomie bazy, bo bazy nie ma.

**State transitions**:
- Strona `/pl/klient/zapytanie` ma dwie klienckie fazy w obrębie tego samego adresu: `form` → `sent` (jednokierunkowo, bez przejścia wstecz w obrębie strony; opuszczenie widoku "sent" możliwe tylko przez link "Wróć do wyników", który wychodzi z przepływu).
- Zaznaczenie na `/wyniki` to prosty stan lokalny (zbiór `project.id`, maks. 3), bez własnej maszyny stanów.

**API surface** (interfejs stron, brak backendu, ten sam wzorzec co w spec 0004):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| Checkbox na `ResultCard` | Klik na wynikach | `project.id` | Lokalny stan zaznaczenia (klient, maks. 3) | Brak | Limit osiągnięty: pozostałe checkboxy disabled (satisfies AC-3) |
| Pasek akcji → URL zapytania | Klik "Wyślij zapytanie" | Zaznaczone `project.id` (1 do 3), aktualne `country`/`sizeMin`/`sizeMax` z URL wyników | Nawigacja do `/pl/klient/zapytanie?projects=...&country=...&sizeMin=...&sizeMax=...` | Brak | Nie dotyczy, pasek pokazuje się dopiero od 1 zaznaczonego |
| `parseInquiryProjectIds(rawProjects, knownIds)` | Wywołanie w `page.tsx` (serwer) | Surowy string `projects`, zbiór znanych `project.id` | `string[]` (1 do 3) albo `null` | Nie dotyczy | `null` → przekierowanie do wyników z zachowanym `country`/`sizeMin`/`sizeMax` |
| URL → strona zapytania | Nawigacja z wyników albo bezpośredni URL | `projects` (wymagany), `country`/`sizeMin`/`sizeMax` (opcjonalne, przepisywane) | Formularz kontaktowy (prawidłowy `projects`) albo miękkie przekierowanie (nieprawidłowy) | Brak (strona publiczna) | Nigdy błąd, zawsze albo formularz, albo przekierowanie |
| Formularz kontaktowy → stan potwierdzenia | Submit (klient, bez przeładowania) | Imię, e-mail, telefon (wszystkie wymagane, e-mail zwalidowany formatem) | Widok potwierdzenia, blok szablonu na każdy projekt | Brak | Submit zablokowany, dopóki pola są nieprawidłowe (walidacja inline) |

**Kluczowe niezmienniki**:
- Liczba zaznaczonych/wybranych projektów mieści się zawsze w przedziale domkniętym 1 do 3, zarówno w stanie zaznaczenia na wynikach, jak i po parsowaniu na stronie zapytania.
- Każde id w wynikowym `string[]` odpowiada realnemu `Project` (gwarantowane przez `parseInquiryProjectIds`).
- Dane kontaktowe (imię, e-mail, telefon) nigdy nie trafiają do URL ani żadnego trwałego magazynu; żyją wyłącznie w lokalnym stanie komponentu klienckiego, na czas wizyty.
- Zaznaczenie 4. projektu przy już 3 zaznaczonych jest blokowane na poziomie UI (disabled checkbox), nie tylko walidowane po fakcie.

**Model bezpieczeństwa**: Strona publiczna, bez logowania, spójnie z resztą ścieżki klienta. Dane kontaktowe wpisane w formularz nie są nigdzie przesyłane ani zapisywane, to czysty mock potwierdzenia zgodny z etapem Facade; znikają przy odświeżeniu albo zamknięciu karty. Brak zakresu zgodności regulacyjnej, bo żadne realne dane osobowe nie opuszczają przeglądarki.

**Wymagana konfiguracja**: Brak nowych zmiennych środowiskowych.

**Krytyczne scenariusze testowe** (każdy odwołuje się do kryterium z Requirements):
- Happy path: zaznacz 2 projekty na wynikach, kliknij "Wyślij zapytanie", wypełnij dane kontaktowe, zobacz potwierdzenie z 2 blokami szablonu, sprawdza **AC-1**, **AC-2**, **AC-4**, **AC-6**, **AC-7**.
- Przypadek brzegowy: zaznaczenie 3. projektu blokuje pozostałe karty, odznaczenie jednej odblokowuje pozostałe, sprawdza **AC-3**.
- Przypadek brzegowy: bezpośrednie wejście na `/pl/klient/zapytanie?projects=nieznane-id` przekierowuje do wyników, sprawdza **AC-5**.
- Przypadek brzegowy: `/pl/klient/zapytanie?projects=id1,id1,id2,nieznane-id` (duplikat plus nieznane id) czyści do `[id1, id2]` i akceptuje, sprawdza **AC-5**.
- Treść: blok potwierdzenia dla każdego projektu pokazuje ten sam zestaw pól (zdjęcie, nazwa, producent, cena, komunikat, status), sprawdza **AC-7**.
- Auth/permission: brak autoryzacji, strona dostępna dla każdego odwiedzającego bez logowania, sprawdza **AC-6**, **AC-9**.

## Build plan

1. [x] Dodaj `lib/inquiry.ts`: `parseInquiryProjectIds()` (dedupe, odrzuca nieznane id, waliduje długość 1 do 3, zwraca `null` gdy nieprawidłowe) i typ `InquiryContact`, satisfies **AC-5**
2. [x] Rozszerz `components/klient/ResultCard.tsx` o opcjonalne propsy zaznaczenia (`selected`, `selectionDisabled`, `onToggleSelect`), renderujące `Checkbox` na karcie; bez propsów karta zachowuje się jak dziś, satisfies **AC-1**
3. [x] Zbuduj `components/klient/ResultsSelection.tsx` (kliencki wrapper wokół siatki kart): trzyma lokalny stan zaznaczonych id (maks. 3), przekazuje propsy zaznaczenia do `ResultCard`, renderuje `ShortlistActionBar` gdy co najmniej 1 zaznaczony, satisfies **AC-1**, **AC-2**, **AC-3**
4. [x] Zbuduj `components/klient/ShortlistActionBar.tsx`: przypięty pasek z licznikiem zaznaczonych i przyciskiem "Wyślij zapytanie" nawigującym do `/pl/klient/zapytanie` z `projects` plus przepisanymi `country`/`sizeMin`/`sizeMax`, satisfies **AC-4**
5. [x] Osadź `ResultsSelection` w `app/[locale]/klient/wyniki/page.tsx` zamiast bezpośredniej siatki `ResultCard`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**
6. [x] Zbuduj `app/[locale]/klient/zapytanie/page.tsx` (serwerowy): parsuje `projects` przez `parseInquiryProjectIds()` na tle znanych id z `getProjects()`; przy nieprawidłowym wyniku przekierowuje do wyników z zachowanym `country`/`sizeMin`/`sizeMax`; przy prawidłowym pobiera wybrane projekty (`Promise.all(ids.map(getProjectById))`), satisfies **AC-5**
7. [x] Zbuduj `components/klient/InquiryFlow.tsx` (kliencki, dwie fazy: `form` i `sent`): faza `form` renderuje pola imię, e-mail, telefon (`Input`) z walidacją inline i przyciskiem nieaktywnym do czasu poprawności; submit przełącza fazę na `sent`, satisfies **AC-6**, **AC-7**
8. [x] Zbuduj blok szablonu potwierdzenia (w `InquiryFlow.tsx` albo wydzielony `components/klient/InquiryConfirmationCard.tsx`): dla każdego wybranego projektu zdjęcie, nazwa, producent, widełki cenowe, stały tekst komunikatu, status "Wysłano" z datą i godziną (mock), plus link "Wróć do wyników" z zachowanymi `country`/`sizeMin`/`sizeMax`, satisfies **AC-7**, **AC-8**
9. [x] Przejście dostępności: jeden H1 na `/zapytanie`, kolejność fokusa (checkboxy, potem pasek akcji, potem formularz, potem link powrotu), `.focus-ring` na każdym elemencie interaktywnym, weryfikacja WCAG 2.2 AA, satisfies **AC-9**

## Consequences

**Positive**:
- Ustala pierwszy mechanizm działania na karcie wyniku, który spec 0004 świadomie zostawiła otwarty w swoim Follow-up ("czy `ResultCard` powinien stać się linkiem, albo dostać checkbox").
- Definiuje "narzucony szablon zapytania" jako spójny, powtarzalny blok, z którego skorzysta też funkcja 15 (zapytania i oferty producenta) po drugiej stronie tej samej wymiany.
- Cały przepływ mieści się w istniejącym systemie komponentów (`Checkbox`, `Card`, `Button`, `Input`), zero nowych zależności ani nowego interaktywnego prymitywu.

**Negative / tradeoffs**:
- Dane kontaktowe klienta (imię, e-mail, telefon) nie są nigdzie zapisywane ani przesyłane, więc "wysłane" zapytanie znika przy odświeżeniu albo zamknięciu karty; to świadomy skrót etapu Facade, nie prawdziwa funkcjonalność.
- Limit "1 do 3" (nie "2 do 3" jak w pierwotnym opisie funkcji w scope) to decyzja doprecyzowana w tej rozmowie; opis funkcji 7 w `docs/scope/scope.md` nadal mówi "2–3" i wymaga aktualizacji, patrz Follow-up.
- Brak ekranu "moje zapytania": po potwierdzeniu jedyna dostępna akcja to powrót do wyników; klient nie ma dziś gdzie zobaczyć historii wysłanych zapytań (świadomie odłożone, brak trwałości na tym etapie).

**Neutral**:
- Nowy plik `lib/inquiry.ts` to jedyne miejsce logiki parsowania i walidacji zapytania, tym samym wzorcem co `lib/results-filters.ts`.
- `ResultCard` dostaje opcjonalne propsy zaznaczenia zamiast osobnego wariantu komponentu, zachowując zgodność wsteczną z istniejącym użyciem bez zmian.

## Follow-up

- [ ] Zaktualizuj opis funkcji 7 w `docs/scope/scope.md` z "2–3" na "1 do 3" przy najbliższym `/scope`, zgodnie z decyzją doprecyzowaną w tej specyfikacji.
- [ ] Gdy powstanie prawdziwe konto klienta (Deferred: prawdziwe logowanie i role) i prawdziwy model danych, zdefiniuj, gdzie i jak dane kontaktowe z tego formularza faktycznie trafiają; dziś nigdzie, czysto kliencki mock.
- [ ] Funkcja 15 (zapytania i oferty producenta) powinna odwołać się do tego samego "narzuconego szablonu" zdefiniowanego tutaj, żeby lista przychodzących zapytań u producenta pokazywała spójny format.
- [ ] `lucide-icons` konwencje nie są jeszcze w głównym `AGENTS.md` w sekcji `## Agent skills`, mimo że skill jest zainstalowany i już używany (np. `MapPin` w `ResultCard`) oraz potrzebny tutaj (status "Wysłano"); dotyczy całego projektu (ikony), więc powinien trafić do głównego `AGENTS.md`, nie do zagnieżdżonego pliku.
