# 0044. Porównywalna oferta domów: katalog, cena i porównanie modeli

**Date**: 2026-09-17

**Status**: Draft

**Source**: przegląd ofert Treevia, FastHome, FiModular, Polska Fabryka Domów, Modularen i MOBI HOUSE z 2026-09-17; szczegóły i linki w [rationale.md](rationale.md).

## Summary

Klient ma móc ocenić cenę *konkretnego standardu* już na liście wyników i porównać 2–3 domy różnych producentów bez zakładania konta. Producent ma widzieć w swoim katalogu te same kluczowe informacje, które zobaczy klient, oraz brakujące dane utrudniające porównanie. Spec rozwija istniejące warianty, pozycje kosztowe i kartę projektu ze spec 0041/0042; nie przebudowuje ich od nowa.

## Problem i stan obecny

- `ResultCard` pokazuje cenę od, nazwę standardu, metraż i liczbę pokoi, ale nie podaje przy cenie krótkiego zakresu ani informacji, czy rzut jest dostępny.
- Zaznaczenie do trzech produktów na `/results` służy dziś wysłaniu zapytania (`ResultsSelection` i `ShortlistActionBar`). Nie jest to wybór do porównania.
- Porównanie na `/panel/favorites` wymaga zapisanych ulubionych i obejmuje cztery wiersze: powierzchnię, cenę, czas produkcji i standard (`FavoriteCompareTable`). Cena jest brana z pól produktu, a nie jawnie wybranego wariantu w kolumnie.
- Strona `/project/[id]` już pokazuje warianty, zakres, rzut, układ pomieszczeń, logistykę i harmonogram. Nowa funkcja ma prowadzić do tej strony i zachować wybrany wariant.
- `ProducerProductList` pokazuje obecnie nazwę, rodzinę, status i datę produktu, bez miniatury, ceny, metrażu, podglądu klienta i wskazówek o brakujących danych.
- Model `Project` ma już `floorAreaM2`, `builtUpAreaM2`, `bedrooms`, `bathrooms`, `externalDimensions`, `documents` i `variants`. Pozycje kosztowe mają wolny tekst `label`, więc nie da się niezawodnie automatycznie scalić ich między różnymi producentami.

## Cel i granice

**Cel:** klient rozumie, jaki wariant i jaki zakres stoją za ceną na liście, może zestawić modele po wspólnych parametrach i przejść do karty lub zapytania bez utraty wyboru.

**W zakresie:** wyłącznie rodzina `dom`; istniejące trasy wyników, projektu, ulubionych i katalogu producenta; ceny i waluta przechowywane w istniejącym modelu; porównanie publicznych produktów opublikowanych.

**Poza zakresem:** kalkulacja pełnej ceny działki lub inwestycji, automatyczna wycena transportu i montażu, przeliczanie EUR na PLN, porównywanie ofert prawnie wiążących, nowy konfigurator domu, porównanie spa i kontenerów, samodzielna edycja wielu wariantów przez producenta, automatyczne rozpoznawanie tożsamych pozycji kosztowych z wolnego tekstu. Te tematy wymagają osobnych decyzji o danych i procesie.

## Użytkownicy i scenariusze

- Jako klient bez konta chcę zaznaczyć 2–3 domy na wynikach i porównać ich ceny oraz parametry w jednym miejscu.
- Jako klient chcę widzieć, który standard odpowiada cenie, co jest w tej cenie i czego producent nie wycenił.
- Jako klient chcę sprawdzić, czy dom ma rzut i czy jego powierzchnia użytkowa różni się od powierzchni zabudowy.
- Jako producent chcę sprawdzić, jak opublikowany dom wygląda dla klienta i które kluczowe pola oferty pozostają puste.

## Priorytety

