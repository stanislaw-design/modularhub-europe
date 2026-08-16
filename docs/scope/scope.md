# Scope: ModularHub Europe

Platforma prowadząca transgraniczny zakup domu modułowego w Europie: łączy klienta kupującego dom i producenta, który go wytwarza, w jedną kontrolowaną ścieżkę od wyceny do odbioru.

**Build approach:** Facade (najpierw pełny, klikalny interfejs na danych przykładowych; prawdziwe zaplecze podłączane ekran po ekranie w kolejnym etapie).
**Weight profile:** ekrany prototypu głównie lean/medium; podłączenie prawdziwych danych, płatności i silnika zgodności w kolejnym etapie jest full.

Ten pierwszy etap jest świadomie prototypem demonstracyjnym: żaden ekran nic trwale nie zapisuje, logowania nie ma, płatność jest makietą. Cel to szybki, przekonujący pokaz obu ścieżek (klienta i producenta) na realnym brandingu, żeby dało się to komuś pokazać i zebrać reakcję, zanim zainwestujemy w prawdziwe zaplecze.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack i architektura | Foundation | done |
| 2 | Standardy kodu i narzędzia | Foundation | planned |
| 3 | System projektowy i fundament UI | Foundation | done |
| 4 | Strona startowa (hero marki) | Prototyp | done |
| 5 | Kreator ceny (klient) | Prototyp | dropped |
| 6 | Wyniki z filtrem prawnym (klient) | Prototyp | done |
| 7 | Zapytanie / shortlista (klient) | Prototyp | done |
| 8 | Analiza działki i dossier (klient) | Prototyp | done |
| 9 | Oferta wiążąca (klient) | Prototyp | done |
| 10 | Realizacja — oś statusów (klient) | Prototyp | done |
| 11 | Rejestracja (producent) | Prototyp | in-progress |
| 12 | Pierwszy projekt (producent) | Prototyp | done |
| 13 | Gotowość eksportowa (producent) | Prototyp | done |
| 14 | Domykanie luk (producent) | Prototyp | done |
| 15 | Zapytania i oferty (producent) | Prototyp | done |
| 16 | Realizacja i wypłata (producent) | Prototyp | in-progress |

## Foundations

### 1. Stack i architektura · done
Wybór stacku technicznego i uruchomienie pustego, działającego szkieletu projektu, na którym stanie cały prototyp.
**Done when:** stack jest zapisany w specyfikacji, a pusty szkielet uruchamia się lokalnie i przechodzi build.
- [x] Zdecyduj stack (spec): [0001](../specs/0001-stack-i-architektura/index.md)
- [x] Uruchom pusty szkielet: `npm run build` przechodzi lokalnie, `npm run dev` serwuje `/` → przekierowanie na `/pl` (kod w `app/`, `proxy.ts`, `package.json`)

### 2. Standardy kodu i narzędzia
Spisanie konwencji i instalacja lintera, formattera oraz pre-commit z realnie uruchomionego projektu.
**Done when:** główny `AGENTS.md` odzwierciedla rzeczywisty stack, a lint/format/pre-commit przechodzą czysto.
- [ ] Spisz konwencje i narzędzia: `/audit`

