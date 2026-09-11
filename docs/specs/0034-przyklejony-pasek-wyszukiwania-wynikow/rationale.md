# 0034. Przyklejony pasek wyszukiwania na wynikach, uzasadnienie

## Context

Na `/wyniki` cały blok wyszukiwania i filtrów (`FamilyTabs`, `ResultsFilterBar`, `CategoryFilterBar`, `SubcategoryFilterBar`) stoi dziś raz, na samej górze strony, nad siatką wyników. Gdy klient przewinie się w listę produktów, jedyny sposób na zmianę kryterium to powrót na górę. Spec 0026 rozszerzył zestaw kryteriów (atrybuty techniczne domu, cena, podkategorie, sortowanie, słowo kluczowe), więc dziś jest więcej powodów, żeby coś poprawić w trakcie przeglądania, nie mniej.

`SiteHeader` jest już przyklejony (`sticky`, a na stronie startowej `fixed`) na górze każdej trasy klienta, więc trwałe elementy chrome nad treścią już istnieją w tym projekcie; nic dotąd nie trzyma w ten sam sposób samych kontrolek wyszukiwania. Historia scope (`docs/scope/produkcja.md`) odnotowuje, że globalne `overflow-x: hidden` na `html` kiedyś psuło `position: sticky` w całym projekcie; poprawka przeniosła tę regułę wyłącznie na `body`, więc dziś `position: sticky` jest bezpieczne do ponownego użycia.

Główne napięcie to miejsce na ekranie. Pełny blok filtrów, zwłaszcza w wąskiej, kolumnowej wersji `ResultsFilterBar` poniżej przełomu `sm`, jest wysoki; trwałe przyklejenie całości zajęłoby duży, stały kawałek widocznego ekranu telefonu, konkurując z samą listą wyników, którą ma pomóc przeglądać.

## Options considered

### Opcja 1: Cały blok zawsze przyklejony, na każdej szerokości

`FamilyTabs`, `ResultsFilterBar` i chipy atrybutów razem stają się zadokowane pod `SiteHeader` po przewinięciu, bez żadnej redukcji zawartości, niezależnie od szerokości ekranu.

**Pros**:
- Najprostszy model mentalny i najprostszy w budowie, jedna ścieżka kodu, żadna funkcja nie jest schowana.

**Cons**:
- Na telefonie sam `ResultsFilterBar` już dziś układa się w kolumnę pięciu segmentów poniżej `sm`; przyklejenie całego bloku zajęłoby trwale znaczną większość widocznego ekranu telefonu, konkurując z samą listą wyników, którą ma pomóc filtrować.

### Opcja 2 (wybrana): Pełny pasek od `sm` w górę, skrócona pigułka i rozwijany panel poniżej

Od istniejącego przełomu `sm` w górę zadokowany pasek pokazuje cały `ResultsFilterBar` wprost. Poniżej `sm` zwija się do pola słowa kluczowego plus przycisku „Filtruj". Przycisk „Filtruj" (obecny na każdej szerokości) otwiera panel z pełnym kompletem kryteriów (rodzina, cały pasek, chipy), jako wysuwany arkusz na telefonie i boczny panel na szerszych ekranach.

**Pros**:
- Każde kryterium zostaje osiągalne na każdej szerokości, trwałe zajęcie ekranu zostaje małe dokładnie tam, gdzie miejsca jest najmniej (telefon), a desktop zachowuje już znajomy pełny pasek bez dodatkowego kliknięcia.

**Cons**:
- Dwie ścieżki responsywne (pełny pasek wprost oraz pigułka) plus wspólny panel oznaczają więcej kodu i więcej przypadków do zbudowania i przetestowania niż jeden spójny wzorzec; na desktopie panel dodatkowo powtarza kontrolki, które i tak stoją obok, widoczne wprost.

### Opcja 3: Jedna spójna pigułka i panel na każdej szerokości

Ten sam wzorzec „słowo kluczowe plus Filtruj" z Opcji 2 staje się jedyną formą zadokowanego paska, również na desktopie, gdzie pełny `ResultsFilterBar` nigdy nie pokazuje się wprost po zadokowaniu.

**Pros**:
- Jedna ścieżka kodu, najmniej kodu, najbardziej spójne zachowanie na każdym urządzeniu, żadna kontrolka nigdzie się nie powtarza.

**Cons**:
- Marnuje wolne miejsce, które desktop i tak ma; klient na szerokim ekranie, który przed przewinięciem widział cały pasek wprost, po zadokowaniu traci ten dostęp na rzecz dodatkowego kliknięcia, czyli realny krok wstecz względem tego, co miał wcześniej na tej samej stronie.

## Rationale

Inżynier wprost powiedział, że chce zachować całą funkcjonalność, ale niekoniecznie widoczną cały czas naraz, szczególnie na telefonie. To wyklucza Opcję 1 (żadna redukcja) i wskazuje na jakąś formę schowanej, rozwijanej zawartości przynajmniej na wąskim ekranie.

Między Opcją 2 i Opcją 3 rozstrzyga kontekst z ekranu: `ResultsFilterBar` już dziś ma dedykowany przełom `sm`, na którym przechodzi z wąskiej kolumny na wiersz, właśnie dlatego, że na szerokim ekranie mieści się wygodnie w jednej linii. Desktop, który przed przewinięciem miał pełny pasek wprost, nie powinien go tracić na rzecz dodatkowego kliknięcia tylko dlatego, że telefon potrzebuje kompresji; to byłby regres widoczny wyłącznie na szerszych ekranach, bez żadnej korzyści dla nich. Opcja 2 stosuje kompresję (pigułka plus panel) dokładnie tam, gdzie jest potrzebna (poniżej `sm`), i zachowuje pełny, bezpośredni dostęp tam, gdzie miejsca wystarcza (od `sm` w górę), więc trzyma się już istniejącej granicy w kodzie zamiast wprowadzać nową.

Koszt Opcji 2 (dwie ścieżki UI, częściowa duplikacja kontrolek w panelu na desktopie) jest akceptowalny, bo panel na desktopie pełni tam inną rolę niż na telefonie: jego jedyna naprawdę nowa treść to rodzina produktu i chipy atrybutów, które i tak nie mieściłyby się trwale przyklejone bez odtworzenia problemu z Opcji 1 na mniejszą skalę.
