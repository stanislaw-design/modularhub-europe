# 0081. Rationale: Letniskowo, katalog i sekcje klienta

Zapis uzasadnienia i danych źródłowych dla [index.md](index.md). Budowa czyta `index.md`, a z tego pliku tylko sekcję „Inwentarz opcji”.

## Context

Letniskowo sp. z o.o. (Białystok) produkuje całoroczne domy mobilne na stalowej konstrukcji z izolacją PUR, na podwoziu FF (płaskie) albo MP (mobilne). Ma certyfikat ISO 9001 i 14001, deklaruje ponad 2000 dostarczonych domów w Europie i jest dla platformy ważnym klientem. Dostarczył 28 plików (cennik, oferta, 17 kart modeli, cennik opcji, 5 stylistyk wnętrz, certyfikat). Materiały są w `_docs/letniskowo/`, poza repozytorium.

Katalog ma już wszystko, żeby przyjąć takie dane: kategoria `mobilny`, rodzina `dom`, opcje płatne (spec 0059), tłumaczenia (spec 0067), rzuty wersji układu (spec 0069). Trzy rzeczy z materiałów nie mają jednak miejsca w modelu: pięć stylistyk wnętrza z próbnikami materiałów, opis współpracy w pięciu krokach i lista zastosowań komercyjnych. Dodatkowo okazało się, że link „zapytanie” przenosi dziś tylko wariant, a standardowe zapytanie (`inquiry` i `inquiry_item`) nie ma gdzie zapisać ani opcji, ani stylistyki. Bez tego klient mógłby skonfigurować dom, a producent dostałby zapytanie o samą nazwę modelu.

Dane źródłowe są też niespójne i niekompletne (ceny w ofercie różnią się od cennika, „deLux” nigdzie nie jest zdefiniowane, nazwy części opcji są niejasne). Trzeba było zdecydować, co jest źródłem prawdy i co zostaje oznaczone jako niepewne.

## Options considered

**Decyzja A: model stylistyk wnętrza**

*Opcja A1: katalog producenta przypisywany do produktów (wybrana).* Stylistyka należy do producenta i jest przypisywana do modeli, jak grupy opcji w specu 0059. Pro: pięć stylistyk zapisanych raz zamiast 85 kopii, zmiana tekstu w jednym miejscu, gotowe pod innych producentów. Con: siedem nowych tabel w całym speku, tłumaczenia wymagają rozszerzenia `check:translations`.

*Opcja A2: osobno na każdym produkcie.* Pro: prostsze tabele. Con: 5 × 17 kopii tych samych danych i zdjęć, każda poprawka 17 razy.

*Opcja A3: zwykła grupa opcji z ceną 0.* Pro: zero nowych tabel. Con: grupa opcji ma tylko etykietę, więc nie pomieści materiałów w strefach ani wizualizacji, a sekcja byłaby uboga.

**Decyzja B: treść „Sposób współpracy” i zastosowań**

*Opcja B1: tabela treści producenta z tłumaczeniami (wybrana).* Pro: tekst w bazie, tłumaczony jak reszta, inni producenci mogą mieć własny. Con: nowa tabela dla pięciu krótkich wpisów.

*Opcja B2: zakodowane w komponencie.* Pro: najszybsze. Con: tylko dla Letniskowo, każda zmiana tekstu to deploy, nie przechodzi przez system tłumaczeń.

*Opcja B3: istniejący harmonogram etapów (`product_timeline_stage`).* Pro: już zbudowany. Con: wymaga czasu w dniach per wariant, a oferta nie podaje żadnych terminów, więc musielibyśmy je wymyślić.

**Decyzja C: konfiguracja w zapytaniu**

*Opcja C1: migawka w jednej kolumnie jsonb na `inquiry_item` (wybrana).* Pro: bez nowej tabeli, działa dla opcji każdego producenta, producent widzi pełny opis. Con: jsonb gorzej nadaje się do raportów niż tabela, migawka nie ma ofert PDF.

*Opcja C2: strukturalna tabela wyborów.* Pro: czyste do raportów i przyszłych ofert PDF. Con: duża zmiana przepływu zapytań, osobna decyzja, wykracza poza klienta.

