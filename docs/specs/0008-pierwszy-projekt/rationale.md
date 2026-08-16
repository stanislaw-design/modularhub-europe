# 0008. Pierwszy projekt (producent): rationale

## Context

Funkcja 12 w `docs/scope/scope.md` opisuje krótko: formularz z ośmioma polami technicznymi (układ ścian, izolacja, współczynniki przenikania ciepła, klasa okien, wentylacja, źródło ciepła, odporność ogniowa i wiatrowa) plus makieta wgrywania rzutów i zdjęć, bez realnego zapisu plików. „Done when” tej funkcji jest wąskie: wszystkie pola techniczne są w formularzu, pole wgrywania pokazuje wybrany plik bez trwałego zapisu, a zapisanie prowadzi do ekranu gotowości eksportowej (funkcja 13, jeszcze nie zaprojektowana).

Dokument wizji `flow-klienta-i-producenta.pdf` opisuje ten sam krok szerzej: producent wgrywa też cenę bazową, moce produkcyjne, wolne terminy i model 3D, a krok ma dodatkowo pasek postępu, podpowiedź przy każdym polu i możliwość dokończenia później, bo to (cytując dokument) „najtrudniejszy krok w całym onboardingu”. Między tymi dwoma źródłami jest realne napięcie: scope.md jest zatwierdzonym zakresem tego konkretnego przyrostu (Facade, ekran po ekranie), dokument wizji opisuje docelowy, pełny kształt produktu.

> ⚠️ Uwaga projektowa: cena bazowa, moce produkcyjne i wolne terminy z dokumentu wizji nie są dziś używane przez żadną zbudowaną funkcję (gotowość eksportowa ocenia tylko zgodność prawną per kraj, nie cenę ani moce; te pola naturalnie należą do funkcji 15, zapytania i oferty). Dodanie ich teraz byłoby rozszerzeniem zakresu bez odbiorcy. Zamawiający potwierdził węższą wersję ze scope.md podczas rozmowy projektowej; ta specyfikacja pomija cenę, moce, terminy i model 3D, zostawiając je jako przyszłą decyzję (patrz Follow-up).

Druga siła: istniejący typ `Project` w `lib/data/types.ts` już ma dokładnie te 8 pól technicznych, jako wolny tekst (nie enumy), używane dziś w danych przykładowych klienta (`lib/data/fixtures/projects.ts`). To, co producent wpisuje w tej funkcji, konceptualnie staje się kiedyś takim samym `Project`, tylko że dziś (Facade, bez bazy danych, patrz `AGENTS.md` sekcja Rules i Deferred, „Prawdziwy model danych i baza”) nie ma gdzie tego trwale zapisać. Bez żadnej nazwy, metrażu czy opisu formularz zebrałby dane, których nic po drugiej stronie (funkcja 13) nie miałoby jak sensownie zidentyfikować jako „ten projekt”.

Trzecia siła: `localStorage`, jedyny sposób na coś w rodzaju „dokończ później” bez backendu, nie potrafi zapisać obiektu `File` (danych binarnych) — to ograniczenie przeglądarki, nie decyzja projektowa. Każdy wariant z zapisem stanu w `localStorage` może więc odtworzyć tylko nazwę i rozmiar wcześniej wybranych plików, nigdy ich zawartość.

Czwarta siła: funkcja 13 (gotowość eksportowa) nie ma jeszcze własnej specyfikacji ani kodu. Zasada Facade tego projektu to pełny, klikalny interfejs; przycisk prowadzący donikąd (404) łamie tę zasadę.

## Options considered

### Option 1: Jeden długi formularz przewijany, bez zapisu stanu

Wszystkie pola techniczne i tożsamości na jednej stronie, jeden przycisk zapisu na dole, bez podziału na kroki i bez `localStorage`. Najbliżej dzisiejszego `RegistrationForm`.

**Pros**:
- Najmniej kodu, jeden komponent, wzorzec już znany w projekcie.
- Zero ryzyka związanego z serializacją stanu w przeglądarce.

**Cons**:
- Nie realizuje wprost tego, co dokument wizji nazywa najtrudniejszym krokiem onboardingu: trzynaście pól i dwa obszary wgrywania na raz, bez żadnego podziału, to realne ryzyko porzucenia formularza w połowie.
- Odświeżenie strony w połowie wypełniania kasuje wszystko, bez żadnej siatki bezpieczeństwa.

### Option 2: Kreator wieloetapowy z zapisem stanu w localStorage (wybrane)

