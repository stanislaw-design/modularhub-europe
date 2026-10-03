# Rationale: dedykowana strona produktu dla sauny

## Context

> ⚠️ Uwaga wstępna: nowy kształt danych technicznych sauny jest dziś oparty wyłącznie na dwóch publicznych stronach producentów (Kora i Wooden Dream House), nie na realnym wdrożeniu żadnego z nich jako producenta na platformie. To ten sam rodzaj ryzyka, jaki już raz się zdarzył przy rodzinie `pergola` (zbudowanej hipotetycznie, zero realnych wierszy, później zastąpionej przez `kontenery-modulowe`). Ryzyko jest mniejsze niż wtedy (mamy dwa konkretne, aktualne produkty do porównania, nie zero), ale ścisły (`.strict()`) schemat warto jeszcze raz zweryfikować, gdy którykolwiek z tych dwóch producentów faktycznie dołączy do platformy, zanim pojawi się trzeci, inny producent sauny.

Sauna istnieje dziś w typach jako `SpaSubcategory = "sauna" | "jacuzzi" | "wellness-combo"` pod rodziną `spa-modulowe`, ale ma zero realnych wierszy w bazie. Jedyny dotąd istniejący przykładowy wpis tej rodziny to teaser łączący saunę, jacuzzi i barek w jednym module (`wellness-combo`, `lib/data/fixtures/projects.ts:473` i dalej), nie czysta sauna. Jedyny dziś istniejący schemat danych technicznych tej rodziny (`spaModuloweSpecsShape`, `lib/product-technical-specs.ts:101`) zawiera pola wprost opisujące wannę z wodą (objętość wody w litrach, system filtracji, materiał niecki, ogrzewanie pompą ciepła) i nie pasuje do suchej sauny, w której nie ma wody do filtrowania. Kreator producenta (`lib/producer-project-draft.ts:298`) już dziś pozwala wybrać podkategorię "sauna", ale pokazuje wtedy te same, jacuzziowe pola.

Dwaj producenci referencyjni, Kora (sauna Relax 550) i Wooden Dream House (Qube), pokazują spójny, odmienny od domu model handlowy: jedna cena bazowa (montaż wliczony), bez żadnego ze standardów wykończenia surowy, deweloperski czy pod klucz, a piec kupowany osobno z listy marek wraz z dodatkowymi opcjami (kolor impregnacji drewna, panele podczerwieni, pakiety WiFi czy audio). To jest dokładnie model, dla którego platforma ma już gotowy mechanizm, czyli płatne opcje konfiguratora (spec 0059), zbudowany wcześniej dla producenta kontenerów Dampol.

Platforma ma dziś dokładnie dwa precedensy strony produktu: stronę domu (`/project/[slug]`, pełny szablon ze wszystkimi sekcjami domowymi, dziś też wykorzystywaną przez kontenery modułowe) i dedykowaną stronę partnera `/outdoor-tv/[slug]` (zbudowaną od zera, bo strona domu z wyłączonymi sekcjami okazała się złym rozwiązaniem, spec 0056). Żaden z tych precedensów nie powstał dla podkategorii w ramach istniejącej rodziny, tylko dla całej nowej rodziny, więc rozszerzenie funkcji trasowania (`resolveProductHref`) o drugi wymiar (rodzina plus podkategoria) jest nową decyzją, nieprzewidzianą wprost przez żaden wcześniejszy spec, choć spec 0056 (Konsekwencje) wprost zapowiada, że trzecia rodzina katalogowa będzie musiała podjąć własną decyzję tego rodzaju.

## Options considered

### Opcja 1: Dedykowana trasa `/sauna/[slug]` (wybrana)

Nowa, osobna trasa budowana od zera na wzór `/outdoor-tv/[slug]`, z własnym, poprawnym schematem danych technicznych i promocją dwóch komponentów (wideo, cechy) do wspólnego użytku.

