# 0001. Stack i architektura

**Date**: 2026-08-13
**Status**: Accepted

## Summary

Ten dokument wybiera fundament techniczny dla prototypu ModularHub Europe: Next.js (App Router) w TypeScript, ze stylowaniem Tailwind CSS na bazie już gotowych tokenów marki, danymi mockowymi w lokalnych plikach (bez bazy danych), hostingiem na Vercel. Wybór jest zrobiony tak, żeby ten sam kod, który teraz pokazuje klikalne demo na przykładowych danych, dało się w drugim etapie rozbudować o prawdziwe zaplecze, ekran po ekranie, bez zmiany frameworka. Baza danych, logowanie, płatności, przechowywanie plików i silnik zgodności prawnej są świadomie odłożone na później, zgodnie z listą Deferred w `docs/scope/scope.md`.

## Decision

**Chosen option**: Option 1: Next.js (App Router) + TypeScript + Tailwind CSS + lokalne dane mockowe + Vercel

Prototyp ModularHub Europe stanie na jednej aplikacji Next.js (App Router) w TypeScript, ze stylowaniem Tailwind CSS w wersji 4 skonfigurowanym na bazie zmiennych z `assets/tokens/brand-v3-tokens.css`, danymi mockowymi w typowanych plikach lokalnych (funkcje dostępowe asynchroniczne od początku), segmentami adresu `/klient` i `/producent`, stanem UI w wbudowanym mechanizmie Reacta, menadżerem pakietów npm i hostingiem demo na Vercel (plan Pro).

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `tailwindcss-advanced-layouts` (`josiahsiegel/claude-plugin-marketplace`, `.agents/skills/tailwindcss-advanced-layouts/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Proposed stack

| Warstwa | Wybór | Powód |
|---|---|---|
| Język | TypeScript | Typowany model danych mockowych (projekty, ceny, wymagania krajowe, statusy) łapie błędy już przy zamianie mocka na prawdziwe dane w drugim etapie (basis: Twoja odpowiedź w rozmowie projektowej) |
| Framework | Next.js, App Router | Jeden pełny framework Reacta: routing plikowy teraz, a w tym samym miejscu można później dodać server actions albo route handlery podłączone do prawdziwego zaplecza, bez zmiany frameworka (basis: porównanie frameworków 2026, patrz Referencje) |
| Stylowanie | Tailwind CSS w wersji 4, konfiguracja przez `@theme` w CSS (nie plik `tailwind.config.js` ze starszych wersji) | Tokeny marki (kolor, typografia, spacing, radius) są już gotowe jako zmienne CSS w `brand-v3-tokens.css`; wersja 4 czyta je prosto w `@theme`, bez dodatkowej warstwy konfiguracji w JavaScript, jedna skala dla wszystkich 13 ekranów prototypu |
| Dane na ten etap | Lokalne typowane pliki danych plus proste funkcje dostępowe, asynchroniczne od początku | Zero bazy danych, zero zapisu (zgodnie z zakresem etapu w `scope.md`); funkcja dostępowa musi być asynchroniczna już teraz (nawet czytając plik lokalny), bo w drugim etapie zamieniamy tylko jej wnętrze na prawdziwe wywołanie API, bez zmiany sygnatury i bez dopisywania stanów wczytywania na każdym ekranie od nowa (basis: Twoja odpowiedź w rozmowie projektowej, doprecyzowane po sprawdzeniu spec) |
| Stan interfejsu | Wbudowany stan Reacta (`useState`) lokalnie na ekran; stan, który musi przetrwać przejście między ekranami (na przykład kraj i budżet z kreatora widoczne na ekranie wyników), idzie przez parametry adresu (URL), nie przez współdzielony stan komponentu | Prosty stan komponentu wystarcza w obrębie jednego ekranu, ale nie przenosi się sam między trasami; parametry adresu przenoszą się automatycznie i dodatkowo dają wynikom link, który można wkleić (basis: Twoja odpowiedź w rozmowie projektowej, doprecyzowane po sprawdzeniu spec) |
| Struktura ekranów | Prawdziwe segmenty adresu `/klient/...` i `/producent/...` (foldery, nie tylko grupy w nawiasach) | Same grupy trasowania w nawiasach nie dodają segmentu adresu, więc dwa ekrany o tej samej nazwie w obu ścieżkach (na przykład "realizacja" u klienta i u producenta) wylądowałyby na tym samym adresie i wywołały błąd budowania; prawdziwy segment w adresie to wyklucza, a wspólny układ i tokeny wciąż mogą być w jednym miejscu (basis: znalezione podczas sprawdzenia spec przez inny model) |
| Menadżer pakietów | npm | Zero dodatkowej instalacji, najbardziej uniwersalny wybór na tę skalę projektu (basis: Twoja odpowiedź w rozmowie projektowej) |
| Hosting | Vercel, plan Pro (płatny) | Firma stojąca za Next.js, zero konfiguracji dla App Router, podglądy per branch przydatne do zbierania reakcji; darmowy plan Hobby zabrania użycia komercyjnego, a to demo ma pomóc pozyskać inwestycję, więc liczymy z planem Pro od początku (basis: porównanie hostingu 2026, patrz Referencje; warunki planu Hobby sprawdzone podczas sprawdzenia spec) |
| Obserwowalność | Brak dedykowanego narzędzia na ten etap | Demo bez logowania i bez zapisu nie generuje realnych zdarzeń produkcyjnych do obserwowania; wbudowany podgląd błędów Next.js wystarcza na start (basis: brak realnych zdarzeń produkcyjnych w demo bez zapisu i logowania) |
| Zaplecze (baza danych, autoryzacja, płatności, pliki, silnik zgodności) | Odłożone | Świadomie poza zakresem tego etapu, patrz sekcja Deferred w `docs/scope/scope.md`; każda z tych warstw dostanie własną sesję `/architect`, gdy przyjdzie czas na drugi etap |

## Consequences

**Positive**:
- Jeden kod na cały prototyp: te same ekrany, które dziś działają na mocku, w drugim etapie dostają prawdziwe dane bez przepisywania frameworka.
- Duża, aktualna społeczność Next.js i Vercel; łatwo znaleźć pomoc, gotowe wzorce i ludzi znających ten stack.
- Hosting demo z podglądami per branch, wygodny do szybkiego pokazania klientowi i zebrania reakcji, zanim padnie decyzja o inwestycji w prawdziwe zaplecze.
- Tokeny marki już gotowe (`brand-v3-tokens.json`, `brand-v3-tokens.css`) wchodzą prosto do konfiguracji Tailwind, jeden spójny system dla obu ścieżek (klient i producent).

**Negative / tradeoffs**:
- Next.js App Router (server components, wzorce ładowania danych) ma realną krzywą uczenia się dla kogoś, kto wcześniej go nie używał; zainstalowany skill `nextjs-app-router-patterns` to łagodzi, ale nie usuwa całkiem.
- Zamiana lokalnych danych mockowych na prawdziwe API w drugim etapie to praca ręczna, ekran po ekranie, nie automatyczne podłączenie.
- Najwygodniejsza ścieżka hostingu (Vercel) wiąże z jednym dostawcą, i wymaga płatnego planu Pro od startu, bo demo służy komercyjnemu celowi (pozyskanie inwestycji), a darmowy plan Hobby tego zabrania.
- Brak dedykowanej obserwowalności na tym etapie oznacza, że błędy w demo trzeba będzie zgłaszać i sprawdzać ręcznie, nie automatycznie.
- Wersje językowe (EN/DE) są odłożone (patrz Deferred w `scope.md`), ale jeśli w drugim etapie wejdą przez segment `app/[locale]/`, to dotknie każdej trasy i każdego linku w całej aplikacji; to jedyny odłożony temat, który realnie dotyka struktury routingu wybranej w tym spec, patrz Follow-up.

**Neutral**:
- Wybór npm (a nie pnpm) oznacza troszkę więcej miejsca na dysku i troszkę dłuższy `install`, ale zero dodatkowej konfiguracji na starcie.
- Segmenty `/klient` i `/producent` w jednym drzewie oznaczają, że prawdziwe logowanie i role (patrz Deferred w `scope.md`) trzeba będzie świadomie zaprojektować na to samo drzewo routingu, nie od zera.

## Follow-up

- [ ] Przed rozpoczęciem scaffoldu zdecyduj, czy struktura tras dostaje już teraz segment `app/[locale]/` (nawet z jednym językiem, polskim), żeby dodanie EN/DE później nie wymagało przenoszenia każdej trasy. To jedyny odłożony temat z sekcji Deferred w `scope.md`, który dotyka struktury routingu wybranej w tym spec; sama decyzja "czy i kiedy robimy EN/DE" zostaje odłożona, ale koszt przygotowania segmentu jest niski teraz i wysoki później.
- [ ] Potwierdź plan Vercel przed pierwszym wdrożeniem widocznym dla klienta: plan Pro (płatny), bo darmowy plan Hobby zabrania użycia komercyjnego, a to demo ma pomóc pozyskać inwestycję.
- [ ] Root `AGENTS.md` jeszcze nie istnieje (zaplanowane jako punkt 2 zakresu, `/audit`). Po jego powstaniu sekcja `## Agent skills` powinna wymienić wszystkie cztery zainstalowane tu skille; wszystkie są ogólnoprojektowe (framework, język i stylowanie dotyczą każdego pliku), więc trafiają do roota, nie do zagnieżdżonego pliku.
- [ ] Podłącz serwer MCP Vercel (`https://mcp.vercel.com`, oficjalny, w wersji Beta) po pierwszym wdrożeniu, żeby agent miał żywy dostęp do logów wdrożeń i projektów. Podłączenie jest Twoją konfiguracją (na przykład przez `/mcp` albo `claude mcp add`), nie mogłem zrobić tego automatycznie.
- [ ] Rozważ podłączenie `tailwindcss-mcp-server` i `npm-mcp`, jeśli chcesz żywy dostęp do dokumentacji Tailwind i operacji npm bez zgadywania. Również Twoja konfiguracja.
- [ ] Baza danych, autoryzacja, płatności, przechowywanie plików i silnik zgodności prawnej są świadomie odłożone (sekcja Deferred w `docs/scope/scope.md`); każda potrzebuje własnej sesji `/architect` w drugim etapie.

## Rationale

Pełne uzasadnienie i porównanie wszystkich rozważanych stacków: patrz [rationale.md](rationale.md).