| Priorytet | Zmiana | Wartość |
| --- | --- | --- |
| P0 | Cena z nazwą realnego wariantu i krótkim zakresem na liście | Usuwa najbardziej mylący skrót „od” bez kontekstu |
| P0 | Publiczne porównanie 2–3 domów, osobne od wyboru do zapytania | Daje główną korzyść katalogu wielu producentów |
| P1 | Metraż zabudowy, sypialnie, łazienki i dostępność rzutu w porównaniu | Pozwala porównać użyteczność, nie tylko cenę |
| P1 | Bogatsza lista producenta i podgląd opublikowanego produktu | Ułatwia kontrolę jakości oferty u źródła |
| P2 | Podpowiedzi kompletności w panelu producenta | Zwiększa liczbę porównywalnych ofert bez blokowania publikacji |
| P2 | Wspólne kategorie kosztów po potwierdzeniu mapowania danych | Pozwala porównać zakres między producentami bez zgadywania |

## Requirements i kryteria akceptacji

### A. Karta na wynikach

**AC-1.** Dla produktu z aktywnym wariantem domyślnym karta wyników pokazuje przy cenie nazwę tego wariantu (nazwa własna, jeśli istnieje, oraz jednoznaczny standard wykonania) i jego `scopeSummary`, jeśli jest wypełnione. Cena, etykieta i zakres zawsze pochodzą z tego samego wariantu. Cena na karcie nie może po cichu pochodzić z innego standardu.

**AC-2.** Gdy `scopeSummary` jest puste, karta nie sugeruje żadnego zakresu. Pokazuje krótkie „Zakres do potwierdzenia”. Gdy brak realnego wariantu lub ceny, pokazuje „Wycena indywidualna” i nie liczy ceny za m². Syntetyczny `isPlaceholder` nie jest ofertą cenową.

**AC-3.** Dla rodziny `dom` karta informuje, czy istnieje co najmniej jeden dokument `product_floor_plan`. Gdy istnieje, pokazuje „Rzut dostępny” prowadzący do zakładki rzutu na karcie projektu; gdy go nie ma, nie pokazuje fałszywej odznaki. Link zachowuje aktywne parametry kontekstu wyników istotne dla karty (co najmniej kraj).

### B. Wybór i widok porównania

**AC-4.** Na liście wyników domów klient może dodać 2–3 opublikowane produkty do porównania i usunąć każdy z wyboru. Kontrolka porównania jest wyraźnie odróżniona od obecnego zaznaczenia „do zapytania”; użycie jednej nie zmienia drugiej. Dla innych rodzin kontrolka porównania domów nie jest pokazywana.

**AC-5.** Po wyborze co najmniej dwóch domów dostępna jest akcja „Porównaj domy”. Otwiera osobny, publiczny widok porównania. Identyfikatory i wybrane warianty znajdują się w URL; skopiowany adres oraz odświeżenie odtwarzają to samo zestawienie bez konta i bez pamięci komponentu.

**AC-6.** Widok ma maksymalnie trzy kolumny modeli. Każda kolumna ma zdjęcie lub stan braku zdjęcia, nazwę, producenta, link do karty modelu, nazwę realnego wariantu, cenę lub „Wycena indywidualna” i krótki zakres lub „Zakres do potwierdzenia”. Pierwszy wybór wariantu to aktywny wariant domyślny produktu. Klient może przełączyć wariant osobno dla każdego modelu; zmiana wariantu aktualizuje cenę i zakres tylko jego kolumny oraz URL.

**AC-7.** Wiersze porównania domów obejmują: powierzchnię użytkową, powierzchnię zabudowy, sypialnie, łazienki, kondygnacje, wymiary zewnętrzne, standard wykonania, czas produkcji i montażu (jeśli podany dla wariantu), dostępność rzutu oraz minimum pięć kategorii kosztów: projekt, fundament, transport, montaż, przyłącza. Każdy wiersz ma tę samą definicję we wszystkich kolumnach. Brak danych to „Nie podano” lub „Do wyceny”, zgodnie z rzeczywistym statusem; nigdy `0`, pusty napis ani wywnioskowane „w cenie”.

