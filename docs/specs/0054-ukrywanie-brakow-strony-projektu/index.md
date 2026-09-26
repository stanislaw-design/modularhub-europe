# 0054. Ukrywanie brakow na stronie projektu

**Date**: 2026-09-25
**Status**: In Progress

## Summary

Strona szczegolow projektu klienta dzis w siedmiu miejscach pokazuje jawny placeholder "do uzupelnienia", gdy jakiejs danej brakuje: brakujacy standard wykonania, pojedyncze pole logistyki, etap harmonogramu, dokument, pytanie FAQ, czas odpowiedzi producenta. Ta decyzja odwraca to na jedna, spojna zasade: czego nie ma, tego strona nie pokazuje, a to co jest, uklada sie tak, zeby wygladalo dobrze samo w sobie, bez pustych miejsc czekajacych na uzupelnienie. Jeden wyjatek zostaje swiadomie: trzy rozne odpowiedzi producenta o mozliwosci odwiedzin (tak, nie, jeszcze nie ustalone) nadal pokazuja sie wszystkie, bo "nieustalone" to prawdziwa odpowiedz, nie brakujaca dana.

## Context

Zobacz [rationale.md](rationale.md).

## Requirements

**Historie uzytkownika**:
- Jako klient przegladajacy karte projektu, chce widziec tylko standardy wykonania, ktore producent faktycznie wycenil, ulozone czytelnie niezaleznie od tego, czy jest ich jeden, dwa czy trzy, zamiast pustych kolumn "do uzupelnienia".
- Jako klient, chce widziec tylko te fakty o logistyce, harmonogramie, dokumentach i producencie, ktore sa faktycznie podane, zeby strona nie wygladala na niedokonczona przy kazdym produkcie, ktory ma mniej danych niz maksimum.
- Jako klient sprawdzajacy mozliwosc odwiedzin producenta, chce nadal jasno widziec, czy to "tak", "nie" czy "jeszcze nie ustalone", bo to realna roznica przy podejmowaniu decyzji.