Sześć kroków (Informacje podstawowe, Konstrukcja i izolacja, Instalacje i okna, Odporność, Pliki, Podsumowanie), nawigacja Dalej/Wstecz z walidacją per krok, wskaźnik postępu, podpowiedzi pod polami technicznymi. Stan (wartości pól plus nazwy i rozmiary wybranych plików, nigdy ich zawartość) zapisywany w `localStorage` po każdej zmianie; powrót do tej samej przeglądarki wznawia od ostatniego kroku bez pytania.

**Pros**:
- Dzieli trudny formularz na małe, zrozumiałe kawałki, zgodnie wprost z opisem dokumentu wizji.
- Realna ochrona przed utratą pracy przy odświeżeniu albo zamknięciu karty, bez żadnej nowej infrastruktury backendowej.
- Ustala reużywalny wzorzec makiety uploadu (`FileUpload`) i wzorzec kreatora wieloetapowego dla przyszłych funkcji producenta.

**Cons**:
- Więcej kodu niż formularz jednoekranowy: sześć komponentów kroków, logika wskaźnika postępu, warstwa `localStorage` z bezpiecznym parsowaniem uszkodzonego stanu.
- `localStorage` nie odtwarza treści plików po wznowieniu, tylko ich nazwy; wymaga jasnego komunikatu w UI, żeby producent nie pomyślał, że plik nadal jest „aktywny”.

### Option 3: Kreator wieloetapowy bez trwałości między wizytami

Ten sam podział na kroki i wskaźnik postępu co w opcji 2, ale stan żyje tylko w pamięci komponentu (jak dziś `InquiryFlow` czy `PlotDossierPanel`), znika przy odświeżeniu.

**Pros**:
- Ten sam podział trudnego formularza na kroki, bez ryzyka związanego z serializacją stanu w przeglądarce.
- Mniej kodu niż opcja 2 (brak warstwy `localStorage`).

**Cons**:
- Nie realizuje wprost „możliwości dokończenia później” z dokumentu wizji, mimo że zamawiający chciał to zachować jako realną funkcję, nie tylko podział na kroki.
- Odświeżenie w połowie sześcioetapowego formularza nadal kasuje wszystko — dokładnie problem, którego podział na kroki miał uniknąć.

## Rationale

Option 2 wygrywa, bo jako jedyna odpowiada na obie części opisu „najtrudniejszego kroku onboardingu” z dokumentu wizji: podział na kroki (wspólny z opcją 3) i realną możliwość dokończenia później (czego opcja 3 świadomie nie robi). Zamawiający wybrał to wprost podczas rozmowy projektowej, mimo mojej wstępnej rekomendacji pominięcia zapisu stanu jako zbędnego dla etapu Facade: dodatkowy koszt budowy jest niewielki (jedna cienka warstwa nad `localStorage`, bez nowej infrastruktury), a korzyść (brak utraty trzynastu pól przy przypadkowym odświeżeniu) jest realna dla tak długiego formularza.

Option 1 (jeden formularz) odrzucona, bo zostawiłaby najtrudniejszy krok onboardingu bez żadnego z dwóch wzmocnień, o które prosi dokument wizji, mimo że koszt ich dodania (opcja 2) jest umiarkowany. Ograniczenie `localStorage` (brak treści plików po wznowieniu, patrz Context) jest wspólne dla każdego wariantu z zapisem stanu, więc nie różnicuje opcji 2 i 3 — jest to udokumentowane wprost w Consequences głównej specyfikacji, żeby przyszły czytelnik kodu nie uznał tego za przeoczenie.

`sessionStorage` był rozważony jako sposób na wyeliminowanie skutku ubocznego opcji 2 (dwie karty tej samej przeglądarki dzielące jeden szkic, patrz Consequences), przy tym samym koszcie budowy. Odrzucony: `sessionStorage` czyści się przy zamknięciu karty, więc nie spełniłby wprost potwierdzonego wymagania „wznawia po ponownym otwarciu karty w tej samej przeglądarce”, tylko węższe „przeżywa odświeżenie tej samej karty”. Skutek uboczny wielu kart adresowany osobno: klucz zapisu zawiera `nip` producenta (patrz Feature design, Key invariants), więc przynajmniej różni producenci w tej samej przeglądarce nigdy nie dzielą jednego szkicu; ten sam producent w dwóch kartach naraz nadal dzieli jeden zapis, co pozostaje udokumentowanym kompromisem, nie błędem.
