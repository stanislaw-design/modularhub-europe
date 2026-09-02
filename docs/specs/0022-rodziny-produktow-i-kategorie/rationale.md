# Rationale: 0022. Rodziny produktów i kategorie

## Context

Dzisiejszy model danych (`lib/db/schema.ts`, spec 0018) zakłada wyłącznie jedną rodzinę produktu, dom, w sposób ukryty: nie ma pola rodziny produktu w ogóle. `product.category` (enum `caloroczny` / `rekreacyjny-caloroczny` / `mobilny`) niesie tylko warianty cyklu życia domu, a osiem osobnych kolumn tekstowych (`wallBuildUp`, `insulation`, `heatTransferCoefficients`, `windowClass`, `ventilation`, `heatSource`, `fireResistance`, `windResistance`) niesie dane techniczne, wyłącznie domowe.

Kreator producenta (`components/producent/ProjectWizard.tsx`, `lib/producer-project-draft.ts`) ma dziś siedem kroków w jednej, płaskiej liście (`WIZARD_STEPS`): trzy z nich (`konstrukcja`, `instalacje`, `odpornosc`) są sztywno domowe, walidowane jednym `switch` bez rozgałęzienia po kategorii.

Dwa komponenty kategorii na stronie głównej są dziś świadomie dekoracyjne. `CategoryShowcase` ma wpisaną na sztywno tablicę 4 podtypów domu z fałszywymi licznikami, linkującą zawsze do nieprzefiltrowanego `/wyniki` (komentarz w kodzie: *"Project has no houseType field"*, potwierdzone w spec 0014 AC-6). `CategoryFilterBar` ma 12 wyłączonych przycisków atrybutów domu (Piętrowy, Pompa ciepła...), bez modelu danych za sobą.

Silnik zgodności i analiza działki (`lib/data/plot-analysis.ts`, `lib/data/fixtures/eligibility.ts`) to dziś płaskie, wolnotekstowe fixture'y `{status, reason}`, przypisane do `projectId`, bez żadnej struktury per kategoria. Wzmianki o BENG, klasach odporności ogniowej, liniach odsunięcia od granicy i nośności gruntu są zdaniami w polu `reason`, nie osobnymi, sprawdzalnymi regułami.

Platforma rozszerza się z jednej rodziny (dom) na trzy: dom, spa modułowe, pergola, każda z własnymi, jeszcze nieustalonymi podkategoriami. Decyzja musi zapaść raz, przed funkcją 7 (`docs/scope/produkcja.md`), która ręcznie zasieje dane pierwszych prawdziwych producentów (Budman House, Cocomodule, oboje najwyraźniej producenci domów) przez Neon MCP, żeby nie migrować tych danych dwa razy.

Sprawdzone bezpośrednio w bazie Neon (projekt `modularhub`, 2026-09-02): `SELECT count(*) FROM product` zwraca `0`. Tabela istnieje od migracji spec 0018 (Foundation, funkcja 2), ale żaden prawdziwy producent jeszcze nie został zasiany, to zadanie dopiero funkcji 7. Migracja tej decyzji nie przenosi więc żadnych danych na żywo.

Siły w grze: typowanie bazy danych kontra elastyczność (osobny enum per rodzina kontra jedno generyczne pole), spójność mechanizmu przechowywania kontra zakres migracji (przenieść dzisiejsze płaskie kolumny domu do wspólnego `jsonb`, czy zostawić je jak są), i kolejność względem funkcji 7 (klient na realnym zapleczu), 8 (dopracowanie wyszukiwania) i 14 (realny silnik zgodności), które są już osobno zaplanowane i nie powinny być powtórnie specyfikowane tutaj.

## Options considered

