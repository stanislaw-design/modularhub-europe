# 0009. Gotowość eksportowa (producent): statyczna mapa krajów

**Date**: 2026-08-16
**Status**: In Progress

## Summary

Po zapisaniu pierwszego projektu producent trafia dziś na zaślepkę. Ta specyfikacja zastępuje ją prawdziwym ekranem: mapą trzech krajów (Polska, Niemcy, Holandia), każdy ze statusem dopuszczone, warunkowo dopuszczone albo niedopuszczone. Kraj o statusie pośrednim rozwija listę konkretnych braków. Dane są stałym mockiem, jednym i tym samym za każdym razem, bo prawdziwa ocena zgodności prawnej to osobna, odłożona decyzja. Ekran pokazuje też stałe zastrzeżenie, że to nie jest opinia prawna.

## Requirements

**User stories**:
- Jako producent, który właśnie zapisał swój pierwszy projekt, chcę zobaczyć, w których krajach jest on gotowy do sprzedaży, a gdzie czegoś brakuje, żeby wiedzieć, co zrobić dalej.
- Jako producent patrzący na kraj ze statusem pośrednim, chcę zobaczyć dokładnie, czego brakuje, zamiast ogólnikowego komunikatu.
- Jako producent, chcę mieć jasność, że ten wynik to nie prawdziwa opinia prawna, żeby nie podejmować na jej podstawie decyzji bez konsultacji.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Wejście na `/pl/producent/gotowosc-eksportowa` z parametrem `nazwa` pokazuje nagłówek z nazwą projektu; brak `nazwa` (albo pusty string) pokazuje ten sam ekran z ogólnym nagłówkiem, nigdy błąd. Zachowuje kontrakt ustalony w spec [0008](../0008-pierwszy-projekt/index.md) (AC-10).
- **AC-2**: Ekran pokazuje dokładnie trzy wiersze krajów, jeden na każdy kraj z `getCountries()` (Polska, Niemcy, Holandia), każdy oznaczony `StatusPill` jednym z trzech statusów: Dopuszczone, Warunkowo dopuszczone, Niedopuszczone.
- **AC-3**: Dane statusu są stałe (ten sam kanoniczny mock za każdym razem, niezależnie od wpisanej nazwy projektu czy pól technicznych z kreatora) i pokrywają wszystkie trzy statusy naraz: jeden kraj dopuszczony, jeden warunkowo dopuszczony, jeden niedopuszczony.
- **AC-4**: Wiersz kraju o statusie dopuszczone albo niedopuszczone pokazuje status i jednowierszowe uzasadnienie tekstowe, bez kontrolki rozwijania.
- **AC-5**: Wiersz kraju o statusie warunkowo dopuszczone jest rozwijalny (akordeon): domyślnie zwinięty, pokazuje status i uzasadnienie; rozwinięcie ujawnia listę co najmniej dwóch konkretnych, nazwanych braków, nie ogólnikowy tekst.
- **AC-6**: Stały tekst zastrzeżenia prawnego, dosłownie ten sam co w spec [0006](../0006-analiza-dzialki-i-dossier/index.md) AC-5 („To nie jest opinia prawna. Wynik to szacunkowa ocena na podstawie danych przykładowych, nie realna ekspertyza prawna ani budowlana."), jest widoczny raz na stronie, blisko góry, zawsze, niezależnie od statusów.
- **AC-7**: Ekran nie zawiera żadnych dodatkowych akcji ani linków (np. do niezbudowanej jeszcze funkcji 14 albo do strony głównej producenta) — jest czysto informacyjny.
- **AC-8**: WCAG 2.2 AA: dokładnie jeden prawdziwy H1, logiczna kolejność fokusa, akordeon w pełni obsługiwany klawiaturą z `aria-expanded`/`aria-controls` i zarządzaniem fokusem (wzorem `PlotAnalysisRow`), status przekazywany ikoną i tekstem, nigdy samym kolorem.

## Options considered

### Option 1: Stały, kanoniczny mock, wszystkie trzy kraje, bez dalszej akcji

Jeden statyczny zestaw trzech wierszy (jeden kraj na status), ten sam dla każdego producenta i każdego projektu, niezależny od nazwy projektu czy zarejestrowanych krajów dostawy. Ekran jest czysto informacyjnym punktem końcowym.

**Pros**:
- Dosłownie realizuje wymagane „Done when" funkcji 13, bez wymyślania mechanizmu, którego nikt nie prosił.
- Zero zmian w istniejącym kontrakcie URL (`nazwa` jako jedyny parametr, ustalony w spec 0008).
- Pokazuje wszystkie trzy statusy naraz, więc jedna wizyta w pełni demonstruje ekran.

**Cons**:
- Wynik nigdy nie zmienia się między projektami, nawet jeśli producent wpisał zupełnie inne dane techniczne w kreatorze; może to wyglądać na oczywisty mock przy dłuższym demo.

### Option 2: Kilka gotowych profili, wybieranych deterministycznie z hashu nazwy projektu, zawężone do zarejestrowanych krajów dostawy

Kilka wariantów statusu wybieranych na podstawie hashu `nazwa`; ta sama nazwa zawsze daje ten sam wynik, różne nazwy dają różne profile. Mapa pokazuje tylko kraje, które producent wybrał przy rejestracji.

**Pros**:
- Więcej demo różnorodności bez ręcznego przełączania.
- Produktowo trafniejsze: pokazuje tylko kraje, do których producent faktycznie chce eksportować.

**Cons**:
- Wymaga rozszerzenia kontraktu URL o zarejestrowane kraje dostawy (dziś nieprzenoszone), czyli zmiany w `ProjectWizard`, stronie rejestracji i stronie docelowej.
- Mechanizm wyboru profilu po hashu to dodatkowa logika bez wymogu w scope, którą trzeba będzie utrzymywać.

### Option 3: Reużycie istniejących wierszy `EligibilityByCountry` z sześciu demo projektów klienta

Zamiast nowego mocka, dopasowanie szkicu producenta do jednego z sześciu istniejących projektów klienta (np. po kraju produkcji albo hashu) i wyświetlenie jego istniejących wierszy `EligibilityByCountry`.

**Pros**:
- Zero nowych danych do napisania, reużywa gotowe, już napisane uzasadnienia.

**Cons**:
- `EligibilityByCountry.reason` to pojedynczy string, nie lista konkretnych braków wymagana przez „Done when"; i tak trzeba by dopisać nowe dane.
- Wiąże mock producenta z niepowiązanymi demo projektami klienta w sposób, który zmyli przyszłego czytelnika `fixtures/eligibility.ts`.

## Decision

**Chosen option**: Option 1, stały kanoniczny mock, wszystkie trzy kraje, bez dalszej akcji na ekranie.

## Rationale

Pełne uzasadnienie i porównanie opcji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
- Nowy typ `ExportReadinessCountryStatus` w `lib/data/types.ts`: `{ countryCode: CountryCode; status: EligibilityStatus; reason: string; gaps: string[] }`. Osobny od istniejącego `EligibilityByCountry` (ten jest kluczowany prawdziwym `projectId`, którego szkic producenta nie ma). `gaps` jest wymagane, ale puste dla `approved`/`blocked`.
- Nowy fixture `lib/data/fixtures/export-readiness.ts`: dokładnie trzy wiersze, po jednym na każdy `CountryCode` z `lib/data/fixtures/countries.ts`, jeden na status (Polska dopuszczone, Niemcy warunkowo dopuszczone z listą braków, Holandia niedopuszczone).
- Nowy dostęp `lib/data/export-readiness.ts`: `getExportReadiness(): Promise<ExportReadinessCountryStatus[]>`, asynchroniczny od początku (spójnie z resztą `lib/data`), zwraca cały fixture bez filtrowania.
- Brak relacji do `Project`/`ProjectDraft`/tożsamości producenta; płaska, statyczna lista.

**State transitions**:
Wiersz warunkowy (jedyny rozwijalny): zwinięty → rozwinięty, czysto klienckie, bez zapisu, reset przy każdej nawigacji na ekran.

**API surface**:
| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| URL → ekran gotowości eksportowej | Nawigacja z kreatora (spec 0008) albo bezpośredni URL | `nazwa` (opcjonalny) | Mapa trzech krajów, nagłówek z nazwą albo ogólny | Brak | Brak/pusty `nazwa` → ogólny nagłówek, nigdy błąd (satisfies AC-1) |
| Akordeon wiersza warunkowego | Klik / Enter / Spacja na nagłówku wiersza | Brak | Rozwinięcie/zwinięcie listy braków | Brak | Nie dotyczy |

**Key invariants**:
- Fixture zawiera dokładnie jeden wiersz na każdy `CountryCode` z `lib/data/countries.ts`; brak duplikatów, brak brakujących krajów.
- `gaps` ma co najmniej dwie pozycje wtedy i tylko wtedy, gdy `status === "conditional"`; dla `approved`/`blocked` `gaps` jest pustą tablicą.
- Dane nigdy nie zależą od `nazwa`, zawartości kreatora ani żadnej innej wartości przekazanej z wcześniejszych ekranów — ten sam wynik dla każdego producenta i każdego projektu na tym etapie.
- Tylko wiersz o statusie `conditional` ma kontrolkę rozwijania; pozostałe dwa renderują treść zawsze w pełni widoczną, bez ukrytego stanu.

**Security model**:
Brak logowania, spójnie z resztą etapu Facade. Strona jest publicznie dostępna pod znanym adresem, bez zbierania ani pokazywania danych wrażliwych. Brak zakresu regulacyjnego: dane są jawnie oznaczonym mockiem, nie prawdziwą oceną prawną.

**Configuration required**:
Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: wejście z `?nazwa=Modulor%20Family%2090` pokazuje nagłówek z tą nazwą, trzy wiersze krajów z poprawnymi statusami, rozwinięcie wiersza warunkowego ujawnia listę braków, zastrzeżenie widoczne raz na górze, weryfikuje **AC-1** do **AC-6**.
- Failure case: wejście bez `nazwa` (albo z pustym stringiem) pokazuje ten sam ekran z ogólnym nagłówkiem, bez błędu, weryfikuje **AC-1**.
- Auth/permission: nie dotyczy (brak logowania na tym etapie); zamiast tego dostępność: nawigacja klawiaturą do wiersza warunkowego, Enter/Spacja rozwija listę, fokus zarządzany zgodnie z wzorem `PlotAnalysisRow`, weryfikuje **AC-8**.

## Build plan

1. [x] Dodaj `ExportReadinessCountryStatus` do `lib/data/types.ts`, satisfies **AC-2**, **AC-3**
2. [x] Zbuduj `lib/data/fixtures/export-readiness.ts` (trzy statyczne wiersze: Polska dopuszczone, Niemcy warunkowo z listą braków, Holandia niedopuszczone) i `lib/data/export-readiness.ts` (`getExportReadiness()`), satisfies **AC-2**, **AC-3**
3. [x] Zbuduj `components/producent/ExportReadinessMap.tsx` (serwerowy): nagłówek z opcjonalną nazwą projektu, stałe zastrzeżenie raz na górze, lista trzech wierszy, satisfies **AC-1**, **AC-6**, **AC-7**
4. [x] Zbuduj `components/producent/ExportReadinessCountryRow.tsx` (kliencki): `StatusPill` i uzasadnienie dla każdego wiersza; dla statusu warunkowego dodaje akordeon (wzorem `PlotAnalysisRow`) z listą braków, satisfies **AC-4**, **AC-5**
5. [x] Przepisz `app/[locale]/producent/gotowosc-eksportowa/page.tsx`: usuń zaślepkę, pobierz `getCountries()` i `getExportReadiness()`, wyrenderuj `ExportReadinessMap`, zachowaj miękkie parsowanie `nazwa` ustalone w spec 0008, satisfies **AC-1**
6. [x] Przejście dostępności: jeden H1, `aria-expanded`/`aria-controls` na akordeonie, zarządzanie fokusem po rozwinięciu, weryfikacja WCAG 2.2 AA, satisfies **AC-8**

## Consequences

**Positive**:
- Zastępuje zaślepkę z 0008 rzeczywistą treścią, domykając „Done when" funkcji 13 wprost.
- Reużywa cztery już ustalone wzorce (`StatusPill`, tekst zastrzeżenia, akordeon `PlotAnalysisRow`, podział serwer/klient), bez nowych zależności ani nowego stylu.
- Statyczny mock pokazujący wszystkie trzy statusy naraz czyni jedną wizytę w pełni demonstracyjną.

**Negative / tradeoffs**:
- Wynik nie zależy w żaden sposób od pól technicznych faktycznie wpisanych w kreatorze (funkcja 12); to świadome uproszczenie, bo prawdziwy silnik zgodności jest odłożoną decyzją (Deferred, full weight), ale może mylić kogoś oczekującego realnej oceny przy dłuższym demo.
- Mapa zawsze pokazuje wszystkie trzy kraje z mocka, nawet jeśli producent zarejestrował się tylko do jednego z nich (funkcja 11); kontrakt URL nie przenosi dziś zarejestrowanych krajów dostawy.
- Brak jakiejkolwiek dalszej akcji oznacza, że producent o statusie warunkowym nie ma dziś nic do kliknięcia poza czytaniem listy braków; to celowo odłożone do funkcji 14.

**Neutral**:
- Nowy typ `ExportReadinessCountryStatus` jest celowo osobny od `EligibilityByCountry` (używanego po stronie klienta), mimo podobieństwa pól, bo ten drugi jest kluczowany prawdziwym `projectId`, którego szkic producenta nie ma.
- Trasa `/pl/producent/gotowosc-eksportowa` i kontrakt parametru `nazwa` pozostają bez zmian względem spec 0008; ta specyfikacja tylko wypełnia zaślepkę właściwą treścią.

## Follow-up

- [ ] Gdy funkcja 14 (domykanie luk) dostanie własną specyfikację, doda działanie na wierszu warunkowym (np. przycisk „Domknij luki"), którego ta specyfikacja świadomie nie zawiera.
- [ ] Rozważ, czy mapa gotowości powinna kiedyś zawężać się do krajów dostawy wybranych przy rejestracji (funkcja 11); dziś pokazuje zawsze wszystkie trzy kraje z mocka, bo kontrakt URL nie przenosi zarejestrowanych krajów. Wymagałoby to rozszerzenia parametrów przekazywanych z `ProjectWizard` przez stronę kreatora aż do tego ekranu.
- [ ] Gdy powstanie prawdziwy silnik zgodności (Deferred, full weight), ten statyczny mock zostanie zastąpiony rzeczywistą oceną per projekt i kraj; `ExportReadinessCountryStatus` prawdopodobnie połączy się wtedy z prawdziwym `projectId`.