### 3. System projektowy i fundament UI · done
Warstwa wizualna, siatka, typografia, komponenty bazowe i dane przykładowe (mock fixtures) dla wszystkich ekranów prototypu. Punktem wyjścia jest już gotowy `docs/brand-guidelines-v3.md` (paleta, typografia, siatka, język 3D) oraz tokeny w `assets/tokens/brand-v3-tokens.json` — nie projektujemy marki od zera, tylko przekładamy istniejący system na komponenty produktowe i płaskie logo v2 z `assets/brand/logo/v2/`.
**Done when:** `design.md` pokrywa typografię/kolor/spacing/komponenty na bazie istniejących wytycznych marki, komponenty bazowe obsługują focus i klawiaturę, a routing i dane mockowe (projekty, ceny, wymagania krajowe, statusy) są gotowe do użycia przez wszystkie ekrany.
- [x] Zaprojektuj (spec): [0002](../specs/0002-system-projektowy-i-fundament-ui/index.md)
- [x] Zbuduj: `/develop system projektowy i fundament ui` (kod w `app/globals.css`, `app/fonts.ts`, `components/ui/`, `lib/data/`, `app/[locale]/klient/`, `app/[locale]/producent/`, `docs/design.md`)
  - [x] Tokeny i typografia: skala typografii, moduł odstępów i kontener w `@theme`, czcionki przez `next/font/google`, `docs/design.md`
  - [x] Biblioteka komponentów bazowych: Button, pola formularza (Input/Select/Textarea/Checkbox/Radio), Label, StatusPill, Card, typografia (Heading/Text/DataText), layout (Container/Grid/Stack)
  - [x] Dane mockowe i routing: `Project`/`Country`/`EligibilityByCountry` w `lib/data/`, funkcje dostępowe asynchroniczne, puste segmenty `klient/` i `producent/` z powłoką (skip link + `<main>`)

## Prototyp: flow klienta

### 4. Strona startowa (hero marki) · done
Pierwszy ekran całego demo: hero na logo v3 display, główny claim „One project. Different rules. One clear path.” i jedno CTA prowadzące do kreatora. Pierwsze realne zastosowanie marki v3 w produkcie.
**Done when:** strona renderuje się z logo v3, claimem i jednym CTA zgodnie z zasadami tła i pola ochronnego z wytycznych marki; brak drugorzędnych komunikatów odciągających od CTA.

> ⚠️ Opis funkcji i „Done when” powyżej pochodzą z pierwotnego planu i są nieaktualne: spec [0003](../specs/0003-strona-startowa/index.md) zastępuje jedno CTA selektorem (kraj plus widełki metrażu) prowadzącym wprost do wyników, dodaje sekcje „Polecane domy” i „Jak to działa”, i usuwa zależność od kreatora ceny. Zaktualizuj ten opis i „Done when” przy najbliższym `/scope`.

- [x] Zaprojektuj (spec): [0003](../specs/0003-strona-startowa/index.md)
- [x] Zbuduj: `/develop strona startowa` (kod w `lib/data/types.ts`, `lib/data/fixtures/projects.ts`, `lib/data/projects.ts`, `lib/size-thresholds.ts`, `next.config.ts`, `components/klient/`, `app/[locale]/klient/layout.tsx`, `app/[locale]/klient/page.tsx`, `app/[locale]/page.tsx`)
  - [x] Dane i konfiguracja: pole `featured` na `Project`, `getFeaturedProjects()`, `images.remotePatterns` w `next.config.ts` (satisfies AC-5)
  - [x] Nagłówek i routing: komponent nagłówka (logo v2, link „Zostań producentem”) w `klient/layout.tsx`, strona pod `klient/page.tsx`, przekierowanie korzenia po `locale` (satisfies AC-1)
  - [x] Hero z selektorem: logo v3 display, nagłówek zorientowany na wyszukiwanie, pola Kraj/od/do, walidacja i nawigacja do wyników (satisfies AC-2, AC-3, AC-4, AC-9)
  - [x] Polecane domy i Jak to działa: siatka kart z linkiem do wyników, sekcja 4 kroków (satisfies AC-5, AC-6, AC-7)
  - [x] Dostępność: jeden H1, kolejność fokusa, WCAG 2.2 AA (satisfies AC-8)
- [x] Zweryfikuj: `/check verify strona startowa`
- [x] Testuj: `/test strona startowa`

### 5. Kreator ceny (klient) · dropped
Osobny ekran formularza (kraj, działka, metry, sypialnie, budżet, termin → szacunkowa cena) wypadł z zakresu. Zastąpiony krótkim selektorem w hero strony startowej (kraj plus widełki metrażu), prowadzącym wprost do dedykowanej strony przeglądania ofert (funkcja 6), wzorem serwisów rezerwacyjnych (Airbnb, wakacje.pl, otomoto.pl/osobowe).
Decyzja zapisana w spec [0003](../specs/0003-strona-startowa/index.md), potwierdzona przez zamawiającego 2026-08-13.

