# 0070. Przetarg na duże zamówienia z podsumowaniem ModularHub: uzasadnienie

To jest zapis powodów decyzji. Plik do budowy to [index.md](index.md).

## Context

> ⚠️ Premise note: ochrona przed omijaniem platformy opiera się w tej decyzji na zasadzie dostępu do przetargów i na umowie z producentami, a nie na mechanizmie w kodzie. Kod ukrywa kontakt klienta do wyboru, ale nazwy producentów są jawne, więc klient może zadzwonić do producenta sam. Jeśli zasada trafi do regulaminu zbyt późno albo zostanie źle sformułowana (rozporządzenie UE 2019/1150 stawia wymagania wobec warunków korzystania z platform), cały model zarobkowy traci podstawę. To jest wymóg prawny i biznesowy poza tą specyfikacją, opisany w Follow-up.

Pierwsi klienci ModularHub to w większości deweloperzy i inwestorzy zamawiający kilka lub kilkanaście domów, głównie w Niemczech i w Holandii, a producenci są w większości z Polski. Przepływ dużych zamówień, który już istnieje (specyfikacje 0037, 0038, 0062, 0063, 0066), działa jak otwarta tablica ogłoszeń: każdy zatwierdzony wolumenowo producent widzi każde zapytanie, składa ofertę, a klient widzi oferty od razu i sam je akceptuje. Zespół ModularHub nie ma w tym przepływie żadnego miejsca. Panel admina nie pokazuje zapytań ani ofert, a akcje zatwierdzeń (producent wolumenowy, klient B2B) i formularze profilu zdolności i NIP nie mają ekranów. Z tego powodu nikt nie może dziś przejść ścieżki bez ręcznej zmiany w bazie.

Zespół chce, żeby zapytanie samo trafiało do producentów, którzy pasują do projektu, bez weryfikacji zapytania przez ModularHub. Chce natomiast wiedzieć o każdej ofercie, przekazać inwestorowi zestawienie ofert i dopiero po wyborze połączyć strony. Dzięki temu wie, kogo klient wybrał, i zachowuje kontakt z oboma. Prowizja jest ustalana z producentami osobno, poza systemem. Zespół jest mały (po pilotażu ma urosnąć), a horyzont wynosi około trzech tygodni z pilotażem jednego dużego inwestora.

Nieodwołalnie trzeba też zmienić dwie rzeczy związane z rynkiem DE i NL: maile do klienta mają dziś język polski na sztywno, a link logujący prowadzi do `/pl/panel`. Próg "dużego zamówienia" w kodzie to 10 domów, a zespół chce 3.

## Options considered

### Option 1: Otwarta tablica i widok admina (stan obecny plus ekrany)

Zostawiamy model 0062, dodajemy tylko ekran admina i brakujące formularze. Klient nadal widzi oferty od razu i akceptuje je sam.

**Pros**:
- Najmniej pracy, mieści się w tygodniu.
- Brak ręcznych kroków po stronie zespołu.

**Cons**:
- Zespół widzi oferty, ale nie zna momentu wyboru i nie łączy stron, więc nie wie, kto wygrał, dopóki producent nie powie.
- Oferty trafiają do klienta w dowolnej formie, trudne do porównania.
- Brak terminu, więc klient widzi pojedyncze oferty w losowych odstępach.

### Option 2: Przetarg z automatycznym dopasowaniem i podsumowaniem publikowanym przez ModularHub

Zapytanie trafia do producentów dopasowanych regułami. Oferty mają wspólny format i termin. Klient widzi je dopiero po publikacji przez ModularHub, wybiera jedną, a ModularHub łączy strony.

**Pros**:
- ModularHub zna zwycięzcę i moment wyboru bez analizowania treści ofert.
- Oferty są porównywalne, a klient dostaje wartość, której sam nie wytworzy.
- Ocena handlowa zostaje po stronie klienta, więc ryzyko sporów jest małe.
- Reguły dopasowania są jawne i kontrolowane wyjątkami admina.

