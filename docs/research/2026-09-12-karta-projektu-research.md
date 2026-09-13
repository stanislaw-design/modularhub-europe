# Karta projektu ModularHub: informacje przed zapytaniem i proponowany układ

Data analizy: 12 września 2026. Materiał do decyzji produktowej, bez zmian w aplikacji.

## Rekomendacja

Karta projektu powinna pozwolić odpowiedzieć na pięć pytań: czy ten dom pasuje do mojego życia, jaki zakres kupuję za podaną cenę, co jeszcze muszę opłacić, czy realizacja jest możliwa w mojej lokalizacji i komu powierzam wykonanie. Dopiero wtedy prośba o wycenę ma dla klienta konkretny sens.

Z Media Expert warto przejąć czytelną hierarchię informacji: galerię, skrót parametrów, panel oferty, nawigację po szczegółach, porównanie, zakres usług i dowody doświadczenia użytkowników. Zachować duże zdjęcia domu i spokojny charakter ModularHub.

Najpilniejsza zmiana dotyczy powiązania ceny z konkretnym standardem. Samo przestawienie sekcji nie rozwiąże sytuacji, w której niższa cena i bogatszy zakres pochodzą z dwóch różnych wariantów.

## Zakres i sposób analizy

Przejrzano wszystkie osiem plików `_docs`: dwa PDF-y, dwa skoroszyty, trzy manifesty importu i obraz referencyjny. PDF COCO ma 13 stron, Castor 76 stron pliku; drukowana numeracja Castora jest miejscami inna. Poniżej numery stron oznaczają kolejność w pliku PDF. Odczytano tekst katalogów i arkusze skoroszytów; wizualnie sprawdzono wybrane strony z cenami, rzutami i dopłatami. Skoroszyty obejmują 13 projektów Budman i 27 wariantów Steel House. Arkusze zdjęć zawierają odpowiednio 44 i 19 pozycji.

Przeanalizowano dostępne strony i wybrane karty/FAQ wszystkich sześciu producentów. COCO udało się odczytać w przeglądarce mimo błędów narzędzia web. Dla Domikon wykorzystano odczytywalne podstrony poradnikowe; strona główna zwracała timeout. Karta produktu Media Expert została sprawdzona w treści strony i w przeglądarce. Nie jest to pełny audyt wszystkich podstron ani pomiar konwersji.

Obecną kartę ModularHub oceniono na podstawie kodu `app/[locale]/(customer)/project/[id]/page.tsx`, warstwy danych, tłumaczeń, strony zapytania, PRODUCT.md i specyfikacji 0020. Nie przeprowadzono testu wdrożonej strony z aktualnymi rekordami bazy. Manifesty są historią importów, nie dowodem obecnego stanu bazy.

Research potrzeb jest jakościowy: pytania użytkowników, FAQ producentów i różnice w ofertach. Przykładowe zapytania w tym dokumencie są propozycjami treści i filtrów, nie rankingiem wolumenów wyszukiwania. Wypowiedzi na forach pokazują obawy; nie stanowią potwierdzenia technicznych twierdzeń o trwałości czy energooszczędności.

## Co pokazują źródła producentów

