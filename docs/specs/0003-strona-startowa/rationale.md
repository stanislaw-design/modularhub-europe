# 0003. Strona startowa: hero z selektorem wyszukiwania, uzasadnienie

## Context

`docs/scope/scope.md`, funkcja 4, opisywała stronę startową wąsko: logo v3 display w hero, claim marki „One project. Different rules. One clear path.", i jedno CTA prowadzące do osobnego kroku „Kreator ceny" (funkcja 5, pełny formularz: kraj, działka, metry, sypialnie, budżet, termin, którego jedynym wyjściem jest jedna szacunkowa cena). „Done when" tej funkcji wprost zakładał „brak drugorzędnych komunikatów odciągających od CTA".

Zamawiający przyniósł do tej sesji inny wzorzec: selektor w hero ograniczony do kraju i przybliżonego metrażu (krok 50 m²), prowadzący od razu do strony przeglądania wyników, gdzie reszta parametrów jest dogrywana na miejscu; niżej sekcja polecanych domów; jeszcze niżej coś o samej platformie. Jako punkt odniesienia wskazał Airbnb.pl, wakacje.pl i przykładowy serwis „Runway" (zrzut ekranu przesłany w rozmowie), ten ostatni oceniony jako najbliższy oczekiwanemu układowi: pigułkowy pasek wyszukiwania z kilkoma polami, rząd kategorii, siatka kart ze zdjęciem, tytułem, ceną i oceną.

To bezpośrednio koliduje z zapisem funkcji 4 w scope na dwóch poziomach: (1) hero przestaje być czystą powierzchnią wizerunkową z jednym CTA, staje się funkcjonalnym formularzem wyszukiwania; (2) selektor prowadzi wprost do wyników (funkcja 6), nie do kreatora ceny (funkcja 5), co w rozmowie zamawiający rozstrzygnął jednoznacznie: kreator ceny wypada z zakresu.

