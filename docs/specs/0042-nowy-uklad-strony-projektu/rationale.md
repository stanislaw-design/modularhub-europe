# 0042. Rationale: Nowy uklad strony projektu

## Context

> Uwaga wstepna: ten temat obejmuje kilka powiazanych, w zasadzie niezaleznie budowalnych elementow (integralnosc ceny i wariantu, uklad pomieszczen, logistyka dzialki, harmonogram, rozroznienie zdjec, zaufanie do producenta). Zamiast dzielic to na kilka osobnych spec, ta decyzja trzyma je razem w jednym dokumencie, z rozmowy projektowej: inzynier swiadomie wybral jeden pelny spec z build planem w kolejnosci Tracer Bullet, po przedstawieniu alternatywy (osobny, waski spec tylko na poprawke P0). Powod tej decyzji jest konkretny: wszystkie te elementy czytaja ten sam, juz zaakceptowany model danych ze spec 0041 (warianty niosa wlasne pozycje kosztowe i etapy harmonogramu), wiec projektowanie ich osobno oznaczaloby wielokrotne odwolywanie sie do tego samego kontraktu danych. Dwa elementy z materialu badawczego (podobne domy, indywidualne opinie o modelu) zostaly mimo to swiadomie wyciete z zakresu, bo wymagaja wlasnej, nowej logiki dopasowania albo procesu zbierania danych, ktorego dzis nie ma; patrz Follow-up w `index.md`.

Strona szczegolow projektu klienta (`app/[locale]/(customer)/project/[id]/page.tsx`, zaprojektowana pierwotnie w spec 0020) dzis pokazuje jeden standard wykonania i jedna pare `priceMin`/`priceMax` na caly produkt, w polu `Project.commercial`. To nie oddaje tego, jak realnie sprzedaja domy modulowi producenci: ten sam fizyczny dom bywa oferowany w kilku standardach wykonczenia naraz, kazdy z inna, pelna cena i inna lista tego co wchodzi w zakres.

Material badawczy z 12.09.2026 (`docs/research/2026-09-12-karta-projektu-research.md` i towarzyszaca rekomendacja kliencka) nazwal to najpilniejszym problemem do naprawienia: katalog Castora pokazuje model z dwiema realnymi, kompletnymi ofertami na ten sam dom (stan surowy zamkniety za 207 000 zl netto i stan wykonczony za 309 900 zl netto), a historyczny manifest importu zapisal je jako jeden produkt z cena minimum/maksimum i lista wyposazenia wzieta z bogatszego standardu. Ten sam material badawczy zaowocowal juz decyzja o bazie danych, spec 0041 (zaakceptowany tego samego dnia), ktory dodal tabele `product_variant`, `cost_line_item` i `product_timeline_stage` dokladnie po to, zeby ten blad stal sie niemozliwy na poziomie schematu. Spec 0041 sam w swoim Follow-up zostawil otwarte dokladnie to, co ta decyzja teraz zamyka: "przebudowac strone odczytu na nowe tabele, w jednym, sprzezonym zadaniu razem z usunieciem starych pol".

Do tego dochodza mniejsze, ale realne luki potwierdzone w kodzie i w tym samym materiale badawczym: strona nie pokazuje ukladu pomieszczen w ogole, logistyka dzialki (wymiary transportowe, wymagania dzwigu, minimalna szerokosc) nie ma zadnego pola w modelu, harmonogram nie mowi kto za dany etap odpowiada, galeria nie rozroznia wizualizacji od prawdziwych zdjec z realizacji, a dane `family`/`category` (przeznaczenie domu) juz istnieja w modelu `Project`, ale strona ich nigdy nie renderuje.