| Producent | Konkretna obserwacja | Zastosowanie w ModularHub |
|---|---|---|
| Domikon | Wyjaśnia wpływ fundamentu i lokalizacji na budżet oraz różnicę między stanem deweloperskim a gotowością do zamieszkania. | Rozbić koszt i wskazać, które pozycje zależą od działki. [Poradniki](https://domikon.pl/poradniki/). |
| DomiHaus | DH70-3 ma osobno powierzchnię użytkową, zabudowy i podłóg, a także pakiety BASIC/COMFORT/PREMIUM. | Pokazać nazwany wariant, porównanie zakresów i trzy odrębne miary powierzchni. [DH70-3](https://domihaus.com/projekty/dh70-3/). |
| Budman House | Awokado ma podstawowe parametry, warianty A–D oraz odnośniki do zakresu robót i rzutów. | Udostępnić zakres i rzut bez opuszczania karty. Wyjaśnić różnice wariantów przy cenie. [Awokado](https://budman.house/projekty/awokado-11165m%C2%B2-cennik-od-273-540-zl/). |
| Steel House | Rosevia rozdziela standard deweloperski, pod klucz i umeblowanie. Osobno opisuje różne grubości izolacji dla dwóch konfiguracji. | Standard i pakiet techniczny muszą zmieniać specyfikację wybranego wariantu. [Rosevia](https://steel-house.com.pl/domy-modulowe/dom-rosevia/). |
| COCO | Strona grupuje ofertę w linie COCO/LOFT/CUBE, pokazuje zabudowę, powierzchnię netto i liczbę modułów. Katalog podaje ceny netto i wyłączenia. | Dodać rodzinę, wariant i przeznaczenie; połączyć estetykę z konkretną logistyką. [Oferta COCOHOUSE](https://cocomodule.com/domy-modulowe-caloroczne/). |
| Castor | Katalog rozdziela rodziny konstrukcji, pokazuje rzuty, minimalne wymiary działki, zakresy i koszty dodatkowe. Strona ma też ofertę pod wynajem. | Użyć jednego schematu porównania, z dodatkowymi polami dla domu mieszkalnego, rekreacyjnego i mobilnego. [Oferta Castor](https://castor.net.pl/). |

### Najważniejsze szczegóły z lokalnych dokumentów

**Castor, strony 14–15: OPTIMO 35.** Cena katalogowa wynosi 135 000 zł netto. Katalog podaje 26,00 m² użytkowych, 43,09 m² zabudowy i osobno 13,44 m² antresoli liczonej po podłodze. Nazwa „35” nie zastępuje żadnego z tych pól. Fundament 28 000 zł, elektryka 10 000 zł i instalacje wodno-kanalizacyjne 6 000 zł są opisane jako szacunkowe wyceny podwykonawców. Projekt kosztuje dodatkowo 5 900 zł netto. Suma tych wymienionych pozycji wynosi 184 900 zł netto; nie jest kompletną wyceną do zamieszkania. Trzeba jeszcze ustalić pozostały zakres, lokalne koszty i podatek.

**Castor, strony 32–33: CAS 98 Mikołajki.** Cena 207 000 zł netto dotyczy stanu surowego zamkniętego, a 309 900 zł netto stanu wykończonego. To dwie różne oferty zakresowe. Manifest importu zapisuje je jako minimum/maksimum jednego produktu, ale listę elementów bierze z bogatszego standardu i przypisuje `pod-klucz`. Ten sposób prezentacji wymaga korekty przed wykorzystaniem do porównania cen.

**Castor, strony 50–67.** Domy mobilne mają bogatsze wykończenie wnętrza niż część modeli OPTIMO/CAS, mimo wspólnego określenia „stan wykończony”. Transport, dźwig i przygotowanie podłoża pozostają po stronie kupującego. Lista dodatków zawiera też pozycje oznaczone jako obowiązkowe, np. foliowanie transportowe. Takie pozycje powinny trafiać do kosztu odpowiedniej konfiguracji, po potwierdzeniu zastosowania przez producenta.

**COCO, strony 2–12.** Każda karta jawnie wyłącza transport, montaż na miejscu, fundament, przyłącza oraz pergole i tarasy. W tabeli są dwa poziomy ceny, lecz droższy wiersz nie opisuje pełnego zakresu wyposażenia. Nie należy samodzielnie nazywać go „gotowy do zamieszkania”. Na stronie 12 CH-140 tabela podaje jedną kondygnację i 144 m² zabudowy przy wymiarach 12 × 6 m, podczas gdy wizualizacja przedstawia dwa poziomy. To rozbieżność do wyjaśnienia z producentem, nie podstawa do zgadywania poprawnej wartości.

**Budman, arkusz Projekty.** Ceny są wartościami „od”; brak rozbicia VAT i standardu. Pole powierzchni nie ma jednolitej semantyki: opis Mary antresola wskazuje powierzchnię podłóg, a inne modele podają metraż bez takiego rozróżnienia. Treść opisów i rzuty zawierają więcej informacji niż same pola liczbowe. Ceny i zakresy muszą pochodzić z tego samego wariantu i wersji cennika.

**Steel House, arkusze Projekty i Uwagi QA.** Obecny skoroszyt ma puste ceny; nie potwierdza już opisanych w historycznym manifeście przypadkowych wartości 20–119. Nie należy raportować tego historycznego błędu jako aktualnego błędu pliku. Nadal są rozbieżności Rosevia 57/60, Pomerania 35, nazewnictwa Posnania oraz brak części parametrów. Media przeważnie opisują rodzinę, a nie konkretny wariant. Rzut przypisany do innego modelu nie może udawać rzutu oglądanego domu.

**Obraz referencyjny.** Dobrze ustawia aspiracyjny ton: dom, natura, duże zdjęcie i wyraźne wyszukiwanie. Na karcie projektu potrzebujemy jeszcze informacji, czy przedstawiony taras, wyposażenie i otoczenie należą do oferty. Hasła o weryfikacji wymagają wskazania, co rzeczywiście sprawdzono.

## Jakich odpowiedzi klient potrzebuje przed kontaktem

Poniższa kolejność to rekomendacja produktowa wynikająca z analizy. Do potwierdzenia w rozmowach z klientami i danych o zachowaniu na stronie.

| Pytanie klienta | Co pokazać | Gdzie |
|---|---|---|
| Ile naprawdę wydam? | Cena wybranego standardu, waluta, netto/brutto, obowiązkowe dodatki, koszty zależne od lokalizacji. | Panel oferty i sekcja kosztów. |
| Co dostanę za tę kwotę? | Porównanie zakresów, w tym fundament, instalacje, ogrzewanie, łazienka, kuchnia, montaż, transport. | Tuż pod pierwszym ekranem. |
| Czy zmieścimy się w tym domu? | Czytelny rzut z wymiarami, sypialnie, łazienki, przechowywanie, wysokość antresoli, powierzchnie pomieszczeń. | Bezpośredni skrót przy galerii i własna sekcja. |
| Czy nadaje się do mojego celu? | Stałe zamieszkanie, rekreacja, najem lub funkcja hotelowa; dokumentacja dla danego zastosowania. | Przy nazwie, potem szczegóły. |
| Czy mogę postawić go na działce? | Zabudowa, wymiary, dach, wymagania fundamentowe, zakres analizy lokalnej. | Sekcja działki, skrót w panelu. |
| Czy ciężarówka i dźwig dojadą? | Sposób transportu, wymiary transportowe, warunki dojazdu, miejsce rozładunku, odpowiedzialność. | Działka i dostawa. |
| Kiedy mogę zamieszkać? | Projekt/formalności, termin produkcji, montaż, wykończenie i odbiór; od jakiego zdarzenia liczymy terminy. | Skrót przy cenie i harmonogram. |
| Czy zimą będzie ciepło, latem komfortowo, a w środku cicho? | Parametry i źródła dla konkretnej konfiguracji; ogrzewanie, wentylacja, osłony przeciwsłoneczne, akustyka. | Komfort i technologia. |
| Czy producent dowiezie obietnice? | Rzeczywiste realizacje, możliwość obejrzenia domu, zakres gwarancji, serwis i opinie z kontekstem. | Galeria i producent. |
| Czy można coś zmienić? | Odbicie lustrzane, układ, okna, dach, elewacja; wpływ zmian na cenę i dokumentację. | Wariant i układ. |
| Co stanie się po wysłaniu formularza? | Odbiorca zapytania, oczekiwana odpowiedź, brak zobowiązania zakupowego, dalsze kroki. | Przy CTA i formularzu. |

Pytania o akustykę, temperaturę latem i zimą oraz wybór wykonawcy występują wprost w [dyskusji kupujących](https://www.reddit.com/r/Polska/comments/1kv0zw4/). Obawa, że cena reklamy obejmuje tylko część inwestycji, pojawia się w [drugiej dyskusji](https://www.reddit.com/r/Polska/comments/1so2jkg/). Są to sygnały do projektowania treści, nie reprezentatywne badanie rynku.

FAQ DomiHaus rozdziela czas montażu konstrukcji i doprowadzenia do stanu deweloperskiego oraz opisuje różne okresy gwarancji dla różnych elementów. Warto przejąć te rozróżnienia do naszej karty. [FAQ DomiHaus](https://domihaus.com/faq/).

Kwestii formalnych nie można sprowadzić do etykiety „dom do 70 m²”. GUNB wskazuje m.in. powierzchnię zabudowy, przeznaczenie, obszar oddziaływania i warunki lokalne. Na stronie proponuję komunikat „Sprawdź możliwość realizacji na swojej działce”, z wynikiem dotyczącym konkretnej inwestycji. [Procedury budowlane GUNB](https://www.gov.pl/web/gunb/procedury-budowlane).

### Różne potrzeby odbiorców

- **Dom do stałego mieszkania:** pełny budżet, sypialnie, przestrzeń gospodarcza, ogrzewanie, akustyka, serwis.
- **Dom rekreacyjny:** zimowanie, sezonowość instalacji, bezpieczeństwo podczas nieobecności, dojazd, taras i utrzymanie elewacji.
- **Dom pod wynajem/hotel:** faktyczna liczba miejsc noclegowych, standard łazienki i kuchni, sprzątanie, trwałość wyposażenia, serwis wielu sztuk. Osobne zapytanie o liczbę domów; żadnych gwarantowanych zysków.
- **Klient zagraniczny:** język dokumentacji i obsługi, zakres dostawy, lokalny montaż i serwis, podatek i waluta oferty, dokumentacja dla kraju oraz działki. Nie przenosić polskich zapewnień formalnych na DE/NL bez odrębnej weryfikacji.

## Jakie treści i wyszukiwanie zbudować

| Intencja | Przykłady fraz klienta | Odpowiedź w serwisie |
|---|---|---|
| Budżet | dom modułowy cena z fundamentem; dom pod klucz z transportem; co nie jest w cenie domu | Porównywarka zakresu i poradnik kosztów. |
| Funkcja | dom całoroczny 2 sypialnie; mały dom dla pary; dom z gabinetem | Filtry funkcjonalne i rzut. |
| Metraż | 35 m² użytkowej czy zabudowy; antresola powierzchnia użytkowa | Objaśnienia przy parametrach, osobne pola filtrów. |
| Działka | dom na wąską działkę; dojazd dźwigu; jaki fundament pod dom modułowy | Wymagania danego modelu i analiza lokalizacji. |
| Formalności | dom do 70 m² zgłoszenie; dom mobilny na działce; dom rekreacyjny a mieszkalny | Aktualizowany poradnik dla kraju, autora i daty weryfikacji. |
| Komfort | dom modułowy zimą; ogrzewanie domu 35 m²; czy słychać deszcz; przegrzewanie latem | Sekcja komfortu z dowodami, FAQ i doświadczeniami użytkowników. |
| Zaufanie | producent opinie po kilku latach; gwarancja domu; dom pokazowy | Realizacje i opinie o modelu oraz producencie rozdzielone. |
| Porównanie | stal czy drewno czy CLT; deweloperski a pod klucz | Porównanie konkretnych ofert, słownik standardów. |
| Eksport | dom z Polski z montażem w Niemczech; dokumentacja domu do Holandii | Kraj docelowy, zakres obsługi i status dokumentów. |

Pierwszy zestaw filtrów: kraj realizacji, przeznaczenie, budżet z widoczną definicją zakresu, powierzchnia użytkowa, sypialnie, standard. W filtrach dodatkowych: zabudowa, wymiary, dach, konstrukcja, antresola, wariant ogrzewania, dostawa/montaż. Przy nieznanym koszcie całkowitym nie sugerować dopasowania do całkowitego budżetu.

Poradniki odpowiadają na pytania ogólne. Karta projektu musi zawierać odpowiedź dla oglądanego modelu. Wyszukiwanie powinno obsługiwać nazwę producenta/modelu oraz potoczne potrzeby, np. „2 sypialnie do 60 m²”. Nie tworzyć masowo stron kraj × powierzchnia bez rzeczywistych ofert i użytecznej treści.

## Co przejąć z Media Expert

Na sprawdzonej karcie znajdują się galeria, skrót parametrów, porównanie, wydzielony panel ceny i dostawy, usługi dodatkowe, nawigacja po sekcjach, instrukcje i opinie z informacją o potwierdzeniu zakupu. To obserwacje struktury strony, a nie dowód skuteczności sprzedażowej tych elementów. [Sprawdzona karta Media Expert](https://www.mediaexpert.pl/agd/pralki-i-suszarki/pralki/pralka-bosch-serie-2-wge02400pl-7kg-1400-obr).

| Rozwiązanie | Adaptacja do domu |
|---|---|
| Skrót najważniejszych parametrów obok galerii | Użytkowa/zabudowa, sypialnie, standard, termin i przeznaczenie. |
| Wyraźny panel oferty | Wariant, cena i jej zakres, lokalizacja realizacji, przycisk zapytania. |
| Oddzielne usługi | Fundament, transport, dźwig, podłączenia: status ceny i wykonawca każdej pozycji. |
| Nawigacja po szczegółach | Układ, cena i zakres, działka, technologia, realizacje, dokumenty. |
| Porównanie produktów | 2–3 konkretne konfiguracje, wspólne jednostki, funkcja „pokaż różnice”. |
| Dokumentacja | Rzut, zakres, specyfikacja i gwarancja bez obowiązkowego pozostawiania kontaktu. |
| Opinie z kontekstem | Model, standard, rok realizacji, czas zamieszkania i sposób potwierdzenia. |

U nas galeria może zajmować około 60% pierwszego ekranu, a panel oferty około 40%. Nie trzeba kopiować trzech gęstych kolumn sklepu. Liczniki promocji, mnogość odznak, sztuczna pilność i dodatki odciągające od wyboru domu nie pasują do tej decyzji. Q&A dla projektu proponuję jako własne rozszerzenie; nie potwierdzono osobnej takiej sekcji na analizowanej karcie ME.

## Proponowana budowa strony projektu

### Pierwszy ekran

Lewa kolumna: zdjęcie, miniatury oraz przełączniki „Wizualizacje”, „Wnętrza”, „Rzut”, „Realizacje” tylko dla dostępnych materiałów. Widoczna informacja, czy zdjęcie dotyczy tego wariantu i czy pokazuje wyposażenie dodatkowe.

Prawa kolumna: nazwa i producent, przeznaczenie, powierzchnia użytkowa i zabudowy, sypialnie i łazienki. Poniżej wybór wariantu/standardu, cena wraz z walutą i podatkiem, krótka informacja o zakresie oraz o kosztach do ustalenia. Jedna główna akcja: **„Zapytaj o wycenę tego domu”**. Obok spokojny link „Porównaj”.

Pod CTA: odbiorca zapytania i rezultat następnego kroku. Deklarować bezpłatność lub termin odpowiedzi dopiero po potwierdzeniu procesu. Dla ofert bez ceny pokazać „Wycena indywidualna” i wyjaśnić, od czego zależy.

### Kolejność dalszych sekcji

1. **Układ domu.** Duży rzut, tabela pomieszczeń, antresola osobno, ewentualne odbicie lustrzane. Krótki opis użytkowy: gdzie spać, pracować, przechowywać rzeczy.
2. **Cena i zakres.** Porównanie dostępnych standardów. Zmiana standardu aktualizuje cenę, listę wyposażenia, dokumenty i treść zapytania.
3. **Działka i dostawa.** Wymiary, dach, wymagania fundamentowe, transport, rozładunek oraz przyłącza. Akcja „Sprawdź swoją działkę” i ścieżka „Dopiero szukam działki”.
4. **Termin i przebieg realizacji.** Etapy i zależności, odpowiedzialny wykonawca, znaczenie daty początkowej każdego terminu.
5. **Komfort i technologia.** Krótkie odpowiedzi o cieple, wentylacji, chłodzeniu, akustyce i trwałości, następnie pełne parametry z dokumentacją.
6. **Realizacje i producent.** Materiały z budowy i użytkowania, możliwość wizyty, zakres gwarancji i serwis. Oddzielić opinię o firmie od opinii o tym modelu.
7. **Dokumenty i pytania.** Rzut, zakres oferty, dokumentacja techniczna, gwarancja i FAQ danego projektu. Na końcu ponowne CTA.
8. **Podobne domy.** Maksymalnie kilka sensownych alternatyw z opisem różnicy: dodatkowa sypialnia, mniejsza zabudowa, inny zakres w podobnym budżecie.

Pasek nawigacyjny pozostaje widoczny podczas przewijania. Na desktopie może mu towarzyszyć niewielki panel wybranej oferty. Na mobile pozostaje dolny pasek ceny i CTA, z czytelnym wskazaniem standardu i netto/brutto; nie może zasłaniać dokumentów ani formularza.

### Logika kosztów

Każda pozycja ma jeden ze stanów: **w cenie**, **obowiązkowa dopłata**, **opcja**, **po stronie klienta**, **do wyceny**. „Po stronie klienta” opisuje odpowiedzialność, a nie zerowy koszt; kwota i jej pewność są osobnymi informacjami.

Pełny budżet obejmuje wybrany dom, obowiązkowe opcje, przygotowanie działki/fundament, transport i rozładunek, podłączenia, dokumentację/adaptację oraz wykończenie potrzebne do zamierzonego użytkowania. Jeśli część kwot jest nieznana, pokazujemy sumę znanych pozycji i listę niewycenionych. Nie nazywamy jej „ceną całkowitą”. Działka jako zakup gruntu powinna mieć osobną, wyraźną informację o wyłączeniu.

Cena za m² może być pomocnicza wyłącznie przy tej samej definicji powierzchni i zakresie. Dla polskiego klienta preferowane są PLN, dla eksportu wybrana waluta; przeliczenie wymaga źródła i daty kursu. Nie dopisywać VAT ani stawki na podstawie samej nazwy domu.

### Zapytanie bez utraty kontekstu

Formularz dziedziczy model, wariant, standard i kraj. Pyta o miejscowość/kod pocztowy, etap posiadania działki, planowany termin i wybrany sposób kontaktu. Budżet oraz dodatkowe pytania mogą być opcjonalne. Dokumenty działki nie powinny być wymagane do wstępnej rozmowy.

Przyciski „Dopytaj o fundament” albo „Dopytaj o ogrzewanie” mogą dodawać temat do jednego zapytania. Klient widzi, do których producentów trafi wiadomość. Nie wymagać od niego samodzielnego przepisywania specyfikacji z karty.

W kodzie obecnej strony zapytania osoba niezalogowana jest od razu kierowana do logowania. Warto sprawdzić wariant, w którym klient najpierw poznaje zakres formularza, a potwierdza kontakt na końcu. To propozycja zmiany procesu; wymaga oddzielnego zaprojektowania obsługi zapytań gości.

## Obecna strona: zachować i poprawić

Zachować galerię z powiększeniem, dominującą fotografię, istniejące sekcje danych/warunków, ulubione i dolny pasek CTA na telefonie. Nie trzeba budować strony od zera.

| Priorytet | Obserwacja | Proponowana zmiana |
|---|---|---|
| P0 | Historia importu Castora łączy cenę niższego standardu z zakresem wyższego. | Osobne warianty oferty: cena, zakres, podatek i dokument dla każdego. Najpierw potwierdzić aktualne rekordy. |
| P0 | Cena w interfejsie jest EUR, a import Castora korzystał z przybliżonego przeliczenia netto PLN. | Zachować walutę źródłową, jawne netto/brutto oraz informację o konwersji. |
| P0 | `mapRowToProject` zamienia nieznane pokoje/łazienki na zero; karta te wartości pokazuje. | Rozróżnić brak danych i rzeczywiste zero. Dla informacji decyzyjnych pokazać „do potwierdzenia”. |
| P0 | Manifest Steel House opisuje krajowe statusy zatwierdzone bez realnej oceny, a karta może je wyświetlić. | Sprawdzić aktualne dane. Publikować status dopiero z zakresem, dokumentem, datą i odpowiedzialnym podmiotem. |
| P0 | Brak parametrów zastępowano założeniami, np. wentylacją grawitacyjną u Castora. | Usunąć domniemania z prezentacji jako faktów; zachować „brak potwierdzenia”. |
| P1 | Podstawowy metraż/pokoje są pod galerią, a przy cenie tekst zakresu to ogólne „Dom”. | Skrót parametrów i dokładny standard przy cenie. |
| P1 | Brak osobnej sekcji rzutu i selektora wariantu na analizowanej stronie. | Rzut jako pierwszoplanowa treść; dopasowanie mediów do wariantu. |
| P1 | Strona ma warunkowe włączone/wyłączone elementy, ale nie całościowy obraz kosztów. | Rozwinąć je o obowiązkowe dopłaty, odpowiedzialność i koszty nieznane. |
| P1 | Profil producenta korzysta z fixture po ID, a produkty z ID bazy. | Ujednolicić identyfikację; karta producenta nie powinna znikać przez brak dopasowania. |
| P1 | Informacja o kraju znika bez parametru URL. | Umożliwić wybór kraju na karcie i zachować go w dalszych krokach. |
| P1 | Brak nawigacji po długiej stronie i objaśnienia, co dzieje się po zapytaniu. | Dodać kotwice sekcji i krótki opis procesu. |
| P2 | Brak kontekstowych opinii, Q&A i podglądu całego kosztu. | Rozbudować po pozyskaniu danych; nie wypełniać fikcyjnymi ocenami. |

Obecna specyfikacja 0020 przewiduje ukrywanie brakujących sekcji. Proponuję zachować to dla treści opcjonalnych, np. filmu, lecz zmienić dla ceny, standardu, kosztów transportu i kluczowych parametrów: jawny brak odpowiedzi pomaga zadać konkretne pytanie. To świadoma propozycja aktualizacji specyfikacji.

## Minimalny pakiet danych od producenta

Przed publikacją kompletnej oferty zebrać: identyfikator modelu i wariantu, przeznaczenie, trzy powierzchnie z definicjami, wymiary, rzut, sypialnie/łazienki, standard i zakres, walutę i podatek, datę cennika, obowiązkowe dodatki, logistykę, harmonogram, gwarancję i obsługę serwisową. Parametry techniczne powinny wskazywać dokument i konfigurację, której dotyczą.

Każda istotna informacja potrzebuje statusu: potwierdzona dokumentem, deklaracja producenta lub do potwierdzenia. Nie trzeba obciążać klienta historią importu; wystarczy krótka etykieta i dostępny szczegół. Nazwa certyfikatu materiału nie oznacza automatycznie certyfikacji całego domu ani dopuszczenia do konkretnej działki.

## Kolejność prac i sprawdzenie efektu

**Etap 1:** uporządkować cenę/standard/powierzchnie/statusy oraz wyświetlanie braków. **Etap 2:** zbudować pierwszy ekran, rzuty, porównanie zakresów, koszty i nawigację. **Etap 3:** rozwinąć formularz, porównanie 2–3 konfiguracji, dokumenty i dane producentów. **Etap 4:** realne opinie, kalkulacje eksploatacji z założeniami i treści dla poszczególnych krajów.

Przed kodowaniem przebudowy sprawdzić makietę na 5–8 rozmowach z osobami realnie rozważającymi zakup. To proponowany test jakościowy, nie badanie reprezentatywne. Zadania: ustal koszt i zakres; wskaż trzy koszty dodatkowe; znajdź sypialnię na rzucie; ustal czego nie wiemy o działce; przygotuj zapytanie.

Mierzyć: udział odwiedzin kończących się rozpoczęciem i wysłaniem zapytania, rezygnacje na logowaniu, kompletność lokalizacji/standardu w zapytaniu, użycie rzutu i porównania oraz odsetek pytań wynikających z niezrozumienia ceny. Nie zakładać z góry procentowego wzrostu konwersji; najpierw ustalić punkt odniesienia i porównywać podobne źródła ruchu.

## Lokalny wykaz źródeł

- `_docs/Katalog domów PDF skompresowany 3.pdf`: 76 stron pliku, 20 modeli w trzech rodzinach, zakresy i opcje dodatkowe.
- `_docs/COCOHOUSE - COCO_ENG_(20.04.26_.pdf`: 13 stron, 11 tabel modeli/wariantów, ceny i wyłączenia.
- `_docs/BudmanHouse_projekty_ModularHub.xlsx`: Projekty, Zdjęcia, Instrukcja.
- `_docs/SteelHouse_projekty_ModularHub — kopia.xlsx`: Projekty, Zdjęcia, Instrukcja, Uwagi QA.
- `_docs/budmanhouse-import-manifest.json`, `_docs/steelhouse-import-manifest.json`, `_docs/castor-import-manifest.json`: pochodzenie danych i ograniczenia historycznych importów.
- `_docs/referancja.png`: kierunek wizualny strony głównej.
- `app/[locale]/(customer)/project/[id]/page.tsx`, `app/[locale]/(customer)/inquiry/page.tsx`, `lib/data/projects.ts`, `lib/data/producers.ts`, `messages/pl.json`, `PRODUCT.md`, `docs/specs/0020-strona-szczegolow-projektu/index.md`: obecna struktura i zasady produktu.