Patrz [index.md, sekcja Options considered](index.md#options-considered) — trzy opcje modelowania rodziny i danych technicznych, z pełnymi Pros/Cons.

## Rationale

Opcja 1 (pole `family` plus osobna kolumna podkategorii per rodzina plus wspólny `technicalSpecs jsonb`) wygrywa, bo rozdziela dwa różne rodzaje pól po ich faktycznej naturze: klasyfikację (rodzina, podkategoria), po której baza filtruje i której spójności ma pilnować, zostawia typowaną (enumy plus `CHECK`); dane techniczne, których kształt naprawdę różni się między rodzinami (ściany i izolacja kontra objętość wody i typ ogrzewania kontra obciążenie wiatrem dachu), przenosi do jednej elastycznej kolumny, walidowanej w aplikacji.

Opcja 2 (jedno generyczne pole podkategorii, płaskie kolumny dopisywane per rodzina) była realną alternatywą, mniejszą zmianą względem dziś, ale przegrywa na tym samym kryterium: traci typowanie enum tam, gdzie baza faktycznie może i powinna pilnować spójności, a przy trzeciej i czwartej rodzinie tabela `product` (już dziś około 30 pól) rośnie bez końca płaskimi kolumnami, z których większość jest pusta dla dwóch z trzech rodzin w każdym wierszu.

Opcja 3 (w pełni znormalizowane tabele per rodzina) daje najsilniejsze typowanie, ale jej koszt (migracja, join warunkowy na `family` przy każdym odczycie produktu) nie jest uzasadniony dziś, gdy dwie z trzech rodzin (spa, pergola) nie mają jeszcze ani jednego prawdziwego producenta do zwalidowania, czy w ogóle te pola są właściwe. `jsonb` plus Zod daje niemal tę samą elastyczność bez tego kosztu, a jeśli po zasianiu prawdziwych danych spa/pergoli (funkcja 7 lub później) okaże się, że te rodziny potrzebują pełnego typowania bazy danych, przejście na Opcję 3 dla konkretnej rodziny zostaje możliwe bez zmiany reszty modelu.

Rozważony był też wariant pośredni między Opcją 1 i Opcją 2: jeden, wspólny enum `subcategory` niosący wartości ze wszystkich trzech rodzin naraz (`caloroczny`, `sauna`, `bioklimatyczna`...), plus `CHECK` dopasowujący dozwolone wartości do `family`. Zachowałby pełne typowanie bazy w jednej kolumnie zamiast trzech. Odrzucony, bo sprzęga alokację wartości między niepowiązanymi rodzinami w jednym typie Postgresa: dodanie nowej podkategorii do jednej rodziny (np. czwarty typ pergoli) wymaga zmiany tego samego enuma, którego dotykają też dom i spa, a lista `IN` w `CHECK` rośnie liniowo z każdą kolejną rodziną i wartością, zamiast zostać rozłożona na osobne, niezależnie rozszerzalne enumy. Trzy osobne kolumny (Opcja 1) skalują się lepiej przy założeniu, że rodzin i podkategorii przybędzie.

Stan roboczy kreatora (`ProjectDraft` w `lib/data/types.ts`) nie jest osobno rozważany jako ryzyko migracji: baza Neon ma dziś 0 wierszy `product`, w tym 0 wierszy `status = 'draft'` (ta sama kontrola z Contextu), więc nie ma żadnego prawdziwego, zapisanego w bazie stanu roboczego kreatora odwołującego się do usuwanych kroków/kolumn do zmigrowania. Jeśli gdziekolwiek istnieje stan roboczy w `localStorage` przeglądarki z czasów epiki Prototyp, jest efemeryczny per przeglądarka i nieszkodliwy do zresetowania.

Ograniczenie `CHECK` na spójność rodziny i podkategorii jest świadomym, wąskim wyjątkiem od konwencji zapisanej w komentarzu przy `product` (`lib/db/schema.ts:227-229`, spec 0018): tabela celowo trzyma pełną wymagalność pól (przy `status = 'published'`) po stronie aplikacji, nie jako `CHECK`, bo warunkowo wymaganych pól jest zbyt wiele na sensowne ograniczenie SQL. Reguła rodzina-podkategoria to inny przypadek: cztery kolumny, jedna prosta reguła wzajemnej wyłączności, i konkretny, realny scenariusz jej złamania (funkcja 7 wstawia wiersze ręcznie przez Neon MCP, mijając każdą walidację aplikacji). To uzasadnia `CHECK` bez zaprzeczania reszcie konwencji tej tabeli.

## References

**Project sources** (weryfikowalne w tym repozytorium):
- `lib/db/schema.ts`, spec 0018 (`docs/specs/0018-prawdziwy-model-danych/`), dzisiejsza tabela `product` i jej konwencja walidacji po stronie aplikacji dla pól warunkowo wymaganych
- `components/klient/CategoryShowcase.tsx`, `components/klient/CategoryFilterBar.tsx`, spec 0014 AC-6 (`docs/specs/0014-przebudowa-strony-startowej/`), dzisiejszy dekoracyjny stan kart kategorii
- `components/producent/ProjectWizard.tsx`, `lib/producer-project-draft.ts`, spec 0016 (`docs/specs/0016-katalog-produktow-producenta/`), dzisiejsza struktura kroków kreatora i miejsce pola `category`
- `lib/data/plot-analysis.ts`, `lib/data/fixtures/eligibility.ts`, dzisiejszy płaski, wolnotekstowy kształt fixture'ów silnika zgodności
- `docs/scope/produkcja.md`, funkcja 6 (brief tej decyzji), funkcje 7/8/14 (kolejne funkcje, których zakres ta decyzja celowo nie powiela)

**Practices & standards**:
- Bezpieczna sekwencja migracji produkcyjnej (dodaj kolumnę nullable/z wartością domyślną, wdróż, dodaj ograniczenie), zastosowana tu w lekkiej formie, bo tabela ma dziś 0 wierszy
- Rozdział pól typowanych (baza pilnuje spójności) od pól semi-strukturalnych (aplikacja pilnuje kształtu), standardowa praktyka przy polach o kształcie zależnym od dyskryminatora

**Links** (zweryfikowane podczas researchu w tej rozmowie, 2026-09-02):
- Prawo budowlane, art. 29, próg zwolnienia z formalności dla altan/pergoli (do 35 m², maks. 2 na 500 m² działki): [samorzad.gov.pl](https://samorzad.gov.pl/attachment/682526c4-56d6-4ed1-87ed-ebc0ed4df4ba)
- Muratordom, wyjaśnienie progów formalnych dla altan i pergoli: [muratordom.pl](https://muratordom.pl/ogrod/wiaty-i-altany/czy-budowa-altany-wymaga-pozwolenia-aa-5rsS-1jgR-hVZ2.html)
- gov.pl, przegląd procedury pozwolenia wodnoprawnego: [gov.pl](https://www.gov.pl/web/national-contact-point-for-renewable-energy-sources/permit-under-the-water-legislation)

### Research: kategorie rynkowe i pola techniczne (podstawa AC-3, technicalSpecs)

Research przeprowadzony przez subagenta w tej rozmowie (2026-09-02), do ustalenia realnych podkategorii i pól technicznych dla rodzin bez jeszcze jednego prawdziwego producenta w bazie:

**Pergola, podkategorie rynkowe**: bioklimatyczna/silnikowa (regulowane lamele aluminiowe), stała aluminiowa/poliwęglanowa, drewniana, wolnostojąca kontra przyścienna. Źródła: [ArchiExpo, pergole bioklimatyczne](https://www.archiexpo.com/architecture-design-manufacturer/bioclimatic-pergola-46944.html), [Oweado, dostawcy dachów rozsuwanych](https://oweado.com/top-10-retractable-roof-pergola-suppliers-in-eu-usa/).

**Pergola, pola techniczne z kart katalogowych producentów**: materiał dachu, kąt/regulacja lameli, wymiary, klasa obciążenia wiatrem, klasa obciążenia śniegiem, rozstaw słupów, przeszklenie/panele boczne, głębokość fundamentu. Źródła: [PERGOLUX](https://pergoluxshop.com/products/pergola), [pergolacave, przewodnik techniczny dachów rozsuwanych](https://pergolacave.com/blogs/blog/louvered-roof-pergola-engineering-technical-guide-2026).

**Spa modułowe, podkategorie rynkowe** (dobrane pod polski rynek, bez nisz jak cold plunge/float pody, popularnych głównie w USA): kabiny sauna, wanny/jacuzzi, kabiny wellness łączone (sauna plus jacuzzi w jednej bryle). Źródła: [Plunge](https://plunge.com/), [GlampLaunch, wellness pody 2025](https://glamplaunch.co.uk/blogs/sauna-spa-wellness/wellness-pods-2025).

**Spa modułowe, pola techniczne z kart katalogowych producentów**: liczba miejsc, objętość wody, typ ogrzewania (elektryczne / pompa ciepła / na drewno), system filtracji, materiał niecki, wymagania elektryczne, wymagania fundamentu/podstawy. Źródła: [podręcznik specyfikacji Jacuzzi](https://jacuzzipartners.com/knowledgelibrary/assets/pdf/8977.pdf), [Hot Spring, fakty o wannach spa](https://www.hotspring.com/blog/hot-tub-facts-and-stats-all-you-need-to-know-before-buying).

Uwaga: dla Polski nie znaleziono osobnej ustawy dla spa/wanien spa porównywalnej z progiem dla pergoli; wymogi sanitarno-elektryczne dla użytku współdzielonego/najmu wymagają kontaktu z lokalnym urzędem gminy, oznaczone jako otwarte w Feature design, Kategorie kontroli zgodności.