`PRODUCT.md` tego projektu niesie juz sekcje zasad projektowych napisana konkretnie dla tej strony: pokazac dom przed arkuszem danych, kazdy szczegol techniczny odpowiada na niewypowiedziane zastrzezenie kupujacego, jedna hierarchia na strone (cena i glowne wezwanie do dzialania jako kotwica), zaufanie przez jasnosc a nie dekoracje. Ten sam dokument wprost odrzuca dwa wzorce jako punkty odniesienia: generyczna strone produktu e commerce (siatka ikon specyfikacji, plaska i zamienna, brak napiecia) i prospekt inwestycyjny dewelopera (sztywna tabela danych technicznych bez zadnego rejestru emocjonalnego). Material zrodlowy z 12.09.2026 byl szkicem interaktywnym, jawnie oznaczonym jako "nie wdrozone", ktory dobrze uzasadnia CO powinno znalezc sie na stronie (tresc, priorytety P0/P1/P2, konkretne luki danych), ale jego wlasna warstwa wizualna (powtarzalne siatki kart, obwodki akcentowe z lewej krawedzi na adnotacjach) byla scelowo prowizoryczna, przeznaczona dla statycznego pliku bez frameworka, i nie jest tym, co ta decyzja przenosi wprost do kodu.

Zapis danych do bazy pozostaje reczny przez Neon MCP (decyzja juz przyjeta w funkcjach 7 i 9 epiki Produkcja), nie przez formularz producenta. To ogranicza tempo, w jakim nowe, opcjonalne pola (odpowiedz czasowa, mozliwosc odwiedzin, uklad pomieszczen) faktycznie wypelnia sie realnymi danymi; wiekszosc z nich pokaze stan "nieznane" albo zniknie, dopoki ktos rocznie tego nie uzupelni.

## Options considered

### Opcja 1: Napraw w miejscu, bez wiekszej przebudowy

Rozszerzyc dzisiejsza strone przyrostowo: dodac przelacznik wariantow do istniejacego bloku ceny, dopisac brakujace pola tam gdzie latwo (odznaka przeznaczenia), zostawic reszte wizualnych wzorcow strony bez zmian.

**Pros**:
- Najmniejsza mozliwa zmiana wizualna, najnizsze ryzyko regresji na juz dzialajacej stronie.
- Szybciej do wdrozenia niz pelna przebudowa sekcji.

**Cons**:
- Nie daje miejsca na logistyke, harmonogram z odpowiedzialnym wykonawca ani rozroznienie zdjec, bo dzisiejszy uklad sekcji po prostu nie ma na to miejsca bez przemyslenia kolejnosci od nowa.
- Zostawia strone w stanie, ktory `PRODUCT.md` wprost nazywa ryzykiem: dane techniczne bez emocjonalnego uzasadnienia, dorzucane tam gdzie sie zmiescily, zamiast w kolejnosci odpowiadajacej realnym pytaniom kupujacego.

### Opcja 2: Przebudowa w miejscu, cienki plaster na start (wybrana)

Przeprojektowac strone pod tym samym adresem, w kolejnosci ktora najpierw stawia i potwierdza jeden dzialajacy, kompletny plaster (integralnosc ceny i wariantu), a dopiero potem dokleja kolejne sekcje tresci, az do pelnego zestawu z materialu badawczego (minus dwa swiadomie wyciete elementy).

**Pros**:
- Zaden rownolegly adres do utrzymania ani do porzucenia pozniej; produkt jest wciaz w fazie Facade/Produkcja bez prawdziwego ruchu klientow, wiec koszt przelaczenia w miejscu jest niski.
- Kolejnosc Tracer Bullet (cienki plaster, potem grubienie) daje szanse zlapac problem integracji z nowym modelem danych ze spec 0041 wczesnie, na najmniejszym mozliwym wycinku, zanim szesc kolejnych komponentow zacznie na nim polegac.
- Zgodna z deklarowanym podejsciem epiki Produkcja (Tracer Bullet), tym samym co juz zastosowany w spec 0041.

