# Flow doradczy ModularHub Europe

Data: 19 września 2026. Roboczy projekt procesu biznesowego i doświadczenia użytkownika. Dokument rozwija research logistyczny. Nie jest jeszcze specyfikacją implementacji.

## Założenie modelu

ModularHub jest doradcą i koordynatorem procesu wyboru producenta.

Klient nie kontaktuje się od razu z każdym producentem. Najpierw wysyła krótkie zapytanie do ModularHub. Doradca uzupełnia z nim potrzeby w komunikatorze, przygotowuje jeden uporządkowany brief i przekazuje go właściwym producentom. Producent odpowiada ModularHub. ModularHub sprawdza odpowiedzi, sprowadza je do wspólnego formatu i przedstawia klientowi ofertę porównawczą.

Dopiero gdy klient wybierze finalistę, ModularHub otwiera wspólną rozmowę klienta, producenta i doradcy. Umowa sprzedaży domu pozostaje umową klienta z producentem. ModularHub może dalej doradzać w transporcie, przygotowaniu działki, montażu i kolejnych etapach.

## Uczestnicy

### Klient

Klient wybiera domy, opisuje potrzeby, zatwierdza brief, odpowiada na pytania, porównuje oferty i wybiera producenta.

### Doradca ModularHub

Doradca jest głównym kontaktem klienta. Prowadzi rozmowę, porządkuje dane, przygotowuje brief, wybiera producentów do zaproszenia, zbiera odpowiedzi, sprawdza kompletność, przygotowuje porównanie i pomaga podjąć decyzję.

### Producent

Producent otrzymuje uporządkowany brief, deklaruje zainteresowanie, zadaje pytania przez ModularHub i składa ofertę według wspólnego formatu. Przed wyborem finalisty nie kontaktuje się bezpośrednio z klientem.

### Operator ModularHub

Operator może przypisywać doradców, pilnować czasu odpowiedzi, pomagać przy trudnych sprawach i kontrolować jakość przygotowanych porównań. Doradca oraz operator mogą być na początku tą samą osobą.

## Zasada komunikacji

Przed wyborem finalisty istnieją dwa oddzielne kanały.

Pierwszy kanał łączy klienta z ModularHub.

Drugi kanał łączy ModularHub z każdym producentem osobno.

Producent nie widzi rozmowy klienta z doradcą. Klient nie widzi roboczej rozmowy ModularHub z producentem. Producenci nie widzą siebie nawzajem ani konkurencyjnych ofert.

Po wyborze finalisty powstaje trzeci kanał wspólny. Uczestniczą w nim klient, producent i doradca ModularHub. Dotychczasowe kanały pozostają w historii, ale ich prywatne treści nie są automatycznie kopiowane do wspólnej rozmowy.

E mail służy tylko do powiadomienia, że w projekcie czeka nowa wiadomość, pytanie, oferta albo decyzja. Źródłem prawdy pozostaje komunikator na stronie.

## Flow główny

### Etap 1. Wybór domów

Klient przegląda katalog i wybiera od jednego do trzech domów. Może wybrać modele jednego albo kilku producentów.

Na karcie projektu oraz shortliście główne wezwanie brzmi:

„Poproś ModularHub o przygotowanie ofert”

Przed wysłaniem klient widzi krótkie wyjaśnienie:

„Najpierw poznamy twoje potrzeby. Następnie przygotujemy jeden brief, zbierzemy odpowiedzi od producentów i pomożemy ci porównać pełne koszty oraz zakres.”

Klient nie powinien odnieść wrażenia, że formularz od razu trafia do wszystkich producentów.

### Etap 2. Krótkie zapytanie

Pierwszy formularz powinien być krótki. Jego celem nie jest przygotowanie kompletnego briefu, tylko rozpoczęcie rozmowy.

Wymagane dane:

1. Wybrane domy, dodane automatycznie z shortlisty.

2. Kraj realizacji.

3. Przybliżona lokalizacja, na przykład kod pocztowy albo miejscowość.

