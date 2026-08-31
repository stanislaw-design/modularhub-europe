# 0020. Strona szczegolow projektu &mdash; rationale

## Context

> &#9888; Uwaga do przeslanki: inzynier wybral pelne SEO teraz (JSON-LD, obraz OG, canonical) dla tej jednej strony, ale funkcja 16 w `docs/scope/produkcja.md` ("SEO podstawowe stron publicznych") jest wprost zaplanowana, zeby ustalic metadata, sitemape, dane strukturalne i obrazy OG dla wszystkich stron publicznych naraz, pózniej. Budowanie pelnego SEO tutaj jako pierwsze oznacza, ze ten spec ustala pierwszy konkretny wzorzec SEO w aplikacji, zanim zapadnie ta decyzja na poziomie calego projektu. To nie jest bledna decyzja, ktos musi byc pierwszy, ale funkcja 16 powinna potraktowac implementacje z tej strony jako wzorzec do rozszerzenia (sitemapa, pozostale strony), a nie równolegla decyzje do pogodzenia pózniej. Zaznaczone w Follow-up, zeby funkcja 16 nie zdublowala ani nie rozjechala sie z tym, co powstanie tutaj.

Dzis strona wyników (`/klient/wyniki`) pokazuje karty projektów, ale zadna z nich nie prowadzi do widoku pojedynczego projektu &mdash; specy 0004 (AC-8), 0014 (AC-6) i 0015 (AC-4) wprost zapisuja, ze karty celowo nie sa klikalne, bo "trasa pojedynczego projektu nie istnieje dzis". To swiadomie zostawiona luka, teraz warta domkniecia, bo uzytkownik chce przygotowac realne oferty na strone marketingowa na podstawie dwóch prawdziwych dostawców (Budman House, Cocomodule) i uzyc tej analizy do zaprojektowania panelu producenta.

Badanie tych dwóch dostawców w trakcie tej rozmowy ujawnilo kluczowa sile ksztaltujaca ten spec: **kompletnosc danych jest bardzo nierówna miedzy realnymi producentami**. Budman podaje jawna cene, czas produkcji/montazu i gwarancje w latach, ale wspólczynnik przenikania ciepla (U-value) tylko na osobnej podstronie z obrazkiem przekroju sciany, nie w tekscie strony glównej. Cocomodule podaje mocne U-value i liste certyfikatów (ISO, CE, EN) na stronie technologii, ale brak jawnej gwarancji w latach czy czasu realizacji publicznie, a cena pojawia sie tylko w katalogu PDF (prawdopodobnie EUR, nigdzie na ich www), nie w ogóle na stronach modeli. Dzisiejszy typ `Project` w `lib/data/types.ts` ma niemal wszystkie pola jako wymagane (`required`), co nie przetrwa zderzenia z ta rzeczywistoscia &mdash; strona projektu musi umiec sensownie sie wyrenderowac z czesciowymi danymi, nie zakladac kompletu.

Druga sila: ta strona jest budowana w etapie Prototyp, podejsciem Facade (pelny klikalny interfejs na danych przykladowych, prawdziwe zaplecze pózniej) &mdash; `getProjectById` i `getEligibilityByCountry` juz dzis istnieja w `lib/data/projects.ts` i dzialaja na zaszytych danych przykladowych, wiec ta funkcja nie wymaga nowego backendu, tylko nowego UI i drobnego rozszerzenia ksztaltu danych przykladowych.

Trzecia sila: istnieje juz osobny, niezalezny mechanizm lokalnego podgladu producenta wlasnego produktu w wynikach (`local-` prefiks id, `lib/local-client-projects.ts`, spec 0016) &mdash; dziala wylacznie po stronie klienta przez `localStorage` i `getProjectById` (funkcja serwerowa) go nie widzi. Ta strona musi swiadomie zdecydowac, czy objac ten przypadek, czy zostawic go poza zakresem.

Konsekwencja niepodjecia tej decyzji teraz: praca nad realnymi ofertami na strone marketingowa nie ma gdzie wyladowac (karty nadal nieklikalne), a projektowanie panelu producenta bez wiedzy, jakich dokladnie pól potrzebuje strona projektu, ryzykuje zaprojektowanie formularza producenta, który nie zbiera tego, co strona faktycznie musi pokazac.

## Options considered

### Opcja 1: Rozszerz istniejacy typ `Project` w miejscu

Dopisz cztery nowe, opcjonalne pola (`priceOnRequest`, `certifications`, `simplifiedPermitEligible`, `galleryImageUrls`) bezposrednio do dzisiejszego `Project` w `lib/data/types.ts`. Strona szczególów, `ResultCard`, `PopularHomeCard` i `BindingOfferView` czerpia z tego samego, jednego typu.

**Zalety**:
- Jedno zródlo prawdy &mdash; zaden nowy krok mapowania miedzy typami, zaden ryzyko rozjazdu miedzy tym, co widac na karcie wyników a na stronie szczególów.
- Zmiana wstecznie zgodna (pola opcjonalne) &mdash; istniejace uzycia `Project` dzialaja bez zmian.

**Wady**:
- `Project` staje sie coraz szerszym typem, mieszajacym pola potrzebne kazdej karcie z polami potrzebnymi tylko widokowi szczególowemu; z czasem moze wymagac podzialu.

### Opcja 2: Nowy typ `ProjectDetail`, osobny od `Project`

Wprowadz dedykowany typ tylko dla tej strony, `Project` zostaje szczuply, uzywany tylko przez karty/listy.

**Zalety**:
- `Project` (uzywany w wielu miejscach) zostaje maly i szybki do ogarniecia; nowe, ciezsze pola nie obciazaja kazdego miejsca, które go importuje.

**Wady**:
- Wymaga funkcji mapujacej `Project` &rarr; `ProjectDetail` (albo osobnego pobrania danych) &mdash; dodatkowa warstwa, dodatkowe miejsce na rozjazd miedzy tym, co ma karta a tym, co ma strona szczególów tego samego projektu.
- Na tym etapie (garstka nowych pól, wszystkie opcjonalne) koszt osobnego typu przewyzsza korzysc; ten sam projekt musialby byc widoczny w dwóch niezaleznie ewoluujacych ksztaltach.

## Rationale

Opcja 1 wygrywa, bo w tym momencie róznica miedzy `Project` a tym, czego potrzebuje strona szczególów, to cztery opcjonalne pola, nie osobny model danych. Rozdzielenie typów teraz (Opcja 2) doda warstwe mapowania bez realnej korzysci, dopóki `Project` faktycznie nie urosnie na tyle, ze karty zaczna cierpiec na jego rozmiar &mdash; a to jeszcze nie ten moment (AGENTS.md, zasada "dane przykladowe" i dzisiejszy jeden wspólny typ juz uzywany przez trzy komponenty). Decyzja "brak danych = sekcja znika" (potwierdzona przez inzyniera w rozmowie) dziala naturalnie z opcjonalnymi polami na jednym typie: skladnia `project.certifications?.length` jest tym samym sprawdzeniem wszedzie, gdziekolwiek ten typ trafia.

Wybór "rozszerz w miejscu" jest tez spójny z tym, co juz odkryto w kodzie: `lib/local-client-projects.ts` juz dzis mapuje `SavedProduct` &rarr; `Project` recznie (dla lokalnego podgladu producenta) &mdash; dodanie kolejnego typu `ProjectDetail` oznaczaloby trzeci ksztalt danych o tym samym projekcie do utrzymania w synchronizacji, co byloby zauwazalnie wiecej pracy niz dodanie czterech pól do istniejacego mapowania.
