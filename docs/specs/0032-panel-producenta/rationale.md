# 0032. Panel producenta: rationale

## Context

Producent dziś nie ma żadnego prawdziwego konta. Cała jego ścieżka (`/producent`, `/producent/produkty`, `/producent/projekt`, plus siedem innych ekranów pod `components/producent/`) działa dokładnie tak, jak opisuje `components/producent/AGENTS.md`: bez logowania, tożsamość producenta to sam NIP przenoszony w parametrach URL, a dane (rejestracja, produkty) żyją w `localStorage` przeglądarki, kluczowane tym NIP em. To był świadomy wybór z epiki Prototyp (spec 0016): zero backendu, szybka makieta.

Tymczasem realny model danych już istnieje od spec 0018 (tabela `producer`, `product`, `document`, `inquiry`) i realne logowanie linkiem magicznym (Auth.js, Resend) już działa dla obu ról, klienta i producenta, od spec 0023. Formularz `ProducerRegistrationForm` i akcja `registerProducer` (`lib/auth-registration.ts`) są gotowe i realnie zapisują do bazy. Problem: nic po stronie zalogowanego producenta tego nie odczytuje. `requirePanelClientSession` (wzorzec klienta, spec 0024) przekierowuje rolę `producer` prosto na `/producent` — ale `/producent` to wciąż stary mockowy formularz rejestracji NIP, który nie wie nic o sesji. Zalogowany, prawdziwy producent ląduje więc dokładnie tam, gdzie ląduje dziś każdy anonimowy gość.

To nie jest przeoczenie: `docs/scope/produkcja.md` (funkcja 7) świadomie odłożył samoobsługową rejestrację producenta 2026-09-02, potwierdzone ponownie 2026-09-07 ("realny zapis producenta do bazy to osobna, przyszła decyzja, nie blokuje już tej funkcji"), na rzecz ręcznego zasiewania pierwszych producentów przez Neon MCP, żeby skupić się najpierw na kliencie przed inwestorami. Ta decyzja jest tu świadomie cofana na wyraźną prośbę zamawiającego (odpowiedź podczas tej sesji `/architect`): panel producenta wchodzi do zakresu teraz, przed resztą Slice 3 i dalej.

Zakres tej decyzji jest celowo węższy niż "cały producent na realnym zapleczu". Trzy ekrany (gotowość eksportowa, weryfikacja firmy, realizacje/wypłata) czytają dziś globalne, niescopowane fixture'y (`lib/data/export-readiness.ts`, `lib/data/fulfillment.ts`, `lib/data/producer-mock-projects.ts`) i odpowiadają wprost trzem osobnym, już zaplanowanym, wciąż niezaprojektowanym przyszłym funkcjom w `produkcja.md` (11 Realna oferta, 16 Realizacja i statusy, 19 Weryfikacja firmy). Wciągnięcie ich tutaj oznaczałoby zdublowanie trzech przyszłych decyzji w jednej. Ta funkcja buduje fundament (sesja, konto) i to, co realny model danych już dziś udźwignie bez czekania na tamte trzy decyzje: katalog produktów (tabela `product` już realna, `getProductsForProducer` już istnieje w kodzie, tylko nieużywany) i podgląd własnych zapytań (`inquiry`/`inquiryItem` już realne).

## Options considered

### Option 1: Napraw punktowo dzisiejszy mock (NIP + localStorage)

Zostań przy identyfikacji przez NIP w URL, dodaj tylko wygodę (np. formularz "wpisz NIP, zobacz swój katalog" — dokładnie to, co ta sesja zbudowała chwilę wcześniej jako doraźną łatkę na `/producent`).

**Pros**:
- Zero migracji, zero ryzyka regresji istniejącego demo.
- Bardzo szybkie do zbudowania.

**Cons**:
- Nie rozwiązuje właściwego problemu: NIP w URL nie jest kontem, każdy znający NIP widzi ten sam katalog, dane żyją tylko w jednej przeglądarce.
- Prosto sprzeczne z tym, o co poprosił zamawiający (prawdziwe konto, prawdziwe logowanie, prawdziwe dane).
- Nie daje żadnej drogi do przyszłego przekazania zamówień/płatności realnym producentom (cel, który zamawiający wprost nazwał).

