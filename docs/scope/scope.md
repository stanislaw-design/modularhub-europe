# Scope: ModularHub Europe

Platforma prowadząca transgraniczny zakup domu modułowego w Europie: łączy klienta kupującego dom i producenta, który go wytwarza, w jedną kontrolowaną ścieżkę od wyceny do odbioru.

**Build approach:** Facade (najpierw pełny, klikalny interfejs na danych przykładowych; prawdziwe zaplecze podłączane ekran po ekranie w kolejnym etapie).
**Weight profile:** ekrany prototypu głównie lean/medium; podłączenie prawdziwych danych, płatności i silnika zgodności w kolejnym etapie jest full.

Ten pierwszy etap jest świadomie prototypem demonstracyjnym: żaden ekran nic trwale nie zapisuje, logowania nie ma, płatność jest makietą. Cel to szybki, przekonujący pokaz obu ścieżek (klienta i producenta) na realnym brandingu, żeby dało się to komuś pokazać i zebrać reakcję, zanim zainwestujemy w prawdziwe zaplecze.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack i architektura | Foundation | in-progress |
| 2 | Standardy kodu i narzędzia | Foundation | planned |
| 3 | System projektowy i fundament UI | Foundation | in-progress |
| 4 | Strona startowa (hero marki) | Prototyp | planned |
| 5 | Kreator ceny (klient) | Prototyp | planned |
| 6 | Wyniki z filtrem prawnym (klient) | Prototyp | planned |
| 7 | Zapytanie / shortlista (klient) | Prototyp | planned |
| 8 | Analiza działki i dossier (klient) | Prototyp | planned |
| 9 | Oferta wiążąca (klient) | Prototyp | planned |
| 10 | Realizacja — oś statusów (klient) | Prototyp | planned |
| 11 | Rejestracja (producent) | Prototyp | planned |
| 12 | Pierwszy projekt (producent) | Prototyp | planned |
| 13 | Gotowość eksportowa (producent) | Prototyp | planned |
| 14 | Domykanie luk (producent) | Prototyp | planned |
| 15 | Zapytania i oferty (producent) | Prototyp | planned |
| 16 | Realizacja i wypłata (producent) | Prototyp | planned |

## Foundations

### 1. Stack i architektura
Wybór stacku technicznego i uruchomienie pustego, działającego szkieletu projektu, na którym stanie cały prototyp.
**Done when:** stack jest zapisany w specyfikacji, a pusty szkielet uruchamia się lokalnie i przechodzi build.
- [x] Zdecyduj stack (spec): [0001](../specs/0001-stack-i-architektura/index.md)
- [x] Uruchom pusty szkielet: `npm run build` przechodzi lokalnie, `npm run dev` serwuje `/` → przekierowanie na `/pl` (kod w `app/`, `proxy.ts`, `package.json`)

### 2. Standardy kodu i narzędzia
Spisanie konwencji i instalacja lintera, formattera oraz pre-commit z realnie uruchomionego projektu.
**Done when:** główny `AGENTS.md` odzwierciedla rzeczywisty stack, a lint/format/pre-commit przechodzą czysto.
- [ ] Spisz konwencje i narzędzia: `/audit`

### 3. System projektowy i fundament UI
Warstwa wizualna, siatka, typografia, komponenty bazowe i dane przykładowe (mock fixtures) dla wszystkich ekranów prototypu. Punktem wyjścia jest już gotowy `docs/brand-guidelines-v3.md` (paleta, typografia, siatka, język 3D) oraz tokeny w `assets/tokens/brand-v3-tokens.json` — nie projektujemy marki od zera, tylko przekładamy istniejący system na komponenty produktowe i płaskie logo v2 z `assets/brand/logo/v2/`.
**Done when:** `design.md` pokrywa typografię/kolor/spacing/komponenty na bazie istniejących wytycznych marki, komponenty bazowe obsługują focus i klawiaturę, a routing i dane mockowe (projekty, ceny, wymagania krajowe, statusy) są gotowe do użycia przez wszystkie ekrany.
- [x] Zaprojektuj (spec): [0002](../specs/0002-system-projektowy-i-fundament-ui/index.md)
- [x] Zbuduj: `/develop system projektowy i fundament ui` (kod w `app/globals.css`, `app/fonts.ts`, `components/ui/`, `lib/data/`, `app/[locale]/klient/`, `app/[locale]/producent/`, `docs/design.md`)
  - [x] Tokeny i typografia: skala typografii, moduł odstępów i kontener w `@theme`, czcionki przez `next/font/google`, `docs/design.md`
  - [x] Biblioteka komponentów bazowych: Button, pola formularza (Input/Select/Textarea/Checkbox/Radio), Label, StatusPill, Card, typografia (Heading/Text/DataText), layout (Container/Grid/Stack)
  - [x] Dane mockowe i routing: `Project`/`Country`/`EligibilityByCountry` w `lib/data/`, funkcje dostępowe asynchroniczne, puste segmenty `klient/` i `producent/` z powłoką (skip link + `<main>`)

