# 0039. Kontenery modułowe zamiast pergoli — uzasadnienie

## Context

Rodzina produktu "pergola" istnieje od spec 0022 (rodziny produktów i kategorie) jako jedna z trzech rodzin (dom, spa-modulowe, pergola), zbudowana hipotetycznie, bez prawdziwego producenta pergoli za sobą. Spec 0035 (Domy i Więcej niż dom) wprost nazywa ten katalog "płytkim": grupa "Więcej niż dom" jest dziś bogata tylko tak, jak najcieńsza rodzina za nią, czyli praktycznie jeden przykładowy produkt na rodzinę. Sprawdzone bezpośrednio w produkcyjnej bazie Neon (projekt `modularhub`) 2026-09-14: `product` ma dziś 65 wierszy `family = 'dom'`, 1 wiersz `family = 'spa-modulowe'`, 0 wierszy `family = 'pergola'`.

Biznesowo, kierunek "styl życia" grupy "Więcej niż dom" przesuwa się z pergoli na kontenery modułowe, z trzema realnie różnymi zastosowaniami: gastronomiczne (kontener/moduł gastronomiczny — bar, food truck, kuchnia), usługowe (biuro, sklep, punkt usługowy) i mieszkalne (moduł do zamieszkania). To pierwszy przypadek w tym modelu danych, gdzie podkategorie jednej rodziny różnią się na tyle realnie (wymogi sanitarno-elektryczne kuchni vs. wymogi mieszkalności vs. ogólne wymogi usługowe), że dzisiejszy wzorzec "jeden kształt `technicalSpecs` na całą rodzinę, subcategory to tylko klasyfikacja" (spec 0022) nie oddaje różnicy uczciwie.

Siły w grze: `product` jest dziś prawdziwą, produkcyjną tabelą Postgresa (spec 0017/0018), więc to migracja schematu na żywym systemie, nie zmiana warstwy mocków. Postgres nie ma polecenia usuwającego wartość z istniejącego typu enum (`DROP VALUE`) — usunięcie `pergola` wymaga przebudowy typu (rename, create, alter column, drop starego typu), nie prostego dopisania nowej wartości. Zero rzeczywistych danych rodziny pergola radykalnie obniża ryzyko każdej z rozważanych strategii migracji.

## Options considered

### Option 1: Bezpośrednie zastąpienie (direct replace) — wybrane

Usuń `pergola` całkowicie z enuma, kolumny podkategorii, `technicalSpecs`, UI i tłumaczeń w jednym skoordynowanym wdrożeniu; dodaj `kontenery-modulowe` w jej miejsce, z trzema własnymi kształtami danych technicznych per podkategoria.

**Pros**:
- Czysta baza kodu i schemat: brak baggage'u, żadnej martwej wartości enum na zawsze.
- Realizuje dosłowną prośbę ("usuń rodzinę pergola"), nie tylko przykrywa ją nową etykietą.
- Bezpieczne, bo tabela ma dziś 0 wierszy tej rodziny — nie ma nic do zachowania.

**Cons**:
- Wymaga przebudowy typu enum Postgresa (kilka kroków SQL: rename, create, alter, drop) zamiast prostego `ADD VALUE`.
- Każde dzisiejsze odwołanie do `pergola`/`pergolaSubcategory`/`PergolaSubcategory` w kodzie przestaje się kompilować od razu (zaleta z punktu widzenia kompletności zmiany, koszt w rozmiarze diffu).

### Option 2: Additive / strangler (dodaj kontenery obok pergoli, usuń pergolę później)

Dodaj `kontenery-modulowe` jako czwartą rodzinę, oznacz `pergola` jako przestarzałą w komentarzu, usuń ją w osobnym, późniejszym builcie.

**Pros**:
- To ogólnie właściwy wzorzec migracji na żywym systemie (`lib/db/AGENTS.md`, enhancement.md): rozdziela ryzyko w czasie, chroni dane w trakcie przejścia.

