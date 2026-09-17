# 0042. Nowy uklad strony projektu (client)

**Date**: 2026-09-15
**Status**: In Progress

## Summary

Strona szczegolow projektu klienta (`/project/[id]`) dzis pokazuje jeden standard wykonania i jedna cene na produkt. Ta decyzja podlacza strone do nowego, juz zaakceptowanego modelu danych z wariantami (spec 0041, tabele `product_variant`, `cost_line_item`, `product_timeline_stage`) i dodaje sekcje, ktorych dzis brakuje: uklad pomieszczen, porownanie standardow wykonania z pelnym zakresem kazdego, logistyke dzialki, harmonogram z odpowiedzialnym wykonawca, oraz wyrazne rozroznienie miedzy wizualizacjami a prawdziwymi zdjeciami z realizacji. Kolejnosc budowy idzie od najpilniejszej poprawki (cena zawsze razem z wlasciwym zakresem, nigdy zmieszana miedzy standardami) do reszty tresci.

## Requirements

**Historyjki uzytkownika**:
- Jako klient przegladajacy karte projektu, chce zobaczyc osobna, pelna pare cena i zakres dla kazdego wariantu wykonania, zeby nigdy nie zalozyc nizszej ceny przy bogatszym zakresie.
- Jako klient, chce zobaczyc uklad pomieszczen (rozklad, metraze, funkcje) zanim przejde do specyfikacji technicznej, zeby ocenic czy dom pasuje do mojego zycia.
- Jako klient, chce widziec jasno oznaczone zdjecia z prawdziwej realizacji, odroznione od wizualizacji, zeby nie pomylic renderu z gotowym domem.
- Jako klient, chce zobaczyc harmonogram realizacji z etapami, czasem trwania i odpowiedzialnym wykonawca, zeby wiedziec czego sie spodziewac po wyslaniu zapytania.
- Jako klient rozwazajacy konkretna dzialke, chce zobaczyc wymagania logistyczne (wymiary transportowe, wymagania dzwigu, minimalna szerokosc dzialki), zeby wiedziec czy realizacja jest w ogole mozliwa, zanim wysle zapytanie.
- Jako klient, chce wiedziec czy moge odwiedzic producenta osobiscie (dom pokazowy albo realizacja), zeby zbudowac zaufanie przed wyslaniem zapytania na duza kwote.