**Zalety**:
- Poprawny model danych i cenowy od pierwszego dnia, bez dziedziczenia pojęć domowych, które nie mają sensu dla sauny.
- Pełne miejsce na treść lifestyle i edukacyjną (seria wideo Kory), bez sztucznego dopasowywania jej do układu strony domu.

**Wady**:
- Trzecie, osobne drzewo komponentów strony produktu (obok domu i outdoor tv), czyli kolejny koszt utrzymania przy każdej przyszłej, przekrojowej zmianie strony produktu.
- Wymaga rozszerzenia `resolveProductHref` o drugi wymiar (rodzina i podkategoria), czego żaden wcześniejszy spec wprost nie przewidział.

### Opcja 2: Reużycie `/project/[slug]` z wygaszonymi sekcjami domowymi

Sauna renderuje się na istniejącej stronie domu, z sekcjami układu, ceny i zakresu, harmonogramu oraz B2B wygaszonymi przez flagi `hasXSection`, dokładnie tak jak dziś robią to kontenery modułowe Dampol.

**Zalety**:
- Zero nowej trasy, zero zmiany w `resolveProductHref`, najtańsze i najbardziej spójne z istniejącym precedensem kontenerów.

**Wady**:
- Dziedziczy nawigację sekcji i układ strony myślany pod dom, z kilkoma pozycjami nawigacji bez realnej treści.
- Brak naturalnego miejsca na treść lifestyle i edukacyjną, którą Kora wyraźnie eksponuje; wymagałoby doklejenia czegoś ad hoc i tak.

### Opcja 3: Jeden generyczny szablon katalogowy dla całej rodziny spa-modulowe już teraz

Zamiast strony tylko dla sauny, budowa od razu wspólnego szablonu dla sauny, jacuzzi i wellness combo.

**Zalety**:
- Jacuzzi i wellness combo dostają stronę "za darmo", gdy pojawi się dla nich realny producent.

**Wady**:
- Projektowanie kształtu danych i strony dla jacuzzi i wellness combo, dla których nie ma dziś ani jednego realnego producenta, czyli dokładnie powtórka błędu `pergola` (zbudowanej hipotetycznie, zero wierszy, później zastąpionej).

### Opcja 4: Jeden wspólny szablon katalogowy dla outdoor tv i sauny (rozważona na żądanie cross checku, odrzucona)

Zamiast dwóch osobnych tras (`/outdoor-tv/[slug]`, `/sauna/[slug]`), jeden generyczny szablon strony katalogowej z wymiennym slotem na specyfikację techniczną per rodzina, współdzielony od razu przez obie.

**Zalety**:
- Usuwa większość wady Opcji 1 ("trzecie drzewo komponentów"), bo zostałoby jedno drzewo, nie dwa osobne.
- Zadanie 5 Build planu (promocja komponentów wideo i cech) jest już połową kroku w tym kierunku.

**Wady**:
- Mamy dziś dokładnie dwa punkty danych do uogólnienia (outdoor tv, sauna), czyli wciąż za mało, żeby być pewnym, który element szablonu jest naprawdę wspólny, a który tylko przypadkiem podobny; przedwczesne uogólnienie na dwóch próbkach ma ten sam rodzaj ryzyka, co budowanie schematu dla rodziny bez realnych danych.
- `/outdoor-tv/[slug]` działa dziś na produkcji; przepisanie go na generyczny szablon przy okazji dodawania sauny zwiększa ryzyko tej zmiany bez proporcjonalnej korzyści teraz.

Odrzucona na rzecz Opcji 1 plus częściowej promocji (zadanie 5), zostawiona jako otwarta ścieżka w Follow-up, jeśli pojawi się trzecia podobna podkategoria katalogowa.

## Rationale

