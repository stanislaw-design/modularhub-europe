# 0008. Pierwszy projekt (producent): kreator wieloetapowy z zapisem stanu

**Date**: 2026-08-14
**Status**: Proposed

## Summary

Po rejestracji producent trafia od razu do kreatora dodawania pierwszego projektu, zamiast dzisiejszego ekranu „formularz pojawi się później”. Kreator ma sześć kroków: dane podstawowe, dwa kroki pól technicznych, odporność, wgrywanie rzutów i zdjęć (makieta, bez realnego zapisu plików) i podsumowanie. Postęp jest zapisywany w przeglądarce, więc powrót do niedokończonego projektu wznawia go od ostatniego kroku. Po zapisaniu producent trafia na nowy, na razie zaślepkowy ekran gotowości eksportowej, który funkcja 13 rozbuduje później.

## Requirements

**User stories**:
- Jako producent, który właśnie się zarejestrował, chcę od razu przejść do dodawania mojego pierwszego projektu, żeby nie tracić czasu na dodatkowy ekran pośredni.
- Jako producent wypełniający długi, techniczny formularz, chcę widzieć, ile kroków zostało i co dokładnie oznacza każde pole, żeby nie zgubić się w żargonie budowlanym.
- Jako producent, który musiał przerwać wypełnianie (np. sprawdzić dokumentację techniczną), chcę wrócić do tego samego miejsca w formularzu bez wypełniania wszystkiego od nowa.
- Jako producent wgrywający rzuty i zdjęcia, chcę zobaczyć listę tego, co wybrałem, i móc usunąć pojedynczy plik przed zapisaniem.
- Jako producent na ostatnim kroku, chcę zobaczyć podsumowanie wszystkiego, co wpisałem, zanim faktycznie zapiszę projekt.

**Acceptance criteria** (kontrakt, każde kryterium sprawdzalne osobno):
- **AC-1**: Wejście na `/pl/producent/projekt` z prawidłowymi parametrami rejestracji (te same `nip`/`countries`/`technology` co dziś, `parseRegistrationDetails` bez zmian) pokazuje od razu kreator pierwszego projektu, z krótkim jednowierszowym paskiem potwierdzenia rejestracji na górze (NIP, kraje dostawy, technologia) zamiast dzisiejszego osobnego ekranu `RegistrationConfirmation`. Brak albo nieprawidłowe parametry nadal przekierowują do `/pl/producent`.
- **AC-2**: Kreator ma sześć kroków w stałej kolejności: Informacje podstawowe, Konstrukcja i izolacja, Instalacje i okna, Odporność, Pliki, Podsumowanie, z widocznym wskaźnikiem postępu pokazującym wszystkie kroki i aktualny krok.
- **AC-3**: Nawigacja jest sekwencyjna: „Dalej” przechodzi do kolejnego kroku tylko gdy bieżący krok ma wypełnione wszystkie wymagane pola; kliknięcie już ukończonego kroku na wskaźniku postępu albo „Wstecz” cofa bez utraty wpisanych danych; kroki jeszcze nieosiągnięte nie są klikalne.
- **AC-4**: Krok „Informacje podstawowe” zawiera: nazwę projektu, metraż (m²), liczbę sypialni, kraj produkcji (lista z `getCountries()`) i opis — wszystkie wymagane.
- **AC-5**: Krok „Konstrukcja i izolacja” zawiera układ ścian, izolację i współczynniki przenikania ciepła; krok „Instalacje i okna” zawiera klasę okien, wentylację i źródło ciepła; krok „Odporność” zawiera odporność ogniową i odporność wiatrową. Wszystkie osiem pól technicznych jest wymagane, każde z krótką podpowiedzią wyjaśniającą pod polem.
- **AC-6**: Krok „Pliki” ma dwa niezależne obszary wgrywania, rzuty i zdjęcia; każdy przyjmuje wiele plików naraz i pokazuje listę wybranych plików (nazwa, rozmiar) z możliwością usunięcia pojedynczego pliku. Żaden plik nie jest faktycznie zapisywany ani wysyłany (makieta). Każdy obszar wymaga co najmniej jednego pliku, by przejść dalej.
- **AC-7**: Krok „Podsumowanie” pokazuje tylko do odczytu wszystkie wpisane wartości i nazwy wszystkich wybranych plików, pogrupowane według poprzednich kroków, z przyciskiem „Zapisz projekt”.
- **AC-8**: Po każdej zmianie pola albo listy plików stan kreatora (wartości pól i wyłącznie nazwa/rozmiar plików, nigdy ich zawartość) jest zapisywany w `localStorage` razem z numerem aktualnego kroku. Ponowne wejście na `/pl/producent/projekt` w tej samej przeglądarce z zapisanym stanem otwiera kreator od razu na ostatnio osiągniętym kroku, z zachowanymi danymi, bez pytania. Uszkodzony albo nieczytelny zapisany stan jest po cichu odrzucany, kreator startuje pusty zamiast pokazać błąd.
- **AC-9**: Kliknięcie „Zapisz projekt” na kroku Podsumowanie czyści zapisany stan z `localStorage` i przenosi na `/pl/producent/gotowosc-eksportowa?nazwa=<nazwa projektu>`.
- **AC-10**: Pod `/pl/producent/gotowosc-eksportowa` istnieje minimalny ekran (zaślepka funkcji 13, nie jej pełna treść): nagłówek z przekazaną nazwą projektu i krótka informacja, że mapa gotowości eksportowej per kraj pojawi się w kolejnym etapie budowy. Brak parametru `nazwa` pokazuje ten sam ekran z ogólnym nagłówkiem, nigdy błąd.
- **AC-11**: Kreator spełnia WCAG 2.2 AA: dokładnie jeden prawdziwy H1 (na poziomie strony, nie per krok), logiczna kolejność fokusa w obrębie każdego kroku, wskaźnik postępu i lista wgranych plików w pełni obsługiwane klawiaturą z odpowiednimi rolami/etykietami ARIA (np. `aria-current="step"` na aktywnym kroku), widoczny fokus na każdym elemencie interaktywnym.