**Cons**:
- Tu nie ma czego chronić: 0 wierszy `family = 'pergola'`. Cała korzyść strangler pattern (bezpieczne współistnienie starego i nowego na prawdziwych danych) jest zerowa.
- Koszt jest realny i trwały: dwie rodziny "stylu życia" widoczne naraz w kodzie i UI, dodatkowa wartość enum, której Postgres nigdy nie usunie bez tej samej przebudowy typu, którą i tak trzeba było kiedyś zrobić — tylko później i z dodatkowym międzyczasem mylącego stanu.

### Option 3: Relabel w miejscu (zostaw `pergola` w bazie/kodzie, zmień tylko etykiety UI)

Zostaw enum, kolumnę i kod tak jak są, zmień wyłącznie widoczne teksty "Pergole" → "Kontenery modułowe".

**Pros**:
- Najmniejsza możliwa zmiana, brak migracji bazy.

**Cons**:
- Trwałe, mylące rozjechanie między nazwą techniczną (`pergola` w schemacie, typach, testach) a rzeczywistym znaczeniem biznesowym (kontener modułowy) — każdy przyszły inżynier czytający `schema.ts` albo `ProductFamily` zobaczy "pergola" i będzie zdezorientowany.
- Nie realizuje trzech osobnych podkategorii z różnymi polami technicznymi (gastronomiczne/usługowe/mieszkalne nie mapują się sensownie na cztery dzisiejsze podkategorie pergoli: bioklimatyczna/aluminiowa-stala/drewniana/wolnostojaca-przyscienna).
- Nie realizuje intencji "usuń rodzinę pergola" — tylko ją ukrywa.

## Rationale

Wybrano Option 1. `lib/db/AGENTS.md`'s ogólna zasada bezpiecznej migracji produkcyjnej (dodaj nullable → backfill → wymuszaj) i enhancement.md's domyślna rekomendacja strangler pattern zakładają, że jest coś do ochrony podczas przejścia — tu nie ma: tabela ma zero wierszy tej rodziny, sprawdzone bezpośrednio w bazie. Enhancement.md wprost dopuszcza bezpośrednią zamianę, gdy "zakres jest mały i ryzyko niskie" — dokładnie ten przypadek.

Option 3 (relabel) był kuszący ze względu na rozmiar zmiany, ale odrzucony: zostawiłby permanentny rozjazd między nazwą techniczną a znaczeniem biznesowym, i nie pozwoliłby na trzy realnie różne podkategorie z własnymi polami technicznymi, co było wyraźnym wymaganiem tej decyzji.

Decyzja o rozdzieleniu `technicalSpecs` per podkategoria (zamiast jednego wspólnego kształtu na całą rodzinę, jak dziś dla dom/spa-modulowe) zapadła wprost w rozmowie projektowej: silnik-inżynier rozważał wariant "jeden wspólny zestaw pól" (prostszy, spójny z dzisiejszym wzorcem) jako rekomendowany, ale zdecydowano się na trzy osobne kształty, bo gastronomiczne (wymogi sanitarno-elektryczne kuchni), usługowe (ogólne biuro/sklep) i mieszkalne (wymogi mieszkalności — sypialnie, łazienka) różnią się realnie na tyle, że jeden wspólny zestaw pól albo pęczniałby polami nieistotnymi dla części zastosowań, albo nie doprecyzowywał żadnego z nich wystarczająco. To pierwszy taki przypadek w tym kodzie (dotąd `subcategory` była tylko klasyfikacją, nigdy nie zmieniała kształtu `technicalSpecs`), świadomie przyjęty koszt większej złożoności w zamian za trafniejszy formularz dla producenta. Trzy kształty dzielą kilka identycznych pól (`dimensions`, `structureMaterial`, `insulationType`, `foundationType`) — `/develop` może je złożyć z jednego wspólnego bazowego kształtu Zod rozszerzanego per podkategoria, żeby ograniczyć duplikację kodu, o ile finalny kształt każdej podkategorii zostaje dokładnie taki, jak ustalono (patrz Follow-up w index.md). To szczegół implementacji, nie osłabienie samej decyzji o trzech rozłącznych kształtach.