4. Preferowany sposób kontaktu w komunikatorze oraz dane konta.

5. Krótka wiadomość opcjonalna.

Można dodać dwa łatwe pytania, jeżeli testy pokażą, że nie obniżają liczby zapytań:

1. Orientacyjny budżet całej inwestycji.

2. Orientacyjny termin realizacji.

Nie należy na tym etapie pytać o wszystkie parametry działki, media, dźwig, fundament i dokumentację. Te dane doradca zbiera później, w kontekście rozmowy.

Po wysłaniu system tworzy projekt doradczy i otwiera stronę projektu.

Status: `nowe zapytanie`.

### Etap 3. Potwierdzenie i przypisanie doradcy

Klient natychmiast otrzymuje wiadomość systemową:

„Otrzymaliśmy twoje zapytanie. Nie wysłaliśmy go jeszcze do producentów. Doradca ModularHub najpierw pomoże doprecyzować potrzeby.”

System pokazuje oczekiwany czas pierwszej odpowiedzi. Operator przypisuje doradcę. Klient widzi jego imię, zdjęcie, rolę i stan dostępności.

Doradca sprawdza wybrane modele, producentów, kraj realizacji i informacje już posiadane przez platformę.

Status po przypisaniu: `rozmowa z doradcą`.

### Etap 4. Uzupełnianie potrzeb w komunikatorze

Doradca nie wysyła klientowi jednego formularza z kilkudziesięcioma polami. Prowadzi rozmowę małymi porcjami. Przy pytaniach, które wymagają precyzyjnej odpowiedzi, komunikator może pokazywać kartę z wyborem, polem liczbowym albo możliwością dodania pliku.

Pierwsza rozmowa ustala:

1. Do czego dom będzie używany.

2. Ile osób ma z niego korzystać.

3. Czy klient ma już działkę.

4. Jaki jest kraj i region realizacji.

5. Jaki jest orientacyjny budżet całej inwestycji.

6. Jaki jest oczekiwany termin.

7. Jaki standard wykończenia klient bierze pod uwagę.

8. Czy klient potrzebuje pomocy z transportem, montażem, fundamentem albo przygotowaniem działki.

Kolejne pytania zależą od odpowiedzi. Jeżeli klient nie ma działki, nie pytamy jeszcze o szerokość wjazdu. Jeżeli chce tylko stan surowy, nie pytamy szczegółowo o wyposażenie kuchni. Jeżeli interesuje go dziesięć domów, sprawa przechodzi do procesu B2B.

Informacje z rozmowy są zapisywane w uporządkowanym podsumowaniu projektu. Doradca może je poprawić, ale klient widzi ich aktualną wersję.

Każde pole ma jedno z oznaczeń:

1. Potwierdzone przez klienta.

2. Założenie doradcy do potwierdzenia.

3. Brak informacji.

4. Nie dotyczy.

Status pozostaje `rozmowa z doradcą`, dopóki nie ma danych wystarczających do przygotowania briefu.

### Etap 5. Ocena gotowości zapytania

Doradca ocenia, czy sprawa jest gotowa do wysłania producentom.

Możliwe wyniki:

1. Gotowe do briefu.

2. Potrzebne dodatkowe informacje.

3. Potrzebna płatna albo zewnętrzna analiza, na przykład analiza działki.

4. Brak producenta odpowiadającego potrzebom.

5. Projekt poza aktualnym obszarem obsługi ModularHub.

6. Przekazanie do procesu dużych zamówień B2B.

Klient zawsze otrzymuje wyjaśnienie. Nie powinien widzieć samego statusu „odrzucone”.

### Etap 6. Przygotowanie briefu

Doradca tworzy brief producenta na podstawie zatwierdzonych informacji.

Brief powinien zawierać:

1. Cel projektu.

2. Kraj i region realizacji.

3. Wybrany model albo wymagania dla alternatywy.

4. Liczbę domów.

5. Oczekiwany standard.

6. Wymagane modyfikacje.

7. Budżet albo przedział budżetu.

8. Oczekiwany termin.