**Kryteria akceptacji** (kontrakt, kazde niezaleznie sprawdzalne):
- **AC-1**: `lib/data/project-variants.ts#getDisplayProjectVariants` i ksztalt `isPlaceholder` na `ProjectVariant` sa usuniete. `ProjectVariantPicker`, `ProjectVariantSelect` (wybor mobilny) i `ProjectCostComparisonTable`, oraz strona `app/[locale]/(customer)/project/[id]/page.tsx`, czytaja `project.variants` (tylko prawdziwe wiersze `product_variant`) wprost, nigdy syntetyczny placeholder za brakujacy standard.
- **AC-2**: Tabela cena/zakres i przelacznik standardow (zakladki desktop, lista mobile) ukladaja dokladnie tyle kolumn/zakladek, ile jest prawdziwych wariantow (1, 2 albo 3), nigdy dopelnione do trzech pusta albo placeholderowa kolumna/zakladka.
- **AC-3**: Gdy projekt ma dokladnie jeden prawdziwy wariant, przelacznik standardow nadal renderuje ten jeden wariant jako widoczna, niekliklana "biezaca" zakladke (albo jedyna opcje w liscie mobilnej), dla spojnosci ukladu z projektami majacymi dwa albo trzy warianty; nie znika calkowicie.
- **AC-4**: Galaz karty ceny w hero dla "wybrany przez URL standard nie ma jeszcze wiersza `product_variant`" (dzisiejszy tekst `scopeToBeCompleted` plus pigulka "do uzupelnienia") jest usunieta jako nieosiagalna, dzieki fallbackowi z AC-9 nizej; teraz nieuzywane klucze tresci (`scopeToBeCompleted` i pokrewne) znikaja z `messages/{pl,en,de,nl}.json`.
- **AC-5**: `ProjectLogistics` renderuje `externalDimensions` i `foundationOptions` kazde niezaleznie, tylko gdy ma prawdziwa wartosc; pole bez wartosci nie renderuje swojego wiersza (ikony, etykiety ani pigulki "do uzupelnienia"), a siatka dwoch pol przeklada sie na tyle kolumn, ile pol ma wartosc (jedna kolumna, gdy tylko jedno jest wypelnione; dzisiejsze dwie kolumny, gdy oba sa).
- **AC-6**: `ProjectTimeline` renderuje tylko te etapy harmonogramu (z piatki: formalnosci, produkcja, transport, montaz, wykonczenie), dla ktorych wybrany wariant ma wiersz, w ich dzisiejszej chronologicznej kolejnosci; laczaca linia biegnie tylko miedzy wyrenderowanymi etapami, etap bez wiersza nie pokazuje kropki placeholderowej.
- **AC-7**: `ProjectDocumentsAndFaq` renderuje kazdy z dwoch niezaleznych blokow (pobranie PDF specyfikacji, akordeon FAQ) tylko wtedy, gdy ma prawdziwa tresc; blok bez tresci nie pokazuje juz swojej pigulki "do uzupelnienia" ani tekstu zastepczego.
- **AC-8**: Cala sekcja strony ("Cena i zakres", "Logistyka dzialki", "Harmonogram", "Dokumenty i pytania"), ktora po zastosowaniu AC-2, AC-5, AC-6, AC-7 nie mialaby zadnej prawdziwej tresci (zero wariantow; oba pola logistyki i wymagania klienta puste; zero etapow harmonogramu; ani specyfikacja, ani zadne pytanie FAQ), nie renderuje sie w ogole, naglowek wlacznie; jej pozycja w `ProjectSectionNav` dostaje wtedy `disabled`, dokladnie tak jak dzisiejsza pozycja "Podobne domy", zamiast zniknac z paska.
- **AC-9**: Wartosc parametru `?wariant=`, ktora nie pasuje do zadnego prawdziwego standardu projektu (nieaktualny link, albo standard, ktory producent od tego czasu usunal), jest ignorowana; strona wraca do tego samego domyslnego prawdziwego wariantu, co przy braku parametru w ogole (`is_default`, w jego braku pierwszy wedlug `sort_order`). Strona nigdy nie rozwiazuje wybranego wariantu do placeholdera ani do `undefined` z powodu nieaktualnego parametru.
- **AC-10**: Wiersz czasu odpowiedzi producenta w `ProducerCard` renderuje sie tylko wtedy, gdy `producer.inquiryResponseTimeLabel` ma wartosc; brak wartosci oznacza brak calego wiersza (etykiety i pigulki), nie pigulke "do uzupelnienia".
- **AC-11**: Trzy rozroznialne stany `producer.showroomVisitAvailable` (tak / nie / nieustalone) zostaja dokladnie takie jak dzis, bez zadnej zmiany zachowania, bo to prawdziwa trzecia odpowiedz biznesowa, nie brakujaca dana do uzupelnienia; zmienia sie wylacznie tresc trzeciego stanu w `messages/{pl,en,de,nl}.json`, tak zeby jednoznacznie mowila "do ustalenia z producentem" zamiast dzisiejszego sformulowania.
- **AC-12**: Zaden test, fixture ani ekran nie odwoluje sie juz do usunietego ksztaltu `isPlaceholder`, do tekstu "do uzupelnienia"/`scopeToBeCompleted` na ktorymkolwiek z siedmiu miejsc wyzej, ani do statycznej (niezaleznej od realnej zawartosci) listy pozycji `ProjectSectionNav`.

## Decision

**Wybrana opcja**: Opcja 2 (rationale.md): jedna zasada "czego nie ma, tego nie pokazuj" na calej stronie produktu, plus regula wyzsza: sekcja bez prawdziwej tresci znika calkowicie, z wyjatkiem trzystanowej odpowiedzi o mozliwosci odwiedzin producenta.

## Rationale

Zobacz [rationale.md](rationale.md).

## Feature design

**Podejscie budowy**: Tracer Bullet (domyslne w epice Produkcja, `docs/scope/produkcja.md`, ten sam wzorzec co spec 0051/0050). Nie ma tu jednak wielu warstw do przeciagniecia cienkim platrem: to wylacznie zmiana renderu nad juz istniejacymi polami, bez migracji bazy i bez nowej powierzchni serwerowej. Kolejnosc budowy idzie wiec od wspoldzielonej warstwy danych (zadanie 1, bo cztery kolejne komponenty od niej zaleza), przez przyklad wprost wskazany w rozmowie (przelacznik i tabela cena/zakres), do pozostalych, niezaleznych od siebie komponentow, konczac na sprzataniu.

**Szkic modelu danych**: Bez zmian. Zadna kolumna ani tabela sie nie zmienia; to wylacznie inny render nad `project.variants`, `project.roomLayout`, `producer.inquiryResponseTimeLabel` i pokrewnymi polami, ktore juz dzis istnieja i juz dzis sa odczytywane.

