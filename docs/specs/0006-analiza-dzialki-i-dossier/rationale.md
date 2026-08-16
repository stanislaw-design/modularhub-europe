# 0006. Analiza działki i dossier: rationale

## Context

Funkcja 8 w `docs/scope/scope.md` opisuje jednym zdaniem „ekran płatnej bramki”: opis zakresu, cena, przycisk zapłać (mock) i status wyniku z trzema wartościami (dopuszczone / warunkowo / niedopuszczone) z uzasadnieniem. To ma być pierwszy przypadek „udawanego kroku płatnego”, wzorzec, który funkcja 14 (domykanie luk u producenta) ma potem powtórzyć.

W trakcie rozmowy projektowej zamawiający doprecyzował, że chce, aby klient miał dostęp do tego kroku z czegoś w rodzaju panelu klienta, „żeby łatwiej mu tym zarządzać”. To rodzi napięcie: projekt jest na etapie Facade, bez logowania i bez trwałych kont (patrz `AGENTS.md`, sekcja Rules; prawdziwe logowanie i role jest w Deferred jako osobna, jeszcze nie podjęta decyzja). Prawdziwy „panel klienta” w zwykłym znaczeniu (historia, powrót następnego dnia) wymagałby konta.

> ⚠️ Uwaga projektowa: zamawiający poprosił o „panel klienta”, ale ten etap projektu świadomie nie ma logowania ani trwałych kont. Zbudowanie prawdziwego panelu (z historią, dostępnego po powrocie) oznaczałoby po cichu wprowadzenie kawałka logowania bez decyzji o tym, kiedy indziej odłożonej do Deferred. Rozwiązanie przyjęte w tej specyfikacji: panel bez logowania, tylko na czas wizyty, zasilany przez `projects` w URL (ten sam mechanizm co dzisiejsza strona zapytania), zamiast trwałego konta. To był wybór zamawiającego po jasnym postawieniu tego napięcia (patrz rozmowa projektowa), nie cichej decyzji.

Druga siła kształtująca decyzję: klient może mieć od 1 do 3 wybranych domów naraz (limit ustalony w spec 0005), a zamawiający zdecydował, że dopuszczenie działki liczy się osobno dla każdego domu, nie raz dla całej fizycznej działki. To oznacza, że jedna wizyta klienta obejmuje potencjalnie 3 niezależne bramki płatne, każdą z własną ceną, własnym stanem płatności i własnym wynikiem, przy współdzielonym jednym adresie działki.

Trzecia siła: to pierwszy „udawany krok płatny” w projekcie. Jego kształt (opis, cena, zapłać, przetwarzanie, wynik) nie jest tylko decyzją lokalną dla tego ekranu, staje się wzorcem, który funkcja 14 u producenta ma odtworzyć jeden do jednego (wprost tak mówi opis funkcji 14 w scope). Warto go więc zaprojektować świadomie, nie jako przypadkowy efekt uboczny jednego ekranu.

## Options considered

### Option 1: Jeden ekran bramki per dom, bez panelu

Dokładnie to, co opisuje dzisiejszy wiersz 8 w scope: klient trafia z potwierdzenia zapytania od razu na jedną bramkę płatną dla jednego, wcześniej wybranego domu (osobny adres URL na dom, bez wspólnego adresu działki, bez listy). Wariant bez nawet nowego adresu URL, bramki wbudowane wprost w istniejący stan potwierdzenia w `InquiryFlow` (spec 0005), mieści się w tej samej opcji i pada z tego samego powodu.

**Pros**:
- Najmniejszy możliwy zakres, najbliżej pierwotnego opisu funkcji w scope.
- Najszybsze do zbudowania, jeden nowy adres, jeden komponent.

**Cons**:
- Klient z 2 albo 3 wybranymi domami wpisuje adres działki od nowa przy każdym, bez żadnego wspólnego miejsca do zarządzania.
- Nie realizuje wprost tego, o co poprosił zamawiający: miejsca, gdzie „łatwiej mu zarządzać” kilkoma sprawdzeniami naraz.

### Option 2: Panel klienta (bez logowania) z rozwijaną bramką per dom (wybrane)

Nowy ekran `/pl/klient/dzialka`: jedno pole adresu na górze, lista domów z zapytania, każdy dom rozwija się w swoją własną bramkę płatną. Cały stan (adres, metraże, fazy płatności, wyniki) żyje w jednym drzewie komponentów klienckich, bez trwałości, bez logowania, znika po odświeżeniu, dokładnie jak dzisiejszy formularz kontaktowy w `InquiryFlow`.

**Pros**:
- Realizuje wprost prośbę o łatwiejsze zarządzanie kilkoma domami naraz, bez czekania na prawdziwe logowanie.
- Adres wpisany raz, metraż i wynik osobno per dom, stan przeżywa przechodzenie między domami w ramach jednej wizyty.
- Zero nowych zależności, reużywa `StatusPill`, `Card`, `Button`, `Input` i słownik statusów już ustalony w `EligibilityStatus`.

**Cons**:
- Szerszy zakres niż jednolinijkowy opis funkcji 8 w dzisiejszym scope, wymaga aktualizacji tego opisu przy najbliższym `/scope`.
- Bez prawdziwego logowania panel jest tylko na czas wizyty, klient nie wróci do niego następnego dnia z tymi samymi wynikami.

### Option 3: Panel z osobnym adresem URL per dom (bez rozwijania w miejscu)

Ten sam panel i wspólny adres działki co w opcji 2, ale klik w dom nawiguje na osobny adres `/pl/klient/dzialka/[projectId]` zamiast rozwijać wiersz w miejscu, bliżej dzisiejszego wzorca `/wyniki` → `/zapytanie` (dwie osobne, pełnoekranowe strony).

**Pros**:
- Spójne z istniejącym wzorcem pełnoekranowych faz z spec 0005.
- Każdy dom ma własny, potencjalnie udostępnialny adres URL.

**Cons**:
- Bez trwałego zapisu przejście na osobny adres i powrót do panelu gubi stan (adres, metraż, wynik) innych domów, chyba że przeniesie się go w całości do URL, co jest bardziej skomplikowane niż jeden wspólny komponent kliencki.
- Więcej stron do zbudowania i przetestować dla funkcji, która i tak jest tylko na czas wizyty.

## Rationale

Option 2 wygrywa, bo jako jedyna realizuje wprost to, o co poprosił zamawiający (miejsce, gdzie łatwiej zarządzać kilkoma domami naraz), bez wprowadzania prawdziwego logowania po cichu. Napięcie z brakiem kont (patrz Context) rozwiązuje się tym samym mechanizmem, którym projekt już dziś przenosi stan między ekranami bez bazy danych: parametrami URL (`projects`, `country`, `sizeMin`, `sizeMax`) plus nietrwałym stanem klienckim (dokładnie wzorzec `InquiryContact` z `InquiryFlow`), a nie nowym kawałkiem infrastruktury.

Option 3 (osobne adresy URL per dom) odrzucona, bo zamawiający wprost wybrał, że stan bramek ma przeżywać przechodzenie między domami w ramach jednej wizyty; bez trwałego zapisu jedyny sposób to trzymać wszystko w jednym drzewie komponentów, nie w osobnych stronach. Option 1 (bez panelu) odrzucona, bo nie odpowiada na wyraźną prośbę zamawiającego i zostawiłaby klienta z 3 domami bez żadnego wspólnego miejsca do zarządzania, mimo że dane wejściowe (adres działki) są takie same dla wszystkich trzech.