9. Stan działki i znane ograniczenia.

10. Oczekiwany zakres producenta.

11. Potrzebę transportu, montażu, dźwigu, fundamentu i innych usług.

12. Pytania, na które producent musi odpowiedzieć.

13. Termin odpowiedzi.

14. Informację, które dane są jeszcze założeniem.

Na tym etapie brief nie musi zawierać pełnych danych kontaktowych klienta. Producent otrzymuje identyfikator sprawy, region realizacji i dane konieczne do wyceny. Dokładny adres, numer telefonu oraz e mail klienta są udostępniane dopiero za zgodą klienta, gdy jest to potrzebne albo gdy producent zostanie wybrany.

Klient widzi podgląd briefu oraz listę informacji, które zostaną przekazane. Zatwierdza brief przyciskiem:

„Zatwierdź i poproś producentów o oferty”

Status: `brief do zatwierdzenia`, następnie `brief zatwierdzony`.

### Etap 7. Wybór producentów

Podstawową listę tworzą producenci modeli wybranych przez klienta.

Doradca może zaproponować dodatkowego producenta albo podobny model, jeżeli:

1. Lepiej pasuje do kraju realizacji.

2. Ma odpowiedni termin.

3. Obsługuje wymagany zakres.

4. Wybrane modele wyraźnie przekraczają budżet.

5. Pierwotny producent nie jest zainteresowany.

Dodatkowy producent nie otrzymuje briefu bez wiedzy klienta. Klient zatwierdza rozszerzenie listy albo wcześniej udziela zgody, aby doradca zaprosił maksymalnie określoną liczbę dobrze dopasowanych producentów.

### Etap 8. Zaproszenie producentów

Każdy producent dostaje osobne zaproszenie w swoim panelu i komunikatorze.

Zaproszenie zawiera brief, termin odpowiedzi i jasne opcje:

1. Jestem zainteresowany.

2. Potrzebuję dodatkowych informacji.

3. Nie mogę zrealizować projektu.

4. Mogę zaproponować alternatywny model.

Producent powinien podać powód odmowy, na przykład brak mocy, brak obsługi kraju, niezgodny budżet albo niemożliwy termin. Powód pomaga doradcy, ale klient widzi jego neutralne podsumowanie, nie wewnętrzne komentarze producenta.

Status zaproszenia producenta może przyjmować wartości: `wysłane`, `wyświetlone`, `zainteresowany`, `pytania`, `odmowa`, `oferta złożona`, `wygasło`.

Status projektu klienta: `producenci przygotowują odpowiedzi`.

### Etap 9. Pytania producentów

Producent zadaje pytania w prywatnej rozmowie z ModularHub.

Doradca odpowiada na podstawie briefu albo przekazuje pytanie klientowi. Jeżeli odpowiedź zmienia istotny element projektu, doradca aktualizuje brief i zapisuje nową wersję.

Jeżeli zmiana dotyczy wszystkich producentów, każdy zaproszony producent otrzymuje tę samą aktualizację. Dzięki temu oferty pozostają porównywalne.

Producent nie otrzymuje fragmentów prywatnej rozmowy z klientem. Dostaje konkretną odpowiedź albo zaktualizowany brief.

### Etap 10. Złożenie oferty przez producenta

Producent wypełnia wspólny format oferty. Może dołączyć własny PDF, ale sam PDF nie wystarcza.

Wspólny format obejmuje:

1. Producenta i model.

2. Wariant oraz standard.

3. Cenę domu.

4. Walutę i sposób pokazania podatku.

5. Zakres w cenie.

6. Zakres poza ceną.

7. Obowiązkowe koszty dodatkowe.

8. Transport jako cena, widełki albo pozycja do późniejszej wyceny.

9. Montaż, rozładunek i dźwig.

10. Fundament i przygotowanie działki.

11. Dokumentację i formalności.

12. Termin produkcji.

13. Możliwe okno dostawy.

14. Plan płatności.

15. Gwarancję i serwis.

16. Ważność oferty.