**Cons**:
- Strona przez pewien czas (miedzy krokiem 3 a krokiem 6 build planu) jest wizualnie niekompletna wzgledem docelowego ksztaltu, co wymaga dyscypliny, zeby nie zatrzymac sie w polowie.
- Wiekszy jednorazowy koszt review i testow niz Opcja 1, bo zmienia sie ksztalt calej sekcji komercyjnej naraz.

### Opcja 3: Nowa wersja strony pod osobnym adresem, przelaczenie na koniec

Zbudowac cala nowa strone (na przyklad `/project/[id]/v2`), rozwijac ja niezaleznie od produkcyjnej wersji, przelaczyc ruch dopiero gdy kompletna, potem usunac stara.

**Pros**:
- Zero ryzyka dla dzisiejszej, dzialajacej strony przez caly czas budowy nowej.
- Latwe porownanie starej i nowej wersji obok siebie podczas budowy.

**Cons**:
- Prawdziwy wzorzec strangler ma sens przy realnym ruchu produkcyjnym, ktorego dzis nie ma (etap Facade, katalog przykladowy plus pierwsi reczni producenci); tutaj to czysty koszt dodatkowy bez odpowiadajacej korzysci.
- Podwaja tymczasowo powierzchnie kodu do utrzymania (dwie strony czytajace ten sam, nowy model danych ze spec 0041) bez zadnego uzytkownika, ktory by na tym skorzystal w miedzyczasie.

## Rationale

Wybrano Opcje 2, bo jest to jedyna z trzech, ktora jednoczesnie domyka realne ryzyko nazwane w materiale badawczym (integralnosc ceny i wariantu, patrz Context) i trzyma sie deklarowanego podejscia budowy epiki Produkcja, Tracer Bullet, juz raz zastosowanego w bezposrednio powiazanej decyzji (spec 0041). Opcja 1 zostala odrzucona, bo `PRODUCT.md`'s zasady projektowe dla tej konkretnej strony (dom przed arkuszem danych, kazdy szczegol odpowiada na zastrzezenie) wymagaja przemyslenia kolejnosci sekcji od nowa, nie tylko dolozenia pol do istniejacego ukladu. Opcja 3 zostala odrzucona, bo koszt operacyjny wzorca strangler (dwie rownolegle strony) nie ma dzis odpowiadajacej korzysci: produkt jest wciaz w fazie przedprodukcyjnej bez realnego ruchu klientow, ktorego trzeba by chronic.

Inzynier w rozmowie projektowej potwierdzil pelny zakres tresci (wszystkie osiem sekcji z materialu badawczego minus dwie swiadomie wyciete) zamiast dzielic go na kilka osobnych spec, dokladnie z tego samego powodu co spec 0041 potwierdzil pelny zakres modelu danych naraz: sekcje sa ze soba powiazane przez ten sam kontrakt danych (warianty), wiec projektowanie ich osobno oznaczaloby wielokrotne odwolywanie sie do tego samego schematu w krotkich odstepach czasu.

Dwa swiadome wyjatki od reguly "brak danych, brak sekcji" (zakladka Realizacje, trzy stany dostepnosci odwiedzin) zostaly wybrane zamiast prostego ukrycia, bo w obu przypadkach cichy brak sekcji byloby myllace, nie tylko niekompletne: kupujacy moglby zalozyc, ze wizualizacja jest zdjeciem z budowy, albo ze brak informacji o odwiedzinach znaczy "nie mozna". Material badawczy z 12.09.2026 sam doszedl do tego samego wniosku dla zakladki Realizacje (jawny komunikat "do uzupelnienia przez producenta"), co zostalo tu przyjete wprost, tym razem jako realny komponent aplikacji, nie jako opis w statycznym szkicu.