**Kryteria akceptacji** (kontrakt, kazde niezaleznie sprawdzalne):
- **AC-1**: Strona `/project/[id]` czyta `Project.variants: ProjectVariant[]` (spec 0041) zamiast dzisiejszego `Project.commercial`. Gdy produkt ma dwa lub wiecej wariantow, hero pokazuje przelacznik wariantow jako parametr adresu URL (`?wariant=deweloperski`, zgodnie z regula AGENTS.md, ze stan majacy przetrwac zmiane trasy zyje w parametrach URL, nie w stanie komponentu), wstepnie ustawiony na wariant oznaczony `is_default = true`, a w jego braku na pierwszy wariant wedlug `sort_order`. Wybor wariantu aktualizuje cene, opis zakresu, tabele porownawcza, podpis galerii i galerie zdjec jednoczesnie, przez normalna nawigacje `<Link>`, bez utraty stanu wyboru przy przejsciu do zapytania (link "Wyslij zapytanie" niesie ten sam parametr dalej).
- **AC-2**: Sekcja "Cena i zakres" (osobna sekcja, nie czesc hero, patrz kolejnosc w AC-12) pokazuje tabele porownawcza wszystkich wariantow produktu z pozycjami kosztowymi i ich statusem (w cenie, obowiazkowa doplata, opcja, po stronie klienta, do wyceny). Status nigdy nie jest zgadywany z braku wartosci, tylko czytany wprost z `cost_line_item.status`. Przelacznik "pokaz tylko roznice" laczy wiersze miedzy wariantami po dokladnym dopasowaniu tekstu `label`; poniewaz spec 0041 celowo zostawil `label` jako wolny tekst bez wspolnego slownika, dopasowanie jest najlepszym mozliwym przyblizeniem, nie gwarancja, i dwie pozycje o tym samym sensie ale innym zapisie licza sie jako rozne wiersze (odnotowane w Follow-up).
- **AC-3**: Gdy produkt ma dokladnie jeden aktywny wariant, strona nie pokazuje przelacznika wariantow ani wielokolumnowej tabeli porownawczej, tylko pojedynczy blok cena i zakres (tak jak dzis).
- **AC-4**: Sekcja "Uklad domu" renderuje tabele pomieszczen (nazwa, powierzchnia, funkcja), tylko gdy produkt ma taka liste wypelniona. Brak listy oznacza brak sekcji, zaden pusty placeholder (ten sam wzorzec co spec 0020 AC-4).
- **AC-5**: Sekcja "Dzialka i dostawa" pokazuje wymiary zabudowy, wymagania fundamentu, wymiary transportowe, wymagania dzwigu i minimalna szerokosc dzialki. Kazde pole renderuje sie niezaleznie, tylko gdy jest wypelnione.
- **AC-6**: Sekcja "Harmonogram" renderuje etapy z `product_timeline_stage` dla aktualnie wybranego wariantu (czas trwania, punkt odniesienia startu, odpowiedzialny wykonawca), w stalej kolejnosci (formalnosci, produkcja, transport, montaz, wykonczenie). Etap bez wiersza w bazie po prostu sie nie pokazuje.
- **AC-7**: Galeria w hero rozroznia zakladki wedlug realnych, juz istniejacych wartosci `document.purpose` produktu: Wizualizacje (`product_photo`), Rzut (`product_floor_plan`), Realizacje (`product_realization_photo`). Nie ma osobnej zakladki "Wnetrza", bo nie ma dla niej wlasnej wartosci enuma, a spec 0041 swiadomie zamknal ten enum na te trzy wartosci (dopisanie kolejnej jest nieodwracalne w Postgresie). Zakladka bez zadnego dokumentu danego typu dla wybranego wariantu nie pojawia sie w ogole (wyjatek patrz AC-8). Dokument z pustym `product_variant_id` liczy sie jako dotyczacy kazdego wariantu (zgodnie z 0041 Feature design); dokument przypisany do konkretnego wariantu pokazuje sie tylko przy tym wariancie.
- **AC-8**: Zakladka "Realizacje" (prawdziwe zdjecia z budowy, `document_purpose = product_realization_photo`) pokazuje jawny komunikat "zdjecia z realizacji, do uzupelnienia przez producenta" wtedy, gdy wybrany wariant nie ma zadnego takiego dokumentu (ani wlasnego, ani ogolnego dla produktu). To znaczy, ze placeholder moze pokazac sie dla jednego wariantu, a prawdziwe zdjecia dla innego wariantu tego samego produktu, jesli producent dostarczyl zdjecia tylko dla jednego standardu, to zamierzone, nie blad. To swiadomy wyjatek od reguly "brak danych, brak sekcji" z AC-4 tej samej specyfikacji i z AC-4 spec 0020: domyslne ukrycie tej jednej zakladki ryzykowaloby, ze kupujacy uzna wizualizacje za zdjecie z budowy.
- **AC-9**: Sekcja "Producent" pokazuje mozliwosc odwiedzin osobistych jako jeden z trzech stanow (tak, nie, nieznane) na podstawie `producer.showroom_visit_available`. Wartosc pusta (`null`) renderuje sie jako "do potwierdzenia z producentem", nigdy jako ukryta sekcja ani jako ciche "nie". Gdy wartosc to `true`, pokazuje sie tez `producer.showroom_visit_note`, jesli jest wypelniona.
- **AC-10**: Linia zaufania "odpowiedz w ciagu X dni roboczych" pod przyciskiem zapytania pokazuje sie tylko wtedy, gdy `producer.inquiry_response_time_label` jest wypelnione. Brak wartosci oznacza brak linii, nie generyczny tekst zastepczy.
- **AC-11**: Produkt bez zadnego aktywnego wariantu ma puste `priceMin`/`priceMax` (wynik wyzwalacza ze spec 0041, gdy nie ma wariantu domyslnego). Strona renderuje to dokladnie tak samo jak dzisiejsze `priceOnRequest` (istniejace zachowanie, spec 0020 AC-5): brak zakresu ceny, samo wezwanie do zapytania, nigdy "od undefined €" ani blad. To wymaga rozszerzenia dzisiejszej logiki `priceOnRequest` (dzis czytanej wylacznie z pomostowego pola `technicalSpecs._priceOnRequest`, patrz `lib/data/projects.ts`) tak, zeby traktowala pusty `priceMin` tak samo jak `priceOnRequest = true`.
- **AC-12**: Kolejnosc sekcji na stronie: hero (galeria, nazwa, przeznaczenie, cena i wariant, wezwanie do dzialania) &rarr; uklad domu &rarr; cena i zakres &rarr; dzialka i dostawa &rarr; harmonogram &rarr; komfort i technologia (bez zmiany tresci wzgledem dzis) &rarr; producent i realizacje &rarr; dokumenty i pytania &rarr; wezwanie koncowe. Kolejnosc jest celowa: dom przed arkuszem danych, zgodnie z zasada projektowa "pokaz dom przed arkuszem kalkulacyjnym" (`PRODUCT.md`).
- **AC-13**: Odznaka przeznaczenia (na przyklad "dom caloroczny") pokazuje sie w hero obok nazwy projektu, czytajac juz istniejace pola `Project.family`/`Project.category`. Zadna zmiana schematu nie jest do tego potrzebna, to wylacznie luka w renderze.
- **AC-14**: Kazdy nowy element interaktywny (przelacznik wariantow, zakladki galerii, przelacznik "pokaz tylko roznice" w tabeli porownawczej) jest w pelni obslugiwany z klawiatury i ma widoczny `.focus-ring`, zgodnie z WCAG 2.2 AA.
- **AC-15**: Sekcja "Podobne domy" i osobne, tekstowe opinie o konkretnym modelu (rozne od zagregowanej oceny producenta) sa jawnie poza zakresem tej decyzji. Strona nie renderuje zadnej wersji tych dwoch elementow w tym build planie; sekcja producenta nadal pokazuje dzisiejsze `rating`/`reviewCount` bez zmian.