17. Założenia i warunki, od których zależy cena.

18. Elementy wymagające późniejszego potwierdzenia.

19. Osobę odpowiedzialną po stronie producenta.

Każde przesłanie tworzy niezmienną wersję oferty. Producent może złożyć kolejną wersję, ale poprzednia pozostaje w historii.

### Etap 11. Kontrola oferty przez ModularHub

Oferta nie trafia automatycznie do klienta. Doradca sprawdza:

1. Czy producent odpowiedział na wszystkie wymagane pytania.

2. Czy cena dotyczy właściwego modelu i standardu.

3. Czy cena netto i brutto są jasno opisane.

4. Czy obowiązkowe elementy nie zostały ukryte poza ceną.

5. Czy transport i montaż są rozdzielone.

6. Czy termin ma określony punkt początkowy.

7. Czy warunki płatności są kompletne.

8. Czy założenia nie są sprzeczne z briefem.

9. Czy oferta jest nadal ważna.

10. Czy dokument producenta zgadza się z danymi wpisanymi do porównania.

Brakujące albo sprzeczne informacje wracają do producenta. Klient nie otrzymuje pozornie kompletnej oferty z pustymi miejscami ukrytymi przez interfejs.

Status oferty: `w kontroli`, `wymaga uzupełnienia` albo `gotowa do porównania`.

### Etap 12. Przygotowanie oferty porównawczej

ModularHub tworzy porównanie wyłącznie z ofert gotowych.

Porównanie pokazuje dla każdej oferty:

1. Cenę domu.

2. Znane koszty dodatkowe.

3. Szacowany koszt pełnego zakresu.

4. Elementy, których jeszcze nie da się wycenić.

5. Standard i wyposażenie.

6. Transport, montaż, dźwig i fundament.

7. Termin produkcji i dostawy.

8. Plan płatności.

9. Gwarancję oraz serwis.

10. Najważniejsze wyłączenia.

11. Ryzyka i zależności.

12. Ważność oferty.

13. Ocenę dopasowania do potrzeb klienta.

Doradca dodaje podsumowanie w prostym języku:

1. Najlepsze dopasowanie.

2. Najniższy potwierdzony koszt.

3. Najszerszy zakres.

4. Najkrótszy realny termin.

5. Najważniejsze ryzyko każdej opcji.

Rekomendacja musi mieć pisemne uzasadnienie. ModularHub nie powinien przedstawiać jednej liczby punktowej, której klient nie potrafi wyjaśnić.

Oryginalna oferta producenta pozostaje dostępna jako załącznik. ModularHub jej nie nadpisuje. Porównanie jest warstwą doradczą przygotowaną na podstawie ofert źródłowych.

Status projektu: `porównanie gotowe`.

### Etap 13. Omówienie z klientem

Doradca wysyła wiadomość z krótkim podsumowaniem oraz udostępnia porównanie.

Klient może:

1. Poprosić o wyjaśnienie.

2. Poprosić o zmianę zakresu.

3. Poprosić o aktualizację wybranej oferty.

4. Odrzucić ofertę.

5. Wybrać finalistę.

Prośba o zmianę nie edytuje istniejącej oferty. Doradca wysyła producentowi prośbę o nową wersję. Porównanie pokazuje numer i datę każdej wersji.

### Etap 14. Wybór finalisty

Przycisk klienta powinien brzmieć:

„Wybierz producenta i przejdź do wspólnej rozmowy”

Nie powinien brzmieć „Kupuję” ani „Akceptuję wiążącą ofertę”, jeżeli na tym etapie nie dochodzi jeszcze do zawarcia umowy lub płatności.

Przed potwierdzeniem klient widzi:

1. Którą wersję oferty wybiera.

2. Że wybór rozpoczyna bezpośrednie ustalenia z producentem.

3. Jakie dane kontaktowe zostaną udostępnione.

4. Że ModularHub pozostanie w rozmowie jako doradca.

5. Że wiążące zobowiązanie powstanie dopiero zgodnie z późniejszą umową i płatnością.

