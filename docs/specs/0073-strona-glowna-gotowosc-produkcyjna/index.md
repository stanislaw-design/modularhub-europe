# 0073. Strona główna: gotowość produkcyjna (treść, niezawodność, SEO)

**Date**: 2026-10-19
**Status**: Accepted

## Summary

Strona główna działa i ma komplet tłumaczeń, ale przed publicznym startem ma trzy rodzaje luk. Część A poprawia treść i dane, które dziś wprowadzają w błąd (kraje po polsku w każdym języku, pole Budżet bez działania, wymyślony przykład zgodności, martwy przycisk, ceny zawsze w polskim formacie). Część B sprawia, że awaria bazy nie wywala całej strony i że puste listy nie zostawiają pustych nagłówków. Część C dopina SEO: bezpieczny adres strony, sitemapę z produktami, dane strukturalne i obrazek do udostępniania. Baner cookies, polityka prywatności, regulamin i stopka świadomie zostają poza tą spec, bo wymagają decyzji prawnych.

Reasoning and options: see [rationale.md](rationale.md).

## Structure

Trzy części, każda budowana niezależnie, ze wspólnym kontraktem poniżej.

- [Część A: treść i dane](0073-czesc-a-tresc-i-dane.md), wspiera AC-1 do AC-7.
- [Część B: niezawodność](0073-czesc-b-niezawodnosc.md), wspiera AC-8 do AC-11.
- [Część C: SEO](0073-czesc-c-seo.md), wspiera AC-12 do AC-15.

**Wspólny kontrakt między częściami**:
- Nowe teksty trafiają do `messages/{pl,en,nl,de}.json` jednocześnie, w czterech językach, w przestrzeniach nazw, które już istnieją (`SearchCard`, `ComplianceEngineShowcase`, `ProducerShowcase`, `HomePage`) albo w nowej `ErrorPage`.
- Adres strony pochodzi zawsze z `lib/site-url.ts` (część C, zadanie 1). Layout, sitemapa, robots i JSON-LD nie czytają `NEXT_PUBLIC_SITE_URL` bezpośrednio.
- Błędy bazy są raportowane tylko przez `lib/observability` (reguła ESLint z AGENTS.md blokuje bezpośredni Sentry), a w komponentach klienckich przez `lib/observability/errors` (wzór z `app/global-error.tsx`).

## Requirements

**User stories**:
- Jako odwiedzający z Niemiec chcę widzieć nazwy krajów po niemiecku i filtr budżetu, który naprawdę zawęża wyniki.
- Jako odwiedzający chcę, żeby strona główna otwierała się nawet wtedy, gdy część danych chwilowo nie działa.
- Jako właściciel platformy chcę, żeby wyszukiwarki widziały poprawne metadane, mapę strony z produktami i dane o organizacji, a produkcja nie ruszyła z adresem localhost.
- Jako inwestor chcę, żeby przykład Compliance Engine był wyraźnie oznaczony jako ilustracja, a nie moja ocena.

**Acceptance criteria** (the contract):

Część A, treść i dane:
- **AC-1**: Nazwy krajów w wyszukiwarce strony głównej i w nazwie kraju produkcji na kartach polecanych domów pochodzą z `Intl.DisplayNames` dla bieżącego języka (`/de` pokazuje Deutschland, Niederlande, Polen). Fixture trzyma tylko kody. `getCountries(locale)` przyjmuje język, a bez argumentu zwraca polskie nazwy, więc pozostali wywołujący działają bez zmian.
- **AC-2**: Pole Budżet w `SearchCard` ma zakresy zgodne z `PRICE_THRESHOLDS` (do 50 tys., 50 do 100 tys., 100 do 150 tys., 150 do 250 tys., powyżej 250 tys., dowolny) i po wyborze dodaje `priceMin` i `priceMax` do adresu `/results`. Wybór "dowolny" nie dodaje żadnego parametru. Budżet nie pokazuje się w zakładce "Więcej niż dom", tak jak dziś.
- **AC-3**: Dane realizacji pokazowej (inwestor, producent, liczby, lista zdjęć) leżą w typowanym pliku `lib/data/featured-showcase.ts`. `FeaturedProjectShowcase` tylko je renderuje i wygląda tak samo jak dziś.
- **AC-4**: Karta przykładu w `ComplianceEngineShowcase` ma widoczną plakietkę "Przykład ilustracyjny" (przetłumaczoną na cztery języki), dostępną dla czytników ekranu.
- **AC-5**: Przycisk "Zobacz wszystkich producentów" nie jest renderowany. Klucz `ProducerShowcase.viewAllButton` znika z czterech katalogów.
- **AC-6**: Ceny na kartach polecanych domów i w tabeli porównawczej są formatowane przez jeden wspólny helper z `Intl.NumberFormat` dla bieżącego języka, w euro, bez groszy.
- **AC-7**: Wyłączone sekcje ("Więcej niż dom", "Co mówią nasi klienci") są sterowane jedną jawną stałą z komentarzem przy `app/[locale]/(customer)/page.tsx`, bez zakomentowanych importów. Obie są dziś wyłączone, więc wygląd strony się nie zmienia.