*Opcja C3: tylko stylistyka.* Pro: zakres się nie rozszerza. Con: zostawia istniejącą lukę opcji i prowadzi do dwóch różnych mechanizmów.

**Decyzja D: próbniki materiałów**

*Opcja D1: małe WebP w R2 bez optymalizacji Vercela (wybrana).* Pro: koszt zerowy dla limitu obrazów, mały transfer (około 0,3 MB razem po deduplikacji), tylko otwarta stylistyka pobiera pliki. Con: skrypt wycinania i osobny upload.

*Opcja D2: materiały tylko jako tekst z kodem.* Pro: zero kosztu. Con: klient nie widzi koloru materiału.

*Opcja D3: kafelki przez `next/image`.* Pro: najprostszy kod. Con: każdy kafelek zużywa limit optymalizacji obrazów, a ten limit już raz się wyczerpał i zepsuł zdjęcia.

## Rationale

Wzorzec katalogu producenta przypisywanego do produktów jest już sprawdzony w specu 0059 i pasuje do stylistyk: te same pięć stylistyk obowiązuje wszystkie 17 modeli, więc kopie na produkt to czysty koszt (A1). Treść współpracy i zastosowań jest tekstem producenta, który i tak trzeba tłumaczyć na cztery języki, więc tabela z tłumaczeniami jest tańsza na dłuższą metę niż kod (B1), a harmonogram etapów po prostu nie pasuje do danych, które mamy (B3).

Migawka konfiguracji (C1) domyka lukę, którą widać dopiero w kodzie: `inquiry_item` ma tylko `productId`. Kolumna jsonb jest najmniejszą zmianą, która daje producentowi pełny opis, a strukturalna tabela może przyjść później bez utraty danych. Migawka powstaje z identyfikatorów na serwerze, więc tekst od klienta nigdy nie trafia do zapytania.

Próbniki są decyzją o kosztach długoterminowych (D1). Pamięć projektu pokazuje, że limit `/_next/image` już raz się wyczerpał. 125 kafelków przez `next/image` to 125 kolejnych wpisów do tego limitu, a ten sam efekt wizualny dają małe, gotowe pliki serwowane prosto z R2, które nie kosztują nic w Vercel Image Optimization.

Podejście do budowy to Tracer Bullet: `AGENTS.md` wymienia Facade, ale to dotyczy etapu prototypu. Ten spec jest produkcyjny i dotyka bazy, plików i zapytań, więc cienka nitka dla jednego modelu (Bali) od razu ujawni problemy schematu i importu, zanim zrobimy wszystkie 17.

## Inwentarz źródeł

| Plik | Zawartość | Użycie |
|---|---|---|
| `Offer for mobile homes EN, all.pdf` (17 stron) | opis firmy, ceny 17 modeli, zastosowania komercyjne, proces współpracy, kontakt handlowca | ceny modeli, treść współpracy i zastosowań (kontakt nie wchodzi) |
| `Tabela Ceny EUR rynek EN.pdf` | cennik 2026, uwaga „only 13 PUR” przy Zen, Bali, Malibu | tylko Custom design 2 900 € i uwaga o 13 PUR |
| `07_Extras_ENG_EURO.pdf` | cennik opcji, 4 kategorie | opcje płatne |
| `karty produktowe EN/comfort/*.pdf` (11) i `premium/*.pdf` (6) | wymiary, powierzchnia, pojemność, izolacja, rzut, specyfikacja, zdjęcia | dane techniczne, zdjęcia, rzuty, macierz „w standardzie” |
| `Fitout/*.pdf` (7) | 5 stylistyk (po 2 strony) oraz dwa zbiorcze (`_ALL`, `_ALL+VIZ`, 52 MB) | stylistyki, materiały, wizualizacje |
| `ISO/*.jpg` | certyfikat ISO 9001 i 14001 | certyfikaty |

## Niespójności źródeł i decyzje