Klient udziela zgody na udostępnienie danych wybranemu producentowi.

Status: `producent wybrany`.

### Etap 15. Połączenie klienta z producentem

System tworzy wspólną rozmowę. Pierwszą wiadomość publikuje doradca.

Wiadomość zawiera:

1. Przedstawienie uczestników.

2. Link do zatwierdzonego briefu.

3. Link do wybranej wersji oferty.

4. Listę tematów wymagających końcowego potwierdzenia.

5. Proponowany następny krok.

6. Termin odpowiedzi producenta.

Doradca pilnuje, aby dalsze ustalenia były zapisywane w projekcie. Ważna zmiana ceny, zakresu albo terminu wymaga nowej wersji oferty albo osobnego dokumentu, nie samej wiadomości.

Status: `wspólne ustalenia`.

### Etap 16. Kontrakt

Producent przygotowuje umowę albo jej projekt. ModularHub może pomóc klientowi sprawdzić zgodność dokumentu z wybraną ofertą, ale nie przedstawia tego jako poradę prawną, jeżeli nie zapewnia prawnika.

System powinien porównać co najmniej:

1. Strony umowy.

2. Model i wariant.

3. Cenę.

4. Zakres.

5. Terminy.

6. Płatności.

7. Transport i montaż.

8. Odbiór.

9. Gwarancję.

10. Zasady zmian i anulowania.

Podpisana umowa zostaje załączona do projektu. Jeżeli podpis odbywa się poza ModularHub, strony potwierdzają jej zawarcie i dodają dokument.

Status: `kontrakt podpisany` albo `proces zakończony bez kontraktu`.

## Doradztwo po wyborze producenta

Po połączeniu stron klient wybiera, w których obszarach chce dalszego wsparcia.

### Transport

ModularHub może pomóc zebrać rzeczywiste wymiary i masę modułów, dane fabryki, dane działki, ograniczenia trasy, wymagania zezwoleń, rozładunku, dźwigu i ubezpieczenia. Następnie zbiera porównywalne oferty transportowe i pomaga wybrać wykonawcę.

Wczesna cena transportu pozostaje orientacyjna. Oferta wiążąca powstaje dopiero po zebraniu danych potrzebnych przewoźnikowi.

### Działka

ModularHub może przeprowadzić klienta przez checklistę dojazdu, fundamentu, mediów, miejsca dla dźwigu i gotowości do dostawy. Nie potwierdza jednak technicznej gotowości we własnym imieniu, jeżeli nie wykonuje tego uprawniony specjalista.

### Montaż i dźwig

ModularHub pomaga ustalić, czy odpowiada producent, przewoźnik czy lokalny wykonawca. Każdy zakres ma osobną cenę, odpowiedzialnego i termin.

### Harmonogram i dokumenty

ModularHub może pilnować terminów, brakujących dokumentów, kolejnych decyzji i komunikacji. Po podpisaniu kontraktu ten sam projekt doradczy przechodzi do centrum realizacji. Klient nie zaczyna od nowa w innym module.

### Problemy i spory

ModularHub pomaga uporządkować fakty, dowody i komunikację. Rola mediatora musi być jasno odróżniona od roli strony rozstrzygającej albo gwarantującej zwrot.

## Strona projektu klienta

### Nagłówek

Nagłówek pokazuje nazwę projektu, wybrane domy, aktualny etap, doradcę oraz najbliższą czynność.

Najważniejszy komunikat odpowiada na pytanie:

„Co teraz dzieje się z moim projektem i kto ma wykonać następny ruch?”

### Komunikator

Komunikator jest głównym elementem strony. Wiadomości mogą zawierać osadzone pytania, wybory, podsumowania, prośby o plik i decyzje. Odpowiedź aktualizująca brief zawsze pokazuje klientowi, co zostanie zapisane.

### Podsumowanie potrzeb

Widok pokazuje aktualne dane projektu, ich kompletność oraz źródło. Klient może poprawić informację albo poprosić doradcę o zmianę.

### Wybrane domy