Część B, niezawodność:
- **AC-8**: Gdy zapytanie o projekty albo o producentów się nie uda, strona główna nadal się renderuje: znikają tylko sekcje zależne od tych danych (popularne domy, porównanie, producenci), a błąd trafia do `captureError` z kontekstem. Hero, wyszukiwarka, realizacja pokazowa, zgodność, jak to działa, zamknięcie i FAQ zostają.
- **AC-9**: Sekcje popularnych domów i producentów nie renderują się (zero nagłówka), gdy lista jest pusta. Tabela porównawcza nie renderuje się, gdy jest mniej niż dwa polecane projekty.
- **AC-10**: Grupa tras `(customer)` ma `error.tsx` z komunikatem w czterech językach i przyciskiem "Spróbuj ponownie" (`retry()`), który zgłasza błąd przez `lib/observability/errors`.
- **AC-11**: Test e2e `e2e/strona-glowna.spec.ts` przechodzi dla `/pl` i `/de` i sprawdza: nagłówek h1, tytuł i canonical w danym języku, JSON-LD, nazwy krajów w języku strony, przejście z wyszukiwarki na `/results` z `priceMax`, brak sekcji z pustym nagłówkiem.

Część C, SEO:
- **AC-12**: `lib/site-url.ts` zwraca adres z `NEXT_PUBLIC_SITE_URL`, a gdy go brak: na podglądzie Vercela adres z `VERCEL_URL`, lokalnie `http://localhost:3000`, a przy `VERCEL_ENV=production` rzuca błąd i przerywa build. Używają go layout (`metadataBase`), sitemapa, robots i JSON-LD. Zmienna jest opisana w `.env.local.example`.
- **AC-13**: Sitemapa zawiera stałe strony publiczne oraz wszystkie opublikowane produkty (domy, sauny, outdoor TV), każdy w czterech językach z alternatywami `hreflang`, adresy z `resolveProductHref`. Odczyt bazy jest cache'owany na dobę. Gdy baza nie odpowiada, sitemapa zwraca same stałe strony i loguje błąd, a nie status 500.
- **AC-14**: Strona główna ma w HTML jeden blok JSON-LD z `Organization` i `WebSite` (nazwa, adres, logo, język, e mail kontaktowy z `SUPPORT_REPLY_TO_EMAIL` tylko gdy ustawiony). Znak `<` w JSON jest zamieniony na `<`.
- **AC-15**: Metadane strony głównej mają `openGraph.images` i `twitter` typu `summary_large_image` z jednym statycznym obrazkiem 1200 na 630 z hero (`public/images/og/home.jpg`), z opisem alternatywnym równym tytułowi strony w danym języku.

## Decision

**Chosen option**: jedna zbiorcza spec w trzech niezależnych częściach (A, B, C), bez spraw prawnych.

