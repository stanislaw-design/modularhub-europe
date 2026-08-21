# 0014. Rationale: przebudowa strony startowej

## Context

> ⚠️ Premise note: to zlecenie zostało poproszone jako „przerób design strony startowej na to, co jest na grafice", ale w trakcie rozmowy projektowej okazało się, że wymaga też nowego, produktowego systemu kolorów — to dwie oddzielne decyzje (kolory marki i struktura tej jednej strony), rozdzielone na dwie specyfikacje (0013 i 0014) właśnie dlatego, żeby żadna z nich nie była przeciążona. Ta specyfikacja zakłada, że spec 0013 jest zaakceptowana i gotowa do konsumpcji; nie powtarza jej treści.

Spec 0003 ustaliła wprost (AC-2, AC-9), że hero renderuje się jako sam pasek wyszukiwania: h1 tylko dla czytników ekranu, bez logo v3 display, bez towarzyszącej grafiki, „żaden drugorzędny element nie konkuruje wizualnie z akcją wyszukiwania". Ta sama specyfikacja odnotowała we Follow-up, że to był już odwrócony wybór (wcześniej zakładano hero z logo v3 display jako wyraźną decyzję zamawiającego) i że odwrócenie wymaga jego potwierdzenia. Grafika referencyjna z tej sesji odwraca tę decyzję po raz drugi, tym razem w drugą stronę: pełne hero marketingowe ze zdjęciem, hasłem i dwoma przyciskami. Zamawiający (w tej sesji, jako zastępstwo, patrz Follow-up w index.md) potwierdził ten kierunek wprost.

Dwie dotychczasowe sekcje strony startowej („Polecane domy", cztery karty projektów; „Jak to działa", cztery ponumerowane kroki) nie mają odpowiednika w grafice — ta pokazuje inne sekcje w ich miejscu (kategorie domów, krótki wyjaśniacz wpleciony w pasek CTA). Komponenty `CategoryFilterBar` i `SearchSegment`, które strona startowa dziś współdzieli ze stroną wyników (`/wyniki`), muszą przetrwać tę przebudowę nienaruszone dla tamtej strony — spec 0004 opiera na nich swój pasek filtrów.

Kontrakt parametrów URL do `/wyniki` (`country`, `sizeMin`, `sizeMax`), ustalony w spec 0003 i skonsumowany przez spec 0004, zostaje bez zmian; ta specyfikacja zmienia tylko, jak te parametry są zbierane w hero (jedno pole „Powierzchnia" zamiast dwóch pól „od"/„do"), nie sam kontrakt.

Referencyjna grafika (`public/references.png`) pokazuje trzy realne, istniejące marki producentów domów modułowych/prefabrykowanych w pasku „Zaufaj nam wiodący producenci" (Baufritz, Rubner Haus, ELK Fertighaus są rzeczywistymi firmami z tej branży; sam obraz zawiera też nazwę „Honda", która w tym kontekście czyta się jak inna, prawdopodobnie przypadkowa marka trzecia). Żadnej z tych nazw ani logotypów nie wolno reprodukować w tym projekcie bez autoryzacji — stąd decyzja o użyciu prawdziwych nazw producentów z własnych danych mockowych projektu zamiast kopiowania z grafiki (AC-8).

## Options considered

### Option 1: Pełne przyjęcie struktury z grafiki, usunięcie „Polecane domy" i „Jak to działa"

Strona startowa dokładnie odzwierciedla sekcje z grafiki referencyjnej; dotychczasowe dwie sekcje znikają ze strony głównej (nie z projektu — komponenty współdzielone jak `CategoryFilterBar` zostają, bo są używane na `/wyniki`).

**Pros**:
- Dokładne odwzorowanie zlecenia („przerób na to, co jest na grafice"), bez dwóch różnych wyjaśniaczy „jak to działa" na jednej stronie.
- Najprostsza, najbardziej spójna strona startowa — jedna narracja, nie dwie sklejone ze sobą.

**Cons**:
- Traci się bezpośrednią witrynę rzeczywistych danych projektowych na stronie głównej (dziś „Polecane domy" pokazuje prawdziwe fixture'y); grafika kompensuje to kartami kategorii, ale te są dekoracyjne, nie danymi.

### Option 2: Zachować „Polecane domy" jako dodatkową sekcję

Dodać nowe sekcje z grafiki wokół istniejącej siatki polecanych domów, zamiast ją usuwać.

**Pros**:
- Realne dane projektowe zostają widoczne na stronie głównej.

**Cons**:
- Strona ma teraz dwie różne siatki „domów do obejrzenia" (kategorie i polecane domy) blisko siebie, co rozmywa hierarchię i nie odpowiada żadnej części grafiki referencyjnej.

### Option 3: Dopisać wszystkie nowe sekcje pod istniejącą treścią

Zachować całą dzisiejszą stronę startową bez zmian i dokleić pełny układ z grafiki poniżej.

**Pros**:
- Zero ryzyka utraty istniejącej treści.

**Cons**:
- Najdłuższa, najbardziej rozwleczona strona ze wszystkich opcji; dwa kompletne, częściowo nakładające się na siebie wyjaśnienia „jak to działa" jedno pod drugim.

## Rationale

Zamawiający wybrał Option 1 wprost w tej sesji, po zobaczeniu obu alternatyw z ich kompromisami (Context, i Requirements w index.md). Uzasadnienie merytoryczne: grafika referencyjna nie ma miejsca ani na siatkę „Polecane domy", ani na osobną sekcję „Jak to działa" — oba te elementy w Option 2/3 musiałyby zostać dosztukowane bez wzorca w grafice, co prowadzi dokładnie do niespójności opisanej w ich Cons. Utrata bezpośredniej witryny prawdziwych danych na stronie głównej (jedyny realny koszt Option 1) jest częściowo skompensowana tym, że karty kategorii i pasek producentów nadal odwołują się do prawdziwych elementów produktu (nazwy producentów z fixture'ów, linki do `/wyniki`), tylko nie do konkretnych projektów.

Decyzja o przekierowaniu przycisku „Otrzymaj darmowe oferty" (AC-9) do karty wyszukiwania zamiast budowania nowej funkcji „dopasowanych ofert" jest świadomym ograniczeniem zakresu: taka funkcja odpowiadałaby dokładnie odłożonemu wcześniej „Kreatorowi ceny" (funkcja 5, status `dropped`, spec 0003 Consequences), a jego przywrócenie przy okazji przebudowy jednej strony ominęłoby proces `/architect`, który tę funkcję świadomie odrzucił. Przekierowanie do istniejącej, działającej ścieżki wyszukiwania jest uczciwsze niż przycisk prowadzący donikąd, nawet jeśli nie realizuje dosłownie treści przycisku (odnotowane w Consequences i Follow-up w index.md).

## References

Brak (REFERENCES_LEVEL: none, domyślna opcja dla tej sesji — decyzja czysto projektowa, bez wyboru narzędzi/bibliotek wymagającego zewnętrznych źródeł).