Klient widzi pierwotną shortlistę oraz alternatywy zaproponowane przez doradcę. Każda alternatywa ma krótkie wyjaśnienie, dlaczego została dodana.

### Brief

Klient widzi wersję roboczą, zatwierdzoną wersję i historię zmian. Przed wysłaniem widzi także listę producentów i zakres udostępnianych informacji.

### Oferty

Do czasu przygotowania porównania klient widzi stan prac, na przykład „czekamy na dwie odpowiedzi”, bez ujawniania roboczych negocjacji.

Po publikacji widzi wspólne porównanie, oryginalne dokumenty, komentarz doradcy i datę ważności każdej oferty.

### Decyzje i następne kroki

W osobnym miejscu znajdują się czynności wymagające klienta. Przykłady to zatwierdzenie briefu, odpowiedź na pytanie, wybór producenta oraz zgoda na udostępnienie danych.

### Dokumenty

Dokumenty są grupowane jako pliki klienta, briefy, oferty producentów, porównania i kontrakty. Każdy ma wersję, autora, datę i widoczność.

## Panel ModularHub

Operator potrzebuje kolejki spraw pogrupowanej według następnej czynności, a nie tylko chronologicznej listy zapytań.

Widoki kolejki:

1. Nowe, bez doradcy.

2. Czekające na pierwszą odpowiedź doradcy.

3. Czekające na klienta.

4. Briefy do sprawdzenia.

5. Producenci bez odpowiedzi.

6. Oferty wymagające uzupełnienia.

7. Porównania do przygotowania.

8. Klienci bez decyzji.

9. Finaliści do połączenia.

10. Kontrakty w toku.

11. Projekty wymagające wsparcia po wyborze.

Każda sprawa pokazuje właściciela, następny termin, czas od ostatniego kontaktu, blokadę i poziom ryzyka utraty klienta.

## Panel producenta

Producent widzi zaproszenia do wyceny oraz własne odpowiedzi.

Nie widzi danych innych producentów, ich cen ani pozycji w rekomendacji.

Panel prowadzi go przez jeden format oferty, pokazuje brakujące pola, termin odpowiedzi, pytania ModularHub i historię własnych wersji.

Po wyborze producent widzi wspólny projekt z klientem. Odrzucony producent otrzymuje neutralną informację o zakończeniu procesu. ModularHub może zebrać powód przegranej wewnętrznie, lecz nie powinien ujawniać poufnych warunków konkurencji.

## Statusy projektu

Rekomendowany zestaw statusów widocznych klientowi:

1. Nowe zapytanie.

2. Rozmowa z doradcą.

3. Brief do zatwierdzenia.

4. Producenci przygotowują odpowiedzi.

5. ModularHub porównuje oferty.

6. Porównanie gotowe.

7. Producent wybrany.

8. Wspólne ustalenia.

9. Kontrakt w przygotowaniu.

10. Kontrakt podpisany.

11. Realizacja.

12. Zakończone bez wyboru.

Status nie powinien zastępować informacji o następnej czynności. Dwie sprawy w stanie „rozmowa z doradcą” mogą czekać na zupełnie różne osoby.

## Reguły, które chronią zaufanie

1. Zapytanie klienta nie trafia do producenta przed zatwierdzeniem briefu.

2. Klient wie, komu i jakie informacje udostępniamy.

3. Producent nie otrzymuje danych kontaktowych klienta przed zgodą.

4. Producent nie widzi konkurencyjnych ofert.

5. ModularHub nie zmienia treści źródłowej oferty. Tworzy osobne porównanie.

6. Każda oferta i każdy brief mają niezmienną wersję oraz datę.

7. Nieznany koszt jest pokazany jako nieznany, nie jako zero.

8. Cena orientacyjna nie jest przedstawiana jako cena wiążąca.

9. Wybór finalisty nie jest przedstawiany jako zawarcie umowy.

10. Ważna decyzja z rozmowy zostaje zapisana jako osobne potwierdzenie.

11. Rekomendacja ModularHub ma jawne uzasadnienie.

