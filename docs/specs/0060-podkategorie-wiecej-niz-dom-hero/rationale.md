# 0060. Podkategorie "Więcej niż dom" bezpośrednio w hero — rationale

## Context

To rozszerzenie opiera się na fundamencie ze spec 0035 (mapa `FAMILY_GROUPS`, typ `FamilyFilterValue`, `resolveFamilyGroup`), który jest już zbudowany i zweryfikowany. Spec 0035 świadomie zostawił doprecyzowanie podkategorii tylko na stronie wyników (`FamilyTabs.tsx`); hero miało tylko dwa proste przyciski prowadzące do połączonego widoku po kliknięciu Szukaj.

W praktyce to tworzy dodatkowy, niepotrzebny krok dla kogoś, kto już wie, czego szuka (np. kogoś zainteresowanego konkretnie spa modułowym): musi wybrać "Więcej niż dom", wybrać kraj (dziś wymagany przez Szukaj), kliknąć Szukaj, trafić na wyniki połączone, i dopiero tam kliknąć właściwą podkategorię. To trzy kliknięcia tam, gdzie mogłoby wystarczyć jedno.

Od spec 0035 lista rodzin w grupie "Więcej niż dom" urosła z dwóch (spa modułowe, pergola) do trzech (spa modułowe, kontenery modułowe, outdoor TV, specy 0039 i 0056), więc ten skrót staje się coraz bardziej wartościowy wraz z rozrostem katalogu stylu życia.

## Options considered

### Option 1: Podkategorie zastępują pola wyszukiwania (wybrane)

Gdy aktywna jest zakładka "Więcej niż dom", rząd pól Gdzie/Budżet/Powierzchnia i przycisk Szukaj znikają, zastąpione trzema linkami podkategorii, każdy nawigujący od razu po kliknięciu.

**Pros**:
- Najkrótsza możliwa ścieżka: jedno kliknięcie od strony głównej do przefiltrowanych wyników.
- Karta wyszukiwania zostaje czysta i mała zamiast rosnąć o dodatkowy rząd nad już istniejącymi polami.
- Jasny podział ról: "Domy" to pełny formularz wyszukiwania (kraj, budżet, powierzchnia), "Więcej niż dom" to szybki przełącznik kategorii, nie generyczny formularz.

**Cons**:
- Usuwa dzisiejszą ścieżkę do widoku łączonego z hero (akceptowane świadomie, patrz AC-5).
- Kraj i powierzchnia ustawione wcześniej w karcie są ignorowane przy przejściu przez podkategorię (niespójne z resztą karty, choć pola i tak znikają z widoku w tym momencie, więc nie ma ich co przenosić).

### Option 2: Podkategorie jako dodatkowy rząd obok istniejących pól

Dodać rząd trzech linków podkategorii nad lub pod istniejącymi polami Gdzie/Budżet/Powierzchnia, zachowując przycisk Szukaj i ścieżkę do widoku łączonego bez zmian.

**Pros**:
- Nic z dzisiejszego zachowania (AC-2/AC-5 spec 0035) się nie psuje, czysto addytywna zmiana.
- Kraj/powierzchnia mogłyby teoretycznie zostać przeniesione do linku podkategorii, gdyby okazało się to potrzebne.

**Cons**:
- Karta rośnie o dodatkowy rząd tylko dla jednej z dwóch zakładek, niespójny rozmiar karty zależnie od wyboru.
- Dwie równoległe ścieżki do tego samego celu (link podkategorii kontra Szukaj) w jednej karcie, więcej do utrzymania i testowania bez wyraźnej korzyści.

### Option 3: Rozwijany panel z pełną, dwupoziomową podkategorią (sauna/jacuzzi itd.)

Rozwijany panel pokazujący nie tylko rodzinę (spa/kontenery/outdoor TV), ale też głębszą podkategorię w ich obrębie (np. sauna kontra jacuzzi w spa), tak jak dziś robi `SubcategoryFilterBar` na stronie wyników.

**Pros**:
- Jeszcze krótsza ścieżka dla kogoś, kto wie dokładnie czego szuka na najgłębszym poziomie.

**Cons**:
- Znacznie więcej opcji w ciasnej karcie hero, ryzyko przeciążenia interfejsu na urządzeniach mobilnych.
- Dubluje funkcję, którą `SubcategoryFilterBar` już pełni na stronie wyników, bez wyraźnej potrzeby.

## Rationale

Option 1 wygrywa, bo zgłoszenie wprost mówi o automatycznym otwieraniu wyników po wyborze podkategorii, czyli o usunięciu pośredniego kroku, nie o dodaniu kolejnego rzędu obok istniejącego. Option 2 technicznie też by to osiągnęła, ale zostawiłaby w jednej karcie dwie równoległe ścieżki do tego samego celu (link kontra Szukaj), co jest niepotrzebną złożonością bez korzyści dla użytkownika, skoro widok łączony pozostaje w pełni osiągalny ze strony wyników. Option 3 rozwiązuje problem, którego nikt nie zgłosił (głębsza podkategoria w hero) kosztem przeciążenia ciasnej karty.

Utrata ścieżki do widoku łączonego z hero (AC-5) jest świadomym kosztem: `FamilyTabs` na stronie wyników nadal oferuje "Wszystko" jako pełnoprawną opcję, więc widok łączony nie znika z produktu, tylko z hero.