**Kluczowe niezmienniki**:
- Standard wykonania bez wiersza `product_variant` jest niewidoczny wszedzie na stronie produktu; nigdy nie renderuje sie jako wylaczona zakladka placeholder.
- Pojedyncze brakujace pole na istniejacym elemencie (fakt zaufania producenta, wymiar logistyki, etap harmonogramu) jest niewidoczne samo w sobie, bez ukrywania sasiednich pol wokol niego.
- Sekcja bez zadnej prawdziwej tresci znika calkowicie, wraz ze swoja pozycja w `ProjectSectionNav`, zamiast renderowac pusta ramke pod naglowkiem.
- Trzystanowa odpowiedz o mozliwosci odwiedzin producenta jest wyjatkiem: `null` nadal sie renderuje, odroznialny od `false`, zmienia sie tylko tresc.

**Model bezpieczenstwa**: Bez zmian; to wylacznie zmiana tego, co sie renderuje z juz widocznych dla klienta danych, bez zadnej zmiany uprawnien ani wlasnosci.

**Wymagana konfiguracja**: Brak nowych zmiennych srodowiskowych ani danych dostepowych.

**Krytyczne scenariusze testowe** (kazdy odpowiada kryterium wyzej):
- Projekt z jednym prawdziwym wariantem: tabela cena/zakres pokazuje jedna kolumne, przelacznik pokazuje jedna niekliklana zakladke, hero nigdy nie wchodzi w galaz "do uzupelnienia". Weryfikuje **AC-2, AC-3, AC-4**.
- Projekt z dwoma z trzech standardow (np. brak "deweloperski"): tabela i przelacznik pokazuja dokladnie dwie kolumny/zakladki, nic dla brakujacego standardu. Weryfikuje **AC-1, AC-2**.
- Nieaktualny `?wariant=deweloperski` na projekcie bez tego standardu: strona wraca do domyslnego prawdziwego wariantu zamiast bledu albo placeholdera. Weryfikuje **AC-9**.
- Projekt z wypelnionym `externalDimensions`, pustym `foundationOptions`: sekcja logistyki pokazuje jedno pole w jednej kolumnie, zaden placeholder dla fundamentu. Weryfikuje **AC-5**.
- Projekt z pustymi wszystkimi trzema polami logistyki (oba wymiary i wymagania klienta): cala sekcja "Logistyka dzialki" i jej pozycja w nawigacji znikaja. Weryfikuje **AC-5, AC-8**.
- Wariant z dwoma z pieciu etapow harmonogramu: linia laczy tylko te dwa etapy, w kolejnosci. Weryfikuje **AC-6**.
- Produkt bez PDF specyfikacji i bez zadnego pytania FAQ: cala sekcja "Dokumenty i pytania" znika. Weryfikuje **AC-7, AC-8**.
- Producent bez `inquiryResponseTimeLabel`, z `showroomVisitAvailable = null`: wiersz czasu odpowiedzi znika calkowicie, wiersz odwiedzin nadal pokazuje trzeci stan z nowa trescia "do ustalenia". Weryfikuje **AC-10, AC-11**.

## Build plan

1. `lib/data/project-variants.ts`: usuniecie `getDisplayProjectVariants` i ksztaltu `isPlaceholder`; dodanie fallbacku `?wariant=` do domyslnego prawdziwego wariantu, gdy parametr nie pasuje do zadnego prawdziwego standardu. satisfies **AC-1, AC-9**
2. `ProjectVariantPicker.tsx`, `ProjectVariantSelect.tsx`: usuniecie galezi `isPlaceholder` (wylaczona zakladka), render dokladnie prawdziwych wariantow; jeden wariant renderuje sie jako pojedyncza, niekliklana biezaca zakladka. satisfies **AC-2, AC-3**
3. `ProjectCostComparisonTable.tsx`: usuniecie galezi `isPlaceholder` (naglowek kolumny i karta mobilna), siatka zawsze odpowiada `variants.length`. satisfies **AC-2**
4. `app/[locale]/(customer)/project/[id]/page.tsx`: usuniecie galezi karty ceny w hero dla "standard bez wiersza" (nieosiagalna po zadaniu 1); przelaczenie wywolan z `getDisplayProjectVariants` na `project.variants`; wpiecie dynamicznego `disabled` na pozycjach `ProjectSectionNav` na podstawie policzonej pustki kazdej sekcji z zadan 5 do 7. satisfies **AC-4, AC-8**
5. `ProjectLogistics.tsx`: niezalezne ukrywanie kazdego pola, przelozenie siatki na 1 albo 2 kolumny; cala sekcja zwraca `null`, gdy oba pola i wymagania klienta sa puste. satisfies **AC-5, AC-8**
6. `ProjectTimeline.tsx`: render tylko etapow z wierszem, laczaca linia tylko miedzy nimi; cala sekcja zwraca `null`, gdy wybrany wariant ma zero etapow. satisfies **AC-6, AC-8**
7. `ProjectDocumentsAndFaq.tsx`: kazdy z dwoch blokow ukrywa sie niezaleznie przy braku tresci; cala sekcja zwraca `null`, gdy oba sa puste. satisfies **AC-7, AC-8**
8. `ProducerCard.tsx`: usuniecie galezi placeholder czasu odpowiedzi (caly wiersz znika przy braku wartosci); przeformulowanie trzeciego stanu odwiedzin w `messages/{pl,en,de,nl}.json` na "do ustalenia z producentem". satisfies **AC-10, AC-11**
9. Testy i sprzatanie: aktualizacja `ProjectVariantPicker.test.tsx`, `ProjectCostComparisonTable.test.tsx`, `ProjectLogistics.test.tsx`, `ProjectTimeline.test.tsx`, `ProjectDocumentsAndFaq.test.tsx`, `ProducerCard.test.tsx` i testow strony `/project/[id]`; usuniecie martwych kluczy tresci (`scopeToBeCompleted` i pokrewne) z `messages/*.json`. satisfies **AC-12**