### 6. Wyniki z filtrem prawnym (klient) · done
Dedykowana strona przeglądania ofert, wzorem otomoto.pl/osobowe: po wypełnieniu selektora w hero (kraj, opcjonalnie widełki metrażu od/do) użytkownik trafia tu z listą projektów dopuszczalnych w jego kraju (na danych mockowych), każdy jako karta z widełkami cenowymi obejmującymi dom, transport i montaż. Ustala wzorzec listy/karty i widełek cenowych używany dalej. Kontrakt parametrów URL (`country`, `sizeMin`, `sizeMax`) ustalony w spec [0003](../specs/0003-strona-startowa/index.md); brak `country` oznacza brak filtra prawnego, nie błąd.
**Done when:** strona pod `/pl/klient/wyniki` filtruje listę po `country` (gdy obecny) i widełkach `sizeMin`/`sizeMax` (gdy obecne), każda karta pokazuje widełki cenowe, projekty niedopuszczalne w danym kraju się nie pokazują, a nieprawidłowy ręcznie wpisany `country`/rozmiar jest łagodnie ignorowany (traktowany jak brak), nie pokazuje błędu.
- [x] Zaprojektuj (spec): [0004](../specs/0004-wyniki-z-filtrem-prawnym/index.md)
- [x] Zbuduj: `/develop wyniki z filtrem prawnym` (kod w `lib/results-filters.ts`, `lib/data/projects.ts`, `lib/size-thresholds.ts`, `app/[locale]/klient/wyniki/page.tsx`, `components/klient/SearchSegment.tsx`, `components/klient/ResultsFilterBar.tsx`, `components/klient/ResultsHeader.tsx`, `components/klient/ResultCard.tsx`, `components/klient/EmptyResults.tsx`)
  - [x] Dane i parsowanie filtra: `parseResultsSearchParams()`, rozszerzony `getProjects()` o `sizeMin`/`sizeMax`, nowy `getEligibilityByCountry()` (satisfies AC-2, AC-3, AC-4, AC-5, AC-6, AC-7)
  - [x] Strona i pasek filtra: `app/[locale]/klient/wyniki/page.tsx`, `ResultsFilterBar` (na wydzielonym `SearchSegment`) (satisfies AC-1, AC-9, AC-11, AC-12)
  - [x] Komponenty listy: `ResultsHeader`, `ResultCard`, `EmptyResults`, osadzenie `CategoryFilterBar` (satisfies AC-7, AC-8, AC-9, AC-10, AC-13)
  - [x] Dostępność: jeden H1, kolejność fokusa, WCAG 2.2 AA (satisfies AC-14)
- [x] Zweryfikuj: `/check verify wyniki z filtrem prawnym`
- [x] Testuj: `/test wyniki z filtrem prawnym`

### 7. Zapytanie / shortlista (klient) · done
Klient wybiera 2–3 projekty z wyników i wysyła jedno zapytanie w jednym, narzuconym przez platformę szablonie (bez realnego wysyłania — mock potwierdzenia).
**Done when:** można zaznaczyć 2–3 projekty i zobaczyć ekran potwierdzenia zapytania z tym samym szablonem dla każdego projektu.

> ⚠️ Opis funkcji i „Done when” powyżej pochodzą z pierwotnego planu i są nieaktualne: spec [0005](../specs/0005-zapytanie-shortlista/index.md) doprecyzowuje zakres na 1 do 3 projektów (nie 2 do 3) i dodaje krok formularza kontaktowego przed potwierdzeniem. Zaktualizuj ten opis i „Done when” przy najbliższym `/scope`.

