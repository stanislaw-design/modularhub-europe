# 0082. Rationale: kraj jako informacja zamiast filtra prawnego

## Context

> ⚠️ Premise note: Pierwotne ujęcie brzmiało „pokazujemy klientowi, czy projekt jest zgodny z prawem kraju”. To obietnica, której dane nie dotrzymują. Projekty w katalogu są ogólne (nie robione pod kraj ani działkę), a wiersze dopuszczeń w bazie dla czterech producentów (Steel House 26, Castor 20, Perfect Cube 18, Budman 13, razem 77 domów) mają identyczne zdania („zgodne z DIN”, „spełnia BENG”) i status `approved` bez oceny konkretnego domu. Tabela ocen per przepis ma w bazie deweloperskiej jeden wiersz. Pokazywanie tego klientowi to ryzyko wizerunkowe i prawne, a nie funkcja. Właściwe ujęcie: kraj to informacja dla zespołu, a ocena zgodności należy do oferty, gdzie robi ją człowiek.

Kraj dziś działa w kilku rolach naraz. Na stronie głównej jest wymagany do szukania. W wynikach ukrywa produkty z wierszem `blocked` i dopisuje do nagłówka „Dopuszczone prawnie”. W zapytaniu jest wymagany jako kraj działki. U producenta jest listą krajów dostawy, która dawniej sterowała dopasowaniem przetargu. W przetargu (spec 0070, 2026-10-13) kraj dostawy już nie jest warunkiem dopasowania, ale tekst w panelu producenta nadal mówi odwrotnie.

Liczba użytkowników na starcie jest mała i nie uzasadnia budowy własnej weryfikacji zgodności. Wiele zasad lokalnych zależy od działki, a nie od modelu. Lista krajów jest zaszyta w kodzie jako literał `PL, DE, NL` w co najmniej sześciu plikach, choć baza zna już sześć krajów (migracja 0061), a lista krajów dla ocen zgodności w kodzie też ma sześć.

## Options considered

### Option 1: Zostawić filtr prawny, poprawić tylko dane

Filtr kraju i oceny zostają na ekranach, a dane dopuszczeń są poprawiane projekt po projekcie.

**Pros**:
- Zachowuje mocny argument sprzedażowy.
- Nie zmienia ekranów.

**Cons**:
- Dopóki dane nie są poprawione, ekrany mówią nieprawdę. Poprawa 206 domów to praca na tygodnie.
- Nawet poprawne dane dotyczą „modelu ogólnego”, nie konkretnej działki, więc obietnica pozostaje zbyt silna.

### Option 2: Kraj jako informacja z jednej wspólnej listy, ukrycie ocen przy zachowaniu systemu

Kraj w wyszukiwarce i zapytaniu staje się informacją (wymaganą w zapytaniu), lista rośnie do sześciu krajów z jednego miejsca, oceny zgodności znikają z widoku klienta, a tabele, panel admina i logika zostają.

**Pros**:
- Zgodne z tym, co faktycznie wiemy i potrafimy dziś obiecać.
- Niskie ryzyko: bez migracji, jedno wdrożenie, rollback to cofnięcie commitu.
- Zachowuje drogę powrotu do zgodności, gdy będą realne dane.
- Jedna lista krajów zamyka źródło rozjazdów.

**Cons**:
- Strona główna traci argument „sprawdzamy zgodność” do czasu zbudowania oceny w ofercie.
- Klient może zobaczyć dom, którego producent dowozi tylko do innego kraju.
- Dotyka wielu plików (około dwudziestu), choć zmiany są małe.

### Option 3: Usunąć system zgodności i kraj z produktu

Kasujemy tabele dopuszczeń i ocen, kod i panel admina, a kraj zostaje tylko w zapytaniu.

**Pros**:
- Najmniej kodu do utrzymania.
- Jednoznaczny przekaz „nie oceniamy zgodności”.

**Cons**:
- Nieodwracalne i sprzeczne z decyzją właściciela, że do systemu wrócimy.
- Traci działającą bazę ocen dla produktu Cocomodule, gdzie powody są realne i per produkt.
- Wymaga migracji destrukcyjnej na produkcji.

## Rationale

Opcja 2, bo zmiana ma być odwracalna i oparta na prawdzie. Dane zgodności są w dużej części szablonem (siedemdziesiąt siedem domów z identycznymi zdaniami), więc opcja 1 wymagałaby najpierw tygodni pracy nad danymi, a w tym czasie strona dalej wprowadzałaby w błąd. Opcja 3 jest sprzeczna z wprost wyrażoną decyzją „nie usuwamy systemu, bo wrócimy do niego”, a do tego niszczy dane, które w przypadku Cocomodule są dobre (powody per produkt, w tym `blocked` i `conditional`).

Opcja 2 wykorzystuje to, że ekran zgodności jest odczytem, a nie logiką zapisu. Wystarczy przestać go renderować i przestać z niego filtrować, a baza i panel admina zostają. Kosztem jest utrata argumentu sprzedażowego na stronie głównej, ale ten argument jest dziś nieprawdziwy, więc koszt jest uczciwy. Przepisanie sekcji na „wstępna ocena w ofercie” zachowuje wartość bez fałszywej obietnicy.

Jedna wspólna lista krajów jest tania i usuwa realne ryzyko rozjazdu: kod ma trzy kraje, baza sześć, a lista zgodności sześć. Kraj w zapytaniu zostaje wymagany, bo bez niego oferta jest ślepa, a zespół potrzebuje wiedzieć, gdzie projekt ma stanąć.

W sprawie przetargu: kod nie wiąże już kraju (komentarz w `project-request-matching.ts` i AC-35 z 0070). Zmiana widoczności przetargu na „widzą wszyscy zweryfikowani wolumenowo, mail dostają dopasowani” dotyczy zasad dostępu do danych inwestora i dlatego trafia do osobnej specyfikacji z testami dostępu, nie tutaj.

## Evidence

**Dane dopuszczeń w bazie deweloperskiej (published, realni producenci)**:
- Identyczne wiersze `approved` dla PL, DE, NL z jednym zdaniem na kraj: Steel House 26, Castor 20, Perfect Cube 18, Budman 13.
- Tylko PL i `conditional` z jednym zdaniem „zależy od działki”: FrameDEV 43, DomiHaus 23, Logbar 18, Letniskowo 17, MKB 7, MOHO 5, Wencel 7.
- Powody per produkt: Cocomodule 5 (z `conditional` i `blocked`).
- Brak wierszy dopuszczeń: sauny WDH 7 z 8 i Kora 4 z 5, kontenery Dampol 24 z 25, telewizory 4 z 6.
- `product_compliance_assessment`: 1 wiersz w całej bazie.

**Kod**:
- Filtr kraju w wynikach ukrywa tylko produkty z `blocked` (`lib/data/projects.ts`, okolice linii 1127).
- `/plot` czyta dane z `lib/data/fixtures/plot-analysis.ts` z wymyślonymi identyfikatorami, żaden link do niej nie prowadzi.
- Lista krajów w ocenach zgodności ma już sześć krajów (`lib/product-envelope-parameters.ts`).
- Tabela `country` ma `BE`, `FR`, `IT` (migracja `drizzle/0061_envelope_parameters.sql`) i `US` (dodany osobno dla istniejącego producenta).
- Tekst `deliveryCountriesHelp` w panelu producenta jest nieprawdziwy względem 0070.
