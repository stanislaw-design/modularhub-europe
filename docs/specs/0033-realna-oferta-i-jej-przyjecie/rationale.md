# 0033. Realna oferta i jej przyjęcie — uzasadnienie

## Context

Dzisiejszy stan jest rozdarty na trzy części, które się nie widzą. Po pierwsze, prawdziwa ścieżka zapytania (spec 0023) już zapisuje `inquiry`/`inquiry_item` do bazy i pozwala klientowi wybrać do trzech produktów, czasem od różnych producentów naraz (limit koszyka ze spec 0005). Po drugie, schemat oferty i zamówienia (`offer`, `offer_item`, `order`, `order_stage_event`) został w całości zaprojektowany już w spec 0018, łącznie z regułą "najwyżej jedna aktywna oferta na parę (zapytanie, producent)", ale od tamtej pory nie ma żadnego kodu, który by do tych tabel zapisywał. Po trzecie, dwa dzisiejsze ekrany symulują tę funkcję niezależnie od siebie i od realnych danych: `/producent/zapytania/oferta` czyta mockowe zapytania i zapisuje ofertę wyłącznie w `localStorage` producenta, a `/klient/oferta` w ogóle nie przechodzi przez zapytanie ani ofertę, tylko liczy "wiążącą cenę" wprost z `project.priceMax` po wejściu z analizy działki.

Ten rozdźwięk ma już żywy skutek: podczas tej sesji producent zgłosił, że po realnym wysłaniu zapytania o dodany przez siebie produkt nie ma żadnego sposobu, żeby na nie odpowiedzieć. Panel producenta (spec 0032) pokazuje realne zapytania wyłącznie w trybie podglądu, zgodnie z ówczesnym zakresem (AC-8: "podgląd", nie odpowiedź) — to nie był błąd tamtej funkcji, to właśnie ta, wtedy jeszcze niezaprojektowana decyzja. Dopóki nie zostanie podjęta, funkcje dalej w epice (12: realne płatności, 16: realizacja i statusy) nie mają na czym stanąć, bo tabela `order` pozostaje pusta.

Prawdziwy transport i montaż mają swoją osobną, jeszcze niezaprojektowaną funkcję (15: realna wycena transportu); dzisiejsze płaskie stawki mock per kraj (`lib/pricing.ts`) są świadomym placeholderem do tego czasu, nie czymś do rozwiązania tutaj. Podobnie realne płatności (funkcja 12) są świadomie poza zakresem: przyjęcie oferty w tej funkcji tworzy zamówienie śledzone statusem, nie pobiera żadnej opłaty. Producent może dziś odpowiadać na zapytanie zawierające produkty kilku różnych producentów naraz (koszyk klienta, spec 0005/0023): każdy producent na takim zapytaniu składa własną, niezależną ofertę wyłącznie na swoje produkty, nigdy nie widząc ceny ani obecności innego producenta na tym samym zapytaniu (ten sam wzorzec izolacji co spec 0032 AC-8).

## Options considered

### Option 1: Napraw w miejscu (fix in place)

Zamiast realnego zapisu do bazy, rozbudować dzisiejszy mock: np. przenieść ofertę producenta z `localStorage` do współdzielonego pliku/API, ale bez prawdziwej sesji i bez tabel `offer`/`order`.

**Pros**:
- Najmniejsza zmiana kodu w krótkim terminie.

**Cons**:
- Nie rozwiązuje faktycznego problemu: dane wciąż nie docierają między prawdziwym kontem producenta a prawdziwym kontem klienta, bo żadne z nich nie istniałoby w tym rozwiązaniu jako źródło prawdy.
- Ślepa uliczka: schemat na to już czeka (spec 0018), więc naprawianie mocka to praca do wyrzucenia, nie postęp.

### Option 2: Strangler (nowa ścieżka obok starej)

Zbudować realną ścieżkę oferty równolegle do dzisiejszych mocków, z flagą funkcji albo stopniowym przełączaniem ruchu, i dopiero po jakimś czasie usunąć stare ekrany.

**Pros**:
- Bezpieczniejsze przy żywym ruchu produkcyjnym: nowa ścieżka dowodzi się zanim stara zniknie.

**Cons**:
- Żaden prawdziwy klient ani producent nie korzysta dziś z mockowej ścieżki (dane przykładowe, `localStorage` per przeglądarka) — nie ma ruchu do stopniowego przełączania, więc cały mechanizm strangler nie ma czego chronić.
- Utrzymywanie dwóch równoległych, niespójnych ścieżek ofertowych (jedna prawdziwa, jedna udawana) myli bardziej niż pomaga, i to właśnie ten rozdźwięk już spowodował zgłoszony w tej sesji problem.

### Option 3: Wymiana bezpośrednia (replace directly)

Zbudować realną ścieżkę na już zaprojektowanym schemacie (spec 0018) i usunąć oba mocki w tym samym buildzie, ten sam wzorzec co retirement starej ścieżki NIP producenta w spec 0032.

**Pros**:
- Brak ryzyka migracji: zero żywych danych w tabelach `offer`/`order` dziś, więc nie ma nic do ostrożnego przełączania.
- Jedna spójna ścieżka od razu, bez okresu, w którym dwie różne "prawdy" o ofercie istnieją naraz.
- Precedens w tym samym projekcie (spec 0032) już potwierdził, że ten wzorzec działa dla tej fazy produktu (przed inwestorami, bez żywego ruchu na mockach).

**Cons**:
- Nieodwracalne bez sięgania do historii gita: nie ma flagi, którą można by szybko wyłączyć z powrotem na mock, gdyby coś poszło nie tak.

## Rationale

Opcja 3 wygrywa, bo siła głównego argumentu za strangler (chronić żywy ruch podczas przejścia) nie ma tu zastosowania: `git log` i stan bazy potwierdzają zero wierszy w `offer`/`order` i mockowe dane przykładowe na obu starych ekranach. Ryzyko, które strangler miałby ograniczać, po prostu nie istnieje w tej fazie produktu, więc jego koszt (dwie równoległe ścieżki, dodatkowa złożoność przełączania) nie ma żadnej korzyści po drugiej stronie wagi. Ten sam rachunek już raz zapadł w tym projekcie przy retirement starej ścieżki NIP producenta (spec 0032) i sprawdził się.

Opcja 1 odpada, bo naprawia objaw (ograniczenia dzisiejszego mocka), nie przyczynę (brak realnego zapisu i realnej relacji klient/producent) — a przyczyna ma już gotowe, zaprojektowane rozwiązanie czekające od spec 0018.

Zakres tej funkcji obejmuje dwie strony tej samej transakcji (złożenie oferty i jej przyjęcie), a nie dwie niezależne decyzje: nie da się sensownie zaprojektować, jak klient przyjmuje ofertę, bez ustalenia najpierw, co dokładnie ta oferta niesie (cena per produkt, transport, montaż), ani odwrotnie — obie strony współdzielą tę samą parę tabel i tę samą regułę unikalności `(inquiry_id, producer_id)`. Stąd jeden spec, nie dwa.