## Consequences

**Pozytywne**:
- Jedna, przewidywalna zasada na calej stronie produktu zamiast szesciu niezaleznie wypracowanych wyjatkow; klient widzi zawsze tylko to, co producent faktycznie podal.
- Produkty z mniejsza iloscia wypelnionych danych wygladaja na celowo prostsze, nie na zepsute albo porzucone w polowie.
- Zero migracji bazy, zero nowej powierzchni serwerowej; ryzyko wdrozenia ograniczone do warstwy renderu, w pelni odwracalne samym rewertem commitu.

**Negatywne / kompromisy**:
- Znika dzisiejszy, przypadkowy efekt uboczny "widac od razu na karcie klienta, ze producent czegos nie uzupelnil"; jesli ten sygnal byl faktycznie uzywany do popychania producentow do uzupelniania danych, potrzebuje swiadomego zamiennika w panelu producenta (patrz Follow-up), bo ta decyzja go nie zastepuje.
- Wiecej miejsc do zmiany naraz (siedem komponentow plus strona) niz punktowa poprawka jednej tabeli; wiecej powierzchni do zlamania istniejacych testow w jednym build planie.
- `ProjectSectionNav` potrzebuje teraz dynamicznie liczonej pustki trzech sekcji zamiast statycznej listy pozycji, wiec strona (`page.tsx`) musi policzyc te trzy warunki przed zbudowaniem paska nawigacji, nie tylko przekazac je dalej.

**Neutralne**:
- `ProjectRoomLayout` (uklad domu) i logika `priceOnRequest` juz dzis stosuja dokladnie te sama zasade "brak danych, brak elementu"/"wycena indywidualna to prawdziwy stan, nie brak danych"; ta decyzja ich nie dotyka.
- Pigulka statusu "do wyceny" na pozycjach kosztowych w tabeli porownawczej (`cost_line_item.status`) zostaje bez zmian: to prawdziwy, jawnie wybrany status pozycji, nie brakujaca dana o calym wariancie.

## Follow-up

- [ ] `docs/specs/0042-nowy-uklad-strony-projektu/index.md`: dopisac przy AC-3, AC-5, AC-6, AC-10 adnotacje, ze te kryteria sa doprecyzowane/rozszerzone przez te specyfikacje (AC-3 z jedna swiadoma zmiana: pojedynczy wariant zostaje widoczny jako niekliklana zakladka, nie znika calkowicie); wykonane razem z ta specyfikacja.
- [ ] Rozwazyc osobna, przyszla decyzje: jawny sygnal "produkt niekompletny" w panelu producenta (katalog/edycja produktu), zamiast na publicznej karcie klienta, zeby nie stracic calkowicie motywacji do uzupelniania danych, ktora dzisiejszy placeholder przypadkiem dawal.
- [ ] Przy najblizszym `/scope`: dopisac te poprawke do `docs/scope/produkcja.md`, funkcja 37 (ten sam wiersz co spec 0042, bo dotyczy dokladnie tej samej strony i przywraca czesc jej pierwotnych kryteriow), zamiast zakladac osobna funkcje.