Dla ukladu pomieszczen (`room_layout`) rozwazono tez osobna tabele `product_room` (jeden wiersz na pomieszczenie, z wlasnym kluczem obcym do produktu), analogicznie do `product_variant`. Odrzucono to na rzecz opcjonalnego pola jsonb na `product`, bo uklad pomieszczen, w odroznieniu od wariantow czy pozycji kosztowych, nie potrzebuje dzis wlasnych zapytan przekrojowych (nikt nie planuje wyszukiwac projektow po nazwie konkretnego pomieszczenia). Wlasciwym precedensem w tym projekcie jest `product.technical_specs` (jsonb, walidowane Zodem na granicy aplikacji, spec 0022), nie `certifications`/`galleryImageUrls` (te sa `text[]`, prostsza struktura bez zagniezdzonych obiektow). Ta specyfikacja korzysta z tego samego rodzaju rozwiazania co `technical_specs`, ale sam schemat Zod dla `room_layout` zostaje otwartym zadaniem do wykonania przed produkcyjnym uzyciem, patrz Follow-up w `index.md`. Gdyby w przyszlosci uklad pomieszczen mial sie roznic miedzy wariantami tego samego produktu (dzis zalozono, ze jest wspolny dla calego produktu), warto bedzie wrocic do tej decyzji.

Dla galerii zdjec (AC-7, AC-8) rozwazono tez zostawienie dzisiejszego plaskiego ksztaltu (`coverImageUrl`/`galleryImageUrls: string[]`, bez informacji o typie dokumentu) i budowanie zakladek wylacznie po kolejnosci URL-i albo po nazwie pliku. Odrzucono to natychmiast: nie da sie w ten sposob wiarygodnie odroznic wizualizacji od prawdziwego zdjecia z realizacji, czyli dokladnie problemu ktory AC-7/AC-8 ma rozwiazac. Zamiast tego `getProjectById` musi zwracac pelny obiekt dokumentu (`url`, `purpose`, opcjonalny `productVariantId`) juz istniejacy w tabeli `document` po spec 0041, nie tylko liste adresow URL.

## References

**Project sources** (weryfikowalne, w tym repozytorium):
- `docs/specs/0041-model-danych-karty-projektu/index.md` i `rationale.md`, juz zaakceptowany model danych (`product_variant`, `cost_line_item`, `product_timeline_stage`) ktory ta decyzja konsumuje bez zmian.
- `docs/specs/0020-strona-szczegolow-projektu/index.md`, dzisiejsza strona i jej reguly (AC-4, brak danych rowna sie brak sekcji; AC-5, `priceOnRequest`).
- `docs/research/2026-09-12-karta-projektu-research.md`, material badawczy stojacy za obiema decyzjami (0041 i ta).
- `PRODUCT.md`, sekcja zasad projektowych napisana konkretnie dla tej strony, i lista anty wzorcow.
- `docs/scope/produkcja.md`, funkcja 36 (model danych, zamknieta) i funkcja 10 (tresc i luki funkcjonalne klienta, dzis wezsza niz ta decyzja, patrz Follow-up w `index.md`).
- `components/klient/AGENTS.md` i `components/ui/AGENTS.md`, konwencje komponentow (serwerowy domyslnie, `"use client"` tylko dla realnego stanu klienckiego; prymitywy przez `tailwind-variants`).

**Practices & standards**:
- Wzorzec Tracer Bullet (cienki, dzialajacy od konca do konca plaster jako pierwszy krok, potem grubienie), przyjety jako deklarowane podejscie epiki Produkcja.
- Bezpieczna kolejnosc migracji produkcyjnej (dodaj kolumne jako opcjonalna, potem przelacz kod, potem dopiero usun stare pole), zastosowana w Migration plan.
- Wspoldzielone prawa projektowe skilla `impeccable` (zakaz identycznych siatek kart jako domyslnej odpowiedzi, zakaz obwodek akcentowych z boku jako ozdoby, hierarchia przez skale i kontrast wagi, nie przez dekoracje), zastosowane przy doborze ukladu nowych sekcji (tabela zamiast siatki kart, pionowa os zamiast kart na harmonogram).