## Decision

**Chosen option**: Option 2, kreator wieloetapowy z zapisem stanu w `localStorage`.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`) · `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`)

## Rationale

Pełne uzasadnienie, porównanie opcji i kontekst: patrz [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
- Nowy `ProjectDraft` w `lib/data/types.ts` (stan wyłącznie kliencki, nigdy zapisany na serwerze): `{ name: string; floorAreaM2: number | null; bedrooms: number | null; countryOfProduction: CountryCode | null; description: string; wallBuildUp: string; insulation: string; heatTransferCoefficients: string; windowClass: string; ventilation: string; heatSource: string; fireResistance: string; windResistance: string; floorPlanFiles: MockUploadedFile[]; photoFiles: MockUploadedFile[] }`. Nazwy i typy ośmiu pól technicznych dobrane jeden do jednego z istniejącym `Project`, żeby przyszłe podłączenie prawdziwego zapisu mogło zmapować bez przepisywania formularza.
- Nowy `MockUploadedFile` w `lib/data/types.ts`: `{ name: string; sizeBytes: number }`. Reprezentuje wybrany plik bez jego treści; reużywalny przez przyszłe funkcje uploadu (np. funkcja 14).
- Zapisany stan w `localStorage` (poza `ProjectDraft`): `{ draft: ProjectDraft; step: number }` pod kluczem zawierającym `nip` producenta (np. `producent:${nip}:projekt-szkic`), nie pod jednym stałym kluczem dla wszystkich — patrz Key invariants.

**Podpowiedzi pod polami technicznymi** (treść, nie tylko wymóg AC-5):
| Pole | Podpowiedź |
|---|---|
| Układ ścian | Warstwy ściany od zewnątrz do wewnątrz, np. konstrukcja, izolacja, poszycie |
| Izolacja | Współczynnik U dla ścian i dachu (W/m²K) |
| Współczynniki przenikania ciepła | Współczynniki U dla okien i drzwi (W/m²K) |
| Klasa okien | Klasa energetyczna i typ szyby |
| Wentylacja | Typ wentylacji, np. mechaniczna z odzyskiem ciepła |
| Źródło ciepła | Główne źródło ogrzewania, np. pompa ciepła |
| Odporność ogniowa | Klasa odporności ogniowej konstrukcji, np. REI 30 |
| Odporność wiatrowa | Strefa wiatrowa i maksymalna prędkość wiatru |

**State transitions**:
- Kreator jako całość: `nierozpoczęty` → `w trakcie` (kroki 1 do 6, po każdej zmianie zapisywany w `localStorage`) → `zapisany` (po „Zapisz projekt”: stan czyszczony z `localStorage`, nawigacja do zaślepki gotowości eksportowej). Jednokierunkowo, bez powrotu do „w trakcie” po zapisaniu.
- Krok pojedynczy: `nieosiągnięty` → `bieżący` → `ukończony`; „Dalej” wymaga przejścia bieżącego kroku z `bieżący` na `ukończony` (patrz Key invariants).

**API surface** (interfejs stron, brak backendu, ten sam wzorzec co w spec 0004 do 0007):

| Interfejs | Wyzwalacz | Kluczowe wejścia | Wyjście | Autoryzacja | Kluczowe błędy |
|---|---|---|---|---|---|
| URL → kreator | Nawigacja z rejestracji albo bezpośredni URL | `nip`/`countries`/`technology` (jak dziś, wymagane) | Kreator na zapisanym albo pierwszym kroku | Brak | Nieprawidłowe/brakujące parametry → redirect do `/pl/producent` (satisfies AC-1) |
| Pola kroku | Wpisanie/wybór wartości | Wartość pola (string/number/CountryCode) | Aktualizacja `ProjectDraft`, zapis w `localStorage` | Brak | Puste wymagane pole blokuje „Dalej” tego kroku (satisfies AC-3, AC-4, AC-5) |
| Obszar wgrywania (`FileUpload`) | Wybór plików / usunięcie pliku z listy | Lista plików przeglądarki | Aktualizacja `floorPlanFiles`/`photoFiles` (tylko `name`/`sizeBytes`) | Brak | Pusta lista w dowolnym obszarze blokuje „Dalej” kroku Pliki (satisfies AC-6) |
| „Dalej” / „Wstecz” / klik kroku na wskaźniku | Klik (kliencki, bez przeładowania) | Numer docelowego kroku | Zmiana `step`, zapis w `localStorage` | Brak | Klik nieosiągniętego kroku niemożliwy (element nieklikalny) (satisfies AC-3) |
| „Zapisz projekt” (krok Podsumowanie) | Submit | Kompletny `ProjectDraft` | Czyszczenie `localStorage`, nawigacja do `/pl/producent/gotowosc-eksportowa?nazwa=<nazwa>` | Brak | Nieaktywne, dopóki którykolwiek krok jest niekompletny (satisfies AC-7, AC-9) |
| URL → zaślepka gotowości eksportowej | Nawigacja po zapisaniu albo bezpośredni URL | `nazwa` (opcjonalny) | Ekran zaślepki z nagłówkiem | Brak | Brak `nazwa` → ogólny nagłówek zamiast błędu (satisfies AC-10) |

**Key invariants**:
- Każde pole i każda lista plików należy do dokładnie jednego z sześciu kroków; krok jest „ukończony” wtedy i tylko wtedy, gdy wszystkie jego wymagane pola są niepuste, a wymagane listy plików niepuste.
- Wejście na krok N wymaga, by krok N‑1 był „ukończony” (poza swobodnym powrotem do kroków już ukończonych); ten warunek dotyczy tylko kroków 2 do 6, krok 1 jest zawsze dostępny.
- `floorAreaM2` to liczba dodatnia w rozsądnym zakresie domu modułowego (np. 20 do 500 m²); `bedrooms` to liczba całkowita nieujemna (np. 0 do 10). Poza zakresem blokuje „Dalej” tego kroku tak samo jak pole puste.
- `floorPlanFiles`/`photoFiles` przechowują wyłącznie `{ name, sizeBytes }`, nigdy referencję do obiektu `File` ani jego zawartości (ograniczenie serializacji `localStorage`, patrz Consequences).
- Zapisany stan w `localStorage` jest kluczowany kluczem zawierającym `nip` producenta z bieżących parametrów rejestracji, nie jednym stałym kluczem: druga rejestracja (inny NIP) w tej samej przeglądarce nigdy nie wznawia szkicu poprzedniego producenta. W obrębie tego samego `nip` nowy zapis nadpisuje poprzedni, nigdy nie dopisuje osobnego wpisu.
- Zapisany stan jest usuwany dokładnie raz, w momencie udanego „Zapisz projekt”, nigdy wcześniej i nigdy automatycznie po czasie.
- Zapis do `localStorage` jest opakowany w bezpieczną próbę (`try`/`catch`); nieudany zapis (np. przekroczony limit magazynu, tryb prywatny) nigdy nie blokuje dalszej pracy w kreatorze, tylko po cichu pomija tę jedną aktualizację, tak samo fail soft jak odczyt uszkodzonego stanu.

**Security model**:
Brak logowania, spójnie z resztą etapu Facade. Wszystkie dane formularza żyją wyłącznie w `localStorage` tej przeglądarki; jedyna wartość, która opuszcza kreator, to nazwa projektu przekazana w parametrze URL do zaślepki gotowości eksportowej, tym samym mechanizmem co dziś `country`/`sizeMin`/`sizeMax` między stronami klienta. Brak zakresu zgodności regulacyjnej: żadne dane wrażliwe (płatnicze, tożsamościowe) nie są tu zbierane.

**Configuration required**:
Brak nowych zmiennych środowiskowych.

**Critical test scenarios** (każdy odwołuje się do kryterium z Requirements):
- Happy path: wypełnij wszystkie sześć kroków, dodaj co najmniej jeden plik w każdym obszarze na kroku Pliki, zobacz poprawne podsumowanie, kliknij „Zapisz projekt”, trafiasz na zaślepkę gotowości eksportowej z nazwą projektu w nagłówku, sprawdza **AC-2** do **AC-10**.
- Failure case: odśwież stronę w połowie wypełniania (np. po kroku 3) — ponowne wejście otwiera kreator na kroku 4 z zachowanymi danymi z kroków 1 do 3, sprawdza **AC-8**.
- Failure case: ręcznie uszkodzony/niekompatybilny zapis w `localStorage` nie powoduje błędu strony, kreator startuje od kroku 1 z pustym stanem, sprawdza **AC-8**.
- Failure case: próba kliknięcia „Dalej” z pustym wymaganym polem pokazuje walidację inline i nie przechodzi dalej, sprawdza **AC-3**, **AC-5**.
- Auth/permission: bezpośrednie wejście na `/pl/producent/projekt` bez parametrów rejestracji przekierowuje do `/pl/producent`, żaden krok kreatora nigdy nie jest widoczny, sprawdza **AC-1**.

## Build plan

1. Dodaj `ProjectDraft` i `MockUploadedFile` do `lib/data/types.ts`, satisfies **AC-4**, **AC-5**, **AC-6**
2. Zbuduj `lib/producer-project-draft.ts`: pusty stan początkowy, definicja sześciu kroków z przypisanymi polami, teksty podpowiedzi per pole techniczne, funkcje kompletności kroku, oraz `loadDraft()`/`saveDraft()`/`clearDraft()` na `localStorage` z bezpiecznym parsowaniem (uszkodzony zapis zwraca `null`), satisfies **AC-3**, **AC-5**, **AC-8**
3. Zbuduj reużywalny `components/ui/FileUpload.tsx`: obszar wgrywania (natywny `input[type=file] multiple`), lista wybranych plików z usuwaniem pojedynczych, kontrolowany przez `MockUploadedFile[]`, bez zapisu treści plików, z widocznym komunikatem, że to makieta — ustala wzorzec uploadu wymagany przez funkcję 12, satisfies **AC-6**
4. Zbuduj `components/producent/ProjectWizard.tsx` (kliencki) i jego sześć komponentów kroków, renderujące pola z AC-4/AC-5/AC-6: wskaźnik postępu, nawigacja Dalej/Wstecz z walidacją per krok, wczytanie zapisanego stanu przy montowaniu, zapis do `localStorage` po każdej zmianie, krok Podsumowanie tylko do odczytu, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**
5. Przepisz `app/[locale]/producent/projekt/page.tsx`: zachowaj istniejącą walidację parametrów rejestracji i przekierowanie, zamień `RegistrationConfirmation` na jednowierszowy pasek potwierdzenia plus `ProjectWizard`; usuń `components/producent/RegistrationConfirmation.tsx` i `RegistrationConfirmation.test.tsx`, które ten krok czyni martwym kodem, satisfies **AC-1**
6. Zbuduj `app/[locale]/producent/gotowosc-eksportowa/page.tsx` (serwerowy, zaślepka): parsuje opcjonalny parametr `nazwa`, pokazuje nagłówek i krótką informację „w przygotowaniu”, satisfies **AC-10**
7. Dopisz akcję „Zapisz projekt” na kroku Podsumowanie: czyszczenie zapisanego stanu i nawigacja do `/pl/producent/gotowosc-eksportowa?nazwa=...`, satisfies **AC-9**
8. Przejście dostępności: jeden H1, kolejność fokusa per krok, `aria-current="step"` na wskaźniku postępu, etykiety ARIA na liście plików, weryfikacja WCAG 2.2 AA, satisfies **AC-11**

## Consequences

**Positive**:
- Realizuje dosłownie „Done when” funkcji 12 ze scope.md, bez rozszerzania o cenę, moce produkcyjne, terminy ani model 3D z dokumentu wizji, które i tak nie są dziś używane przez żadną zbudowaną funkcję.
- Ustala pierwszy w projekcie wzorzec makiety uploadu (`FileUpload`) i wzorzec kreatora wieloetapowego, gotowe do reużycia przez przyszłe funkcje producenta (np. funkcja 14, domykanie luk).
- Kreator z podpowiedziami i paskiem postępu odpowiada wprost na opis dokumentu wizji tego kroku jako najtrudniejszego w całym onboardingu.
- Zapis w `localStorage` daje realną ochronę przed utratą pracy bez żadnej nowej infrastruktury backendowej.

**Negative / tradeoffs**:
- `localStorage` przechowuje tylko nazwy i rozmiary plików, nigdy ich treść; po wznowieniu przerwanego szkicu producent widzi, że pliki były wybrane, ale musi wybrać je ponownie, zanim będą aktywne w tej wizycie. To ograniczenie przeglądarki, nie luka w implementacji, ale wymaga jasnego komunikatu w UI (build plan krok 3 i 4).
- Dane wpisane w kreatorze nigdy nie stają się prawdziwym `Project` używanym po stronie klienta; to świadomie osobny, tymczasowy model, zgodny z odłożoną decyzją o prawdziwym modelu danych i bazie.
- Ekran gotowości eksportowej zbudowany tu jest tylko zaślepką; funkcja 13 musi go zastąpić właściwą treścią (mapa krajów, listy braków), nie tylko go rozbudować.
- Dwie karty tej samej przeglądarki współdzielą jeden zapisany stan (jeden klucz `localStorage`): otwarcie kreatora w drugiej karcie przejmuje/nadpisuje ten sam szkic zamiast działać niezależnie.

**Neutral**:
- `ProjectDraft` celowo używa tych samych nazw i typów ośmiu pól technicznych co istniejący `Project`, żeby przyszłe podłączenie prawdziwego zapisu (Deferred) mogło zmapować jeden do jednego.
- Trasa `/pl/producent/gotowosc-eksportowa` jeszcze nie istnieje w dzisiejszym scope jako osobny adres; ta specyfikacja ustala go jako pierwsza, funkcja 13 go przejmuje.

## Follow-up

- [ ] Gdy funkcja 13 (gotowość eksportowa) dostanie własną specyfikację, zastąp zaślepkę z tej specyfikacji właściwą treścią pod tym samym adresem `/pl/producent/gotowosc-eksportowa`, reużywając ustalony tu kontrakt parametru `nazwa`; rozważ reużycie treści zastrzeżenia prawnego ustalonego w spec [0006](../0006-analiza-dzialki-i-dossier/index.md) (AC-5), jeśli ekran pokazuje ocenę zgodności.
- [ ] Gdy funkcja 14 (domykanie luk) dostanie własną specyfikację, reużyj `components/ui/FileUpload.tsx` ustalony tutaj zamiast budować nowy mechanizm wgrywania dokumentów.
- [ ] Zaktualizuj opis funkcji 12 w `docs/scope/scope.md` przy najbliższym `/scope`: dzisiejszy opis nie wspomina pól tożsamości (nazwa, metraż, sypialnie, kraj produkcji, opis), kreatora wieloetapowego, podpowiedzi per pole ani zapisu w `localStorage`, które ta specyfikacja dodaje.
- [ ] Gdy powstanie prawdziwy model danych i baza (Deferred), zdecyduj, czy `ProjectDraft` zapisany przez producenta staje się bezpośrednio rekordem `Project`, czy potrzebuje osobnego kroku moderacji/publikacji.
- [ ] Cena bazowa, moce produkcyjne, wolne terminy i model 3D z dokumentu wizji (`flow-klienta-i-producenta.pdf`) pozostają nierozstrzygniętą decyzją; przydziel im właściwą funkcję (prawdopodobnie 15, zapytania i oferty) przy najbliższym `/scope`, zamiast dopisywać je tutaj po fakcie.
