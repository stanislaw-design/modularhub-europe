# Katalog domów modułowych — założenia domenowe

**Stan analizy:** 2026-08-22  
**Charakter danych:** fikcyjne projekty demonstracyjne, oparte na realnych wzorcach ofertowych; nie są ofertami firm źródłowych.

## Źródła wzorców

- [BUDMAN House — projekty i technologia](https://budman.house/#projekty)
- [BUDMAN House — Dom Pani Darii 85,06 m²](https://budman.house/projekty/dom-pani-darii-85m2/)
- [BUDMAN House — dom mobilny Kenza](https://budman.house/projekty/nowoczesny-dom-mobilny-kenza/)
- [Steel House — Rosevia](https://steel-house.com.pl/domy-modulowe/dom-rosevia/)

## Co klient naprawdę porównuje

Metraż i wizualizacja są wejściem do oferty, ale nie wystarczają do podjęcia decyzji. Porównywalny rekord projektu musi rozdzielać:

1. **Geometrię i program:** powierzchnia użytkowa i zabudowy, wymiary zewnętrzne, kondygnacje, pokoje, łazienki, dach.
2. **Produkt budowlany:** konstrukcja drewniana, stalowa albo CLT, pełny układ przegród, parametry cieplne, stolarka, wentylacja i ogrzewanie.
3. **Standard przekazania:** surowy zamknięty, deweloperski albo pod klucz. Sama nazwa standardu nie wystarcza — wymagane są listy elementów w cenie i poza ceną.
4. **Logistykę:** liczba i gabaryt modułów, dojazd zestawu transportowego, miejsce dla dźwigu, czas montażu na działce.
5. **Prace lokalne:** fundament, roboty ziemne, przyłącza, adaptacja projektu i formalności są zwykle osobnym zakresem albo zależą od działki.
6. **Ryzyko i termin:** czas produkcji powinien być oddzielony od czasu montażu; gwarancja konstrukcyjna od gwarancji na elewację, urządzenia i pozostałe elementy.
7. **Możliwość zmian:** część projektów pozwala zmienić elewację i odbić rzut, ale strefy mokre, siatka konstrukcyjna i szerokość transportowa ograniczają personalizację.

## Zasada ceny w ModularHub

Strony producentów często komunikują cenę „od”, której zakres może nie obejmować transportu, fundamentu, montażu lub wykończenia. ModularHub normalizuje prezentację:

- `commercial.housePriceMinEur` / `housePriceMaxEur` — budynek w nazwanym standardzie bazowym;
- `priceMin` / `priceMax` — szacowany pakiet porównawczy: budynek + standardowy transport + montaż;
- `priceIncludes` i `priceExcludes` — jawna granica zakresu;
- oferta producenta rozbija końcową kwotę ponownie na dom, transport i montaż.

Pakiet katalogowy nadal jest estymacją. Cena wiążąca może powstać dopiero po wskazaniu adresu, sprawdzeniu dojazdu, fundamentu, lokalnych obciążeń i wybranego standardu.

## Zasada prawna i działkowa

Katalog nie powinien obiecywać, że dom można postawić „bez pozwolenia” wyłącznie na podstawie metrażu. Ścieżka formalna zależy między innymi od przeznaczenia budynku, sposobu posadowienia, parametrów działki, MPZP/WZ i lokalnej jurysdykcji. Dlatego zgodność kraju pozostaje osobną encją `EligibilityByCountry`, a ostateczne dopasowanie następuje w analizie działki.

## Konsekwencje dla kolejnych ekranów

- **Wyniki:** pokazują program, technologię, standard, porównywalny pakiet cenowy oraz termin.
- **Zapytanie:** przenosi identyfikator konkretnego wariantu projektu, nie tylko rodziny modeli.
- **Oferta producenta:** zaczyna od ceny samego domu i osobno wylicza transport oraz montaż.
- **Analiza działki:** sprawdza dojazd, miejsce dla dźwigu, posadowienie, lokalne obciążenia i formalności.
- **Realizacja:** rozdziela projekt/adaptację, fundament, produkcję, transport, montaż, instalacje, odbiór i gwarancję.
