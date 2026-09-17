# 0044. Uzasadnienie: porównywalna oferta domów

## Obserwacje z rynku — 2026-09-17

| Producent | Sprawdzony wzorzec | Lekcja dla ModularHub |
| --- | --- | --- |
| [Treevia](https://treevia.pl/blog/porownanie-modeli-treevia) | Porównanie 2–3 modeli; [karta NORD 68](https://treevia.pl/dom/nord-68) rozdziela BASIC, ALL-IN i montaż. | Zestawienie modeli ma sens tylko razem z definicją wariantu i zakresu. |
| [FastHome](https://fasthome.com.pl/oferta/) | Dużo modeli grupowanych według bryły, z ceną, wymiarami i liczbą sypialni na liście; [karta modelu](https://fasthome.com.pl/mini-stodola-29m/) pokazuje plan. | Wymiary i rzut są ważne obok ceny, zwłaszcza dla małych domów. |
| [FiModular](https://fimodular.pl/produkty) | Wejście według celu: mieszkanie, rekreacja, wynajem; [karta FIM 96](https://fimodular.pl/dom-modulowy-96m2) nazywa wariant, którego dotyczy cena. | Cena „od” bez nazwy wariantu jest niepełną informacją. |
| [Polska Fabryka Domów](https://polskafabrykadomow.pl/hyperion-dom-bez-pozwolenia/) | Osobna dopłata za wykończenie pod klucz i tabela pomieszczeń. | Klient chce ocenić zarówno zakres ceny, jak i funkcjonalność metrażu. |
| [Modularen](https://www.modularen.com/oferta/grand-house-103/) | Parametry domu, rzuty i osobne ceny dwóch standardów; pod klucz wyceniane indywidualnie. | Standard bez ceny musi pozostać jawną niewiadomą. |
| [MOBI HOUSE](https://mobihouse.pl/oferta/modul-sunrise) | Szczegółowa specyfikacja modelu; cenę konkretnego domu uzyskuje się przez formularz, a pełny [katalog](https://mobihouse.pl/katalog) po podaniu e-maila. | Publiczne porównanie potwierdzonych danych może skrócić drogę klienta do zapytania. |

To są obserwacje funkcjonalne z publicznych stron, nie audyt wizualny ani ocena jakości wykonawstwa producentów. Cenniki mogą się zmieniać; spec nie kopiuje ich kwot do danych ModularHub.

## Dlaczego ten zakres

Spec 0041 i 0042 rozwiązały najtrudniejszy problem wewnątrz pojedynczej karty projektu: cena jest związana z wariantem i zakresem. Dziś te informacje tracą kontekst na liście wyników i w porównaniu ulubionych. Najmniejszy użyteczny krok to więc roznieść już istniejący kontrakt na wynik i publiczne porównanie, a producentowi pokazać stan własnej oferty. Pełny kreator wariantów byłby odrębną zmianą procesu zapisu i uprawnień.

## Rozważane opcje

1. **Rozszerzyć tylko tabelę ulubionych.** Mały koszt, ale porównanie nadal wymaga konta i zapisania produktów, więc nie obsługuje użytkownika przeglądającego katalog po raz pierwszy.
2. **Użyć zaznaczenia do zapytania również do porównania.** Mniej kontrolek, lecz jeden checkbox oznaczałby dwa różne zamiary; dodatkowo zmiana filtra lub nawigacji mogłaby pomieszać oba stany.
3. **Osobny wybór na wynikach i publiczny widok porównania — wybrana opcja.** Daje jasne działanie klientowi bez konta i pozwala udostępnić zestawienie. Obecny przepływ zapytania pozostaje jednoznaczny.

## Zasady danych

- `Project.priceMin` jest polem pochodnym wariantu domyślnego, ale prezentacja powinna jawnie sięgnąć po *ten sam* `ProjectVariant` dla ceny, etykiety i zakresu. Przy braku wariantu nie rekonstruuje zakresu z innych pól.
- Ceny w obecnym modelu są w EUR. Cenniki producentów z researchu są zwykle w PLN; spec nie zakłada prostego porównania tych kwot ani automatycznej konwersji.
- `CostLineItem.label` jest wolnym tekstem. Dwa napisy o tym samym znaczeniu mogą mieć różną treść, a podobne napisy mogą oznaczać różny zakres. Porównanie między producentami wymaga jawnych kategorii i potwierdzonego przypisania.
- Stan `isPlaceholder` ze spec 0042 pomaga pokazać trzy możliwe standardy na karcie, ale nie oznacza faktycznie sprzedawanego wariantu. Nie trafia do wyboru w porównaniu.
- Podgląd producenta nie może ujawniać szkicu przez publiczny `project/[id]`. Na obecnym etapie podgląd klienta ogranicza się do opublikowanych produktów.

## Konsekwencje

**Korzyść:** klient porównuje realne warianty i widzi niewiadome przed kontaktem z producentem; producent szybciej zauważa, dlaczego jego oferta wygląda na niepełną.

**Koszt:** osobna trasa porównania i dodatkowy stan wyboru na wynikach. Najtrudniejsza część danych to wspólne kategorie kosztów, dlatego plan oddziela je od pierwszego działającego porównania podstawowych pól.

**Dalsza praca:** po uruchomieniu należy ujednolicić wejście do porównania z wyników i ulubionych oraz zaprojektować samoobsługowe wpisywanie wielu wariantów przez producenta.
