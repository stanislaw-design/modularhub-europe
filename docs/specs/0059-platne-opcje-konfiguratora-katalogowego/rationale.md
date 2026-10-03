# 0059. Rationale

## Context

Produkty katalogowe (`completion_standard = 'katalogowy'`) mają dziś tylko warianty rozmiaru z jedną ceną bazową każdy (`product_variant`). Producent Dampol, którego kontenery mamy zaimportować, sprzedaje je przez własny konfigurator z dodatkową, długą listą płatnych opcji (okna, wykończenia, ocieplenie, ogrzewanie), z których wiele powtarza się między jego różnymi modelami. Ani `product`, ani `product_variant` nie mają dziś miejsca na taką listę, więc pełny import katalogu Dampola byłby dziś okrojony do samej ceny bazowej, bez dopłat, które realnie stanowią dużą część ceny końcowej u tego producenta.

Silnik zgodności i model danych są dziś zaprojektowane pod założenie, że produkt katalogowy ma jedną cenę per wariant (`product_variant.priceMinCents`, z `price_on_request` jako jedyną alternatywą, spec 0041/0051). Rozwiązanie musi się zmieścić w tym modelu bez łamania istniejących produktów bez opcji (dziś większość katalogu, w tym cały `outdoor-tv`).

Epika Produkcja ma jawną decyzję z 2026-09-02: dane producentów na start wchodzą do bazy ręcznie, przez Claude i Neon MCP, nie przez samoobsługowy formularz. Ten spec trzyma się tej decyzji: nie buduje nowego kroku w panelu producenta, tylko tabele i logikę wyświetlania/liczenia ceny.

## Options considered

### Option 1: Wąska tabela opcji per produkt (bez współdzielenia)

Każdy produkt katalogowy ma własną listę opcji, nawet jeśli treść się powtarza między produktami tego samego producenta. Jedna tabela `product_option` z `product_id` zamiast osobnej grupy i tabeli przypisania.

**Pros**:
- Najmniej tabel, najszybsza migracja i najprostszy kod na start.
- Zero ryzyka, że zmiana ceny w jednym miejscu przypadkowo wpłynie na inny produkt.

**Cons**:
- Nie pasuje do tego, co faktycznie zaobserwowaliśmy u Dampola: ta sama opcja (na przykład „Ocieplenie WT2021, 6500 zł") powtarza się w wielu jego modelach i musiałaby być wpisywana ręcznie za każdym razem, z realnym ryzykiem rozjazdu cen między kopiami.
- Przy imporcie ~25 modeli Dampola (zaplanowanym jako kolejny krok) oznacza dużą duplikację ręcznej pracy w Neon MCP.

### Option 2: Współdzielony katalog opcji per producent, przypisywany do produktów (rekomendowana)

Grupa opcji (`product_option_group`) należy do jednego producenta. Opcje (`product_option`) należą do grupy. Tabela przypisania (`product_option_group_assignment`) łączy grupy z konkretnymi produktami tego samego producenta, wiele do wielu.

**Pros**:
- Opcja zdefiniowana raz, reużywana na dowolnej liczbie produktów tego samego producenta, dokładnie tak jak działa to u Dampola.
- Ogólny mechanizm, gotowy pod kolejnych producentów katalogowych (kolejne kontenery, przyszli partnerzy `outdoor-tv`), bez kolejnej migracji.

**Cons**:
- Trzy nowe tabele zamiast jednej, więcej złożoności schematu.
- Na dziś ma dokładnie jednego realnego użytkownika (Dampol), więc część tej ogólności jest inwestycją w przyszłość, nie w dzisiejszą potrzebę.

### Option 3: Globalny katalog opcji, niezależny od producenta

Definicje opcji (na przykład „Klimatyzacja") żyją niezależnie od producenta, każdy producent tylko podłącza własną cenę do gotowej definicji.

**Pros**:
- Umożliwiłoby w przyszłości porównywanie tej samej opcji między producentami po jednej, wspólnej nazwie.

**Cons**:
- Wymaga z góry ustalić, które opcje są naprawdę „tą samą opcją" między zupełnie różnymi producentami (różne systemy budowlane, różne standardy) — dziś nie mamy do tego żadnych danych poza jednym producentem.
- Realna nadbudowa ponad to, o co proszono; nic w dzisiejszym zakresie tego nie wymaga.

## Rationale

Opcja 1 (wąska, per produkt) rozwiązuje dzisiejszy pojedynczy przypadek najszybciej, ale prosto przeczy temu, co faktycznie zaobserwowaliśmy na stronie Dampola: ta sama lista dopłat powtarza się między jego modelami, więc traktowanie jej jako unikalnej per produkt gwarantuje duplikację i rozjazd cen przy każdej przyszłej aktualizacji, a import kolejnych ~25 modeli Dampola jest już zaplanowanym następnym krokiem, nie hipotezą.

Opcja 3 (globalny katalog) rozwiązuje problem, którego jeszcze nie mamy: dziś jest jeden producent katalogowy z realnymi opcjami (Dampol), więc nie ma danych, na podstawie których dałoby się sensownie ustalić, co liczy się jako „ta sama" opcja u różnych producentów.

Opcja 2 trzyma się poziomu ogólności uzasadnionego tym, co faktycznie wiemy: opcje powtarzają się w obrębie jednego producenta (stąd katalog per `producer_id`, nie per `product_id`), a mechanizm przypisania (wiele do wielu) jest tanim, jednorazowym kosztem migracji, który od razu obsłuży pełny import Dampola bez kolejnej zmiany schematu.
