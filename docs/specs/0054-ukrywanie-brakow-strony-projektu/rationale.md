# 0054. Rationale

## Context

Strona szczegolow projektu klienta (`/project/[id]`) dzis w siedmiu niezaleznych miejscach robi to samo: gdy jakiejs danej brakuje, pokazuje jawny, bursztynowy placeholder "do uzupelnienia" zamiast po prostu nie renderowac tego elementu. Dotyczy to: trzeciej (albo drugiej) zakladki standardu wykonania, gdy producent nie wypelnil jeszcze wszystkich trzech `product_variant` (`ProjectVariantPicker`, `ProjectCostComparisonTable`, hero cena), pojedynczych pol logistyki dzialki (`ProjectLogistics`), etapow harmonogramu (`ProjectTimeline`), sekcji dokumentow i FAQ (`ProjectDocumentsAndFaq`), oraz czasu odpowiedzi producenta (`ProducerCard`).

Ten wzorzec nie byl pierwotnym zamierzeniem. Spec [0042](../0042-nowy-uklad-strony-projektu/index.md) (ktora zaprojektowala te strone) w swoich wlasnych kryteriach akceptacji zakladala odwrotnie: AC-3 (przelacznik wariantow znika przy jednym wariancie), AC-4 (uklad domu, "brak listy oznacza brak sekcji, zaden pusty placeholder"), AC-5 ("kazde pole [logistyki] renderuje sie niezaleznie, tylko gdy jest wypelnione"), AC-6 (harmonogram, "etap bez wiersza po prostu sie nie pokazuje"), i AC-10 (czas odpowiedzi, "brak wartosci oznacza brak linii, nie generyczny tekst zastepczy"). W trakcie kolejnych przebudow kreatora producenta (specyfikacje 0049, 0050 i domyslny model trzech zamknietych standardow wykonczenia) budowany kod swiadomie odszedl od tych kryteriow, zeby produkt niedokonczony przez producenta byl od razu widoczny jako niedokonczony (komentarze w kodzie nazywaja to wprost: "swiadome odejscie od pierwotnego AC-6", "swiadomy wyjatek od reguly brak danych brak sekcji"). Skutek uboczny: klient kupujacy widzi tabele pelna bursztynowych plakietek "do uzupelnienia" na produktach, ktore z jego punktu widzenia po prostu maja mniej standardow albo mniej wypelnionych pol, co wyglada niedbale i osłabia zaufanie w momencie decyzji zakupowej.

Zadanie: przywrocic i dokonczyc pierwotna zasade "pokaz to, co jest, tam gdzie jest" w calej sekcji strony produktu, jednolicie, zamiast szesciu miejsc z osobna wypracowanym kompromisem miedzy "widocznosc niedokonczonego produktu dla klienta" a "sygnal dla producenta, ze czegos brakuje". Ten drugi cel (sygnal dla producenta) nie znika, tylko przenosi sie tam, gdzie faktycznie nalezy: do panelu producenta (poza zakresem tej decyzji), nie na publiczna karte produktu ogladana przez klienta.

Jeden wyjatek jest swiadomy i zostaje: `producer.showroomVisitAvailable` ma dzis trzy rozroznialne stany (tak / nie / nieustalone), wprowadzone celowo w spec 0042 AC-9 wlasnie po to, zeby klient nie mylil "nieustalone z producentem" z cichym "nie". To nie jest "dana czekajaca na uzupelnienie", to prawdziwa trzecia odpowiedz biznesowa; nic sie tu nie chowa, zmienia sie tylko warstwa slowna trzeciego stanu.

## Options considered

### Opcja 1: Punktowa poprawka tylko sekcji "Cena i zakres"

Zmienic wylacznie `ProjectCostComparisonTable`/`ProjectVariantPicker` (przyklad wprost podany w zadaniu), zostawic pozostale piec miejsc bez zmian.

**Pros**:
- Najmniejszy, najszybszy do zbudowania zakres.
- Adresuje przyklad, ktory wywolal ta decyzje.

