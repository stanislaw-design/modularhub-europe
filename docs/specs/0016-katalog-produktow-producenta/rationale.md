# 0016. Katalog produktów producenta: rationale

## Context

Dziś kreator producenta (spec [0008](../0008-pierwszy-projekt/index.md)) obsługuje dokładnie jeden szkic na producenta: zapisany w `localStorage` pod kluczem z NIP, nadpisywany przy każdym kolejnym wejściu, i czyszczony bezpowrotnie po kliknięciu „Zapisz projekt”. Nic nie zostaje: po zapisaniu producent nie ma gdzie zobaczyć tego, co dodał, ani dodać kolejnego produktu bez utraty poprzedniego.

Projekt jest w etapie Facade (pełny klikalny interfejs na danych przykładowych, prawdziwe zaplecze podłączane później) i świadomie bez logowania. To oznacza, że jedyna trwała pamięć, jaką producent ma między wizytami, to `localStorage` tej jednej przeglądarki, kluczowany NIP em przekazanym w adresie URL. Każda decyzja w tej specyfikacji musi działać w tych granicach, nie zakładać backendu ani sesji, których dziś nie ma.

W trakcie projektowania wyszły na jaw dwa twarde warunki brzegowe, których pierwotny opis funkcji w scope.md nie przewidywał:
1. Strony klienta (`/klient/wyniki` i dalej) są komponentami serwerowymi czytającymi wyłącznie plik z danymi przykładowymi (`lib/data/fixtures/projects.ts`). Serwer nigdy nie widzi `localStorage` przeglądarki producenta, więc „doklejenie” lokalnie dodanych produktów do widoku klienta może się zdarzyć wyłącznie po stronie przeglądarki, i tylko w tej samej przeglądarce, w której producent je dodał.
2. Ścieżka zapytania klienta (`/klient/zapytanie` i dalej: działka, oferta, realizacja) sprawdza wybrane identyfikatory projektów wyłącznie względem tego samego pliku z danymi przykładowymi po stronie serwera. Lokalnie dodany produkt nigdy tam nie przejdzie; naprawienie tego wymagałoby przebudowy czterech już gotowych, zweryfikowanych ekranów klienta, nieproporcjonalnie do tego zadania.

Inżynier poprosił o możliwość dodawania produktów „jak najszybciej”, w pełni klikalną, ale bez ostatecznej wersji i bez prawdziwych płatności. To ustawia próg: rozwiązanie ma być kompletne z punktu widzenia producenta (lista, dodawanie, edycja, usuwanie), a wszystko poza tym (prawdziwy backend, prawdziwe zdjęcia, prawdziwa integracja z listą klienta) zostaje świadomym, nazwanym uproszczeniem, nie ukrytym brakiem.

## Options considered

### Option 1: Rozszerzenie w przeglądarce (localStorage), z lokalnym podglądem u klienta

Rozbudowanie istniejącego wzorca `localStorage` per NIP o listę wielu produktów zamiast jednego szkicu, nowy siódmy krok kreatora zbierający dane sprzedażowe, osobny ekran edycji, i doklejanie lokalnie dodanych produktów do `/klient/wyniki` wyłącznie po stronie przeglądarki (bez ich udziału w ścieżce zapytania).

**Pros**:
- Zero nowej infrastruktury: żadnej bazy, żadnego logowania, żadnego API.
- Reużywa każdy istniejący wzorzec (klucz `localStorage` per NIP, zapis fail soft, kroki kreatora, Headless UI) zamiast wymyślać nowy.
- Daje namacalny efekt „koniec do końca” w jednej przeglądarce: dodaj produkt jako producent, zobacz go jako klient.

**Cons**:
- Katalog istnieje tylko w jednej przeglądarce; inna przeglądarka albo wyczyszczone dane = utrata dostępu.
- Lokalny podgląd u klienta jest tylko podglądem (bez możliwości zaznaczenia i wysłania zapytania), co trzeba jasno oznaczyć w interfejsie, inaczej wygląda na błąd.

