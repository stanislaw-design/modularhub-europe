# 0010. Domykanie luk (producent): ekran wyboru i mockowa płatność

**Date**: 2026-08-16
**Status**: In Progress

## Summary

Dziś kraj o statusie "warunkowo dopuszczony" na mapie gotowości eksportowej (funkcja 13) pokazuje tylko listę braków, bez żadnej dalszej akcji. Ta specyfikacja dodaje przycisk "Domknij luki" na takim wierszu, prowadzący do nowego ekranu z dwiema drogami: samodzielne wgranie dokumentów (makieta, bez trwałego zapisu) albo zakup pakietu (mockowa płatność, ten sam wzorzec co analiza działki klienta). Tylko zakup pakietu "rozwiązuje" kraj: zapisuje to w przeglądarce (localStorage), więc po powrocie na mapę kraj pokazuje się jako dopuszczony.

## Requirements

**User stories**:
- Jako producent patrzący na kraj ze statusem warunkowym, chcę mieć jasną akcję do zrobienia zamiast tylko czytać listę braków.
- Jako producent, który nie chce płacić, chcę móc samodzielnie zadeklarować, że wgrywam brakujące dokumenty.
- Jako producent, który chce szybciej domknąć sprawę, chcę móc kupić gotowy pakiet i zobaczyć, że kraj jest teraz dopuszczony.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Rozwinięty wiersz kraju o statusie warunkowym (dziś Niemcy) pokazuje pod listą braków przycisk "Domknij luki", prowadzący do `/producent/domykanie-luk` z parametrami `kraj` (kod ISO kraju) i `nazwa` (jeśli była obecna w URL mapy). Wiersze o statusie dopuszczone/niedopuszczone nigdy nie pokazują tego przycisku.
- **AC-2**: Wejście na `/producent/domykanie-luk` z prawidłowym `kraj` o statusie warunkowym pokazuje nagłówek z nazwą kraju (i nazwą projektu, jeśli `nazwa` była podana), to samo stałe zastrzeżenie prawne co na mapie gotowości eksportowej, i dwie sekcje jedna pod drugą: "Wgraj dokumenty samodzielnie" oraz "Kup pakiet domknięcia luk".
- **AC-3**: Brak parametru `kraj`, nieznany kod kraju, albo kod kraju o statusie innym niż warunkowy przekierowuje łagodnie z powrotem na `/gotowosc-eksportowa` (zachowując `nazwa`, jeśli była podana), nigdy nie pokazuje błędu.
- **AC-4**: Sekcja samodzielnego wgrania pokazuje jedno wspólne pole wgrywania plików (ten sam komponent i makieta co w kreatorze projektu, funkcja 12) i przycisk "Wyślij", nieaktywny dopóki nie wybrano co najmniej jednego pliku.
- **AC-5**: Kliknięcie "Wyślij" pokazuje komunikat potwierdzenia ("Dokumenty przesłane do weryfikacji") i link powrotny do mapy gotowości eksportowej. Ta ścieżka niczego nie zapisuje: status kraju na mapie pozostaje bez zmian.
- **AC-6**: Sekcja zakupu pakietu pokazuje cenę (stała `PLOT_ANALYSIS_PRICE_EUR`, ta sama co analiza działki klienta, funkcja 8) i przycisk "Zapłać", z fazami idle → paying (spinner, `aria-live="polite"`) → result, wzorem `PlotAnalysisRow`.
- **AC-7**: Faza result po zakupie pokazuje status "Dopuszczone" z tekstem potwierdzenia i zapisuje kod kraju jako rozwiązany w localStorage pod jednym, stałym, globalnym kluczem (bez powiązania z NIP producenta).
- **AC-8**: Po powrocie na `/gotowosc-eksportowa` kraj zapisany jako rozwiązany w localStorage renderuje się jako status dopuszczony (bez akordeonu, z zastępczym uzasadnieniem), niezależnie od tego, że `getExportReadiness()` pod spodem wciąż zwraca ten sam stały mock ze statusem warunkowym. Ten stan istnieje tylko w danej przeglądarce.
- **AC-9**: Wejście na `/producent/domykanie-luk` dla kraju już zapisanego jako rozwiązany pokazuje krótki komunikat informacyjny zamiast obu sekcji, z linkiem powrotnym do mapy.
- **AC-10**: Uszkodzony, nieczytelny albo niedostępny zapis localStorage (np. tryb prywatny) jest po cichu ignorowany: odczyt traktuje to jak brak rozwiązanych krajów, zapis po cichu pomija tę jedną aktualizację. Żadna z dwóch ścieżek nigdy nie blokuje pracy ani nie pokazuje błędu.
- **AC-11**: WCAG 2.2 AA: dokładnie jeden prawdziwy H1 na `/producent/domykanie-luk`, logiczna kolejność fokusa, status przekazywany ikoną i tekstem (nigdy samym kolorem), faza "paying" ogłoszona przez `aria-live`, spójne z `PlotAnalysisRow` i `ExportReadinessCountryRow`.