Poprawiamy stronę w obecnej architekturze (bez przebudowy renderowania), z odpornością na błędy opartą o `Promise.allSettled` i `error.tsx`, z jednym helperem adresu strony i z obrazkiem OG jako statycznym plikiem.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `vitest` (`antfu/skills`, `.agents/skills/vitest/`) · `playwright-cli` (`microsoft/playwright-cli`, `.agents/skills/playwright-cli/`) · `sentry-nextjs-sdk` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-nextjs-sdk/`)

Rozstrzygnięcia na etapie pisania (RECOMMEND):
- Zakresy budżetu wynikają z `PRICE_THRESHOLDS` w `lib/results-filters.ts` (filtr po stronie wyników przyjmuje tylko te progi), więc nie mogą być dowolne.
- Pusta sekcja znika całkiem (bez komunikatu), bo strona główna jest wizytówką, a komunikat "brak danych" wygląda jak awaria. Tabela porównawcza ma próg dwóch projektów, bo jedna kolumna nie jest porównaniem.
- Format cen: `Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 })`. Alternatywa (kod waluty dopisany ręcznie jak dziś) odrzucona, bo układ symbolu zależy od języka.
- Obrazek OG generuje jednorazowy skrypt `scripts/generate-og-image.mjs` z `sharp` (kadr 1200 na 630 z hero), wynik jest zatwierdzany w repo.

## Build plan

Podejście projektu to Facade dla prototypu, a to jest warstwa produkcyjna, więc plan idzie cienkimi pionowymi kawałkami, od najmniejszego ryzyka awarii po poprawki widoczne dla użytkownika. Każdy krok jest osobno wdrażalny.

1. `lib/site-url.ts` z testem, podpięcie do `app/[locale]/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`, wpis w `.env.local.example`, satisfies **AC-12**. (część C)
2. Odporność strony głównej: `Promise.allSettled` w `page.tsx`, ukrywanie sekcji przy błędzie i pustej liście, progi w `PopularHomes`, `CompareHomesTeaser`, `ProducerShowcase`, satisfies **AC-8**, **AC-9**. (część B)
3. `app/[locale]/(customer)/error.tsx` i przestrzeń `ErrorPage` w czterech katalogach, satisfies **AC-10**. (część B)
4. Sitemapa z produktami, cache na dobę i bezpieczny powrót do stałych stron, satisfies **AC-13**. (część C)
5. JSON-LD `Organization` i `WebSite` oraz obrazek OG z jednorazowym skryptem, satisfies **AC-14**, **AC-15**. (część C)
6. Nazwy krajów wg języka: `getCountries(locale)`, wywołanie ze strony głównej, nazwy w `PopularHomes`, satisfies **AC-1**. (część A)
7. Pole Budżet: nowe zakresy, mapowanie na `priceMin` i `priceMax`, klucze w czterech katalogach, test `SearchCard`, satisfies **AC-2**. (część A)
8. Dane realizacji do `lib/data/featured-showcase.ts`, komponent czyta z pliku, satisfies **AC-3**. (część A)
9. Plakietka przykładu w `ComplianceEngineShowcase`, usunięcie przycisku producentów, satisfies **AC-4**, **AC-5**. (część A)
10. Wspólny helper cen i podmiana w `PopularHomeCard` oraz `CompareHomesTeaser`, aktualizacja testów, satisfies **AC-6**. (część A)
11. Stała sterująca sekcjami w `page.tsx`, satisfies **AC-7**. (część A)
12. Test e2e strony głównej, satisfies **AC-11**, a przy okazji sprawdza **AC-1**, **AC-2**, **AC-14**, **AC-15**.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Consequences

**Positive**:
- Strona główna przetrwa chwilową awarię bazy (ważne przy znanych limitach Neon) i nie pokazuje pustych nagłówków.
- Produkcja nie wystartuje z adresem localhost, bo build się przerwie.
- Produkty trafiają do sitemapy, a wyszukiwarki dostają dane o organizacji i poprawne udostępnienia.
- Użytkownik widzi nazwy krajów i ceny w swoim języku, a budżet naprawdę filtruje.

**Negative / tradeoffs**:
- Rzucanie błędu w `site-url` na produkcji przerwie build, jeśli ktoś zapomni zmiennej. To zamierzone, ale trzeba ją ustawić na Vercelu przed następnym wdrożeniem.
- Cache sitemapy na dobę oznacza, że nowy produkt trafi do mapy z opóźnieniem do 24 godzin.
- Ukrywanie sekcji przy awarii bazy może zostać niezauważone przez użytkownika i zespół, jeśli nie ma alertu. Wymaga alertu w Sentry na ten kontekst błędu.
- Zakresy budżetu są sztywno powiązane z czterema progami filtra wyników. Zmiana progów wymaga zmiany w obu miejscach.

**Neutral**:
- Layout klienta nadal woła `auth()` i `cookies()`, więc strona główna renderuje się dynamicznie. Mierzymy po starcie (Follow-up).
- Klucz `HomePage` i pliki `messages/*.json` mają niezacommitowane zmiany z innej pracy (menu, kontakt), przy commicie trzeba je rozdzielić.

## Follow-up

- [ ] Poza zakresem, wymaga osobnych decyzji prawnych: baner zgody na cookies i blokada nieistotnego śledzenia, prawdziwa polityka prywatności, regulamin (scope, funkcja 5), stopka z kontaktem i informacjami prawnymi (scope, funkcja zbierająca wiarygodność strony klienta). Rozważyć `/architect` na funkcję 5 jako następny krok.
- [ ] Ustawić `NEXT_PUBLIC_SITE_URL` w Production i Preview na Vercelu, zanim zadanie 1 trafi na produkcję.
- [ ] Alert w Sentry na kontekst błędu "strona główna: sekcja ukryta" (AC-8), żeby ciche ukrycie sekcji nie zostało przeoczone.
- [ ] Zmierzyć po starcie, czy dynamiczny render strony głównej (`auth()` i `cookies()` w layoucie) jest realnym problemem. Dopiero wtedy rozważyć cache zapytań albo przeniesienie sesji na klienta.
- [ ] Dane strukturalne `Product` na stronach produktów (ceny "od" i "na zapytanie" wymagają osobnej decyzji o schemacie `Offer`).
- [ ] Opinie klientów ("Co mówią nasi klienci") wrócą dopiero z prawdziwymi treściami. Kategorie "Więcej niż dom" decyzja produktowa.
- [ ] Logo w JSON-LD wskazuje dziś `icon.svg`, a wyszukiwarki wolą obraz rastrowy minimum 112 na 112. Dodać PNG logo, gdy będzie gotowe.
- [ ] Zauważone przy okazji: `app/global-error.tsx` ma na sztywno `lang="pl"` i polski komunikat bez względu na język użytkownika.
- [ ] Zaktualizować `docs/todo/strona-glowna-gotowosc-produkcyjna.md`, zaznaczając pozycje objęte tą spec.