## Decision

**Wybrana opcja**: Opcja 2, przebudowa w miejscu, cienki plaster na start

Strona zostaje przebudowana pod tym samym adresem, bez rownoleglej wersji "v2", w kolejnosci ktora najpierw stawia i potwierdza jeden dzialajacy plaster (cena zwiazana z wariantem), a dopiero potem dokleja kolejne sekcje tresci.

**Implementation skills**: `headlessui` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/headlessui/`) &middot; `lucide-icons` (`aksuharun/skills`, `.agents/skills/lucide-icons/`) &middot; `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) &middot; `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) &middot; `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`) &middot; `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`)

## Feature design

> Pelne uzasadnienie, rozwazane opcje i dowody z badania: patrz `rationale.md`.

**Dodatek do modelu danych** (ponad juz zaakceptowany spec 0041, ktory pozostaje bez zmian, tabele `product_variant`, `cost_line_item`, `product_timeline_stage` sa gotowe do uzycia):

| Pole | Tabela | Typ | Uwaga |
|---|---|---|---|
| `inquiry_response_time_label` | `producer` | text, moze byc puste | wolny tekst ustalany rocznie z zespolem sprzedazy per producent, na przyklad "2 dni robocze"; puste znaczy ze linia zaufania sie nie pokazuje (AC-10) |
| `showroom_visit_available` | `producer` | boolean, moze byc puste | trzy stany: `true`, `false`, `null` (nieznane); `null` renderuje sie jawnie jako "do potwierdzenia", nie jako "nie" (AC-9) |
| `showroom_visit_note` | `producer` | text, moze byc puste | krotka notatka, znaczaca tylko gdy `showroom_visit_available = true` (nie wymuszone ograniczeniem bazy, tylko konwencja aplikacji) |
| `room_layout` | `product` | jsonb, moze byc puste | tablica `{ name, areaM2, function, isMezzanine }`, czytana do nowego pola `Project.roomLayout` (celowo NIE `Project.rooms`, bo to pole juz istnieje dzis jako liczba pomieszczen, `lib/data/types.ts`, i oznacza cos innego). Ten sam rodzaj rozwiazania (jsonb, bez nowej tabeli) co juz sankcjonowane `product.technical_specs` (spec 0022), nie `certifications`/`galleryImageUrls` (te sa `text[]`, nie jsonb). Rekomendacja tej specyfikacji: patrz `rationale.md`, sekcja Rationale, dla alternatywy (osobna tabela `product_room`) i dlaczego odrzucona na tym etapie |

Zadne pole z tej tabeli nie zastepuje ani nie zmienia niczego z tabel `product_variant`/`cost_line_item`/`product_timeline_stage` ze spec 0041. `Project.commercial` (dzisiejszy plaski obiekt) zostaje zastapiony przez `Project.variants: ProjectVariant[]` dokladnie w ksztalcie juz naszkicowanym w spec 0041, sekcja Feature design: kazdy wariant niesie `completionStandard`, `priceMin`, `priceMax`, `currency`, `scopeSummary`, `isDefault`, `costLineItems`, `timelineStages`.

**Uklad strony i inwentarz komponentow** (`components/klient/`, chyba ze zaznaczono inaczej). Wybor wariantu zyje w parametrze URL (AC-1), nie w stanie klienckim, wiec wiekszosc tych komponentow zostaje serwerowa, dokladnie jak dzisiejsze `CategoryFilterBar`/`SubcategoryFilterBar` (`components/klient/AGENTS.md`: "filtr, ktory tylko przelacza parametry URL przez `<Link>`, zostaje komponentem serwerowym"):

- `ProjectVariantPicker` (nowy, serwerowy): rzad linkow `<Link href="?wariant=...">` stylizowanych jako przelacznik, jeden na wariant, aktywny wariant podswietlony. Nie trzyma wlasnego stanu, calosc idzie przez ponowne wyrenderowanie strony po stronie serwera z nowym parametrem (AC-1, AC-3).
- `ProjectCostComparisonTable` (nowy, serwerowy, dostaje juz wybrany wariant jako prop z `page.tsx`; jedyny fragment po stronie klienta to checkbox "pokaz tylko roznice", zwykly stan lokalny bez potrzeby przetrwania nawigacji): prawdziwa tabela, nie siatka kart, zeby uniknac wzorca z listy anty wzorcow `PRODUCT.md` ("generyczna strona produktu e commerce, siatka ikon specyfikacji, plaska i zamienna") (AC-2).
- `ProjectRoomLayout` (nowy, serwerowy): tabela pomieszczen (`Project.roomLayout`) plus istniejacy rzut, gdy jest dostepny (AC-4).
- `ProjectLogistics` (nowy, serwerowy): wymiary, fundament, transport, dzwig, szerokosc dzialki. Ten sam zroznicowany uklad co juz istniejacy pasek kluczowych danych w hero (jedna wieksza pozycja plus rzad mniejszych), nie kolejna siatka identycznych kart (AC-5).
- `ProjectTimeline` (nowy, serwerowy, dostaje etapy wybranego wariantu jako prop): pionowa os z kropka i laczaca linia, jeden wiersz na etap, nie karty (AC-6).
- `ProjectGalleryTabs` (rozszerza istniejacy `ProjectGallery`/`ProjectGalleryLightbox`; same zakladki (trzy realne kategorie, AC-7) moga zyc jako serwerowe linki `<Link href="?zakladka=...">` tym samym wzorcem co przelacznik wariantow, tylko podswietlanie aktywnej miniatury i lightbox zostaja klienckie jak dzis w `ProjectGalleryLightbox`): filtruje dokumenty produktu po `purpose` i po tym, czy naleza do wybranego wariantu albo do calego produktu (AC-7, AC-8).
- `ProducerCard` (istniejacy, rozszerzony o trzy nowe pola: mozliwosc odwiedzin, notatke, i tam gdzie dotyczy, linie czasu odpowiedzi; przyjmuje nowy prop okreslajacy czy te pola maja sie pokazac, bo ten sam komponent renderuje sie tez w `ProducerShowcase`, gdzie showroom nie musi byc istotny, patrz Follow-up) (AC-9, AC-10).
- Bez zmian: `ProjectTechnicalSpecs`, `ProjectCertifications`, `ProjectSpecIcons`, `StatusPill`, `Button`, `Card`, `Heading`, `Text`, `DataText`.
- Nie buduje sie w tym spec: osobny komponent na indywidualne opinie o modelu, osobny komponent na podobne domy (AC-15, patrz Follow-up).

**Powierzchnia dostepu do danych** (funkcje asynchroniczne w `lib/data/`, bez wlasnego REST API, zgodnie z regula AGENTS.md):

| Funkcja | Zmiana | Kluczowe wejscie | Kluczowe wyjscie |
|---|---|---|---|
| `getProjectById` | rozszerzona (dokladnie jak juz naszkicowano w spec 0041, plus dwa dodatkowe pola opisane obok) | `id`, `locale` | `Project` z `variants: ProjectVariant[]` (kazdy z `costLineItems`, `timelineStages`) zamiast `commercial`; nowym opcjonalnym `roomLayout: RoomLayout[]`; i nowym `documents: ProjectDocument[]` (kazdy z `url`, `purpose`, opcjonalnym `productVariantId`), potrzebnym zeby AC-7/AC-8 mogly w ogole filtrowac zdjecia po typie i po wariancie, dzis niedostepne przez plaskie `coverImageUrl`/`galleryImageUrls` |
| `getProducerById` | rozszerzona | `producerId` | `Producer` z nowymi opcjonalnymi `inquiryResponseTimeLabel`, `showroomVisitAvailable`, `showroomVisitNote` |

**Kluczowe niezmienniki**:
- Cena i zakres danego wariantu podrozuja po stronie zawsze razem. Zaden fragment strony nie pokazuje ceny bez `scopeSummary` i pozycji kosztowych tego samego wariantu w bezposrednim sasiedztwie.
- Status pozycji kosztowej nigdy nie jest pusty ani domyslnie ustawiany przez warstwe odczytu. Baza juz to wymusza (spec 0041); ta warstwa tylko czyta, nigdy nie koryguje braku.
- Wybor wariantu idzie przez normalna nawigacje Next.js (`<Link href="?wariant=...">`), nie przez stan klienta, zgodnie z regula AGENTS.md o stanie przetrwajacym zmiane trasy. To renderuje strone ponownie po stronie serwera z nowym parametrem, ale bez pelnego, twardego przeladowania przegladarki (ten sam mechanizm co dzisiejsze `CategoryFilterBar`), a wybrany wariant przenosi sie dalej do linku zapytania.
- Zakladka "Realizacje" zawsze sie renderuje (albo zdjecia, albo jawny komunikat), jako jedyny wyjatek od reguly "brak danych, brak sekcji" na tej stronie poza polem odwiedzin osobistych (AC-9).
- Trzy stany `showroom_visit_available` sa zawsze pokazane jako trzy rozroznialne stany interfejsu, nigdy sprowadzone do zwyklego prawda/falsz z cichym domyslnym "nie" dla braku danych.

**Model bezpieczenstwa**: bez zmian wzgledem spec 0020. Strona publiczna, bez logowania, bez danych osobowych.

**Wymagana konfiguracja**: brak nowych zmiennych srodowiskowych ani danych dostepowych.

**Kluczowe scenariusze testowe** (kazdy odpowiada kryterium wyzej):
- Wiele wariantow: produkt z trzema wariantami, wybor kazdego aktualizuje cene, zakres, tabele i podpis galerii bez przeladowania, satisfies **AC-1**, **AC-2**, **AC-12**.
- Jeden albo zero wariantow: pojedynczy blok ceny dla jednego wariantu, `priceOnRequest` dla zera wariantow, satisfies **AC-3**, **AC-11**.
- Uklad domu obecny i nieobecny: sekcja renderuje sie tylko z danymi, satisfies **AC-4**.
- Logistyka czesciowa: produkt z tylko czescia pol logistycznych wypelniona pokazuje wylacznie te pola, satisfies **AC-5**.
- Harmonogram z brakujacym etapem: etap bez wiersza w bazie po prostu sie nie pokazuje, satisfies **AC-6**.
- Galeria bez i z realizacjami: placeholder kontra prawdziwe zdjecia w zakladce Realizacje, satisfies **AC-7**, **AC-8**.
- Trzy stany odwiedzin: `true`, `false`, `null` renderuja trzy rozne komunikaty, satisfies **AC-9**.
- Linia odpowiedzi obecna i nieobecna, satisfies **AC-10**.
- Nawigacja klawiatura przez przelacznik wariantow i zakladki galerii, satisfies **AC-14**.
- Regresja: strona nie renderuje zadnego sladu sekcji podobnych domow ani indywidualnych opinii o modelu, satisfies **AC-15**.

## Build plan

Kolejnosc wedlug podejscia Tracer Bullet epiki Produkcja (`docs/scope/produkcja.md`, swiadomie inne niz domyslny Facade projektu, ten sam wybor co juz w spec 0041): najpierw jeden cienki, dzialajacy od konca do konca plaster, potwierdzony, dopiero potem reszta tresci.

1. Migracja: trzy nowe, opcjonalne kolumny na `producer` (`inquiry_response_time_label`, `showroom_visit_available`, `showroom_visit_note`) plus nowa opcjonalna kolumna `room_layout` (jsonb) na `product`. Czysto addytywne, zero wplywu na dzisiejszy odczyt, satisfies **AC-9**, **AC-10**.
2. Sprzezone zadanie juz zapowiedziane w Follow-up spec 0041: przebudowa `lib/data/projects.ts` (`getProjectById` na jedno zapytanie z zagniezdzonym wynikiem wariantow), `lib/data/types.ts` (`Project.variants` zamiast `Project.commercial`, nowe opcjonalne `Project.roomLayout`, nowe `Project.documents`) i pierwszy przebieg przez `app/[locale]/(customer)/project/[id]/page.tsx` tak, zeby czytal nowy ksztalt bez jeszcze zadnej nowej sekcji wizualnej. Blast radius jest szerszy niz tylko strona projektu: co najmniej `ResultCard`, `PopularHomeCard`, `VerifiedManufacturerProjectCard`, `CompareHomesTeaser`, `FavoriteCompareTable`, `CategoryShowcase`, kreator producenta (kroki cenowe i podsumowania), `lib/db/queries.ts`, `lib/producer-product-actions.ts`, skrypt importu katalogu i fixture'y testowe czytaja dzis `project.commercial` albo bezposrednio siedem starych plaskich kolumn na `product`; pelna, aktualna liste trzeba ponownie wygenerowac wyszukiwaniem w kodzie przy starcie tego zadania w `/develop`, nie zakladac z gory ze to tylko strona projektu. Dopiero po potwierdzeniu wszystkich odbiorcow usuwa sie siedem zbednych plaskich pol z `product`, dokladnie jak przewiduje spec 0041 (nigdy w tym samym wdrozeniu co samo usuniecie kolumn, patrz Migration plan), satisfies **AC-1**, **AC-3**, **AC-11**.
3. Cienki plaster od konca do konca (rdzen Tracer Bullet): `ProjectVariantPicker` w hero (sam przelacznik i zaktualizowany blok ceny), plus pelna `ProjectCostComparisonTable` we wlasnej sekcji "Cena i zakres" zaraz pod hero (kolejnosc z AC-12), zastepujace dzisiejszy pojedynczy blok ceny. Ten plaster jest budowany, weryfikowany na zywo i potwierdzony osobno, zanim reszta tresci ruszy dalej, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-11**, **AC-14**.
4. Dokladanie tresci: `ProjectRoomLayout`, `ProjectLogistics`, `ProjectTimeline`, wstawione w potwierdzonej kolejnosci sekcji, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-12**, **AC-13**.
5. Dokladanie tresci: `ProjectGalleryTabs` z wyjatkiem placeholderu dla zakladki Realizacje, satisfies **AC-7**, **AC-8**.
6. Dokladanie tresci: rozszerzenie `ProducerCard` o trzy stany odwiedzin i notatke, linia odpowiedzi pod przyciskiem zapytania, satisfies **AC-9**, **AC-10**.
7. Testy: Vitest plus Testing Library dla kazdego nowego komponentu (wspollokowane, per `components/klient/AGENTS.md`), aktualizacja testu e2e Playwright dla sciezki wyniki, strona projektu, zapytanie na produkcie z wieloma wariantami w danych testowych, satisfies wszystkie AC.

## Consequences

**Pozytywne**:
- Zamyka dokladnie to ryzyko niezgodnosci ceny i zakresu z katalogu Castora, opisane w rationale spec 0041, tym razem na poziomie interfejsu, nie tylko bazy.
- Strona w koncu pokazuje to, na czym realni producenci (Budman, Cocomodule, Steel House wedlug materialu badawczego) faktycznie sie roznia: logistyke, wlasciciela etapu harmonogramu, dostepnosc odwiedzin, dzis niewidoczne w ogole.
- Ustanawia wzorzec przelacznika wariantow i tabeli porownawczej wielokrotnego uzytku dla przyszlych rodzin produktu (spa, kontenery modulowe).

**Negatywne / kompromisy**:
- Dwie rownoczesne konwencje pustego stanu (domyslne ukrycie plus dwa waskie wyjatki, zakladka Realizacje i trzy stany odwiedzin) to swiadomy, maly wzrost zlozonosci, ktory przyszly inzynier musi znac; odnotowane tu i w Follow-up do ujecia w `components/klient/AGENTS.md`.
- Zmiana ksztaltu `Project.commercial` na `Project.variants` psuje kazdego dzisiejszego odbiorce tego pola naraz (lista w build plan krok 2 jest szersza niz sama strona projektu), dokladnie jak przewidziano w spec 0041; nie da sie tego wdrozyc stopniowo za flaga funkcji, musi wejsc w jednym zadaniu `/develop`, choc jego migracja bazy danych rozbija sie na dwa osobne, bezpieczne wdrozenia (patrz Migration plan).
- Linia odpowiedzi i pola odwiedzin zaleza od recznego, per producent wpisywania danych przez Neon MCP (to samo ograniczenie co spec 0041); wiekszosc producentow pokaze "nieznane" albo nic, dopoki ktos nie wykona tej pracy.
- Podobne domy i indywidualne opinie o modelu jawnie znikaja z zakresu tej decyzji; strona traci te dwa elementy proponowane w materiale badawczym, przynajmniej na razie.

**Neutralne**:
- W pelni reuzywa juz zaakceptowanego schematu ze spec 0041 bez zadnej zmiany w jego tabelach; jedyne nowe kolumny to te cztery opisane w Feature design.
- Zadna nowa biblioteka zewnetrzna nie jest potrzebna; Headless UI (juz zainstalowany, sankcjonowany skill) pokrywa nowe zakladki i przelaczniki.

## Follow-up

- [ ] Podobne domy: wlasna, przyszla decyzja `/architect`, dopiero gdy pojawia sie realne dane uzycia informujace logike doboru (AC-15).
- [ ] Indywidualne opinie tekstowe o konkretnym modelu: ten sam status co podobne domy, wlasna przyszla decyzja, gdy proces zbierania opinii (wskazany w materiale badawczym jako zadanie pozniejszego etapu) zostanie ustalony (AC-15).
- [ ] `docs/scope/produkcja.md`, funkcja 10 ("Tresc i luki funkcjonalne klienta") dzis obejmuje tylko certyfikaty, galerie i prog zgloszenia uproszczonego. Jej linia "Done when" powinna zostac rozszerzona, albo ten spec powinien dostac wlasny wiersz scope, do ustalenia przy najblizszym `/scope`.
- [ ] `PRODUCT.md` i kilka plikow `AGENTS.md` odwoluja sie dzis do sciezki sprzed segmentu grupy tras (`app/[locale]/klient/projekt/[id]`), podczas gdy zywy kod stoi pod `app/[locale]/(customer)/project/[id]/`. To nie jest spowodowane ta decyzja i powinno zostac poprawione przy najblizszym `/sync` albo `/audit`, nie w tym build planie.
- [ ] `components/klient/AGENTS.md` dzis w ogole nie wymienia strony szczegolow projektu wsrod obslugiwanych ekranow. Dodac ja przy najblizszym `/sync`, razem z nowymi komponentami z tej decyzji.
- [ ] Dwa waskie wyjatki od reguly pustego stanu (placeholder Realizacje, trzy stany odwiedzin) powinny trafic do konwencji w `components/klient/AGENTS.md` przy najblizszym `/sync`, zeby przyszly ekran ich nie powielil przypadkowo ani im nie zaprzeczyl.
- [ ] Waluta zostaje EUR/netto, jak juz otwarte w Follow-up spec 0041; ta decyzja tego nie zmienia.
- [ ] Panel zgodnosci prawnej (spec 0020) i `simplifiedPermitEligible` pozostaja bez zmian, dalej pole wpisywane recznie, nie prawdziwy silnik zgodnosci (funkcja 14 epiki Produkcja).
- [ ] `product.room_layout` jest polem jsonb wpisywanym recznie przez Neon MCP, bez wlasnego schematu Zod na granicy aplikacji. Zanim to pole trafi do produkcji, warto dodac dla niego schemat Zod tym samym wzorcem co `lib/product-technical-specs.ts` (spec 0022), zeby zle sformatowany reczny wpis nie zepsul renderu po cichu.
- [ ] `ProducerCard` renderuje sie tez w `ProducerShowcase.tsx`, poza strona projektu. Nowy prop sterujacy widocznoscia pol showroom (AC-9) trzeba swiadomie ustawic w obu miejscach uzycia przy `/develop`, zeby fakt "mozna odwiedzic osobiscie" nie pojawil sie tam, gdzie kontekst tego nie potrzebuje.
- [ ] Wspolny slownik typow pozycji kosztowych (dzis wolny tekst, patrz AC-2 ograniczenie dopasowania "pokaz tylko roznice") jest juz otwartym Follow-up w spec 0041; ta decyzja dziedziczy to samo ograniczenie i nie probuje go rozwiazac.

## Migration plan

**Strategia**: trzy niezalezne fazy, tylko srodkowa jest naprawde sprzezona. Faza 1 (nowe kolumny) jest czysto addytywna i w pelni niezalezna. Faza 2 (przelaczenie odczytu na `Project.variants`) i faza 3 (usuniecie siedmiu starych kolumn) musza isc jako dwa osobne wdrozenia bazy danych mimo ze powstaja w jednym zadaniu `/develop`, bo `npm run db:migrate` uruchamia sie automatycznie w pipeline CI (`AGENTS.md`) przy kazdym wdrozeniu: gdyby usuniecie kolumn wjechalo w tym samym wdrozeniu co zmiana kodu, przy rolling deploy na Vercelu stara instancja serwera moglaby przez chwile czytac kolumne, ktora nowa migracja juz usunela.

**Fazy**:
1. Migracja addytywna: cztery nowe, opcjonalne kolumny (`producer.inquiry_response_time_label`, `producer.showroom_visit_available`, `producer.showroom_visit_note`, `product.room_layout`). Zero wplywu na dzisiejszy odczyt, wchodzi niezaleznie od reszty.
2. Wdrozenie kodu: `lib/data/types.ts`, `lib/data/projects.ts` i kazdy odbiorca z rozszerzonej listy w build plan krok 2 przechodza razem na `Project.variants`, `Project.roomLayout`, `Project.documents`, w jednym zadaniu `/develop`, ale stare siedem kolumn na `product` na razie zostaje w bazie (kod po prostu przestaje je czytac).
3. Osobna migracja usuwajaca: dopiero po potwierdzeniu na zywo, ze wdrozenie z fazy 2 dziala poprawnie, osobne wdrozenie usuwa siedem starych kolumn z `product`, dokladnie jak przewiduje spec 0041 Migration plan.

**Wycofanie**: faza 1 wycofuje sie przez usuniecie czterech nowych kolumn, bez ryzyka utraty danych, bo nic jeszcze do nich nie pisze. Faza 2 wycofuje sie zwyklym cofnieciem commita, bo stare kolumny nadal istnieja w bazie przez cala te faze. Faza 3 (usuniecie kolumn) jest jedynym nieodwracalnym krokiem, dokladnie jak juz odnotowano w spec 0041: cofniecie wymaga odtworzenia kolumn z kopii zapasowej, dlatego wchodzi dopiero po potwierdzeniu fazy 2 na produkcji, nigdy razem z nia.

**Ryzyka**: to samo ryzyko sprzezenia co juz opisane w spec 0041 (czesciowe wdrozenie, w ktorym kod czyta `commercial` a kolumny juz nie ma, albo odwrotnie), zlagodzone przez rozdzielenie fazy 2 i fazy 3 na dwa osobne wdrozenia bazy danych, nigdy jedno. Dodatkowe ryzyko unikalne dla tej decyzji: lista odbiorcow `project.commercial` w build plan krok 2 jest sporzadzona dzis, ale moze byc niepelna do czasu ponownego wyszukania w kodzie tuz przed `/develop`; pominiety odbiorca zepsulby sie cicho dopiero w czasie wykonania, nie na etapie budowy TypeScript, jesli korzysta z typu `any` albo z surowego dostepu do pola.

## Rationale

Pelne uzasadnienie, rozwazane opcje i material dowodowy: patrz `rationale.md`.
