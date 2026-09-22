# Logistyka i realizacja transakcji w ModularHub Europe

Data analizy: 19 września 2026. Materiał do decyzji produktowej, prawnej i operacyjnej. Nie jest jeszcze specyfikacją wdrożeniową ani poradą prawną.

## Najważniejszy wniosek

ModularHub nie potrzebuje wyłącznie funkcji wyceny transportu. Potrzebuje jednego modelu prowadzenia zamówienia od przyjętej oferty do końca gwarancji.

Transport domu modułowego jest tylko jednym fragmentem tego modelu. Zależy od zamrożonych wymiarów i masy modułów, gotowości produkcji, gotowości działki, przejezdności trasy, zezwoleń, dostępności przewoźnika, dźwigu, ekipy montażowej, pogody, ubezpieczenia i płatności. Jeżeli te zależności zostaną rozdzielone na kilka niezależnych ekranów i kilka luźnych statusów, platforma pokaże klientowi pozorną pewność, której operacyjnie nie będzie w stanie zapewnić.

Rekomenduję potraktować ten zakres jako centrum realizacji zamówienia. Każde zamówienie powinno mieć uzgodniony zakres, odpowiedzialnych uczestników, bramki gotowości, harmonogram, płatności, dokumenty, komunikację, zmiany, wyjątki i historię decyzji.

Dzisiejsze etapy `produkcja`, `transport`, `montaz`, `odbior`, `gwarancja` mogą zostać jako prosty pasek postępu dla klienta. Nie powinny jednak pozostać właściwą maszyną procesu. Pod nimi potrzebne są zadania, warunki wejścia, dowody, akceptacje i wyjątki.

## Co już istnieje w projekcie

Obecny produkt ma dobry początek, ale urywa proces w najważniejszym miejscu.

1. Zapytanie klienta jest trwale zapisywane i może obejmować produkty kilku producentów.

2. Każdy producent składa własną ofertę. Oferta rozdziela cenę domu, transport i montaż.

3. Przyjęcie oferty tworzy jedno zamówienie i pierwszy wpis historii etapu.

4. Schemat ma tabelę płatności, lecz obejmuje dziś tylko opłatę za analizę działki oraz prowizję platformy.

5. Zamówienie ma tylko bieżący etap i historię pięciu ogólnych etapów.

6. Dokument może zostać powiązany ze zdarzeniem etapu zamówienia.

7. Publiczna karta produktu pokazuje już wymiary transportowe, wymagania dźwigu, minimalną szerokość działki, warianty, pozycje kosztowe i orientacyjny harmonogram.

8. Zakres produkcyjny osobno planuje realne płatności, realną wycenę transportu, realizację, powiadomienia, panel administracyjny i weryfikację producenta.

Największa luka polega na tym, że przyjęcie oferty tworzy obecnie zamówienie od razu na etapie produkcji. Nie istnieje jeszcze etap kontraktu, potwierdzenia zakresu, rezerwacji terminu, pierwszej płatności, zamrożenia projektu, gotowości działki ani zamówienia transportu. Nie istnieje także model zmiany zakresu, kosztu dodatkowego, opóźnienia, szkody, odbioru warunkowego ani sporu.

## Jak działają porównywalne marketplace

### Marketplace ofertowy dla prefabrykacji

PrefabMarket, Spassio, Krovke, Prefabista i podobne portale skupiają się przede wszystkim na katalogu, porównaniu modeli, dopasowaniu producenta i wysłaniu zapytania. Prefabstarter wprost opisuje model, w którym klient wybiera producenta i podpisuje umowę bezpośrednio z nim. To ważna obserwacja, ponieważ rynek jest względnie dobrze obsłużony przed zapytaniem, a znacznie słabiej po wyborze producenta.

Wniosek dla ModularHub: katalog i porównanie nie wystarczą jako trwała przewaga. Największa wartość może powstać po zaakceptowaniu oferty, gdy klient potrzebuje jednej prawdy o pieniądzach, terminach, logistyce i odpowiedzialności.