Dodatkowe napięcie: `docs/brand-guidelines-v3.md`, sekcja 13 („Zastosowania → Strona internetowa"), przewiduje dokładnie odwrotny wzorzec do referencji zamawiającego: „v3 w hero na spokojnym tle, jeden claim i jeden konkretny CTA, poniżej natychmiast proces, dowody i ograniczenia, nawigacja korzysta z płaskiego v2". Zapytany wprost, zamawiający wybrał zachowanie logo v3 display w hero (zgodnie z wytycznymi marki), ale jako element wizualny współistniejący z selektorem wyszukiwania, nie zamiast niego. To rozstrzygnięcie łączy oba źródła: v3 display zostaje (marka, sekcja 6.1, plik przygotowany właśnie pod „hero strony"), ale jego towarzystwem jest teraz funkcjonalny selektor zamiast gołego CTA, a sekcje „Polecane domy" i „Jak to działa" realizują dosłownie frazę wytycznych „poniżej natychmiast proces, dowody i ograniczenia".

Model danych już istniejący (`Project`, `Country`, `EligibilityByCountry` w `lib/data/types.ts`, spec 0002) rozstrzyga, co selektor faktycznie potrzebuje zbierać: `EligibilityByCountry.countryCode` to jedyne pole, od którego zależy filtr prawny na wynikach; `Project.floorAreaM2` to jedyne pole metrażu. Sypialnie, budżet i termin (pola kreatora ceny) nie są dziś używane przez żaden istniejący mechanizm filtrowania, więc ich brak w hero nie blokuje niczego, co już istnieje w modelu danych.

Nie zaproszono do fetchowania transkrypcji filmu wskazanego przez zamawiającego jako dodatkowe źródło (YouTube nie oddał treści przez dostępne narzędzie); zamawiający zgodził się projektować wyłącznie na bazie zrzutu ekranu i ogólnej wiedzy o tym wzorcu UI, nie na bazie samego filmu.

## Options considered

### Opcja 1: Hero ze zwięzłym selektorem wprost do wyników, kreator ceny poza zakresem

Hero zbiera tylko kraj i przybliżony metraż, przycisk „Szukaj" przenosi od razu na stronę wyników (funkcja 6). „Kreator ceny" (funkcja 5) znika ze scope.

**Pros**:
- Najkrótsza droga od wejścia na stronę do zobaczenia prawdziwych domów, zgodna z wzorcem serwisów rezerwacyjnych, który zamawiający wskazał i poparł zrzutami ekranu.
- Dwa zbierane pola (kraj, metraż) to dokładnie to, czego dziś potrzebuje filtr prawny i wyświetlanie widełek cenowych na wynikach, więc nic nie jest zbierane na zapas.

**Cons**:
- Znika docelowa ścieżka do jednej, konkretnej ceny, którą dawał kreator ceny; część klientów mogła chcieć najpierw samej liczby, nie listy domów.
- Kliknięcie karty polecanego domu nie ma naturalnego kraju docelowego (projekt ma tylko kraj produkcji), więc może filtrować wyniki wyłącznie po metrażu, nie po kraju.

### Opcja 2: Hero z jednym CTA do osobnego kreatora ceny (pierwotny zapis w scope)

Hero zostaje czystą powierzchnią wizerunkową: logo, claim, jeden przycisk prowadzący do sześciopolowego kreatora ceny; dopiero po jego wypełnieniu klient widzi wyniki.

**Pros**:
- Dosłownie zgodne z wytycznymi marki („jeden claim, jeden konkretny CTA") bez żadnego godzenia sprzecznych źródeł.
- Daje jedną, konkretną liczbę (cenę) na wczesnym etapie, czego część klientów chcących szybkiego oszacowania budżetu może szukać w pierwszej kolejności.

**Cons**:
- Wymusza cały dodatkowy ekran, zanim klient zobaczy choćby jeden prawdziwy dom, wprost przeciwnie do wzorca, o który poprosił zamawiający i poparł go realnymi zrzutami ekranu.
- Nie wykorzystuje żadnego z pól hero, dopóki cały kreator nie zostanie ukończony.

### Opcja 3: Hybryda, selektor w hero wypełnia wstępnie kreator ceny, który nadal blokuje wyniki

Kraj i metraż z hero trafiają jako wartości domyślne do pól kreatora ceny, ale klient nadal musi dokończyć resztę pól (sypialnie, budżet, termin), zanim zobaczy wyniki.

**Pros**:
- Zachowuje wycenę jako produkt końcowy kreatora, dając selektorowi hero realną przewagę czasową zamiast go zastępować.
- Najmniejsza zmiana względem pierwotnie zaplanowanego lejka.

**Cons**:
- Dwa ekrany tarcia zanim pojawi się choćby jeden dom, wprost zaprzeczające temu, co zamawiający powiedział wprost: „resztę szczegółów klient może dodać na stronie stricte do przeglądania wyników".
- Logika wstępnego wypełniania (stan przeniesiony przez URL między dwoma wielopolowymi ekranami) to realna złożoność techniczna dla korzyści, która materializuje się tylko jeśli kreator przetrwa, a zamawiający zdecydował inaczej.

## Rationale

Opcja 1 wygrywa, bo wprost realizuje to, co zamawiający powiedział bez dwuznaczności: selektor ograniczony do kraju i metrażu, przekierowanie na wyniki, reszta dogrywana na miejscu. Model danych już zbudowany w spec 0002 potwierdza, że te dwa pola są jedynymi, od których zależy dzisiejszy mechanizm filtrowania (`EligibilityByCountry`, `Project.floorAreaM2`); zbieranie sypialni, budżetu czy terminu w hero zbierałoby dane, których żaden istniejący ekran jeszcze nie używa.

Napięcie z `brand-guidelines-v3.md` sekcja 13 nie jest argumentem przeciw Opcji 1, tylko wskazówką jak ją złożyć: logo v3 display zostaje w hero (zamawiający potwierdził to wprost, wybierając zachowanie logo zamiast czystej referencji Runway), a sekcje „Polecane domy" i „Jak to działa" realizują frazę wytycznych „poniżej natychmiast proces, dowody i ograniczenia" tak samo, jak realizowałoby ją Opcja 2, tylko że dowody i CTA pojawiają się o jeden ekran wcześniej.

Opcja 2 była właściwym wyborem na etapie, gdy scope pisano bez znajomości referencji wskazanych w tej rozmowie; przy jednoznacznej preferencji zamawiającego dla wzorca wyszukiwania i przy braku dziś istniejącego mechanizmu korzystającego z pól kreatora, dalsze trzymanie się jej oznaczałoby ignorowanie wprost wyrażonej decyzji bez realnej korzyści funkcjonalnej. Opcja 3 była kuszącym kompromisem, ale zamawiający odrzucił ją wprost (wybór „Hero zastępuje kreator ceny, usuwamy go z zakresu" w pytaniu o dalszy los kreatora), więc traktowanie jej jako żywej opcji byłoby ignorowaniem jego odpowiedzi.

**Nagłówek hero (RECOMMEND, zamawiający nie doprecyzował treści, tylko wybrał kierunek „nowy nagłówek zorientowany na akcję wyszukiwania")**: rekomendowana treść to „Znajdź swój dom modułowy, dopuszczony w Twoim kraju." (łączy akcję wyszukiwania z realną przewagą platformy, filtrem prawnym, zamiast ogólnikowego hasła). Wariant zapasowy: „Twój dom modułowy. Gdziekolwiek w Europie chcesz go postawić." Ostateczny wybór treści zostaje do potwierdzenia przy `/develop`, to nie jest decyzja architektoniczna.

**Progi metrażu (RECOMMEND)**: zamawiający zaakceptował „dwa pola Select co 50 m² (0, 50, 100, 150, 200+)"; zamiast dosłownej opcji „0" i „200+", pola „od" i „do" współdzielą jedną listę progów (50, 100, 150, 200 m²) z pustą wartością domyślną oznaczającą brak ograniczenia w danym kierunku. Efekt jest identyczny (można wyrazić „od 200 m² wzwyż" ustawiając tylko „od"), ale bez dwóch dodatkowych, niesymetrycznych opcji granicznych w każdym polu.