**AC-8.** Statusy kosztów w porównaniu między producentami są pokazywane tylko wtedy, gdy pozycja ma jawne, potwierdzone przypisanie do jednej z pięciu wspólnych kategorii. Samo podobieństwo tekstu `cost_line_item.label` nie wystarcza. Bez takiego przypisania komórka mówi „Nie podano”; oryginalne pozycje pozostają na karcie produktu. Wdrożenie może rozpocząć się bez migracji istniejących wpisów, ale nie może zgadywać ich znaczenia.

**AC-9.** „Pokaż tylko różnice” ukrywa jedynie wiersze z równymi, znanymi wartościami. Brak danych w jednej kolumnie pozostaje widoczny. Na telefonie modele pozostają czytelne jako poziomo przewijana tabela z nazwami kolumn i etykietami wierszy; nie gubią związku wartości z modelem.

**AC-10.** Produkt usunięty, nieopublikowany albo spoza rodziny `dom` przekazany w URL nie jest renderowany jako dostępna oferta. Widok informuje, że niektóre pozycje są niedostępne, zachowuje dostępne modele i podpowiada powrót do wyników. Nie ujawnia szkiców producenta.

### C. Panel producenta

**AC-11.** Każda pozycja w chronionym katalogu producenta pokazuje miniaturę lub stan braku zdjęcia, nazwę, status, powierzchnię użytkową, cenę i standard aktywnego wariantu domyślnego albo „Wycena indywidualna”. Cena pochodzi z istniejącego wariantu; lista nie tworzy równoległego pola ceny do edycji.

**AC-12.** Opublikowany produkt ma akcję „Zobacz jak klient”, prowadzącą do jego publicznej karty. Szkic nie prowadzi do publicznej trasy; pokazuje „Opublikuj, aby zobaczyć kartę klienta” i nadal można go edytować w panelu.

**AC-13.** Lista sygnalizuje brak co najmniej: zdjęcia okładkowego, realnego wariantu z ceną, krótkiego zakresu ceny i rzutu. Każda wskazówka prowadzi do odpowiedniego miejsca edycji, jeśli producent może je dziś edytować. Pola utrzymywane obecnie ręcznie nie dostają niedziałającego przycisku; wskazówka mówi, że wymagają uzupełnienia oferty przez obsługę platformy. Brak tych pól sam w sobie nie blokuje publikacji w tym specu.

### D. Spójność i dostępność

**AC-14.** Ceny zachowują istniejącą walutę EUR i jasną etykietę „od” przy cenie minimalnej; interfejs nie pokazuje kwoty PLN wyliczonej z bieżącego kursu. Cena za m², jeśli zostanie pokazana, dzieli cenę tego samego wariantu przez `floorAreaM2` i wyraźnie nazywa mianownik „powierzchnia użytkowa”.

**AC-15.** Zaznaczanie, usuwanie i przełączanie wariantów działa z klawiatury, ma widoczny fokus oraz czytelne nazwy dostępnościowe. Porównanie używa semantycznej tabeli z nagłówkami wierszy i kolumn. Ważne komunikaty o niedostępności i brakach danych nie opierają się wyłącznie na kolorze. Cel: WCAG 2.2 AA.

## Projekt rozwiązania

1. **Jedno źródło pary cena–standard–zakres.** Wspólna funkcja prezentacyjna wybiera wyłącznie realny wariant domyślny (`Project.variants`, bez `isPlaceholder`) i zwraca gotowy stan ceny dla karty wyniku, listy producenta i porównania. Nie zapisuje nowej ceny w bazie.
2. **Dwa niezależne zamiary na wynikach.** Obecny `selectedIds` i `ShortlistActionBar` pozostają wyborem do zapytania. Porównanie dostaje własny stan wyboru i własną akcję. Oba stany mogą współistnieć, lecz nie współdzielą checkboxa ani etykiety.
3. **Publiczny adres porównania.** Trasa `app/[locale]/(customer)/compare/page.tsx` przyjmuje maksymalnie trzy identyfikatory i wybory standardów przez URL, odczytuje wyłącznie opublikowane produkty i renderuje semantyczną tabelę. Nie wymaga ulubionych ani sesji klienta.
4. **Wspólne atrybuty, jawne niewiadome.** Podstawowe wiersze pochodzą z istniejącego `Project`; etapy z wybranego `ProjectVariant`. Pięć kategorii kosztów potrzebuje jawnego mapowania. Nie stosujemy tekstowego `includes`, dopasowania rozmytego ani generowania statusów z opisu.
5. **Katalog producenta.** Rozszerzenie danych odczytanych do `ProducerProductList`, bez zmiany zasad autoryzacji panelu. Podgląd publiczny tylko dla opublikowanych produktów producenta z sesji.