**Cons**:
- Publikacja podsumowania to praca ręczna, rośnie z liczbą przetargów.
- Wymaga rozbudowy modelu danych i kilku nowych ekranów.

### Option 3: Weryfikacja każdej oferty przez ModularHub przed klientem

Jak Option 2, ale zespół sprawdza i ocenia każdą ofertę (kompletność i zasadność ceny) przed pokazaniem klientowi.

**Pros**:
- Najwyższa jakość porównania.
- Mniej błędnych ofert dla klienta.

**Cons**:
- Praca na każdą ofertę, nie na przetarg, i dopasowanie do przepustowości małego zespołu jest słabe.
- ModularHub bierze na siebie odpowiedzialność za ocenę ofert i może być oskarżony o sterowanie wyborem.

### Option 4: Pełny przepływ doradczy (spec 0048) także dla dużych zamówień

Doradca prowadzi sprawę przez brief, zaproszenia producentów, porównanie i wspólną rozmowę.

**Pros**:
- Największa wartość dla klienta i pełna kontrola procesu.

**Cons**:
- Największy koszt pracy zespołu na sprawę, niemożliwy do obsługi przy obecnej przepustowości.
- Zbyt duży zakres budowy na trzy tygodnie.
- Zespół wprost wybrał lżejszy model, w którym zapytanie nie wymaga zatwierdzenia przez ModularHub.

## Rationale

Option 2 daje to, czego zespół faktycznie potrzebuje: wiedzę o każdej ofercie i o wyborze klienta przy niewielkiej pracy ręcznej, która pojawia się raz na przetarg (publikacja podsumowania), a nie raz na ofertę. Option 1 jest szybsza, ale nie rozwiązuje potrzeby rozliczeń, bo moment wyboru dzieje się poza systemem. Option 3 i 4 wymagają przepustowości, której zespół dziś nie ma, a odpowiedzialność za ocenę ofert zwiększa ryzyko prawne.

Wymóg, żeby producenci widzieli zapytanie bez weryfikacji przez ModularHub, pasuje do reguł dopasowania, a obawę, że moc produkcyjna odetnie dobrych producentów, łagodzą dwie rzeczy: brak wartości w profilu nie wyklucza, a administrator może dodać producenta wyjątkiem. Oferty ukryte do publikacji i wybór klienta w systemie dają zespołowi wiedzę o zwycięzcy, a zasada dostępu do przetargów (w regulaminie) daje producentowi powód, żeby nie omijać platformy. Badania opisane w rozmowie pokazują, że prowizja zwiększa skłonność do omijania, a ograniczenie kanałów kontaktu poza platformą ją zmniejsza, co tu realizuje maskowanie kontaktu do połączenia.

Połączenie stron przez ModularHub przy zatwierdzonym B2B klienta jest automatyczne, bo ręczna zgoda zespołu na każdy wybór opóźniałaby start rozmów producenta z klientem, a sprawdzenie B2B w chwili wyboru zespół wybrał jako sposób, żeby klient mógł najpierw łatwo złożyć zapytanie.

## Alternatywy wewnątrz decyzji

- **Wybór zapisany na zapytaniu (`selected_quote_id`) zamiast statusu `accepted` od razu**: pozwala zmienić wybór bez przywracania statusów ofert. Alternatywa (status `accepted` od razu i cofanie) wymagałaby przywracania odrzuconych ofert innych producentów. Wcześniejszy pomysł, znacznik na ofercie z częściowym indeksem unikalnym i jednym `UPDATE`, odrzucono po kontroli: Postgres sprawdza taki indeks wiersz po wierszu, więc zmiana wyboru mogłaby losowo kończyć się błędem. Zapis jednego wiersza zapytania tego problemu nie ma.
- **Brak mieszania wersji ofert po publikacji**: producent z opublikowaną ofertą nie składa nowej wersji bez cofnięcia publikacji przez administratora. Dzięki temu klient zawsze widzi jedną, aktywną wersję oferty, a wybór dotyczy tylko oferty `active`.
- **Dopasowanie liczone przy odczycie zamiast tabeli zaproszeń**: unika synchronizacji tabeli z profilami producentów i usuwa kategorię błędów typu nieaktualne zaproszenie. Tabelę zaproszeń usunęła już specyfikacja 0062 (AC-9), a przywrócenie jej niczego nie wnosi. Wyjątki admina to mała tabela, nie lista zaproszeń.
- **Zadanie cykliczne Vercel zamiast kolejki**: Vercel Pro jest wykupiony, zadanie raz na godzinę wystarcza przy skali pilotażu, a dodatkowa kolejka (osobna usługa) byłaby nieuzasadnionym kosztem operacyjnym.
- **Jeden próg 3 na oba wejścia**: dwa różne progi dla zapytania wolnego i o produkt zwiększyłyby liczbę wyjątków w formularzach bez uzasadnienia biznesowego.
- **Język maili producentów po polsku**: producenci są głównie z Polski, a preferowany język producenta to osobna zmiana w Follow-up.