| Sprawa | Decyzja |
|---|---|
| Ceny w ofercie różnią się od cennika (np. Palermo 49 800 i 50 500, Sylt 62 300 i 62 900, Premium 71 428 i 71 500) | oferta |
| Custom design 2 900 w cenniku, Individual design 2 857 w cenniku opcji | 2 900 z głównego cennika |
| Palermo ma w karcie 18 cm PUR, reszta Comfort 13 cm | 18 cm w standardzie Palermo, bez opcji |
| Bali w ofercie „110,0 m x 3,5 m” | karta (9,88 × 3,53 m) |
| Pojemność, powierzchnia (Riviera 48 i 50, Elba 3 do 5 i 4 do 6, Moon Light 5 do 7 i 4 do 6) | karta |
| Dane handlowca w ofercie | pomijamy |
| deLux niezdefiniowane | nazwy z cennika, pytanie do klienta (patrz Follow-up w index.md) |

## Macierz „w standardzie” (z kart modeli, wyznacza pomijanie duplikatów opcji)

| Cecha | Comfort (11) | Premium (Sky Light, Silver Moon, Black Stone, Moon Light) | Vario 2BR i 3BR |
|---|---|---|---|
| Ogrzewanie | grzejniki ścienne | podłogowe elektryczne (WiFi) | podłogowe elektryczne (WiFi) |
| Klimatyzacja | brak | salon, 1 split | salon i jadalnia |
| Wentylacja | mechaniczna wyciągowa | mechaniczna wyciągowa | z odzyskiem ciepła (rekuperacja) |
| Okna | dwuszybowe | trójszybowe | trójszybowe |
| Izolacja | 13 cm PUR (Palermo 18 cm) | 18 cm PUR | 18 cm ściany, 23 cm dach |
| Dach | 20° | 20° | 13° |
| Łazienka | PVC | Fibo (potwierdzić przy imporcie) | Fibo |
| Fotowoltaika | brak | brak | przygotowana |
| AGD | zmywarka, miejsce na pralkę | zmywarka, miejsce na pralkę | pralko suszarka, piekarnik z mikrofalą |

Skrypt importu czyta te cechy z kart i nie przypisuje opcji, której funkcja już jest w standardzie (np. ogrzewanie podłogowe tylko Comfort).

## Klasy rozmiaru (powierzchnia z karty, najmniejszy próg większy lub równy)

Gwiazdka oznacza model graniczny do potwierdzenia u klienta.

| Model | m² | Podwozie MP (35, 50, 70) | Ogrzewanie, panele winylowe (40, 50, 70) | PUR 18 cm (50, 70) | Podwyższenie ściany Comfort (50, 70) |
|---|---|---|---|---|---|
| Zen | 35 | 35 | 40 | brak opcji | 50 |
| Bali | 34,88 | 35 | 40 | brak opcji | 50 |
| Malibu | 34,88 | 35 | 40 | brak opcji | 50 |
| Bremen | 39,98 | 50 | 40 | 50 (do potwierdzenia) | 50 |
| Palermo | 50 | 50 | 50 | 18 cm w standardzie | 50 |
| Riviera | 50 | 50 | 50 | 50 | 50 |
| Nicea | 50,95 | 70* | 70* | 70* | 70* |
| Elba | 55 | 70 | 70 | 70 | 70 |
| Malta, Madera | 59,05 | 70 | 70 | 70 | 70 |
| Sylt | 62,28 | 70 | 70 | 70 | 70 |
| Sky Light | 40,34 | 50 | panele winylowe 50* | w standardzie | Premium |
| Silver Moon | 57 | 70 | panele winylowe 70 | w standardzie | Premium |
| Black Stone, Moon Light | 57,75 | 70 | panele winylowe 70 | w standardzie | Premium |
| Vario 2BR, 3BR | 116,81 | brak | brak | w standardzie | brak |

## Inwentarz opcji

Ceny w EUR netto z cennika opcji (obraz PDF jest źródłem, tekst PDF ma pomieszany układ kolumn, więc skrypt trzyma dane jako tabelę i test porównuje sumy z PDF). W bazie ceny w centach. Pozycja „standard” ma cenę 0 i `isDefault` w grupach `single`. Kolumna „Dotyczy” opisuje reguły z `index.md`.

**Konstrukcja**