### Option 2: Strangler, nowy panel obok starego mocka

Zbuduj `/producent/panel/*` na sesji i realnej bazie, zostaw stary `/producent`, `/producent/produkty`, `/producent/projekt` (mock, NIP, `localStorage`) nietknięte i działające równolegle; retire mocka jako osobne, późniejsze zadanie.

**Pros**:
- Klasycznie bezpieczniejsze dla systemu produkcyjnego: stara ścieżka dalej działa, gdyby coś w nowej nie wypaliło.
- Można wdrażać etapami.

**Cons**:
- Dwie równoległe tożsamości producenta w tym samym repo (jedna po NIP, jedna po sesji) to realne ryzyko pomyłki w każdym kolejnym `/develop` na tym obszarze, i dłużej matoucy `AGENTS.md`.
- Ten produkt nie jest dziś produkcyjny (etap Facade przed inwestorami, zero prawdziwych zewnętrznych użytkowników na starej ścieżce) — koszt strangler pattern (dwa równoległe systemy) nie ma tu odpowiadającej korzyści, bo nie ma nic do bezpiecznego "przełączania ruchu".
- Wprost odrzucone przez zamawiającego w tej sesji projektowej na rzecz Option 3.

### Option 3: Zastąp bezpośrednio, usuń mocka w tym samym buildzie

Zbuduj `/producent/panel/*` na sesji i realnej bazie, jednocześnie usuwając stary mockowy `/producent`, `/producent/produkty`, `/producent/projekt`, `lib/producer-products.ts`, `lib/producer-project-draft.ts`, `lib/producer-registration-storage.ts`, `lib/local-client-projects.ts` i powiązany podgląd na `/klient/wyniki` (spec 0016 AC-11, teraz w pełni zastąpiony realną publikacją).

**Pros**:
- Jedna, spójna ścieżka producenta w repo od razu po buildzie — brak ambiwalencji, o co pyta każdy kolejny `/develop`/`/check`.
- Realny model danych (0018/0022) już jest gotowy do tego pod spodem, nie trzeba nic w nim zmieniać.
- Zgodne z jawną decyzją zamawiającego w tej sesji.

**Cons**:
- Większy build za jednym razem: usuwa pliki, przepisuje testy jednostkowe i e2e, które dziś celują w mocka (`pierwszy-projekt.spec.ts`, `rejestracja-producenta.spec.ts`).
- Zero drogi odwrotu poza rewertem całego commitu/PR, gdyby coś w nowej ścieżce nie zadziałało na produkcji tego demo.

## Rationale

Option 3 wygrywa, bo "produkcyjny system" w rozumieniu ostrzeżenia o strangler pattern (agent-prompt.md, Expert opinions) tu po prostu nie istnieje: stary `/producent` to świadomie tymczasowa makieta epiki Prototyp, bez jednego prawdziwego zewnętrznego użytkownika, który mógłby ucierpieć na przełączeniu. Koszt utrzymywania dwóch równoległych tożsamości producenta (Option 2) przewyższa tu korzyść, którą strangler normalnie daje (bezpieczne przełączanie żywego ruchu) — nie ma żywego ruchu do przełączania. Zamawiający wprost potwierdził ten kierunek w rozmowie projektowej: stary formularz rejestracji NIP "był przykładowy", nowy proces (konto + mail) go zastępuje, jedyny element, który świadomie zostaje, to sam kreator projektu (UI), przepięty pod nowe dane.

Zakres jest zawężony do tego, co realny model danych już dźwiga (konto, katalog, zapytania tylko do odczytu) właśnie po to, żeby nie zdublować trzech już zaplanowanych, osobnych przyszłych decyzji (funkcje 11, 16, 19 w `produkcja.md`). Traktowanie trzech mockowych ekranów (gotowość eksportowa, weryfikacja firmy, realizacje) jako wyraźnie oznaczonych "wersja demo" zamiast ukrywania ich zachowuje dzisiejszą wartość demo dla inwestorów (widać całą ścieżkę end to end), bez udawania, że to już czyjeś realne dane.

## References

Brak (REFERENCES_LEVEL: none — ten spec w całości reużywa już wybranego stosu, nic nowego do udokumentowania).