## Prototyp: flow klienta

### 4. Strona startowa (hero marki)
Pierwszy ekran całego demo: hero na logo v3 display, główny claim „One project. Different rules. One clear path.” i jedno CTA prowadzące do kreatora. Pierwsze realne zastosowanie marki v3 w produkcie.
**Done when:** strona renderuje się z logo v3, claimem i jednym CTA zgodnie z zasadami tła i pola ochronnego z wytycznych marki; brak drugorzędnych komunikatów odciągających od CTA.
- [ ] Zaprojektuj (spec): `/architect strona startowa`

### 5. Kreator ceny (klient)
Formularz: kraj, działka, metry, sypialnie, budżet, termin — bez zakładania konta. Wyjściem jest cena, nie prośba o kontakt. Ustala wzorzec formularza używany dalej w prototypie.
**Done when:** po wypełnieniu formularza użytkownik widzi szacunkową cenę na danych mockowych, bez logowania i bez pola na telefon/e-mail.
- [ ] Zaprojektuj (spec): `/architect kreator ceny`

### 6. Wyniki z filtrem prawnym (klient)
Lista pokazuje wyłącznie projekty oznaczone jako dopuszczalne w kraju klienta (na danych mockowych), z ceną jako widełki obejmującą dom, transport i montaż. Ustala wzorzec listy/karty i widełek cenowych używany dalej.
**Done when:** lista filtruje się po kraju z kreatora, każda karta pokazuje widełki cenowe, a projekty niedopuszczalne w danym kraju się nie pokazują.
- [ ] Zaprojektuj (spec): `/architect wyniki z filtrem prawnym`

### 7. Zapytanie / shortlista (klient)
Klient wybiera 2–3 projekty z wyników i wysyła jedno zapytanie w jednym, narzuconym przez platformę szablonie (bez realnego wysyłania — mock potwierdzenia).
**Done when:** można zaznaczyć 2–3 projekty i zobaczyć ekran potwierdzenia zapytania z tym samym szablonem dla każdego projektu.
- [ ] Zbuduj: `/develop zapytanie / shortlista`

### 8. Analiza działki i dossier (klient)
Ekran płatnej bramki: opis zakresu analizy, cena, przycisk „zapłać” prowadzący do makiety płatności (bez realnej bramki płatniczej) i status wyniku (dopuszczone / warunkowo / niedopuszczone z powodem). Ustala wzorzec „udawanego kroku płatnego” używany też u producenta.
**Done when:** widać cenę usługi, makietowy krok płatności bez realnej integracji, i jeden z trzech statusów wyniku z uzasadnieniem tekstowym.
- [ ] Zaprojektuj (spec): `/architect analiza działki i dossier`

### 9. Oferta wiążąca (klient)
Jedna cena końcowa (dom + transport + montaż) bez listy przewoźników do wyboru — jako pojedyncza pozycja.
**Done when:** ekran pokazuje jedną cenę końcową i jeden przycisk akceptacji, bez wyboru przewoźnika.
- [ ] Zbuduj: `/develop oferta wiążąca`

### 10. Realizacja — oś statusów (klient)
Oś czasu etapów: produkcja, transport, montaż, odbiór, gwarancja, z datą i kompletem dokumentów przy każdym etapie (dane mockowe). Ustala wzorzec osi statusu używany też u producenta.
**Done when:** widać wszystkie pięć etapów w kolejności, aktualny etap jest wyróżniony, a przy każdym etapie jest data i lista dokumentów.
- [ ] Zaprojektuj (spec): `/architect realizacja — oś statusów`

## Prototyp: flow producenta

### 11. Rejestracja (producent)
Krótki formularz: NIP, kraje dostawy, technologia. Bez logowania — od razu prowadzi do dodania pierwszego projektu.
**Done when:** wypełnienie trzech pól formularza prowadzi do ekranu pierwszego projektu.
- [ ] Zbuduj: `/develop rejestracja producenta`

### 12. Pierwszy projekt (producent)
Formularz z polami technicznymi (układ ścian, izolacja, współczynniki przenikania ciepła, klasa okien, wentylacja, źródło ciepła, odporność ogniowa i wiatrowa) oraz makieta wgrywania rzutów i zdjęć (bez realnego zapisu plików). Ustala wzorzec makiety uploadu.
**Done when:** wszystkie pola techniczne z listy są w formularzu, pole wgrywania pliku pokazuje wybrany plik bez trwałego zapisu, a zapisanie prowadzi do ekranu gotowości eksportowej.
- [ ] Zaprojektuj (spec): `/architect pierwszy projekt`