| Grupa (typ) | Opcja | Cena € | Dotyczy |
|---|---|---|---|
| Izolacja PUR (single) | 13 cm standard / 18 cm | 0 / 2 333 | Comfort klasa 50 (Bremen, Riviera) |
| Izolacja PUR (single) | 13 cm standard / 18 cm | 0 / 3 452 | Comfort klasa 70 (Nicea, Elba, Malta, Madera, Sylt) |
| Podwozie (single) | stałe FF standard / mobilne MP | 0 / 1 843 | klasa 35 (Zen, Bali, Malibu) |
| Podwozie (single) | stałe FF standard / mobilne MP | 0 / 1 959 | klasa 50 (Bremen, Palermo, Riviera, Sky Light) |
| Podwozie (single) | stałe FF standard / mobilne MP | 0 / 2 074 | klasa 70 (Nicea, Elba, Malta, Madera, Sylt, Silver Moon, Black Stone, Moon Light) |
| Podpory regulowane, tylko FF (single) | bez / 8 szt. / 11 szt. / 13 szt. | 0 / 461 / 634 / 749 | wszystkie 17 |
| Podpory regulowane, tylko MP (single) | bez / 6 szt. / 8 szt. / 10 szt. | 0 / 576 / 768 / 960 | wszystkie 17 |
| Wyposażenie podwozia, tylko MP (multi) | koła skrętne zamiast sztywnej osi 1 448; ocynkowanie podwozia 3 429; uszy dźwigowe 4 szt. 624 | | wszystkie 17 |
| Podwyższenie ściany bocznej do 250 cm, tylko FF (multi) | Comfort klasa 50 1 152; Comfort klasa 70 1 382; Premium 2 611 | | Comfort wg klasy, Premium bez Vario |
| Kąt dachu, tylko FF, Comfort (single) | standard 20° / 25° / 30° | 0 / 429 / 429 | 11 modeli Comfort |
| Kąt dachu, tylko FF, Premium (single) | standard 20° / 25° bez deLux / 30° bez deLux / 25° z deLux / 30° z deLux | 0 / 1 143 / 1 143 / 2 333 / 2 333 | Sky Light, Silver Moon, Black Stone, Moon Light |
| Dodatki konstrukcyjne (multi) | przygotowanie dachu pod fotowoltaikę 799 (bez Vario); przygotowanie izolacji pod kominek „koza” 499; kominek „koza” z kominem 5 968; wełna mineralna w ścianach działowych 461; drzwi frontowe 90x200 zamiast stalowych 669 (nazwa do potwierdzenia); wariant elewacji 749; projekt indywidualny 2 900 | | wszystkie 17 (wyjątek przy fotowoltaice) |

**Instalacje**

| Grupa (typ) | Opcja | Cena € | Dotyczy |
|---|---|---|---|
| Ogrzewanie podłogowe (multi) | klasa 40 / 50 / 70 | 1 747 / 2 131 / 2 535 | tylko Comfort, wg klasy |
| Klimatyzacja (single) | bez / 1 split / 2 multisplit / 3 multisplit | 0 / 1 248 / 2 995 / 4 493 | tylko Comfort |
| Dodatkowe jednostki klimatyzacji (single) | bez / 2 multisplit (+1 jednostka) / 3 multisplit (+2 jednostki) | 0 / 1 747 / 3 245 | Premium i Vario (do potwierdzenia, że to przyrosty) |
| Rekuperacja (single) | bez / Rekuperacja 3 / Rekuperacja 4 | 0 / 1 647 / 2 197 | wszystkie bez Vario (znaczenie 3 i 4 do potwierdzenia) |
| Dodatki instalacyjne (multi, po 1 szt.) | kran zewnętrzny 192; podlicznik wody 157; lampa ścienna zewnętrzna 71; gniazdo zewnętrzne 71; gniazdo wewnętrzne 40; gniazdo internetowe 95; gniazdo z USB 71; gniazdo antenowe 48; gniazdo 32A 333; podlicznik energii 167 | | wszystkie 17 |
| Alarm i kamery (multi) | instalacja pod alarm do 10 punktów 595; instalacja pod kamery do 6 punktów 357 | | wszystkie 17 |

**Wyposażenie AGD**

| Grupa (typ) | Opcja | Cena € | Dotyczy |
|---|---|---|---|
| Pralka (single) | bez / wolnostojąca / pralko suszarka | 0 / 419 / 594 | wszystkie bez Vario |
| AGD (multi) | zmiana na kuchenkę mikrofalową 370 (bez Vario); lodówka NoFrost zamiast standardowej 140 | | wszystkie 17 (wyjątek przy mikrofali) |

