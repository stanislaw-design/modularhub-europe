# Epika: Prototyp (Facade)

Platforma prowadząca transgraniczny zakup domu modułowego w Europie: łączy klienta kupującego dom i producenta, który go wytwarza, w jedną kontrolowaną ścieżkę od wyceny do odbioru.

Ta epika to pierwszy etap budowy, w całości na danych przykładowych. Drugi etap, prawdziwe zaplecze i utwardzenie produkcyjne, ma własną epikę: [Produkcja](produkcja.md). Przegląd obu epik: [index](index.md).

**Build approach:** Facade (najpierw pełny, klikalny interfejs na danych przykładowych; prawdziwe zaplecze podłączane ekran po ekranie w kolejnym etapie).
**Weight profile:** ekrany prototypu głównie lean/medium; podłączenie prawdziwych danych, płatności i silnika zgodności w kolejnym etapie jest full.

Ten pierwszy etap jest świadomie prototypem demonstracyjnym: żaden ekran nic trwale nie zapisuje, logowania nie ma, płatność jest makietą. Cel to szybki, przekonujący pokaz obu ścieżek (klienta i producenta) na realnym brandingu, żeby dało się to komuś pokazać i zebrać reakcję, zanim zainwestujemy w prawdziwe zaplecze.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack i architektura | Foundation | done |
| 2 | Standardy kodu i narzędzia | Foundation | planned |
| 3 | System projektowy i fundament UI | Foundation | done |
| 4 | Strona startowa (hero marki) | Prototyp | in-progress |
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
| 17 | Tokeny marki v4 (fundament wizualny) | Foundation | in-progress |
| 18 | Katalog produktów (producent) | Prototyp | in-progress |
| 19 | Strona szczegółów projektu (klient) | Prototyp | done |

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

### 4. Strona startowa (hero marki) · in-progress
Pełny układ marketingowy strony startowej (hero ze zdjęciem, pasek statystyk, kategorie domów, „dlaczego my”, zaufani producenci, zamykający pasek CTA), na nowym zestawie tokenów marki v4. Zastępuje wcześniejszy minimalny wariant (sam pasek wyszukiwania) ze spec 0003.

> ⚠️ Opis funkcji powyżej odzwierciedla spec [0014](../specs/0014-przebudowa-strony-startowej/index.md), która zastępuje (supersedes) spec [0003](../specs/0003-strona-startowa/index.md) — druga odwrócona decyzja co do kształtu hero w historii tej strony, patrz spec 0014 Follow-up. Kolory pochodzą z nowej, produktowej decyzji o tokenach v4, spec [0013](../specs/0013-tokeny-marki-v4.md) (`Accepted`, standalone, reszta produktu zostaje na v3 do osobnej decyzji migracyjnej per ekran).

- [x] Zaprojektuj (spec): [0014](../specs/0014-przebudowa-strony-startowej/index.md) (kolory: [0013](../specs/0013-tokeny-marki-v4.md))
- [x] Zbuduj: `/develop strona startowa` (kod w `assets/tokens/brand-v4-tokens.{css,json}`, `app/globals.css`, `components/klient/SiteHeader.tsx`, `components/klient/Hero.tsx`, `components/klient/SearchCard.tsx`, `components/klient/StatsBar.tsx`, `components/klient/CategoryShowcase.tsx`, `components/klient/WhyUs.tsx`, `components/klient/TrustedProducers.tsx`, `components/klient/ClosingCta.tsx`, `components/klient/TrustFooterRow.tsx`, `app/[locale]/klient/page.tsx`, `lib/size-thresholds.ts`, `lib/data/projects.ts`, `e2e/wyniki.spec.ts`)
  - [x] Tokeny v4, nagłówek i hero: nowy plik tokenów, pełna nawigacja, hero ze zdjęciem i prawdziwym h1 (satisfies AC-1, AC-2)
  - [x] Karta wyszukiwania: 5 pól (Gdzie/Powierzchnia funkcjonalne, reszta placeholder), nawigacja do wyników (satisfies AC-3, AC-4)
  - [x] Sekcje treściowe: statystyki, kategorie, „dlaczego my”, zaufani producenci, zamykający CTA, rząd zaufania (satisfies AC-5, AC-6, AC-7, AC-8, AC-9, AC-10)
  - [x] Sprzątanie: usunięcie `FeaturedHomes`/`HowItWorks`/`getFeaturedProjects()` (bez pola `featured`, zostaje dla `/wyniki`), przepisanie zależnego testu e2e (satisfies AC-13)
  - [x] Dostępność i responsywność: jeden H1, skip link pierwszy w Tab, kontrast tokenów v4, układ na wąskich ekranach (satisfies AC-11, AC-12)