Źródła: [PrefabMarket](https://prefabmarket.eu/), [Spassio](https://spassio.com/), [Krovke](https://krovke.com/en), [Prefabista](https://www.prefabista.com/), [Prefabstarter](https://prefabstarter.com/).

### Alibaba Trade Assurance

Alibaba wiąże ochronę z zamówieniem zapisanym na platformie. Strony ustalają warunki zamówienia, klient płaci przez platformę, środki są przechowywane w escrow, a zwrot lub rekompensata może zostać uruchomiona, gdy wysyłka, dostawa albo jakość nie odpowiada uzgodnionym warunkom. Alibaba podkreśla także, że zapis zamówienia i komunikacja na platformie stanowią materiał do rozstrzygnięcia sporu.

Wniosek dla ModularHub: ochrona nie może opierać się na ogólnym statusie „odebrane”. Każdy płatny etap musi mieć mierzalny przedmiot, termin, wymagane dowody i regułę akceptacji. Rozmowa na czacie nie może po cichu zmieniać zakresu umowy.

Źródła: [Alibaba Trade Assurance](https://tradeassurance.alibaba.com/), [Alibaba Buyer Central](https://activity.alibaba.com/page/HowItWorks/Page.html).

### Amazon Business Request for Quote

Amazon Business pozwala kupującemu złożyć jedno zapytanie obejmujące wiele pozycji i ilości. Sprzedawcy odpowiadają ofertami, klient otrzymuje powiadomienia, porównuje odpowiedzi w panelu, wybiera ofertę, a przed zakupem potwierdza dostawę i płatność.

Wniosek dla ModularHub: złożone zapytanie powinno mieć ustandaryzowane dane wejściowe, a odpowiedzi powinny być porównywalne. Akceptacja ceny nie powinna omijać końcowego potwierdzenia wariantu, zakresu, miejsca dostawy, terminu i warunków płatności.

Źródło: [Amazon Business Request for Quote](https://business.amazon.com/en/solutions/bulk-buying/request-for-quote).

### Faire

Faire rozdziela moment zakupu, wysyłki, obciążenia kupującego i wypłaty sprzedawcy. Wybrani kupujący otrzymują termin płatności 60 dni, podczas gdy sprzedawca może otrzymać pieniądze wcześniej. Platforma ocenia ryzyko i limit kupującego, obsługuje zwroty i bierze na siebie część ryzyka handlowego.

Wniosek dla ModularHub: termin płatności klienta i termin wypłaty producenta są dwoma osobnymi zdarzeniami. System powinien pokazywać osobno środki wpłacone, środki oczekujące, kwotę gotową do wypłaty, kwotę wypłaconą, zwrot i kwotę sporną. Jeżeli platforma zacznie finansować producenta przed zapłatą klienta, stanie się to osobnym produktem kredytowym i ryzykiem, a nie drobną funkcją interfejsu.

Źródła: [Faire, warunki płatności dla sprzedawców](https://www.faire.com/support/articles/360018414552), [Faire, Net 60](https://www.faire.com/support/articles/360016658851).

### Upwork

Upwork dzieli umowę o stałej cenie na kamienie milowe. Klient finansuje kamień przed rozpoczęciem pracy. Każdy kamień ma własny przedmiot, termin i kwotę. Po zgłoszeniu wykonania klient akceptuje pracę albo prosi o poprawki. Brak reakcji przez ustalony okres może uruchomić automatyczną wypłatę. Spór dotyczy konkretnego kamienia, a nie całego projektu naraz.

Wniosek dla ModularHub: jedna płatność za cały dom jest zbyt ryzykowna dla obu stron. Model powinien obsługiwać dowolną liczbę kamieni płatniczych. Każdy kamień musi zostać sfinansowany przed uruchomieniem kosztownego etapu i zwolniony po konkretnym dowodzie. Procentów nie należy kodować na stałe, ponieważ producenci, kraje i zakresy będą się różnić.

Źródła: [Upwork, kamienie i ich akceptacja](https://support.upwork.com/hc/en-us/articles/360000980507-Review-and-pay-for-fixed-price-contracts-and-milestones), [Upwork, zasady escrow](https://www.upwork.com/legal).

### Freightos

Freightos jest szczególnie użytecznym wzorcem, ponieważ pokazuje cały cykl złożonej usługi logistycznej. Klient podaje miejsce odbioru i dostawy, wymiary, masę, wartość towaru, preferencje odprawy i ubezpieczenia. Proste przypadki dostają ofertę natychmiastową, trudne przechodzą do oferty indywidualnej. Po rezerwacji powstaje bezpośrednia umowa z dostawcą usługi, a Freightos obsługuje płatność i wspólny panel.

Freightos wymaga, aby oferta pokazywała, co obejmuje cena. Zmiana wymiarów, adresu, warunków dostawy albo usług dodatkowych może wywołać korektę kosztu. Dostawca musi ją zakomunikować i uzyskać akceptację. Zlecenie może zostać wstrzymane z zapisanym powodem i datą. Przewoźnik przekazuje terminy, identyfikatory przewozu, dokumenty i statusy. Ubezpieczenie jest osobną usługą, a odpowiedzialność stron jest jawna.

Wniosek dla ModularHub: transport domu modułowego powinien używać wzorca oferty indywidualnej, nawet jeżeli wczesny kalkulator pokazuje orientacyjne widełki. Cena wiążąca może powstać dopiero po potwierdzeniu rzeczywistych wymiarów, masy, adresów, trasy, zezwoleń, sposobu załadunku, rozładunku, dźwigu i daty gotowości. Każda korekta musi być formalnym kosztem dodatkowym z akceptacją, nie wiadomością na czacie.

Źródła: [Freightos Marketplace](https://www.freightos.com/marketplace/), [Freightos Standard Operating Procedure](https://www.freightos.com/standard-operating-procedure/).

### Uber Freight

Uber Freight zbiera pochodzenie, cel, rodzaj transportu, wymiary, masę i wymagania specjalne, następnie pozwala wybrać ofertę, zarezerwować przewóz i śledzić realizację. API rozdziela wycenę, przesyłkę, śledzenie oraz dokumenty.

Wniosek dla ModularHub: kalkulacja, rezerwacja i wykonanie transportu są osobnymi bytami. Nie należy nadpisywać pierwotnej wyceny bieżącym kosztem ani traktować numeru rezerwacji jako statusu wykonania.

Źródła: [Uber Freight, wycena i rezerwacja](https://www.uberfreight.com/en-US/tech/instant-freight-quote), [Uber Freight API](https://developer.uberfreight.com/get-started).

### Houzz Pro i Procore

Houzz Pro pokazuje klientowi w jednym projekcie kosztorysy, propozycje, faktury, zamówienia, płatności i zmiany zakresu. Dokumenty mają jawne statusy, a poszczególne pozycje mogą być zatwierdzane lub odrzucane. Procore używa harmonogramu wartości, wniosków o płatność, retencji oraz formalnych zmian zakresu.

Wniosek dla ModularHub: strona zamówienia nie może być wyłącznie osią statusów. Musi zawierać także aktualną wersję zakresu, rejestr zmian, rozliczenie i dokumenty odbiorowe. W przeciwnym razie komunikacja i pieniądze szybko przeniosą się do poczty oraz arkuszy.

Źródła: [Houzz Pro, panel klienta](https://pro.houzz.com/pro-help/r/how-to-use-your-project-dashboard-for-clients), [Houzz Pro, statusy dokumentów](https://pro.houzz.com/pro-help/r/status-breakdown-for-proposals-invoices-and-purchase), [Procore](https://mkt-cdn.procore.com/downloads/Procore_Brochure.pdf).

## Wymagania transportu domu modułowego

Unia Europejska określa maksymalne masy i wymiary pojazdów. Ładunki przekraczające limity wymagają zezwoleń krajowych albo regionalnych. Poszczególne kraje stosują różne procedury, eskorty, okna przejazdu i ograniczenia prędkości. Oznacza to, że sama odległość nigdy nie wystarczy do wiążącej wyceny transportu modułu.

W przewozie międzynarodowym drogą lądową konwencja CMR standaryzuje warunki umowy przewozu i odpowiedzialność przewoźnika. List CMR zapisuje między innymi nadawcę, odbiorcę, przewoźnika i dane towaru. Elektroniczny e CMR może pełnić rolę dowodu przekazania między stronami.

Incoterms 2020 pomagają rozdzielić obowiązki, koszty i moment przejścia ryzyka między kupującym a sprzedawcą. Nie zastępują umowy sprzedaży. W kontrakcie trzeba podać dokładne miejsce oraz punkt dostawy. Dla domu modułowego różnica między dostawą do adresu, dostawą gotową do rozładunku i dostawą z rozładunkiem ma istotny wpływ na ryzyko i koszt.

Źródła: [Komisja Europejska, ładunki ponadnormatywne](https://road-safety.transport.ec.europa.eu/eu-road-safety-policy/priorities/safe-vehicles/cargo-securing-and-abnormal-loads_en), [Komisja Europejska, masy i wymiary](https://transport.ec.europa.eu/transport-modes/road/weights-and-dimensions_en), [UNECE, e CMR](https://unece.org/trade/documents/2023/10/executive-guide-e-cmr), [ICC, Incoterms 2020](https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/).

W praktyce każde zamówienie powinno zebrać co najmniej następujące dane.

1. Liczbę modułów oraz identyfikator każdego modułu.

2. Rzeczywistą długość, szerokość, wysokość, masę i punkty podnoszenia każdego modułu.

3. Adres fabryki, miejsce załadunku oraz wymagania wózka albo dźwigu przy fabryce.

4. Dokładny adres działki i współrzędne punktu rozładunku.

5. Ocenę dojazdu, szerokości, promieni skrętu, nośności nawierzchni, nachylenia, bram, przewodów, drzew, mostów i ograniczeń czasowych.

6. Potrzebę badania trasy, zezwoleń, pilota, eskorty i czas ważności tych dokumentów.

7. Gotowość fundamentu, mediów, placu dla dźwigu, strefy montażowej oraz wymaganych odbiorów lokalnych.

8. Plan podnoszenia, model dźwigu, promień pracy, nośność podłoża i kolejność modułów.

9. Okno odbioru z fabryki, okno dostawy, plan awaryjny i zasady oczekiwania.

10. Wartość ładunku, zakres ubezpieczenia, udział własny i procedurę szkody.

11. Warunek dostawy, moment przejścia ryzyka i podmiot odpowiedzialny za każdy odcinek.

12. Dokumenty przewozowe, zdjęcia przed załadunkiem, protokół szkody, potwierdzenie dostawy i protokół przekazania do montażu.

## Rekomendowany model odpowiedzialności

### Klient

Klient zatwierdza zakres, finansuje uzgodnione kamienie, zapewnia prawdziwe dane działki, wykonuje przypisane przygotowanie terenu, udostępnia działkę w ustalonym oknie, zatwierdza zmiany kosztu i podpisuje odbiór albo zgłasza konkretną wadę.

### Producent

Producent odpowiada za zgodność produktu z zamrożoną specyfikacją, prawdziwe wymiary i masę, gotowość fabryczną, przygotowanie do załadunku, dokumentację techniczną, kontrolę jakości oraz montaż, jeżeli montaż jest w jego zakresie.

### Przewoźnik albo spedytor

Przewoźnik odpowiada za ofertę transportową, dobór pojazdu, badanie trasy i zezwolenia w zakresie umowy, rezerwację, odbiór, zabezpieczenie ładunku, statusy przejazdu, dokumenty przewozowe i dowód dostawy.

### Operator ModularHub

Operator pilnuje kompletności danych, bramek gotowości, terminów odpowiedzi i spójnej historii. Może koordynować wyjątki, mediować i blokować przejście do kolejnego etapu. Nie powinien jednak udawać przewoźnika, generalnego wykonawcy, inspektora ani strony umowy, jeżeli faktycznie nie przyjmuje tych obowiązków.

### Dostawca płatności

Dostawca płatności przyjmuje środki, wykonuje wymagane sprawdzenia użytkowników, prowadzi salda, obsługuje zwroty, spory płatnicze i wypłaty. ModularHub nie powinien samodzielnie przechowywać pieniędzy klientów na zwykłym rachunku ani używać słowa escrow bez rzeczywistej, licencjonowanej usługi.

### Dźwig, montaż, inspektor i wykonawcy lokalni

Każda dodatkowa firma powinna mieć własny zakres, osobę kontaktową, termin, cenę, dokumenty i status. Nie należy ukrywać ich pod nazwą producenta, ponieważ szkoda przy transporcie, rozładunku i montażu może mieć różnych odpowiedzialnych.

## Rekomendowany przebieg zamówienia

### Etap 0. Uzgodnienie handlowe

Producent składa ofertę z konkretnym wariantem, zakresem, ceną domu, założeniami transportu, montażem, terminem ważności oraz listą wyłączeń. Klient porównuje oferty. Akceptacja tworzy projekt w stanie „do zakontraktowania”, a nie od razu „produkcja”.

Warunek wyjścia: wybrana oferta, znany klient, znany producent i zapisane warunki, które były podstawą wyboru.

### Etap 1. Kontrakt i uruchomienie

Strony potwierdzają dane prawne, role, sprzedawcę, wykonawców, zakres, podatek, walutę, warunki dostawy, politykę zmian, anulowania, opóźnień, odbioru, gwarancji i sporów. Producent przechodzi weryfikację wymaganą do wypłaty. Klient finansuje pierwszy kamień.

Warunek wyjścia: podpisane dokumenty, spełnione KYC lub KYB, sfinansowany pierwszy kamień i przypisany operator projektu.

### Etap 2. Zamrożenie techniczne

Klient oraz producent uzgadniają wariant, rysunki, wyposażenie, otwory, instalacje, kolorystykę, zakres dostawy i montażu. Po zamrożeniu każda zmiana przechodzi przez formalny wniosek, wpływ na cenę i termin oraz akceptację obu stron.

Warunek wyjścia: wersja specyfikacji oznaczona jako obowiązująca, komplet zatwierdzeń i brak otwartej zmiany blokującej.

### Etap 3. Gotowość działki

Klient albo wskazany wykonawca uzupełnia checklistę działki. Załącza zdjęcia, plan, wymiary wjazdu, dane fundamentu, mediów, placu dźwigu i lokalnych zgód. Odpowiednia strona sprawdza kompletność. Wynik może być gotowy, warunkowo gotowy albo zablokowany.

Warunek wyjścia: działka i miejsce rozładunku są potwierdzone dla konkretnego zestawu modułów.

### Etap 4. Produkcja

Producent potwierdza rozpoczęcie, raportuje kamienie produkcyjne, załącza wymagane dowody i zgłasza ryzyko opóźnienia. Kontrola jakości przed wysyłką porównuje produkt z zamrożoną specyfikacją. Ewentualna inspekcja zewnętrzna ma własny raport.

Warunek wyjścia: produkt gotowy, kontrola jakości zaliczona, rzeczywiste dane transportowe zamrożone i wymagany kamień płatniczy sfinansowany.

### Etap 5. Wycena i rezerwacja transportu

System może wcześniej pokazywać orientacyjne widełki. Wiążąca oferta transportowa powstaje po potwierdzeniu modułów, trasy, daty, zezwoleń, załadunku, rozładunku, dźwigu, ubezpieczenia i usług dodatkowych. Klient albo producent zatwierdza ofertę zgodnie z kontraktem. Dopiero wtedy powstaje rezerwacja przewoźnika.

Warunek wyjścia: zaakceptowana oferta, zarezerwowany przewoźnik, potwierdzone zezwolenia, ubezpieczenie, okna oraz dane kontaktowe.

### Etap 6. Bramka przed wysyłką

Operator sprawdza jednocześnie gotowość produktu, działki, przewoźnika, dźwigu, ekipy montażowej, dokumentów, płatności i pogody. Każdy brak ma właściciela, termin i wpływ. Bez zaliczenia bramki moduł nie opuszcza fabryki.

Warunek wyjścia: jawna decyzja „można wysłać”, zapisana z osobą i czasem.

### Etap 7. Transport i dostawa

Przewoźnik potwierdza załadunek, załącza dokument przewozowy i wysyła statusy. Opóźnienie albo incydent otwiera wyjątek z odpowiedzialnym i kolejnym terminem aktualizacji. Przy dostawie strony dokumentują stan modułów przed rozładunkiem. Widoczna szkoda uruchamia protokół, zdjęcia i zgłoszenie ubezpieczeniowe.

Warunek wyjścia: potwierdzenie dostawy, udokumentowany stan oraz formalne przekazanie odpowiedzialności do strony wykonującej rozładunek lub montaż.

### Etap 8. Rozładunek i montaż

Ekipa realizuje plan podnoszenia i kolejność modułów. Rejestruje rozpoczęcie, zakończenie, zdjęcia i odstępstwa. Wady nieblokujące trafiają na listę usterek z właścicielem i terminem. Wada krytyczna blokuje odbiór.

Warunek wyjścia: montaż ukończony, obiekt zabezpieczony, dokumenty przekazane i lista usterek sklasyfikowana.

### Etap 9. Odbiór i rozliczenie

Klient podpisuje odbiór bez zastrzeżeń, odbiór warunkowy z listą usterek albo odmowę z uzasadnieniem. Akceptacja może zwolnić odpowiedni kamień płatniczy. Część kwoty może pozostać zatrzymana do usunięcia usterek, jeżeli kontrakt tak stanowi.

Warunek wyjścia: podpisany protokół, rozliczone płatności, przekazana dokumentacja i daty początku gwarancji.

### Etap 10. Gwarancja i serwis

Klient zgłasza problem z kategorią, opisem, zdjęciami i stopniem pilności. System wskazuje odpowiedzialną stronę, termin pierwszej odpowiedzi, termin wizyty i wynik. Gwarancja konstrukcyjna, instalacyjna, wyposażenia oraz transportowa nie powinny być jedną wartością.

Warunek zamknięcia: zakończony okres obsługi albo zamknięcie konkretnego zgłoszenia. Historia projektu pozostaje dostępna zgodnie z polityką retencji.

## Płatności, które model powinien obsłużyć

Nie rekomenduję jednej sztywnej tabeli procentów. System powinien pozwolić ustalić plan per oferta i kontrakt. Każdy kamień musi mieć kwotę, walutę, płatnika, odbiorcę, termin finansowania, warunek wypłaty, wymagane dowody, okres akceptacji, zasady zwrotu i status sporu.

Typowy plan może zawierać rezerwację i prace projektowe, uruchomienie produkcji, zakończenie konstrukcji, gotowość do wysyłki, dostawę i montaż oraz odbiór końcowy. Konkretny procent powinien zostać uzgodniony z producentem, operatorem płatności i prawnikiem, a nie wyprowadzony z interfejsu.

Model danych powinien rozróżniać co najmniej następujące stany pieniędzy: wymagane, oczekujące na wpłatę, przetwarzane, zabezpieczone, dostępne do wypłaty, wypłacone, częściowo zwrócone, zwrócone, sporne i utracone przez chargeback.

Powinien także rozróżniać opłatę dla producenta, opłatę przewoźnika, montaż, dźwig, usługi dodatkowe, podatek, koszt operatora płatności i prowizję ModularHub. Dzisiejsze pojedyncze `platform_commission` nie wystarczy do pogodzenia tych przepływów.

### Możliwe modele biznesowe

Model pierwszy: platforma pobiera tylko własną prowizję, a klient płaci producentowi bezpośrednio. Jest prostszy regulacyjnie, ale osłabia kontrolę procesu, ochronę klienta i automatyczne rozliczenie kamieni.

Model drugi: licencjonowany operator marketplace przyjmuje płatność, rozdziela kwoty, prowadzi salda i wypłaca producenta po spełnieniu warunków. To rekomendowany kierunek docelowy, jeżeli ModularHub chce realnie gwarantować przebieg transakcji.

Model trzeci: osobna licencjonowana usługa escrow. Zapewnia najmocniejszy komunikat zaufania, ale wymaga dopasowania do krajów, typu klienta, wartości zamówienia i rzeczywistych warunków zwolnienia środków.

Adyen for Platforms dokumentuje podział płatności, salda użytkowników, przechowywanie środków do wypłaty, weryfikację rachunków i sterowanie wypłatami. Stripe Connect obsługuje oddzielne płatności i transfery, lecz dokumentacja wskazuje, że chroniona segregacja środków jest funkcją dostępną w ograniczonym trybie, a przy tym modelu platforma może ponosić koszty zwrotów i chargebacków. Obaj dostawcy wymagają oceny handlowej, krajowej i prawnej przed wyborem.

Źródła: [Adyen Marketplaces](https://docs.adyen.com/marketplaces), [Adyen, podział transakcji](https://docs.adyen.com/marketplaces/split-transactions), [Adyen, wypłaty](https://docs.adyen.com/platforms/quickstart-guide/payouts), [Stripe Connect](https://stripe.com/connect), [Stripe, separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers).

## Komunikacja i dowody

Cała komunikacja projektowa powinna być dostępna w jednym projekcie, lecz nie każda wiadomość ma tę samą wagę.

1. Wiadomość zwykła służy do rozmowy i nie zmienia kontraktu.

2. Prośba o informację ma właściciela i termin odpowiedzi.

3. Decyzja wymaga jawnego zatwierdzenia przez uprawnioną rolę.

4. Zmiana zakresu ma opis, wpływ na cenę i termin, załączniki oraz akceptację obu stron.

5. Wyjątek opisuje problem, wpływ, właściciela, plan i następny termin aktualizacji.

6. Spór zamraża powiązaną wypłatę, zbiera dowody i ma osobny stan rozstrzygnięcia.

7. Zdarzenie systemowe zapisuje zmianę statusu, płatność, wypłatę, dokument albo upływ terminu.

E mail powinien powiadamiać o zdarzeniu i prowadzić do projektu. Nie powinien być jedynym miejscem decyzji. Telefon może pozostać kanałem awaryjnym, ale operator powinien zapisać notatkę z rozmowy i poprosić strony o potwierdzenie decyzji w projekcie.

## Rekomendowany układ strony realizowanego projektu

To jest strona zamówienia po akceptacji oferty, nie publiczna karta produktu z katalogu.

### Nagłówek

Nagłówek pokazuje nazwę projektu, producenta, lokalizację, numer zamówienia, wersję kontraktu, ogólny etap i stan ryzyka. Najważniejszym elementem jest „Twoja następna czynność” z właścicielem i terminem. Obok znajduje się kontakt do operatora oraz przycisk zgłoszenia problemu.

### Widok główny

Pierwszy ekran pokazuje aktualną bramkę, warunki już spełnione, warunki brakujące, najbliższy termin, następną płatność i ostatnią istotną zmianę. Klient nie powinien szukać odpowiedzi w osi z dziesiątkami zdarzeń.

### Plan i postęp

Sekcja pokazuje etapy główne oraz szczegółowe kamienie. Każdy kamień ma właściciela, planowaną datę, rzeczywistą datę, zależności, wymagane dowody, status akceptacji i powiązaną płatność. Opóźniony kamień pokazuje przyczynę, wpływ i nowy termin, nie tylko kolor czerwony.

### Zakres i zmiany

Sekcja pokazuje obowiązującą wersję wariantu, zakres w cenie, zakres poza ceną, odpowiedzialną stronę dla każdej pozycji oraz historię formalnych zmian. Klient może porównać wersje i zobaczyć wpływ każdej zaakceptowanej zmiany na koszt i termin.

### Płatności

Sekcja pokazuje łączny kontrakt, prowizję platformy, usługi dodatkowe, kwoty wpłacone, zabezpieczone, wypłacone, oczekujące i sporne. Każdy kamień wyjaśnia, co uruchamia wypłatę. Rachunki, faktury, zwroty i identyfikatory operatora płatności są dostępne przy właściwej pozycji.

### Działka i logistyka

Sekcja pokazuje checklistę gotowości działki, moduły i ich parametry, adresy, badanie trasy, zezwolenia, warunek dostawy, przewoźnika, ubezpieczenie, dźwig, ekipę montażową, okna czasowe, status przejazdu i plan awaryjny. Orientacyjna kalkulacja, wiążąca oferta i końcowe koszty są od siebie wyraźnie oddzielone.

### Dokumenty

Dokumenty są grupowane według celu, wersji i etapu. System odróżnia rysunek do wglądu od rysunku zatwierdzonego, ofertę od kontraktu, zdjęcie postępu od dowodu odbiorowego oraz dokument wygasły od obowiązującego. Każdy dokument ma autora, datę, wersję i widoczność.

### Wiadomości i decyzje

Rozmowa może zostać filtrowana według tematu. Decyzje, prośby, zmiany, wyjątki i spory są widoczne osobno od zwykłych wiadomości. Użytkownik widzi, kto czeka na czyją odpowiedź.

### Odbiór, usterki i gwarancja

Sekcja pozwala przygotować protokół, dodać zdjęcia, sklasyfikować usterkę, przypisać odpowiedzialnego, ustalić termin i powiązać wynik z zatrzymaną płatnością. Po odbiorze ta sama sekcja przechodzi w centrum gwarancji i serwisu.

### Widoczność według roli

Klient widzi pełen uzgodniony zakres, ceny, terminy, decyzje i dowody dotyczące swojego projektu. Producent widzi projekt i zadania swoich zespołów. Przewoźnik widzi tylko dane niezbędne do przewozu. Wykonawca dźwigu albo montażu widzi swój zakres. Operator widzi całość oraz notatki wewnętrzne. Notatki wewnętrzne nigdy nie mogą mieszać się z komunikacją stron.

## Wymogi prawne i zgodności do uwzględnienia

Digital Services Act wymaga od marketplace działających dla konsumentów pozyskania i częściowego pokazania danych sprzedawcy. Interfejs ma także umożliwić sprzedawcy podanie informacji wymaganych przez prawo i dotyczących bezpieczeństwa produktu. Obecna weryfikacja producenta w ModularHub powinna więc nastąpić przed możliwością zawarcia transakcji, nie dopiero przed pierwszą wypłatą.

Consumer Rights Directive wymaga jasnych informacji przed zawarciem umowy. Towary wykonane według specyfikacji klienta mogą podlegać wyjątkowi od prawa odstąpienia, ale wyjątek jest interpretowany wąsko. ModularHub powinien pokazać klientowi dokładny skutek personalizacji i moment, po którym anulowanie zmienia się z prostego odstąpienia w rozliczenie poniesionych kosztów. To wymaga sprawdzenia w każdym kraju docelowym.

General Product Safety Regulation nakłada obowiązki także na marketplace. Zakres stosowania do konkretnego domu, elementów budynku i wyposażenia wymaga opinii prawnej oraz produktowej. Platforma powinna jednak od początku przechowywać identyfikację producenta, produktu, wersji, dokumentów zgodności oraz odbiorców, aby móc obsłużyć ostrzeżenie lub wycofanie.

Źródła: [DSA, artykuły 30 i 31](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R2065), [Komisja Europejska, wpływ DSA na marketplace](https://digital-strategy.ec.europa.eu/en/policies/dsa-impact-platforms), [prawa konsumenta i wyjątki](https://europa.eu/youreurope/citizens/consumers/shopping/returns/indexamp_en.htm), [Komisja Europejska, bezpieczeństwo produktów](https://commission.europa.eu/topics/business-and-industry/product-safety_en).

## Co trzeba zmienić względem obecnego modelu danych

Poniższa lista nie jest jeszcze projektem tabel. Pokazuje zakres pojęć, których obecny schemat nie potrafi zapisać.

1. Projekt realizacyjny jako centrum współpracy, oddzielony od samego zamówienia handlowego.

2. Uczestnicy projektu, role, organizacje i zakres widoczności.

3. Wersjonowany kontrakt, specyfikacja i formalne akceptacje.

4. Kamienie projektu z zależnościami, właścicielem, planem, wykonaniem i dowodami.

5. Bramki gotowości z warunkami i decyzją o przejściu.

6. Plan płatności, finansowanie kamienia, wypłata, prowizja, zwrot, retencja i spór.

7. Zlecenie transportowe, oferta transportowa, rezerwacja, moduły ładunku i statusy śledzenia.

8. Checklista działki, plan trasy, zezwolenia, dźwig i okna dostawy.

9. Formalna zmiana zakresu, ceny lub terminu.

10. Problem, wyjątek, szkoda, usterka i spór jako różne pojęcia.

11. Odbiór częściowy, warunkowy, końcowy i dowody dostawy.

12. Wiadomości, prośby, decyzje oraz zdarzenia systemowe.

13. Wersje dokumentów, podpisy, okres ważności i widoczność.

14. Zgłoszenie gwarancyjne i serwisowe z osobnym SLA.

Obecne `order.currentStage` może zostać jako wyliczona etykieta do szybkiego odczytu. Źródłem prawdy powinny być jednak zdarzenia, kamienie i bramki. Użytkownik nie powinien ręcznie ustawiać etapu na dowolną wartość.

## Ryzyka, których nie można zostawić do późniejszego dopowiedzenia

1. Kto jest sprzedawcą domu i stroną umowy z klientem.

2. Kto zawiera umowę z przewoźnikiem, dźwigiem i ekipą montażową.

3. Kto ponosi ryzyko szkody na każdym odcinku i w którym momencie ono przechodzi.

4. Czy ModularHub tylko pośredniczy, czy gwarantuje wynik, termin albo zwrot.

5. Kto przyjmuje pieniądze i kto odpowiada za chargeback, zwrot oraz ujemne saldo.

6. Jak wygląda anulowanie przed produkcją, po zamrożeniu projektu, po rozpoczęciu produkcji i po rezerwacji transportu.

7. Kto potwierdza gotowość działki i z jaką odpowiedzialnością.

8. Jak rozliczane są postoje, nieudana dostawa, ponowny przejazd, magazynowanie i zmiana trasy.

9. Kto ocenia jakość przed wysyłką i przy odbiorze.

10. Jaki dowód wystarcza do zwolnienia pieniędzy oraz ile czasu klient ma na reakcję.

11. Jak rozdzielone są wada produktu, szkoda transportowa i błąd montażu.

12. Jak proces różni się dla konsumenta, firmy oraz inwestora kupującego dziesięć lub więcej domów.

## Rekomendowana kolejność dalszej pracy

Pierwszy krok to warsztat decyzji biznesowych. Powinien ustalić rolę prawną ModularHub, model kontraktów, przepływ pieniędzy, odpowiedzialność za transport oraz minimalny poziom obsługi operatora.

Drugi krok to opis dwóch scenariuszy referencyjnych. Pierwszy powinien obejmować jednego konsumenta, jeden dom, transport międzynarodowy i montaż producenta. Drugi powinien obejmować inwestora B2B, wiele domów, kilka dostaw i odbiory częściowe.

Trzeci krok to dokładna mapa komunikacji. Dla każdego zdarzenia powinna wskazać inicjatora, odbiorcę, wymagane dane, kanał, termin, możliwe odpowiedzi, dowód i skutek dla płatności oraz harmonogramu.

Czwarty krok to osobny model pieniędzy. Powinien zostać oceniony przez operatora płatności, księgowość i prawnika przed zaprojektowaniem interfejsu płatności.

Piąty krok to właściwa specyfikacja produktu. Powinna mieć formę specyfikacji parasolowej z osobnymi decyzjami dla kontraktu i odpowiedzialności, centrum projektu, logistyki, płatności, komunikacji i sporów. Próba zamknięcia całości w jednej małej funkcji „realna wycena transportu” pozostawi najważniejsze decyzje implementującemu.

## Decyzje potrzebne od właściciela produktu

Do rozpoczęcia dokładnego projektu potrzebne są odpowiedzi na sześć pytań.

1. Czy klient podpisuje umowę sprzedaży z producentem, z ModularHub, czy obie umowy równolegle dla różnych usług.

2. Czy ModularHub ma tylko pokazywać i pobierać prowizję, czy także kontrolować środki do czasu wykonania kamienia.

3. Czy transport zawsze organizuje producent, zawsze ModularHub, czy wybór jest częścią oferty.

4. Czy ModularHub zapewnia własnego operatora projektu przy każdym zamówieniu, tylko przy droższych pakietach, czy wyłącznie w sytuacji problemu.

5. Czy pierwszym rynkiem transakcyjnym ma być konsument w Polsce kupujący od polskiego producenta, czy od początku transakcja transgraniczna do Niemiec albo Holandii.

6. Czy duże zamówienia B2B korzystają z tego samego silnika projektu z inną konfiguracją, czy mają dostać oddzielny proces kontraktowy i logistyczny.

Moja rekomendacja na start to bezpośrednia umowa klienta z producentem, osobna umowa na transport wtedy, gdy wykonuje go zewnętrzna firma, jeden wspólny projekt w ModularHub oraz licencjonowany operator marketplace do płatności kamieni. ModularHub powinien zostać koordynatorem procesu i mediatorem, ale nie przyjmować odpowiedzialności generalnego wykonawcy bez osobnej decyzji biznesowej, zespołu operacyjnego i odpowiedniego ubezpieczenia.