## Zmiana z 2026-10-12: jedna liczba domów i załączniki inwestora

**Jedna liczba zamiast zakresu.** Producent wycenia na konkretną liczbę, a zakres (10 do 20) zmusza go do zgadywania lub do dopytywania. Rozważone: przemianować na `unit_count` i usunąć drugą kolumnę (wybrane, jedna nazwa mówi prawdę), zostawić nazwę `unit_count_min` (tanio w kodzie, ale nazwa myli), zostawić obie z `min = max` (martwa kolumna na zawsze). Stare zapytania dostają dawne minimum, bo to bezpieczna wartość dla dopasowania mocy producenta, a oryginalny zakres jako zdanie w uwagach, żeby nic nie zginęło. Wybór maksimum zawyżałby wymaganą moc i mógł wykluczyć mniejszych producentów. Brak dokładnej liczby u inwestora rozwiązuje wskazówka (liczba pierwszego etapu plus opis w uwagach), bo tryb orientacyjny przywróciłby niepewność, której zmiana ma się pozbyć, i wymagałby obsługi w ofercie, w podsumowaniu i przy wyborze. Zmiana kolumny wchodzi w migrację 2 jako rozszerzenie, a usunięcie starych kolumn osobno (rozszerz i zwęż), bo repozytorium zaleca osobne przebiegi dla dodawania i usuwania kolumn w jednej tabeli, a wdrożenie kodu i bazy nie jest atomowe.

**Załączniki w osobnej tabeli, nie w `document`.** `document.owner_user_id` jest NOT NULL i wskazuje użytkownika, a gość bez konta go nie ma (0066). Sztuczny użytkownik techniczny psuje audyt i zasady własności, a zmiana kolumny na nullable dotknęłaby wszystkich innych celów dokumentów. Osobna tabela `inquiry_attachment` z dokładnie jednym rodzicem (wzór z `project_notification_log`) jest mniejszą zmianą i ma własne pola ukrycia i usunięcia.

**Widoczność od razu, ukrycie po fakcie.** Pierwsza propozycja była ostrożniejsza: plik ukryty do zatwierdzenia przez administratora, tak jak oferty przed publikacją. Inwestor odrzucił ją, bo każdy plik czekałby na człowieka, a termin ofert wynosi 14 dni, więc producent zaczynałby pracę później. Trzecia możliwość, ujawnienie dopiero po `contact_revealed_at`, odpada, bo producent składa ofertę przed wyborem i bez planów nie ma czego wyceniać. Wybrano widoczność od razu dla dopasowanych producentów. Koszt, który tu świadomie przyjmujemy: kontakt inwestora w stopce rysunku może dotrzeć do producenta przed wyborem. Ochrona to ostrzeżenie i zgoda przy wgrywaniu, ukrycie przez admina po fakcie i skaner danych kontaktowych w następnym kroku. Wariant pośredni (PDF z e mailem lub telefonem w warstwie tekstowej czeka na admina) odłożono, bo wymaga biblioteki do odczytu PDF i chroni tylko pliki z warstwą tekstową.