- [x] Zaprojektuj (spec): [0005](../specs/0005-zapytanie-shortlista/index.md)
- [x] Zbuduj: `/develop zapytanie / shortlista` (kod w `lib/inquiry.ts`, `components/klient/ResultCard.tsx`, `components/klient/ResultsSelection.tsx`, `components/klient/ShortlistActionBar.tsx`, `app/[locale]/klient/wyniki/page.tsx`, `app/[locale]/klient/zapytanie/page.tsx`, `components/klient/InquiryFlow.tsx`, `components/klient/InquiryConfirmationCard.tsx`)
  - [x] Dane i parsowanie zapytania: `lib/inquiry.ts` (`parseInquiryProjectIds()`, `InquiryContact`) (satisfies AC-5)
  - [x] Zaznaczanie na wynikach: checkbox na `ResultCard`, `ResultsSelection`, `ShortlistActionBar`, osadzenie w `wyniki/page.tsx` (satisfies AC-1, AC-2, AC-3, AC-4)
  - [x] Strona zapytania i formularz kontaktowy: `app/[locale]/klient/zapytanie/page.tsx`, faza `form` w `InquiryFlow` (satisfies AC-5, AC-6)
  - [x] Potwierdzenie i szablon: blok szablonu na projekt, link „Wróć do wyników” (satisfies AC-7, AC-8)
  - [x] Dostępność: jeden H1, kolejność fokusa, WCAG 2.2 AA (satisfies AC-9)
- [x] Zweryfikuj: `/check verify zapytanie / shortlista`
- [x] Testuj: `/test zapytanie / shortlista`

### 8. Analiza działki i dossier (klient) · done
Ekran płatnej bramki: opis zakresu analizy, cena, przycisk „zapłać” prowadzący do makiety płatności (bez realnej bramki płatniczej) i status wyniku (dopuszczone / warunkowo / niedopuszczone z powodem). Ustala wzorzec „udawanego kroku płatnego” używany też u producenta.
**Done when:** widać cenę usługi, makietowy krok płatności bez realnej integracji, i jeden z trzech statusów wyniku z uzasadnieniem tekstowym.
- [x] Zaprojektuj (spec): [0006](../specs/0006-analiza-dzialki-i-dossier/index.md)
- [x] Zbuduj: `/develop analiza działki i dossier` (kod w `lib/data/types.ts`, `lib/data/fixtures/plot-analysis.ts`, `lib/data/plot-analysis.ts`, `lib/pricing.ts`, `app/[locale]/klient/dzialka/page.tsx`, `components/klient/PlotDossierPanel.tsx`, `components/klient/PlotAnalysisRow.tsx`, `components/klient/InquiryFlow.tsx`)
  - [x] Dane i cena: fixture `PlotAnalysisResult`, `getPlotAnalysisResult()`, stała cena w `lib/pricing.ts` (satisfies AC-3, AC-5)
  - [x] Panel i routing: `app/[locale]/klient/dzialka/page.tsx`, `PlotDossierPanel` (satisfies AC-1, AC-2, AC-8, AC-9)
  - [x] Bramka per dom: `PlotAnalysisRow` z fazami idle/paying/result (satisfies AC-3, AC-4, AC-5, AC-6, AC-7)
  - [x] Wejście z zapytania: przycisk „Sprawdź działkę” w `InquiryFlow` (satisfies AC-2)
  - [x] Dostępność: WCAG 2.2 AA, aria akordeonu (satisfies AC-10)
- [x] Zweryfikuj: `/check verify analiza działki i dossier`
- [x] Testuj: `/test analiza działki i dossier`

### 9. Oferta wiążąca (klient) · done · done
Jedna cena końcowa (dom + transport + montaż) bez listy przewoźników do wyboru — jako pojedyncza pozycja.
**Done when:** ekran pokazuje jedną cenę końcową i jeden przycisk akceptacji, bez wyboru przewoźnika.
- [x] Zbuduj: `/develop oferta wiążąca` (kod w `app/[locale]/klient/oferta/page.tsx`, `components/klient/BindingOfferView.tsx`, `lib/pricing.ts`)
- [x] Zweryfikuj: `/check verify oferta wiążąca`
- [x] Testuj: `/test oferta wiążąca`