## Decision

**Chosen option**: Option 1, ekran dwóch sekcji jedna pod drugą, z globalnym (bez NIP) zapisem w localStorage tylko dla ścieżki zakupu pakietu.

**Implementation skills**: `nextjs-app-router-patterns` (`.agents/skills/nextjs-app-router-patterns/`) · `lucide-icons` (`.agents/skills/lucide-icons/`) · `vitest` (`.agents/skills/vitest/`)

## Rationale

Pełne uzasadnienie i porównanie opcji: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
- Brak nowej encji w `lib/data/`. Ekran czyta istniejący `ExportReadinessCountryStatus` (ma już `gaps: string[]`) przez istniejące `getExportReadiness()` i `getCountries()`.
- Nowy, wyłącznie przeglądarkowy zapis (nie `lib/data`, nie serwer): jeden klucz `producent:domykanie-luk:rozwiazane` w localStorage, wartość `CountryCode[]` — płaska lista kodów krajów rozwiązanych zakupem pakietu. Świadomie bez NIP (patrz Rationale).
- Nowy moduł `lib/gap-closure.ts`, wzorem `lib/producer-project-draft.ts` (fail soft, `typeof window === "undefined"` guard, `try/catch` na każdym odczycie/zapisie):
  - `isCountryResolved(countryCode: CountryCode): boolean`
  - `markCountryResolved(countryCode: CountryCode): void`
  - (wewnętrznie: `loadResolvedCountries()`, stały klucz storage)
- Stan wybranych plików (upload) i fazy płatności (idle/paying/result) to `useState` lokalny w nowych komponentach klienckich, dokładnie jak w `PlotAnalysisRow` — bez nowego typu w `lib/data/types.ts`.

**State transitions**:
- Sekcja upload: `idle` (brak plików) → pliki wybrane → `submitted` (komunikat potwierdzenia). Stan czysto komponentowy, resetuje się przy nawigacji, nigdy nie dotyka localStorage.
- Sekcja pakiet: `idle` → `paying` (1200 ms opóźnienia, jak `PlotAnalysisRow`) → `result` (status "Dopuszczone", zapis `markCountryResolved`).

**API surface**:
| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| URL → ekran domykania luk | Klik "Domknij luki" na mapie, albo bezpośredni URL | `kraj` (wymagany), `nazwa` (opcjonalny) | Dwie sekcje wyboru, albo komunikat "już rozwiązane" (AC-9) | Brak | Brak/nieznany/niewarunkowy `kraj` → redirect na mapę (satisfies AC-3) |
| "Wyślij" (sekcja upload) | Klik / Enter | Lista wybranych plików (`MockUploadedFile[]`, min. 1) | Komunikat potwierdzenia | Brak | Zero plików → przycisk nieaktywny (satisfies AC-4) |
| "Zapłać" (sekcja pakiet) | Klik / Enter | Brak | Faza paying → result, zapis do localStorage | Brak | Zapis localStorage nieudany → po cichu pomijany, ekran i tak pokazuje wynik (satisfies AC-10) |