**Typy i skan.** PDF, JPEG, PNG i WebP, bo to typy, które umiemy sprawdzić po sygnaturze (wspólny kod z 0031 i 0063), a producent i tak najczęściej prosi o PDF. DWG i DXF odłożono do Follow-up. Skaner antywirusowy odłożono: przy tych typach, odrzucaniu aktywnych elementów PDF i pobraniu zawsze jako załącznik ryzyko jest małe, a ClamAV z 0047 został usunięty w 0050, więc wrócenie do niego to nowa usługa do utrzymania w trzy tygodnie przed pilotażem.

**Token dla gościa.** Rozważone: zapytanie najpierw, potem pliki z krótkim tokenem (wybrane, brak sierot w magazynie, zapytanie istnieje nawet gdy plik zawiedzie), wgrywanie do poczekalni przed wysłaniem (porzucone obiekty bez właściciela i zadanie czyszczące), pliki tylko dla zalogowanych (cofa sens zmiany 0066). Token to HMAC z klucza `AUTH_SECRET`, więc nie dodaje tabeli ani zmiennej środowiskowej.

**Usuwanie miękkie.** Producent mógł wycenić na podstawie planu, więc natychmiastowe twarde usunięcie zostawia go bez dowodu, a pomyłka inwestora byłaby nieodwracalna. Miękkie usunięcie plus kasowanie obiektu po 30 dniach godzinnym zadaniem pozwala odzyskać pomyłkę i sprawdzić spór. Producent z aktywną ofertą widzi znacznik zmiany plików zamiast maila przy każdej zmianie, żeby nie zasypywać go powiadomieniami.

## Zmiana z 2026-10-13: klient zamyka własne zapytanie (AC-37 do AC-43)

Problem: wyzwalacz limitu z `drizzle/0014` blokuje czwarte zapytanie na e mail, a klient nie ma jak zwolnić miejsca. Dodatkowo `/panel/quotes` ukrywa zapytania bez ofert, a `/panel/inquiries` listuje tylko dawne `inquiry` i sprawy doradcze, więc klient z trzema świeżymi zapytaniami nie widzi żadnego na koncie.

Rozstrzygnięcia i dlaczego:
- Limit zostaje na 3 (decyzja z 0037, nikt nie prosił o zmianę), ale liczy `published`, bo zapytanie po publikacji dalej czeka na wybór. `accepted` nie liczy się, bo to rozstrzygnięcie.
- Wznowienie musi podlegać limitowi, inaczej klient zamknąłby zapytanie, złożył trzy nowe i wznowił stare. Wyzwalacz BEFORE INSERT tego nie widzi, więc dochodzi wyzwalacz BEFORE UPDATE OF status.
- Klient nie podaje powodu zamknięcia: powód jest stały (`client_cancelled`), a tekst dowolny mógłby trafić do producentów z danymi kontaktowymi.
- Zespół dostaje mail tylko przy `published` lub wyborze czekającym na B2B. Inaczej każda rezygnacja byłaby szumem, a zamknięcie i tak widać w adminie.
- Komunikat o limicie nie liczy zapytań, bo błąd pada dopiero przy trzech, więc liczba jest zawsze "3 z 3". Gościowi nie pokazujemy listy (ujawniałaby dane osobie, która wpisała cudzy adres), dajemy link logujący z neutralną odpowiedzią.
- Link logujący dla gościa jest potrzebny, bo po AC-13 `pending_registration` powstaje dopiero przy mailu o publikacji.
- Nagłówek zapytania i lista to osobne zadania przed zadaniem 12, bo nie zależą od nowego modelu ofert i usuwają ślepy zaułek od razu. Zadanie 12 zachowuje komponent nagłówka.

Odrzucone: wyłączanie przycisku dodania przy 3 z 3 (limit liczy po e mailu, licznik po koncie, więc przycisk mógłby blokować bez powodu; prawdą jest baza); pytanie o powód rezygnacji (patrz wyżej); podniesienie limitu (zmieniłoby decyzję 0037 bez potrzeby, zamknięcie rozwiązuje problem).