12. Klient wie, czy i od kogo ModularHub otrzymuje prowizję.

13. Doradca nie obiecuje rezultatu, za który ModularHub formalnie nie odpowiada.

14. Połączenie z producentem nie kończy automatycznie wsparcia ModularHub.

## Sytuacje wyjątkowe

### Producent nie odpowiada

Doradca wysyła przypomnienie. Po upływie terminu oznacza zaproszenie jako wygasłe, informuje klienta i proponuje alternatywę. Klient nie czeka bez informacji.

### Żaden producent nie jest zainteresowany

Doradca wyjaśnia najważniejszą przyczynę, proponuje zmianę wymagań, terminu albo budżetu i, za zgodą klienta, zaprasza inne firmy.

### Klient przestaje odpowiadać

System wysyła rozsądne przypomnienia. Doradca oznacza sprawę jako wstrzymaną, a po określonym czasie zamyka ją z możliwością wznowienia.

### Cena zmienia się podczas procesu

Producent składa nową wersję oferty z powodem zmiany. Doradca aktualizuje porównanie. Stara wersja pozostaje w historii. Klient ponownie potwierdza wybór, jeżeli zmiana nastąpiła po wskazaniu finalisty.

### Klient chce rozmawiać z kilkoma producentami

ModularHub może otworzyć wspólną rozmowę z maksymalnie określoną liczbą finalistów, ale każdy kanał pozostaje oddzielny. Klient świadomie zgadza się na udostępnienie danych każdemu z nich.

### Producent próbuje przenieść rozmowę poza platformę

Nie należy blokować klientowi kontaktu, ale interfejs przypomina, że ustalenia wpływające na cenę, zakres i termin powinny zostać potwierdzone w projekcie. Ochrona procesu i pomoc ModularHub opierają się na udokumentowanych ustaleniach.

### Oferta nie jest porównywalna

Doradca nie wypełnia braków własnymi założeniami. Zwraca ofertę producentowi albo jawnie pokazuje brak informacji.

## Rekomendacja wdrożeniowa dla pierwszej wersji

Pierwsza wersja może być operacyjnie ręczna. Nie potrzebuje automatycznego dopasowywania ani sztucznej inteligencji podejmującej decyzje.

Powinna jednak od początku mieć:

1. Jeden projekt doradczy.

2. Oddzielne rozmowy klienta i producentów.

3. Przypisanego doradcę.

4. Wersjonowany brief.

5. Zaproszenia producentów ze statusami.

6. Wspólny format oferty.

7. Kontrolę kompletności.

8. Porównanie ofert.

9. Wybór finalisty i zgodę na udostępnienie danych.

10. Wspólną rozmowę po wyborze.

11. Historię dokumentów i decyzji.

12. Kolejkę pracy operatora.

Automatyzację podsumowań, przypomnień, oceny kompletności i tworzenia pierwszego szkicu porównania można dodawać później. Decyzję doradczą i odpowiedzialność za publikowane porównanie powinien zachować człowiek.

## Mierniki działania

Warto mierzyć:

1. Czas od zapytania do pierwszej odpowiedzi doradcy.

2. Czas od zapytania do zatwierdzenia briefu.

3. Odsetek zaproszonych producentów, którzy odpowiedzieli.

4. Czas producenta do pierwszej reakcji i do pełnej oferty.

5. Odsetek ofert zwróconych do uzupełnienia.

6. Czas od kompletu ofert do publikacji porównania.

7. Odsetek projektów kończących się wyborem producenta.

8. Odsetek wyborów kończących się podpisaniem kontraktu.

9. Najczęstsze przyczyny braku wyboru.

10. Najczęstsze brakujące elementy ofert.

11. Liczbę projektów prowadzonych jednocześnie przez doradcę.

12. Ocenę klienta po porównaniu i po podpisaniu kontraktu.

Te mierniki pozwolą sprawdzić, czy doradztwo rzeczywiście poprawia decyzje i sprzedaż, czy tylko wydłuża drogę między klientem a producentem.