**Key invariants**:
- Przycisk "Domknij luki" istnieje wyłącznie dla wiersza o `entry.status === "conditional"`, tylko w stanie rozwiniętym; nigdy dla `approved`/`blocked`.
- `lib/gap-closure.ts` jest jedynym miejscem odczytu/zapisu klucza `producent:domykanie-luk:rozwiazane`; klucz nigdy nie zawiera NIP (płaski, świadomie, patrz Rationale).
- Ścieżka samodzielnego wgrania nigdy nie zapisuje do localStorage i nigdy nie zmienia statusu widocznego na mapie; tylko zakup pakietu to robi.
- `getExportReadiness()` pozostaje niezmienionym, statycznym mockiem; "rozwiązanie" kraju żyje wyłącznie w localStorage czytanym po stronie klienta, nigdy nie modyfikuje danych źródłowych.

**Security model**:
Brak logowania i autoryzacji, spójnie z resztą etapu Facade. Brak danych wrażliwych: nazwy mockowych plików i kod kraju nie są nigdzie wysyłane. Zapis w localStorage jest lokalny dla przeglądarki producenta, niewidoczny dla nikogo innego.

**Configuration required**:
Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path (upload): rozwinięcie wiersza Niemiec na mapie, klik "Domknij luki", wybór pliku, klik "Wyślij" pokazuje potwierdzenie; powrót na mapę pokazuje Niemcy nadal jako warunkowe, weryfikuje **AC-1**, **AC-2**, **AC-4**, **AC-5**.
- Happy path (pakiet): z tego samego ekranu klik "Zapłać" w sekcji pakietu przechodzi idle → paying → result, pokazuje "Dopuszczone"; powrót na mapę pokazuje Niemcy jako dopuszczone, weryfikuje **AC-6**, **AC-7**, **AC-8**.
- Failure case: wejście na `/producent/domykanie-luk?kraj=PL` (status dopuszczone, nie warunkowy) przekierowuje na mapę bez błędu, weryfikuje **AC-3**.
- Auth/permission: nie dotyczy (brak logowania); zamiast tego dostępność: nawigacja klawiaturą przez obie sekcje, `aria-live` ogłasza fazę paying, weryfikuje **AC-11**.

## Build plan

1. [x] Zbuduj `lib/gap-closure.ts`: stały klucz storage, `isCountryResolved()`, `markCountryResolved()`, fail soft wzorem `lib/producer-project-draft.ts`, satisfies **AC-7**, **AC-8**, **AC-10**
2. [x] Przeprowadź `locale` przez `app/[locale]/producent/gotowosc-eksportowa/page.tsx` → `ExportReadinessMap` → `ExportReadinessCountryRow`; dodaj przycisk "Domknij luki" (tylko rozwinięty wiersz warunkowy) budujący href z `kraj`/`nazwa`; dodaj w `ExportReadinessCountryRow` odczyt `isCountryResolved()` po stronie klienta, nadpisujący wyświetlany status na dopuszczony, satisfies **AC-1**, **AC-8**
3. [x] Zbuduj `app/[locale]/producent/domykanie-luk/page.tsx`: parsuj `kraj`/`nazwa`, pobierz `getCountries()` i `getExportReadiness()`, znajdź wiersz; brak/nieznany/niewarunkowy `kraj` → łagodny redirect na `/gotowosc-eksportowa` (zachowując `nazwa`), satisfies **AC-2**, **AC-3**
4. [x] Zbuduj `components/producent/GapClosureView.tsx` (kliencki): nagłówek, stałe zastrzeżenie prawne, sprawdzenie `isCountryResolved()` po zamontowaniu (już rozwiązany → krótki komunikat zamiast obu sekcji), w przeciwnym razie renderuje obie sekcje, satisfies **AC-2**, **AC-9**
5. [x] Zbuduj `components/producent/GapClosureUploadSection.tsx` (kliencki): pole wgrywania plików (reużywa `FileUpload`), przycisk "Wyślij" nieaktywny przy zero plikach, komunikat potwierdzenia i link powrotny, satisfies **AC-4**, **AC-5**
6. [x] Zbuduj `components/producent/GapClosurePackageSection.tsx` (kliencki): cena z `PLOT_ANALYSIS_PRICE_EUR`, przycisk "Zapłać", fazy idle/paying/result wzorem `PlotAnalysisRow`; w fazie result woła `markCountryResolved()`, satisfies **AC-6**, **AC-7**
7. [x] Przejście dostępności: jeden H1, `aria-live` na fazie paying, kolejność fokusa, weryfikacja WCAG 2.2 AA na całym ekranie, satisfies **AC-11**

