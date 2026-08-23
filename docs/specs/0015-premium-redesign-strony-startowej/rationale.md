# 0015. Rationale: Redesign strony startowej w kierunku premium

## Context

Spec 0014 wdrożyła pełny układ marketingowy strony startowej: ciemne hero z mozaiką zdjęć, pasek statystyk, kategorie, cztery kafelki „dlaczego my” (w tym Compliance Engine jako jeden z czterech), pasek producentów jako przewijany tekst, zamykające CTA i rząd zaufania. Zamawiający obejrzał tę wersję na żywo i uznał, że kierunek funkcjonalny jest dobry, ale wizualnie strona nie komunikuje wystarczającej wartości: wygląda na wczesny etap startupu, nie na dużą, zaufaną platformę.

Konkretne siły, które ukształtowały tę decyzję:

- **Zbyt dużo konkurujących ze sobą elementów w hero.** Dzisiejsza mozaika sześciu zdjęć rozprasza uwagę zamiast budować jeden mocny, premium efekt pierwszego wrażenia (Airbnb, fintech, nieruchomości premium, nie portal ogłoszeniowy).
- **Za wolno pokazujemy prawdziwy produkt.** Klient dziś widzi statystyki i kategorie, zanim zobaczy chociaż jeden konkretny dom — to opóźnia moment, w którym produkt zaczyna sam się sprzedawać.
- **Compliance Engine™ jest ukryty.** To realna przewaga konkurencyjna platformy (funkcja, której nie dostanie się na stronie pojedynczego producenta), a dziś jest jednym z czterech równorzędnych kafelków, bez własnej wizualnej wagi.
- **Cena nie komunikuje przejrzystości.** Jeden zakres „od–do” nie pokazuje z czego się składa (dom, transport, montaż) — a to jest realna różnica względem kupowania bezpośrednio od producenta.
- **Zbyt dużo ciemnych, pełnych sekcji naraz.** Nagłówek, hero i pasek producentów są dziś czarne — to buduje ciężki, nie „spokojny” ton, sprzeczny z tym, co ma się kojarzyć z premium: dużo bieli, jeden zdyscyplinowany akcent koloru.

Ten redesign dotyczy wyłącznie ekranu `/pl/klient` (strona startowa klienta). Rozbicie ceny na osobne pozycje (dom / transport / montaż) rozciąga się też na `ResultCard`, używany na `/pl/klient/wyniki` (spec 0004, już zweryfikowana) — to jedyny punkt, w którym ta zmiana wychodzi poza granicę jednego ekranu, i jest tu jawnie odnotowany.

## Options considered

### Option 1: Pełny redesign według briefu zamawiającego (wybrana)

Nowa kolejność jedenastu sekcji, nowa proporcja jasne/ciemne (tylko zamykające CTA zostaje ciemne), nowa encja `Producer`, dwa nowe współdzielone komponenty (`Accordion`, `StarRating`), rozbita cena na `/wyniki`. Big bang w ramach jednego przejścia `/develop`, ten sam tryb migracji co spec 0014.

**Pros**:
- Bezpośrednio realizuje konkretny, przemyślany brief zamawiającego, punkt po punkcie.
- Wykorzystuje już istniejące zasoby (6 zdjęć domów, tokeny v3/v4, `Select`/Headless UI) zamiast wymyślać nowe — zero nowych plików graficznych.
- Rozdziela Compliance Engine na własną, wyeksponowaną sekcję — realna przewaga konkurencyjna dostaje wizualną wagę, jaką zamawiający chce jej nadać.

**Cons**:
- Duży zasięg zmiany na raz: 4 komponenty usunięte, 6 nowych, 4 zmodyfikowane, jedna nowa encja danych, jeden plik tokenów.
- Rozbicie ceny wychodzi poza granicę jednego ekranu (dotyka `ResultCard`, współdzielonego z już zweryfikowaną spec 0004).

### Option 2: Restyle w miejscu, bez zmiany kolejności sekcji

Zostawić strukturę i kolejność sekcji ze spec 0014 (statystyki → kategorie → dlaczego my → producenci → CTA → rząd zaufania), zmieniając tylko kolorystykę (mniej czerni) i wagę wizualną ceny na kartach.

**Pros**:
- Znacznie mniejszy zasięg zmiany, szybsze wdrożenie, zero nowej encji danych.
- Zero ryzyka regresji poza samą stroną startową (rozbita cena na `/wyniki` odpada).

**Cons**:
- Nie realizuje najmocniejszego punktu briefu: szybszego pokazania prawdziwych domów i własnej sekcji Compliance Engine.
- Zostawia stronę strukturalnie identyczną z tym, co zamawiający wprost ocenił jako „portal ogłoszeniowy”, nie premium platformę.

### Option 3: Pełna przebudowa od zera, bez odwołań do dzisiejszego kodu

Zignorować istniejące komponenty i tokeny v3/v4 całkowicie, zaprojektować stronę i system wizualny od podstaw.

**Pros**:
- Brak ograniczeń dziedziczonych z wcześniejszych decyzji (v3/v4), pełna swoboda projektowa.

**Cons**:
- Marnuje już zbudowaną, działającą pracę (tokeny, `Select`/Headless UI, sześć zdjęć domów, komponenty bazowe) bez żadnego realnego powodu — te elementy już spełniają brief.
- Ryzykuje niespójność z resztą produktu (wyniki, zapytanie, oferta, realizacja), który dalej stoi na v3.