### 10. Realizacja — oś statusów (klient) · done
Oś czasu etapów: produkcja, transport, montaż, odbiór, gwarancja, z datą i kompletem dokumentów przy każdym etapie (dane mockowe). Ustala wzorzec osi statusu używany też u producenta.
**Done when:** widać wszystkie pięć etapów w kolejności, aktualny etap jest wyróżniony, a przy każdym etapie jest data i lista dokumentów.
- [x] Zaprojektuj (spec): [0007](../specs/0007-realizacja-os-statusow/index.md)
- [x] Zbuduj: `/develop realizacja — oś statusów` (kod w `lib/data/types.ts`, `lib/data/fixtures/fulfillment.ts`, `lib/data/fulfillment.ts`, `components/ui/StageTimeline.tsx`, `app/[locale]/klient/realizacja/page.tsx`, `components/klient/BindingOfferView.tsx`)
  - [x] Dane i komponent osi statusów: `FulfillmentOrder`/`FulfillmentStage`/`FulfillmentDocument` w `lib/data/types.ts`, fixture `lib/data/fixtures/fulfillment.ts`, `getFulfillmentOrder()`, nowy współdzielony `components/ui/StageTimeline.tsx` (satisfies AC-3, AC-4, AC-5, AC-6, AC-7)
  - [x] Strona realizacji i routing: `app/[locale]/klient/realizacja/page.tsx`, parsowanie `project`, przekierowania (brak/nieznany → wyniki, brak zamówienia → oferta), baner ukończenia, link powrotny (satisfies AC-1, AC-2, AC-3, AC-7, AC-9)
  - [x] Wejście z oferty wiążącej: link „Śledź realizację” w `components/klient/BindingOfferView.tsx` (satisfies AC-8)
  - [x] Dostępność: jeden H1, kolejność fokusa, ikona plus tekst zamiast koloru, WCAG 2.2 AA (satisfies AC-10)
- [x] Zweryfikuj: `/check verify realizacja — oś statusów`
- [x] Testuj: `/test realizacja — oś statusów`

## Prototyp: flow producenta

### 11. Rejestracja (producent)
Krótki formularz: NIP, kraje dostawy, technologia. Bez logowania — od razu prowadzi do dodania pierwszego projektu.
**Done when:** wypełnienie trzech pól formularza prowadzi do ekranu pierwszego projektu.
- [x] Zbuduj: `/develop rejestracja producenta` — kod w `app/[locale]/producent/page.tsx`, `app/[locale]/producent/projekt/page.tsx`, `app/[locale]/producent/layout.tsx`, `components/producent/`, `lib/producer-registration.ts`, `lib/producer-technologies.ts`. Ekran pod `/producent/projekt` to na razie potwierdzenie rejestracji (dane z formularza), pełny formularz dodawania projektu buduje feature 12.

### 12. Pierwszy projekt (producent) · done
Kreator wieloetapowy (6 kroków): dane podstawowe projektu, pola techniczne (układ ścian, izolacja, współczynniki przenikania ciepła, klasa okien, wentylacja, źródło ciepła, odporność ogniowa i wiatrowa), makieta wgrywania rzutów i zdjęć (bez realnego zapisu plików) i podsumowanie. Postęp zapisywany w `localStorage` przeglądarki (możliwość dokończenia później). Ustala wzorzec makiety uploadu i wzorzec kreatora wieloetapowego.
**Done when:** wszystkie pola techniczne z listy są w formularzu, pole wgrywania pliku pokazuje wybrany plik bez trwałego zapisu, a zapisanie prowadzi do ekranu gotowości eksportowej.
- [x] Zaprojektuj (spec): [0008](../specs/0008-pierwszy-projekt/index.md)
- [x] Zbuduj: `/develop pierwszy projekt` (kod w `lib/data/types.ts`, `lib/producer-project-draft.ts`, `components/ui/FileUpload.tsx`, `components/producent/ProjectWizard.tsx` i jego sześć kroków, `components/producent/ProducerRegistrationBar.tsx`, `app/[locale]/producent/projekt/page.tsx`, `app/[locale]/producent/gotowosc-eksportowa/page.tsx`)
  - [x] Dane i logika kreatora: `ProjectDraft`/`MockUploadedFile` w `lib/data/types.ts`, stan kroków, podpowiedzi i zapis/odczyt `localStorage` (kluczowany NIP producenta) w `lib/producer-project-draft.ts` (satisfies AC-4, AC-5, AC-6, AC-8)
  - [x] Komponent wgrywania plików: `components/ui/FileUpload.tsx`, reużywalna makieta uploadu (satisfies AC-6)
  - [x] Kreator i jego kroki: `components/producent/ProjectWizard.tsx`, sześć kroków, wskaźnik postępu, nawigacja i walidacja per krok, podsumowanie (satisfies AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8)
  - [x] Wpięcie do routingu: przepisanie `app/[locale]/producent/projekt/page.tsx` (usuwa `RegistrationConfirmation`), nowa zaślepka `app/[locale]/producent/gotowosc-eksportowa/page.tsx` (satisfies AC-1, AC-9, AC-10)
  - [x] Dostępność: WCAG 2.2 AA, `aria-current="step"` na wskaźniku postępu (satisfies AC-11)