- [ ] Zweryfikuj: `/check verify strona startowa`
- [ ] Testuj: `/test strona startowa`

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

### 17. Tokeny marki v4 (fundament wizualny) · in-progress
Nowy, produktowy zestaw kolorów (ciemne sekcje, bursztynowy akcent CTA jako dozwolony kolor działania, inaczej niż w v3) mający stopniowo zastąpić dzisiejszy brand-v3 w kolejnych ekranach, zaczynając od strony startowej (funkcja 4). Fundamentalna decyzja odkryta w trakcie projektowania funkcji 4, nie od początku planu — stąd numer poza kolejnością fazy Foundation.
**Done when:** plik tokenów v4 istnieje i jest udokumentowany w spec 0013; przynajmniej jeden ekran go faktycznie konsumuje (dziś: funkcja 4). Migracja pozostałych ekranów do v4 to osobna, przyszła praca per ekran, nieobjęta tym „Done when".
- [x] Zaprojektuj (spec): [0013](../specs/0013-tokeny-marki-v4.md)
- [x] Wdroż na pierwszym ekranie: patrz funkcja 4 (`/develop strona startowa`), Build plan spec 0014 krok 1 tworzy sam plik tokenów; osobna weryfikacja/testy dla tej pozycji nie są potrzebne, pokrywa je weryfikacja/testy funkcji 4

### 18. Katalog produktów (producent) · in-progress
Dziś kreator „Pierwszy projekt” (funkcja 12) zapisuje jeden szkic w `localStorage`, kluczowany NIP producenta, i nadpisuje go przy kolejnym uruchomieniu. Ta funkcja dodaje ekran listy produktów producenta plus siódmy krok kreatora (cena i dane sprzedażowe), osobny ekran edycji, i usuwanie z potwierdzeniem. Dodane produkty pokazują się też jako podgląd (bez możliwości zaznaczenia) na `/klient/wyniki`, ale tylko w tej samej przeglądarce, bo bez backendu serwer nie widzi `localStorage` producenta. Płatności pozostają makietą (patrz Deferred), nic tu ich nie dotyczy.
**Done when:** producent widzi listę wszystkich swoich produktów, może dodać nowy przez kreator (siedem kroków), otworzyć istniejący do edycji na osobnym ekranie, usunąć go z potwierdzeniem, a zmiany są od razu widoczne na liście; dodane produkty widoczne jako podgląd na `/klient/wyniki` w tej samej przeglądarce (dane mockowe/`localStorage`, bez prawdziwego backendu).
- [x] Zaprojektuj (spec): [0016](../specs/0016-katalog-produktow-producenta/index.md)
- [x] Zbuduj: `/develop katalog produktów producenta` (kod w `lib/data/types.ts`, `lib/producer-project-draft.ts`, `lib/producer-products.ts`, `lib/producer-registration-storage.ts`, `lib/local-client-projects.ts`, `lib/results-filters.ts`, `components/producent/ProjectWizardPricingStep.tsx`, `components/producent/ProductCatalogList.tsx`, `components/producent/ProductEditWizard.tsx`, `components/producent/DeleteProductDialog.tsx`, `components/producent/ProjectWizard.tsx`, `components/producent/ExportReadinessMap.tsx`, `components/klient/ResultCard.tsx`, `components/klient/ResultsSelection.tsx`, `app/[locale]/producent/produkty/`, `app/[locale]/producent/gotowosc-eksportowa/page.tsx`, `app/[locale]/klient/wyniki/page.tsx`)
  - [x] Model danych i pamięć: pola cenowe w `ProjectDraft`, `SavedProduct`, `lib/producer-products.ts`, `lib/producer-registration-storage.ts` (reużywa istniejący `RegistrationDetails` zamiast nowego typu) (satisfies AC-1, AC-4, AC-5, AC-8, AC-9, AC-10, AC-13)
  - [x] Siódmy krok kreatora i zapis produktu: `ProjectWizardPricingStep`, zapis do listy z obsługą błędu (satisfies AC-4, AC-5)
  - [x] Lista i edycja producenta: `/producent/produkty`, `/producent/produkty/[id]/edytuj`, link z gotowości eksportowej (satisfies AC-1, AC-2, AC-3, AC-6, AC-7, AC-8, AC-9, AC-10)
  - [x] Podgląd u klienta: doklejenie lokalnych produktów na `/klient/wyniki`, bez checkboxa (satisfies AC-11, AC-12)
  - [x] Dostępność: WCAG 2.2 AA, `aria-live` na doklejonych kartach (satisfies AC-14)