Opcja 2 była tańsza, ale dziedziczyłaby układ strony myślany pod zupełnie inny produkt (dom) i nie dawała miejsca na treść lifestyle, którą obaj referencyjni producenci wyraźnie traktują jako część oferty (seria wideo Kory, pakiet opisowy WDH). Opcja 3 powtarzałaby dokładnie ten błąd, przed którym ostrzega już własna historia repozytorium: rodzina `pergola` została zbudowana hipotetycznie, bez żadnego realnego wiersza, i musiała zostać zastąpiona. Mając dziś dwóch konkretnych, realnych producentów tylko dla sauny, projektowanie od razu też dla jacuzzi i wellness combo oznaczałoby zgadywanie kształtu danych dla produktów, których nikt na platformie jeszcze nie sprzedaje.

Koszt dodatkowy Opcji 1, czyli trzecie drzewo komponentów i rozszerzenie `resolveProductHref`, jest spłacany częściowo przez promocję komponentów wideo i cech do wspólnego użytku (Build plan, zadanie 6), więc kolejna przyszła podkategoria katalogowa odziedziczy już gotowy wzorzec zamiast kopiować outdoor tv po raz drugi. Opcja 4 poszłaby dalej i uogólniła od razu całą stronę, nie tylko te dwa komponenty, ale przy dokładnie dwóch punktach danych (outdoor tv, sauna) to wciąż za wcześnie: dopiero trzecia podobna podkategoria pokaże, który element szablonu jest naprawdę wspólny, a który tylko przypadkiem podobny u tych dwóch.

Decyzja o budowie podejścia (Facade jako domyślne podejście projektu z `AGENTS.md`) została tu świadomie pominięta na rzecz wzorca ustalonego już przez wszystkie rodziny katalogowe dodane po pierwszym etapie (outdoor tv, kontenery Dampol): dane wchodzą od razu jako realne wiersze przez ręczny zapis Neon MCP, bez osobnej warstwy danych przykładowych. Budowa oddzielnej warstwy mock tylko dla sauny byłaby niespójna z resztą katalogu i nie miałaby komu służyć, bo i tak trzeba wpisać prawdziwe dane obu producentów referencyjnych.

## Evidence: dane producentów referencyjnych (zebrane 2026-10-02)

| | Kora, sauna Relax 550 (firmakora.pl) | Wooden Dream House, Qube (woodendreamhouse.com) |
|---|---|---|
| Cena bazowa | 58 200 zł, montaż wliczony | 89 500 zł, cena "od" |
| Wymiary zewnętrzne | 550 × 250 × 260 cm | 400 × 240 × 260 cm |
| Konstrukcja i okładzina | drewno thermo (sosna skandynawska szczotkowana) | płyta konstrukcyjna certyfikowana, okładzina ThermoWood |
| Wnętrze | świerk skandynawski, ławki abachi | świerk skandynawski, ławki abachi |
| Izolacja | wełna i folia aluminiowa | STEICO albo wełna mineralna, 10 cm |
| Przeszklenie | szkło hartowane przyciemniane | szkło hartowane 8 mm |
| Strefa dodatkowa | strefa relaksu 310 × 250 cm | przedsionek 80 cm szerokości |
| Piec w cenie bazowej | nie, opcja osobna (Tulikivi, Harvia, Huum, EOS elektryczne 6 do 9 kW; Hive Mini, WK Legend, Harvia Linear na drewno 13 do 18 kW) | nie wyszczególniony w standardzie |
| Inne płatne opcje | kolor impregnacji drewna (naturalna, jasny dąb, orzech, antracyt, palisander, heban), panele podczerwieni 350 W | sterowanie WiFi, system audio, pakiet świetlny "DreamLight" |
| Standardy wykończenia (surowy, deweloperski, pod klucz) | brak | brak |
| Treść dodatkowa | seria wideo edukacyjnej "Dookoła saunowania" (10 odcinków), galeria ponad 20 zdjęć, FAQ | opis produktowy, karta specyfikacji PDF do pobrania |
| Logistyka | montaż wliczony w cenę, przygotowanie podłoża po stronie klienta | dostawa gotowa do użycia, fundament i przyłącze elektryczne po stronie klienta |

Źródła: `https://firmakora.pl/produkt/sauna-relax/`, `https://woodendreamhouse.com/sauna-qube/`, odczytane 2026-10-02.