## Plan realizacji

1. Zbudować wspólny selektor danych wariantu i testy stanów: cena dostępna, zakres pusty, wycena indywidualna, brak wariantu.
2. Zaktualizować `ResultCard` o parę cena–standard–zakres oraz dostępność rzutu. Zweryfikować na trzech prawdziwych modelach o różnych stanach danych.
3. Dodać wybór do porównania na wynikach i nową trasę `/compare` z podstawowymi wierszami, weryfikacją URL i odczytem tylko opublikowanych domów.
4. Dodać wybór wariantu per kolumna, „Pokaż tylko różnice” oraz puste i niedostępne stany. Połączyć linki z kartą domu i zapytaniem, zachowując właściwy wariant.
5. Ustalić jawne klucze pięciu kategorii kosztów w modelu lub w kuratorowanym mapowaniu. Dopiero po uzupełnieniu realnych danych włączyć te wiersze w porównaniu.
6. Rozszerzyć listę producenta i dodać akcję podglądu. Wskazówki kompletności oprzeć wyłącznie na istniejących polach i dostępnych sposobach edycji.
7. Test komponentów i scenariusz E2E: wyniki → wybór dwóch domów → porównanie → zmiana wariantu → odświeżenie → karta projektu; osobno katalog producenta → opublikowany model → podgląd.

## Weryfikacja i miara sukcesu

**Definition of done:** wszystkie AC-1–15 przechodzą na desktopie i telefonie; nie ma przypadku ceny przypisanej do obcego wariantu; porównanie działa bez konta; szkic producenta nie jest publicznie dostępny; istniejący wybór do zapytania działa jak wcześniej.

**Mierzyć po uruchomieniu:** udział wejść z wyników do porównania, udział przejść z porównania do karty i zapytania, odsetek opublikowanych domów z ceną wariantu, zakresem i rzutem. Bez docelowych procentów przed zebraniem bazowego pomiaru.

## Ryzyka i otwarte decyzje

- **Mapowanie kosztów:** wolny tekst pozycji kosztowej uniemożliwia pewne porównanie między producentami. Wymaga jawnej kategorii lub ręcznie zatwierdzonego mapowania; do tego czasu nie pokazujemy domniemanych statusów.
- **Samodzielna edycja producenta:** obecny kreator ceny jest płaski, a pełne warianty i pozycje kosztowe mogą być utrzymywane ręcznie. Ten spec poprawia prezentację; osobny spec powinien zaprojektować formularz wielu wariantów po potwierdzeniu procesu danych.
- **Semantyka powierzchni:** `floorAreaM2` i `builtUpAreaM2` muszą mieć konsekwentne etykiety i być sprawdzone na importowanych ofertach. Nie wolno porównywać metrażu „po podłodze” jako powierzchni użytkowej bez potwierdzenia.
- **Ulubione:** istniejące `FavoriteCompareTable` nadal działa. Po wdrożeniu publicznego porównania należy zdecydować, czy panel ulubionych kieruje do tej samej trasy, aby nie utrzymywać dwóch różnych definicji porównania.

## Powiązane decyzje

- [0041 — model danych karty projektu](../0041-model-danych-karty-projektu/index.md)
- [0042 — nowy układ strony projektu](../0042-nowy-uklad-strony-projektu/index.md)
- [0024 — panel klienta i ulubione](../0024-panel-klienta/index.md)
- [0026 — wyszukiwanie i wyniki](../0026-dopracowanie-wyszukiwania-i-wynikow/index.md)
- [0032 — panel producenta](../0032-panel-producenta/index.md)