**Cons**:
- Zostawia strone niespojna: jedna sekcja chowa braki, piec innych obok niej dalej pokazuje "do uzupelnienia" dla dokladnie tego samego rodzaju braku danych.
- Klient nie odczuwa jednej zasady strony, tylko przypadkowa mieszanke; nastepny raport tego samego problemu w innej sekcji jest niemal pewny.

### Opcja 2: Jedna zasada dla calej strony produktu (wybrana)

Zastosowac "czego nie ma, tego nie pokazuj" jednolicie we wszystkich siedmiu miejscach na tej stronie, plus regule wyzszego rzedu: sekcja bez zadnej prawdziwej tresci znika calkowicie (naglowek wlacznie), a nie tylko jej wewnetrzne wiersze.

**Pros**:
- Jedna, przewidywalna zasada na cala strone; klient widzi zawsze tylko to, co producent faktycznie podal, ulozone tak, zeby wygladalo dobrze niezaleznie od tego, ile tego jest.
- Przywraca pierwotny zamiar spec 0042 (AC-3, AC-4, AC-5, AC-6, AC-10) zamiast dokladac kolejny, siodmy wyjatek.
- Nie wymaga zadnej migracji bazy: wylacznie zmiana renderu nad juz istniejacymi polami.

**Cons**:
- Wiekszy zakres zmiany (siedem komponentow plus strona) niz punktowa poprawka.
- Traci sie dzisiejszy, choc przypadkowy, efekt uboczny "widac od razu, ze producent czegos nie wypelnil" na publicznej karcie; ten sygnal trzeba bedzie kiedys swiadomo zbudowac w panelu producenta (patrz Follow-up w index.md), inaczej znika bez zamiennika.

### Opcja 3: Zawsze pelna siatka trzech standardow, puste komorki bez tekstu

Zostawic zawsze trzy kolumny/zakladki, tylko usunac slowo "do uzupelnienia" i pigulke, zostawiajac pusta przestrzen.

**Pros**:
- Najmniejsza zmiana wizualna w tabeli porownawczej, zero zmiany w logice ukladu.

**Cons**:
- Wprost odrzucona w rozmowie projektowej: pusta kolumna bez zadnego tekstu wyglada na blad renderowania, nie na "producent nie ma tego standardu"; nie rozwiazuje tego samego problemu w pieciu pozostalych miejscach.

## Rationale

Opcja 2 wygrywa, bo problem nie jest lokalny do jednej tabeli, to jeden powtarzajacy sie wzorzec (siedem miejsc, jeden mechanizm: `StatusPill status="conditional"` plus tekst "do uzupelnienia") zbudowany szescioma niezaleznymi decyzjami w czasie, z ktorych zadna nie byla swiadoma pieciu pozostalych. Naprawienie jednego miejsca bez pozostalych zostawia dokladnie ten sam problem widoczny gdzie indziej na tej samej stronie, wiec kosztuje niemal tyle samo czasu diagnozy przy nastepnym zgloszeniu, bez korzysci spojnosci. Zasada wyzszego rzedu (sekcja bez tresci znika calkowicie, nie tylko jej wiersze) jest konieczna, bo bez niej niektore produkty (np. bez zadnego dokumentu i bez FAQ) konczylyby z pustym, oprawionym w ramke pudelkiem pod naglowkiem "Dokumenty i pytania", co jest dokladnie tym samym problemem wizualnym w innej postaci.

Wyjatek dla `showroomVisitAvailable` (opcja 2 go zachowuje) opiera sie na tej samej logice, co uzasadnil go w spec 0042: to nie jest brakujaca dana, to realny, trzeci mozliwy stan biznesowy. Ukrycie tego wiersza przy `null` zatarloby roznice miedzy "producent powiedzial nie" i "jeszcze nie zapytalismy producenta", co jest gorsze niz dzisiejszy stan, nie lepsze.

## References

Brak (engineer opted out, keep it clean).