- [ ] Zweryfikuj: `/check verify katalog produktów producenta`
- [x] Testuj: `/test katalog produktów producenta` (`ProjectWizard.test.tsx`, `lib/producer-project-draft.test.ts`, `ExportReadinessMap.test.tsx`, `ResultsSelection.test.tsx` — full suite 367/367 green, confirmed by /sync from repo evidence)

> ⚠️ Zakres urósł ponad pierwotne oszacowanie wagi `medium` przy `/scope` (siódmy krok kreatora, dwie nowe trasy, ingerencja w już gotowy `/klient/wyniki`, spec 0004). Rozważ `full` przy najbliższym `/scope` i ewentualny świeży `/check review`.

### 19. Strona szczegółów projektu (klient) · done
Dziś karty projektów w wynikach i na stronie startowej nie prowadzą nigdzie — trasa pojedynczego projektu nie istnieje (świadomie zostawione otwarte w specach 0004, 0014, 0015). Ta funkcja dodaje `/klient/projekt/[id]`: pełny widok jednego projektu (galeria, kluczowe dane, opis, technologia/konstrukcja, warunki komercyjne, zgodność prawna gdy znany kraj, producent) z jednym jasnym CTA do zapytania. Zaprojektowana na podstawie realnych danych od dwóch pierwszych dostawców (Budman House, Cocomodule), które ujawniły bardzo nierówną kompletność danych producentów — stąd rozszerzenie `Project` o pola opcjonalne (`priceOnRequest`, `certifications`, `simplifiedPermitEligible`, `galleryImageUrls`), gdzie brak danych chowa całą sekcję zamiast pokazywać pustkę.
**Done when:** strona renderuje sekcje w potwierdzonej kolejności, karty wyników i popularnych domów do niej linkują (poza podglądem lokalnym producenta, `local-` id, który zostaje nieklikalny), nieistniejący projekt zwraca 404, a każdy projekt ma własne metadata/OG/JSON-LD.
- [x] Zaprojektuj (spec): [0020](../specs/0020-strona-szczegolow-projektu/index.md)
- [x] Zbuduj: `/develop strona szczegółów projektu` (kod w `lib/data/types.ts`, `lib/data/fixtures/projects.ts`, `lib/data/producers.ts`, `components/klient/ProjectGallery.tsx`, `components/klient/ProjectTechnicalSpecs.tsx`, `components/klient/ProjectCertifications.tsx`, `app/[locale]/klient/projekt/[id]/page.tsx`, `components/klient/ResultCard.tsx`, `components/klient/PopularHomeCard.tsx`, `components/klient/PopularHomes.tsx`, `app/[locale]/layout.tsx`)
  - [x] Model danych i dane przykładowe: cztery nowe opcjonalne pola na `Project`, zaktualizowane fixture (satisfies AC-4, AC-5)
  - [x] Nowe komponenty prezentacyjne: galeria zdjęć, tabela specyfikacji technicznej, lista certyfikatów (satisfies AC-1, AC-4)
  - [x] Strona i akcje: `app/[locale]/klient/projekt/[id]/page.tsx`, kolejność sekcji, trzy akcje (zapytanie/shortlista/działka), 404, panel zgodności prawnej (satisfies AC-1, AC-3, AC-6, AC-7)
  - [x] Wpięcie wejść: `ResultCard` i `PopularHomeCard` linkują do strony, `local-` zostaje nieklikalne (satisfies AC-2, AC-8)
  - [x] SEO: `generateMetadata` per projekt, JSON-LD Product/Offer, obraz OG, canonical (satisfies AC-9)
- [x] Zweryfikuj: `/check verify strona szczegółów projektu`
- [x] Testuj: `/test strona szczegółów projektu` (`lib/data/producers.test.ts`, `components/klient/ProjectGallery.test.tsx`, `ProjectTechnicalSpecs.test.tsx`, `ProjectCertifications.test.tsx`, `PopularHomeCard.test.tsx`, `PopularHomes.test.tsx`, rozszerzone `ResultCard.test.tsx`, e2e `projekt-szczegoly.spec.ts` — 403/403 vitest, 6/6 e2e)