**Wnętrze**

| Grupa (typ) | Opcja | Cena € | Dotyczy |
|---|---|---|---|
| Sypialnia Comfort (single) | standard / XL | 0 / 952 | Comfort |
| Pokój Comfort, łóżko pojedyncze (single) | standard / XL | 0 / 714 | Comfort z pokojem |
| Sypialnia Premium (single) | standard / deLux | 0 / 1 619 | Premium bez Vario |
| Pokój Premium, łóżko pojedyncze (single) | standard / deLux | 0 / 952 | Premium z pokojem (bez Sky Light i Vario) |
| Kuchnia sufitowa, Comfort (single) | standard / 20" / 25" / 30" (nazwy do potwierdzenia) | 0 / 714 / 952 / 1 190 | Comfort |
| Panele winylowe (multi) | klasa 40 / 50 / 70 | 464 / 633 / 750 | wszystkie bez Vario, wg klasy |
| Stoły (single) | bez / okrągły z 4 krzesłami / prostokątny z 4 krzesłami | 0 / 595 / 357 | wszystkie 17 |
| Panele tapicerowane za łóżkiem (single) | bez / 160 cm / 180 cm / 200 cm | 0 / 180 / 202 / 225 | wszystkie 17 |
| Okna wewnętrzne antracyt (single) | bez / Comfort 452 / Premium 619 | | Comfort lub Premium wg linii |
| Dodatki wnętrza (multi) | łóżko piętrowe zamiast zwykłego 548 (modele z pokojem); lustro z podświetleniem 168; szafka z lustrem i oświetleniem 303; lustro na szafie 177; łazienka we Fibo 1 619 (tylko Comfort); listwy za TV 405 | | wszystkie 17 (wyjątki w nawiasach) |

## Stylistyki wnętrz

Pięć stylistyk, dwie strony każda: strona z próbnikami i strona z trzema wizualizacjami (kuchnia, sypialnia, łazienka). Układ próbników jest w każdym PDF taki sam (sześć stref: ściany i sufity, podłoga, meble, łazienka, kuchnia, łóżka i tekstylia, po około cztery kafelki w strefie), więc skrypt wycina je po stałej siatce, a nazwy i kody czyta z tekstu. Przykłady z dwóch przeczytanych stylistyk: „Almond Aura” (White MDF RAL 9016, Linoleum M34, HPL KER Marmo 3346, Fibo Warm Grey M0830, Curtains Paroh 10) i „Calm Stone” (Sonoma Oak PD 3000 WP, Anthracite PU 1203MT, HPL Calipso Site, Fibo Denver White M6030). Stylistyki Carmel Wood, Nude Beige i New York mają ten sam szablon i zostaną odczytane skryptem. W opisie Almond Aura w oryginale został polski ogryzek zdania („expressive accent.wyrazistym, mocnym akcentem”), który import czyści. Opisy są po angielsku, więc polskie teksty są tłumaczeniem robionym przy imporcie.

## Treść producenta

**Sposób współpracy** (pięć kroków, treść wynika wyłącznie z oferty, bez terminów i obietnic spoza niej): analiza potrzeb, planowanie i dopasowanie (projekty szyte na miarę), produkcja, transport (bezpieczny, pod wskazany adres), serwis i wsparcie po zakupie.

**Zastosowania komercyjne** (osiem pozycji, wg oferty): stałe mieszkanie, rozbudowa hotelu, kwatery pracownicze, glamping premium, salon fryzjerski i kosmetyczny, punkt handlowy lub usługowy, przedszkole, biuro lub showroom, pomieszczenia techniczne i magazynowe (razem z mobilnymi warsztatami).

## Koszt i przechowywanie próbników

Mały kafelek 96 × 96 px w WebP waży 2 do 5 KB. Po deduplikacji po kodzie materiału (te same materiały powtarzają się między stylistykami) zostaje około 70 plików, razem około 0,3 MB w publicznym buckecie R2 (UE, pobieranie bez opłat). Strona pobiera tylko kafelki otwartej stylistyki, około 100 KB. Obrazy renderowane jako zwykłe `<img>` nie wchodzą do optymalizacji Vercela, więc nie obciążają limitu, który już raz się wyczerpał.