## Rationale

Option 2 było kuszące ze względu na mniejszy zasięg, ale nie odpowiada na najmocniejszą, najbardziej konkretną część briefu: zamawiający explicite krytykuje dzisiejszą kolejność (statystyki i kategorie przed prawdziwymi domami) i explicite chce dla Compliance Engine własnej, wizualnie odróżnionej sekcji. Zmiana samej kolorystyki bez zmiany kolejności zostawiłaby stronę strukturalnie tym, co zamawiający już ocenił jako niewystarczające.

Option 3 zostało odrzucone, bo nie ma żadnej siły z Context, która by je uzasadniała — tokeny v3/v4 już zawierają dokładnie te kolory, których potrzebuje wersja premium (czerń jako tekst, biel jako tło, bursztyn jako jedyny akcent), a sześć istniejących zdjęć domów w `public/images/houses/golden-hour/` już pokrywa każdą potrzebę wizualną tego redesignu (patrz index.md, Feature design, Zasoby). Przebudowa od zera zmieniałaby coś, co już działa, bez żadnej korzyści.

Kluczowa decyzja techniczna: **v5 to nowy zestaw aliasów tokenów, nie nowe kolory.** `assets/tokens/brand-v3-tokens.css` i `brand-v4-tokens.css` używają dokładnie tych samych wartości hex (czerń `#000000`, granat `#14213d`, bursztyn `#fca311`, alabaster `#e5e5e5`) pod różnymi nazwami dla różnych kontekstów (v3: nazwy semantyczne produktu; v4: nazwy powierzchni marketingowych, domyślnie ciemne). v5 wprowadza trzeci zestaw aliasów tych samych wartości, gdzie domyślną powierzchnią jest biel, a czerń jest zarezerwowana świadomie tylko dla jednej sekcji (`--brand-v5-night`, używany wyłącznie przez `ClosingCta`) — zero nowego koloru do uzasadnienia, zero ryzyka niespójności z resztą marki. To jest spójne z tym, jak v4 samo powstało w spec 0013: dodatkowa warstwa aliasów na tej samej palecie, nie nowa decyzja kolorystyczna.

## Decyzje z rozmowy projektowej (skrót)

Poniższe decyzje zapadły w rozmowie z zamawiającym, każda z jedną rekomendowaną opcją zaznaczoną i wybraną (poza jednym wyjątkiem, gdzie zamawiający wybrał opcję inną niż rekomendowana):

- **Źródło designu**: brief zamawiającego jako główne źródło, obecny UI i `docs/design.md` jako baza wyjścia.
- **Zasięg rozbitej ceny**: też na `/wyniki` (`ResultCard`), nie tylko na stronie głównej — szerszy zasięg niż rekomendacja, świadomie zaakceptowany przez zamawiającego.
- **Kierunek kolorystyczny**: nowy zestaw tokenów (v5), nie rozszerzenie v4 — zamawiający wybrał większy zasięg niż rekomendacja; zrealizowane jako nowa warstwa aliasów tej samej palety (patrz wyżej), nie nowe kolory.
- **Akcent koloru**: zachowany bursztyn `#fca311`.
- **Proporcja czerni**: nagłówek jasny, hero ze zdjęciem (nie pełna czerń), czerń tylko w zamykającym CTA.
- **Katalog producentów**: nie buduje się w tym redesignie, „Zobacz wszystkich producentów” zostaje `disabled`.
- **Kolejność „Popularne domy”**: reużywa istniejące pole `Project.featured`, bez nowego pola `viewCount`.
- **„Porównaj domy”**: marketingowa zapowiedź funkcji, link do `/wyniki`, bez nowej logiki porównywania na stronie głównej.
- **„Opinie”**: 4 do 6 mockowych opinii napisanych teraz, nie placeholder czekający na prawdziwą treść.
- **„Jak działa ModularHub”**: osobny, szerszy wyjaśniacz całej ścieżki, różny od trzykrokowego skrótu w zamykającym CTA.
- **Akordeon**: nowy współdzielony `components/ui/Accordion`, nie trzecia kopia lokalnego wzorca.
- **Model danych `Producer`**: zaakceptowany bez zmian przy pierwszym pokazaniu (pola: id, name, countryCode, rating, reviewCount, modelsCount, sizeRangeM2Min/Max, deliveryCountries, featuredPhotoUrl, verified; testimoniale/FAQ zostają treścią statyczną, nie encją).
- **Karta „Popularne domy”**: nowy, dedykowany komponent karty — zamawiający wybrał to zamiast rekomendowanego ponownego użycia `ResultCard`.
- **Przyciski Zapisz/Porównaj na karcie**: pominięte, poza dzisiejszym zakresem produktu.
- **Sekcja „Dlaczego ModularHub Europe?”**: usunięta całkowicie, treść wchłonięta przez nowe sekcje.
- **Pasek statystyk**: usunięty całkowicie, dubluje się z odznakami w hero i sekcją Opinie.
- **Rząd zaufania na dole (`TrustFooterRow`)**: usunięty, dubluje się z odznakami w hero.
- **Referencje**: bez sekcji References w spec (REFERENCES_LEVEL: none).