## Deferred
Poza zakresem tego pierwszego etapu, świadomie odłożone do podłączenia prawdziwego zaplecza po ekranie. Większość poniższych pozycji jest teraz aktywnie zaplanowana w epice [Produkcja](produkcja.md), link przy każdej pozycji wskazuje na jej nowy numer.
- **Prawdziwe logowanie i role**: konta klienta i producenta zamiast dwóch osobnych widoków demo · zaplanowane jako [Produkcja #7](produkcja.md)
- **Prawdziwy model danych i baza**: trwałe zapisywanie projektów, zapytań, ofert i statusów · zaplanowane jako [Produkcja #2](produkcja.md)
- **Prawdziwe rodziny produktów i kategorie** (dziś `CategoryShowcase`/`CategoryFilterBar` na stronie startowej są świadomie dekoracyjne, bez modelu danych za sobą, spec 0014): rozszerzenie o spa modułowe i pergole obok domów, każda z własnymi podkategoriami · zaplanowane jako [Produkcja #6](produkcja.md)
- **Prawdziwe płatności**: realna integracja płatnicza za analizę działki i domykanie luk · zaplanowane jako [Produkcja #12](produkcja.md)
- **Prawdziwe wgrywanie i przechowywanie plików**: rzuty, zdjęcia, dokumenty producenta · zaplanowane jako [Produkcja #13](produkcja.md)
- **Prawdziwy silnik zgodności**: rzeczywiste, aktualizowane wymagania prawne per kraj zamiast danych mockowych · zaplanowane jako [Produkcja #14](produkcja.md) (pilot: Polska, pozostałe kraje zostają odłożone dalej)
- **Prawdziwa wycena transportu**: integracja z siecią przewoźników zamiast stałych widełek · zaplanowane jako [Produkcja #15](produkcja.md)
- **Powiadomienia**: e-mail przy zmianie statusu · zaplanowane jako [Produkcja #17](produkcja.md)
- **Panel administracyjny**: zarządzanie producentami, projektami i zapytaniami · zaplanowane jako [Produkcja #18](produkcja.md)
- **Wersje językowe (EN/DE)**: rozszerzenie z samego polskiego · pozostaje odłożone, patrz Deferred w [Produkcja](produkcja.md)
- **Stopka strony** (kontakt, informacje prawne, przełącznik języka): świadomie pominięta w specyfikacji [0003](../specs/0003-strona-startowa/index.md), bo nie ma dziś realnej treści do pokazania · treść prawna częściowo pokryta przez [Produkcja #5](produkcja.md) (RODO), kontakt i informacje prawne w stopce zaplanowane jako [Produkcja #10](produkcja.md), przełącznik języka pozostaje odłożony
- **Zawężenie mapy gotowości eksportowej do krajów rejestracji**: dziś mapa (funkcja 13, spec [0009](../specs/0009-gotowosc-eksportowa/index.md)) zawsze pokazuje wszystkie trzy kraje z mocka; zawężenie do krajów dostawy wybranych przy rejestracji (funkcja 11) wymaga rozszerzenia kontraktu URL, który dziś przenosi tylko nazwę projektu · pozostaje odłożone, patrz Deferred w [Produkcja](produkcja.md)
- **Kreator katalogu producenta nie zbiera certyfikatów, galerii ani progu zgłoszenia uproszczonego**: te trzy pola dodane w funkcji 19 (spec [0020](../specs/0020-strona-szczegolow-projektu/index.md)) na podstawie realnych danych od Budman/Cocomodule; projekty dodane przez producenta przez kreator (funkcja 12/18) nie pokażą tych sekcji na własnej stronie szczegółów, dopóki formularz nie zostanie osobno rozszerzony · zaplanowane jako [Produkcja #10](produkcja.md) (dane na start i tak zasiane ręcznie, patrz Produkcja #7)
- **Waluta natywna producenta (PLN) obok EUR**: model `Project` zostaje EUR-only (funkcja 19, spec [0020](../specs/0020-strona-szczegolow-projektu/index.md)); realni producenci (Budman, Cocomodule) podają ceny w PLN · zaplanowane jako [Produkcja #10](produkcja.md)

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