- [x] Zweryfikuj: `/check verify pierwszy projekt`
- [x] Testuj: `/test pierwszy projekt`

### 13. Gotowość eksportowa (producent) · done
Mapa/lista krajów ze statusem (gotowe / brakuje kilku rzeczy / niedopuszczalne) i konkretną listą braków przy statusie pośrednim, na danych mockowych. Zawiera widoczne zastrzeżenie, że to nie jest opinia prawna.
**Done when:** każdy kraj z mocka pokazuje jeden z trzech statusów, status pośredni rozwija listę konkretnych braków, a zastrzeżenie prawne jest widoczne na ekranie.
- [x] Zaprojektuj (spec): [0009](../specs/0009-gotowosc-eksportowa/index.md)
- [x] Zbuduj: `/develop gotowość eksportowa` (kod w `lib/data/types.ts`, `lib/data/fixtures/export-readiness.ts`, `lib/data/export-readiness.ts`, `components/producent/ExportReadinessMap.tsx`, `components/producent/ExportReadinessCountryRow.tsx`, `app/[locale]/producent/gotowosc-eksportowa/page.tsx`)
  - [x] Dane mockowe: `ExportReadinessCountryStatus` w `lib/data/types.ts`, fixture `lib/data/fixtures/export-readiness.ts` (trzy statyczne wiersze, jeden na status) i `lib/data/export-readiness.ts` (`getExportReadiness()`) (satisfies AC-2, AC-3)
  - [x] Komponenty mapy: `components/producent/ExportReadinessMap.tsx` (nagłówek, zastrzeżenie, lista) i `components/producent/ExportReadinessCountryRow.tsx` (`StatusPill`, akordeon na wierszu warunkowym) (satisfies AC-1, AC-4, AC-5, AC-6, AC-7)
  - [x] Wpięcie do routingu: przepisanie `app/[locale]/producent/gotowosc-eksportowa/page.tsx`, usunięcie zaślepki (satisfies AC-1)
  - [x] Dostępność: WCAG 2.2 AA, aria na akordeonie (satisfies AC-8)
- [x] Zweryfikuj: `/check verify gotowość eksportowa`
- [x] Testuj: `/test gotowość eksportowa`

### 14. Domykanie luk (producent) · done
Dla kraju ze statusem pośrednim: wybór między samodzielnym wgraniem dokumentów a zakupem pakietu (makieta płatności, ten sam wzorzec co analiza działki klienta).
**Done when:** z listy braków można przejść do ekranu wyboru, a wybór „kup pakiet” prowadzi do tej samej makiety płatności co u klienta.
- [x] Zaprojektuj (spec): [0010](../specs/0010-domykanie-luk/index.md)
- [x] Zbuduj: `/develop domykanie luk` (kod w `lib/gap-closure.ts`, `components/producent/ExportReadinessCountryRow.tsx`, `components/producent/ExportReadinessMap.tsx`, `app/[locale]/producent/gotowosc-eksportowa/page.tsx`, `app/[locale]/producent/domykanie-luk/page.tsx`, `components/producent/GapClosureView.tsx`, `components/producent/GapClosureUploadSection.tsx`, `components/producent/GapClosurePackageSection.tsx`)
  - [x] Dane i zapis stanu: `lib/gap-closure.ts` (localStorage, fail soft) (satisfies AC-7, AC-8, AC-10)
  - [x] Wpięcie akcji na mapie: przycisk „Domknij luki” i odczyt zapisanego stanu w `ExportReadinessCountryRow` (satisfies AC-1, AC-8)
  - [x] Nowy ekran i routing: `app/[locale]/producent/domykanie-luk/page.tsx`, `GapClosureView` (nagłówek, łagodny redirect, już rozwiązany kraj) (satisfies AC-2, AC-3, AC-9)
  - [x] Dwie ścieżki: `GapClosureUploadSection`, `GapClosurePackageSection` (satisfies AC-4, AC-5, AC-6, AC-7)
  - [x] Dostępność: WCAG 2.2 AA (satisfies AC-11)