### Option 2: Sam katalog producenta, bez podglądu u klienta

To samo rozszerzenie po stronie producenta (lista, dodawanie, edycja, usuwanie), ale bez próby doklejenia czegokolwiek do `/klient/wyniki` i bez siódmego kroku kreatora (dane sprzedażowe zostają w pełni mockowe, wyliczone, nie wpisywane przez producenta).

**Pros**:
- Najmniejszy możliwy zakres: nie dotyka żadnego ekranu klienta, mniej kodu, mniejsze ryzyko regresji.
- Unika mylącego „działa czasem” efektu (lokalny podgląd widoczny tylko w jednej przeglądarce).

**Cons**:
- Nie daje żadnego widocznego dowodu, że dodany produkt „istnieje” poza panelem producenta, co osłabia wartość demo obu ścieżek naraz.
- Ceny i dane sprzedażowe zostają w pełni zmyślone przez system, nie wpisane przez producenta, mniej realistyczne demo.

### Option 3: Poczekać na prawdziwy backend

Nie budować teraz nic ponad dzisiejszy jednorazowy szkic; potraktować wielokrotne dodawanie produktów jako część przyszłej, odsuniętej decyzji „prawdziwy model danych i baza” (Deferred w scope.md).

**Pros**:
- Zero dodatkowej pracy teraz; unika tymczasowego rozwiązania, które i tak trzeba będzie przepisać.

**Cons**:
- Nie odpowiada na wprost wyrażoną, pilną potrebę inżyniera („jak najszybciej”, „w pełni funkcjonalna”).
- Odsuwa realny, klikalny dowód koncepcji katalogu producenta bez uzasadnionego powodu poza „to nie ostateczne rozwiązanie”, co i tak dotyczy całego etapu Facade.

## Rationale

Wybrano Option 1. Inżynier wprost wybrał zarówno pełny zakres (lista plus dodawanie plus edycja plus usuwanie, nie tylko odblokowanie wielokrotnego dodawania) jak i doklejenie do widoku klienta, po tym jak przedstawiono mu oba twarde warunki brzegowe (serwer nie widzi `localStorage`, ścieżka zapytania nie przyjmie nieznanych identyfikatorów) i możliwe uproszczenia. Option 3 odrzucona, bo prosto sprzeczna z wyrażonym priorytetem czasowym; Option 2 pozostawałaby bezpieczniejszym wyborem, ale inżynier świadomie wybrał szerszy zakres po zrozumieniu kosztu i ograniczeń, więc respektujemy tę decyzję zamiast jej zawężać za niego.

Zakres uczciwie odzwierciedla to, co jest osiągalne bez backendu: katalog i podgląd u klienta działają w pełni w obrębie jednej przeglądarki, co pokrywa dokładnie scenariusz demo „jedna osoba pokazuje obie ścieżki” opisany w scope.md jako cel tego etapu, bez podejmowania decyzji, która i tak należy do przyszłego, odsuniętego tematu prawdziwego backendu.

**Rozważona i odrzucona alternatywa: zmienna modułowa po stronie serwera.** Zamiast `localStorage`, dodane produkty mogłyby żyć w zwykłej tablicy w module `lib/` po stronie serwera (mutowana przez server action), obok istniejących plików fixture. To rozwiązałoby oba warunki brzegowe naraz: każda przeglądarka widziałaby te same produkty, a ścieżka zapytania mogłaby je rozpoznać. Odrzucone z dwóch powodów specyficznych dla tego projektu: (1) serwer deweloperski Next.js resetuje stan modułu przy każdym hot reload po zmianie kodu, więc dodany produkt znikałby w trakcie tej samej sesji pracy nad kodem; (2) typowy cel wdrożenia takiej aplikacji (Vercel albo podobny hosting bezserwerowy) uruchamia wiele niezależnych instancji procesu, między którymi zmienna modułowa się nie synchronizuje, więc zapis w jednej instancji byłby niewidoczny w innej. `localStorage` per przeglądarka, choć węższy w zasięgu, jest przewidywalny w obu tych sytuacjach.