## Consequences

**Positive**:
- Domyka follow-up zostawiony w spec [0009](../0009-gotowosc-eksportowa/index.md): wiersz warunkowy dostaje wreszcie działanie.
- Reużywa cztery już ustalone wzorce bez nowych zależności: `FileUpload` (funkcja 12), payment mock idle/paying/result i stała cena z `lib/pricing.ts` (funkcja 8, funkcja 6), localStorage fail soft (funkcja 12), `StatusPill` plus akordeon (funkcja 13).
- Asymetria "tylko zakup zmienia status" jest czytelna i celowa: samodzielne wgranie to deklaracja bez weryfikacji, zakup pakietu to (mockowa) gwarancja wyniku.

**Negative / tradeoffs**:
- Zapis w localStorage jest globalny, nie po NIP: jeśli w tej samej przeglądarce zarejestruje się inny producent, zobaczy ten sam kraj już "rozwiązany". Świadomy kompromis: mapa gotowości eksportowej dziś i tak nie ma żadnej relacji do tożsamości producenta (spec 0009, Feature design), więc dowiązanie zapisu do NIP wymagałoby osobno rozszerzać ten kontrakt.
- Status "dopuszczone" po zakupie pakietu to czysto kosmetyczna zmiana w przeglądarce, nie prawdziwa ocena zgodności — może mylić przy dłuższym demo, tak samo jak reszta silnika zgodności (Deferred, full weight).
- Ścieżka samodzielnego wgrania nie prowadzi do żadnej weryfikacji ani zmiany statusu; użytkownik może się zdziwić, że "wysłanie dokumentów" nic nie zmienia na mapie, w odróżnieniu od zakupu pakietu.
- Ekran `/producent/domykanie-luk` sprawdza `isCountryResolved()` dopiero po zamontowaniu komponentu klienckiego: przy pierwszym renderze może na moment mignąć pełny widok z dwiema sekcjami, zanim przełączy się na komunikat "już rozwiązane". Akceptowalne w tym etapie Facade.

**Neutral**:
- `lib/gap-closure.ts` to pierwszy moduł w projekcie, gdzie stan zapisany w localStorage wpływa na renderowanie ekranu innego niż ten, który go zapisał (dotąd `producer-project-draft.ts` czytał tylko sam siebie w kreatorze). Wzorzec zapisu zostaje ten sam (fail soft, jeden klucz), zmienia się tylko to, że odczyt (`ExportReadinessCountryRow`) i zapis (`GapClosurePackageSection`) żyją w różnych komponentach.

## Follow-up

- [ ] Gdy powstanie prawdziwy silnik zgodności (Deferred, full weight, patrz `docs/scope/scope.md`), ten mechanizm localStorage zostanie zastąpiony rzeczywistym zapisem stanu domknięcia luk per producent i kraj.
- [ ] Jeśli mapa gotowości eksportowej (funkcja 13) kiedyś zyska relację do tożsamości producenta (już odnotowane jako otwarte w spec 0009, Follow-up), rozważ przeniesienie tego zapisu na klucz po NIP zamiast globalnego.