- [x] Zweryfikuj: `/check verify domykanie luk`
- [x] Testuj: `/test domykanie luk`

### 15. Zapytania i oferty (producent) · done
Lista przychodzących zapytań (na danych mockowych) z możliwością złożenia oferty w narzuconym szablonie; pozycja transportu jest wypełniona automatycznie i niemożliwa do edycji.
**Done when:** producent widzi listę zapytań, może otworzyć formularz oferty w tym samym szablonie co u wszystkich producentów, a pole transportu jest tylko do odczytu.
- [x] Zbuduj: `/develop zapytania i oferty` (kod w `lib/data/producer-inquiries.ts`, `lib/data/fixtures/producer-inquiries.ts`, `lib/pricing.ts`, `lib/producer-offers.ts`, `components/producent/ProducerInquiryList.tsx`, `components/producent/ProducerInquiryRow.tsx`, `components/producent/ProducerOfferForm.tsx`, `app/[locale]/producent/zapytania/page.tsx`, `app/[locale]/producent/zapytania/oferta/page.tsx`, `app/[locale]/producent/page.tsx`). Zapytania to samodzielne dane mockowe (nie połączone z `lib/inquiry.ts` po stronie klienta, ten Facade nic trwale nie zapisuje między ekranami); transport wyliczany ze stałej stawki per kraj dostawy w `lib/pricing.ts`, jawnie oznaczonej jako makieta.
- [x] Zweryfikuj: `/check verify zapytania i oferty`
- [x] Testuj: `/test zapytania i oferty`

### 16. Realizacja i wypłata (producent)
Ten sam wzorzec osi statusu co w kroku klienta (produkcja, transport, montaż, odbiór), plus ekran makiety weryfikacji firmy przed „pierwszą wypłatą”.
**Done when:** oś statusu wygląda spójnie z widokiem klienta dla tego samego zamówienia, a ekran weryfikacji firmy pokazuje listę wymaganych dokumentów bez realnej weryfikacji.
- [x] Zbuduj: `/develop realizacja i wypłata` (kod w `lib/data/fulfillment.ts`, `lib/producer-verification.ts`, `components/producent/ProducerFulfillmentList.tsx`, `components/producent/CompanyVerificationView.tsx`, `app/[locale]/producent/realizacje/page.tsx`, `app/[locale]/producent/realizacja/page.tsx`, `app/[locale]/producent/weryfikacja-firmy/page.tsx`, `app/[locale]/producent/page.tsx`). Brak feature 15 (zapytania i oferty), więc lista realizacji na `/producent/realizacje` jest globalna (bez sesji producenta, ten sam precedens co `lib/gap-closure.ts`) i stanowi punkt wejścia zamiast listy przyjętych ofert.

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
- **Stopka strony** (kontakt, informacje prawne, przełącznik języka): świadomie pominięta w specyfikacji [0003](../specs/0003-strona-startowa/index.md), bo nie ma dziś realnej treści do pokazania · needs a decision
- **Zawężenie mapy gotowości eksportowej do krajów rejestracji**: dziś mapa (funkcja 13, spec [0009](../specs/0009-gotowosc-eksportowa/index.md)) zawsze pokazuje wszystkie trzy kraje z mocka; zawężenie do krajów dostawy wybranych przy rejestracji (funkcja 11) wymaga rozszerzenia kontraktu URL, który dziś przenosi tylko nazwę projektu · needs a decision

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