### 13. Gotowość eksportowa (producent)
Mapa/lista krajów ze statusem (gotowe / brakuje kilku rzeczy / niedopuszczalne) i konkretną listą braków przy statusie pośrednim, na danych mockowych. Zawiera widoczne zastrzeżenie, że to nie jest opinia prawna.
**Done when:** każdy kraj z mocka pokazuje jeden z trzech statusów, status pośredni rozwija listę konkretnych braków, a zastrzeżenie prawne jest widoczne na ekranie.
- [ ] Zaprojektuj (spec): `/architect gotowość eksportowa`

### 14. Domykanie luk (producent)
Dla kraju ze statusem pośrednim: wybór między samodzielnym wgraniem dokumentów a zakupem pakietu (makieta płatności, ten sam wzorzec co analiza działki klienta).
**Done when:** z listy braków można przejść do ekranu wyboru, a wybór „kup pakiet” prowadzi do tej samej makiety płatności co u klienta.
- [ ] Zbuduj: `/develop domykanie luk`

### 15. Zapytania i oferty (producent)
Lista przychodzących zapytań (na danych mockowych) z możliwością złożenia oferty w narzuconym szablonie; pozycja transportu jest wypełniona automatycznie i niemożliwa do edycji.
**Done when:** producent widzi listę zapytań, może otworzyć formularz oferty w tym samym szablonie co u wszystkich producentów, a pole transportu jest tylko do odczytu.
- [ ] Zbuduj: `/develop zapytania i oferty`

### 16. Realizacja i wypłata (producent)
Ten sam wzorzec osi statusu co w kroku klienta (produkcja, transport, montaż, odbiór), plus ekran makiety weryfikacji firmy przed „pierwszą wypłatą”.
**Done when:** oś statusu wygląda spójnie z widokiem klienta dla tego samego zamówienia, a ekran weryfikacji firmy pokazuje listę wymaganych dokumentów bez realnej weryfikacji.
- [ ] Zbuduj: `/develop realizacja i wypłata`

## Deferred
Poza zakresem tego pierwszego etapu, świadomie odłożone do podłączenia prawdziwego zaplecza po ekranie.
- **Prawdziwe logowanie i role**: konta klienta i producenta zamiast dwóch osobnych widoków demo · needs a decision
- **Prawdziwy model danych i baza**: trwałe zapisywanie projektów, zapytań, ofert i statusów · needs a decision · full weight
- **Prawdziwe płatności**: realna integracja płatnicza za analizę działki i domykanie luk · needs a decision · full weight
- **Prawdziwe wgrywanie i przechowywanie plików**: rzuty, zdjęcia, dokumenty producenta · needs a decision
- **Prawdziwy silnik zgodności**: rzeczywiste, aktualizowane wymagania prawne per kraj zamiast danych mockowych · needs a decision · full weight
- **Prawdziwa wycena transportu**: integracja z siecią przewoźników zamiast stałych widełek · needs a decision · full weight
- **Powiadomienia**: e-mail/push przy zmianie statusu · needs a decision
- **Panel administracyjny**: zarządzanie producentami, projektami i zapytaniami · needs a decision
- **Wersje językowe (EN/DE)**: rozszerzenie z samego polskiego · needs a decision

## Legend

**Pole decyzyjne.** Każda funkcja ma dokładnie jedno, podzadanie kończące się na „(spec)”. Reszta pól to zadania wykonawcze.

**Cykl życia funkcji:**

| Stan | Ustawia | Funkcja pokazuje |
|---|---|---|
| `planned` · needs a decision | `/scope` | jedno pole: `Zaprojektuj (spec): /architect <funkcja>` |
| `in-progress` (zaprojektowana) | `/architect` przy zapisaniu spec | „Zaprojektuj” odhaczone; spec podlinkowany; `Zbuduj: /develop <funkcja>` z listą kamieni milowych ze spec |
| `in-progress` (budowana) | `/develop` | kamienie milowe odhaczane po kolei |
| `in-progress` (zweryfikowana) | `/check verify` | „Zbuduj” i kamienie milowe odhaczone; „Zweryfikuj” odhaczone |
| `done` | `/test`, potem `/sync` | wszystkie pola odhaczone |

- **Następny krok** = pierwsze nieodhaczone pole (zawsze polecenie albo śledzony kamień milowy).
- **needs a decision** = najpierw `/architect`, inaczej od razu `/develop`.
- **Status**: `planned` → `in-progress` → `done`, plus `dropped` (wypadło z zakresu, zachowane dla historii).
- **Znacznik wagi** `· full` = warto zrobić świeży `/check review`; `lean`/`medium` bez znacznika.
