# 0019. CI/CD i środowiska

**Date**: 2026-08-28
**Status**: In Progress

## Summary

Ta decyzja wprowadza zautomatyzowany pipeline (CI/CD, czyli ciągła integracja i ciągłe wdrażanie) na GitHub Actions, sterujący wdrożeniami na Vercelu. Każdy push uruchamia lint i testy jednostkowe, zmergowanie do głównej gałęzi automatycznie wdraża na osobne środowisko staging z własną bazą danych Neon, a wdrożenie na produkcję wymaga ręcznego uruchomienia jednego workflow, który samodzielnie sprawdza e2e, migruje bazę i buduje osobne, produkcyjne wdrożenie, zamiast dzisiejszych ręcznych wdrożeń bez testów. To fundament, na którym stanie reszta epiki Produkcja, w tym testy regresyjne ścieżek krytycznych (funkcja 18).

## Context

Pełne uzasadnienie, porównanie rozważanych opcji i źródła: patrz [rationale.md](rationale.md).

## Options considered

Patrz [rationale.md](rationale.md).

## Decision

**Chosen option**: Option 1: GitHub Actions jako orkiestrator, osobny wymuszony build produkcyjny, jeden trwały branch Neon per środowisko

GitHub Actions prowadzi cały pipeline i to ono, nie natywna integracja Vercela z Gitem, wykonuje każde wdrożenie przez CLI Vercela (`vercel deploy`). Automatyczne wdrożenie Vercela z Gita jest wyłączone tylko dla głównej gałęzi (inne gałęzie zachowują normalne, natywne podglądy Vercela). Staging i produkcja to dwa trwałe środowiska, każde z własnym, nazwanym branchem bazy Neon i własnym, osobnym buildem: produkcja NIE jest tym samym artefaktem "promowanym" na inne środowisko, tylko osobnym buildem tego samego commita z własnymi zmiennymi środowiskowymi (Vercel nie dokumentuje pewnego mechanizmu promowania buildu jednego środowiska na inne środowisko z innymi zmiennymi, patrz Follow-up i cross check w rationale.md). Podglądy gałęzi funkcji współdzielą branch stagingu. Produkcja rusza dopiero po ręcznym uruchomieniu jednego workflow (`workflow_dispatch`), który w jednym ciągu: ponownie sprawdza e2e na stagingu, migruje produkcyjną bazę, buduje i wdraża osobny build z produkcyjnymi zmiennymi. To świadomy, ręcznie wyzwalany krok, ale technicznie wymuszony przez sam pipeline (e2e musi przejść w tym samym uruchomieniu), nie oparty tylko na dyscyplinie człowieka klikającego w panelu Vercela.

**Implementation skills**: `github-actions-templates` (`wshobson/agents`, `.agents/skills/github-actions-templates/`) · `github-actions` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/github-actions/`) · `vercel-deployments-builds` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/vercel-deployments-builds/`) · `neon-postgres` (`neondatabase/agent-skills`, `.agents/skills/neon-postgres/`) · `drizzle` (`bobmatnyc/claude-mpm-skills`, `.agents/skills/drizzle/`)

## Rationale

Patrz [rationale.md](rationale.md) dla pełnego porównania opcji. Option 1 odzwierciedla ducha każdej odpowiedzi z rozmowy projektowej (silnik CI, miejsce kroku migracji, świadomy ręczny krok produkcji), z jedną świadomą korektą: cross check tej specyfikacji (inny model, patrz rationale.md) wykazał, że dosłowne "Promote to Production w Vercelu" na buildzie środowiska staging nie jest udokumentowanym, pewnym mechanizmem, gdy staging i produkcja mają różne zmienne środowiskowe (różne bazy danych). Zamiast tego produkcja dostaje własny, osobny build tego samego commita, wyzwalany ręcznie, z technicznie wymuszonym ponownym sprawdzeniem e2e w tym samym uruchomieniu, nie samym kliknięciem w panelu Vercela (basis: rozmowa projektowa 2026 08 28 plus cross check 2026 08 28, patrz rationale.md).

## Proposed stack

| Warstwa | Wybór | Powód |
|---|---|---|
| Silnik CI (build, lint, testy) | GitHub Actions | Repo już jest na GitHub, darmowy limit wystarcza dla małego zespołu, pełna kontrola nad kolejnością kroków (basis: rozmowa projektowa, pytanie "Silnik CI") |
| Topologia środowisk | Dwa trwałe środowiska: staging i produkcja, oba wdrażane na Vercelu | Dokładnie to, czego wymaga kryterium gotowości funkcji 3 w `docs/scope/produkcja.md` (basis: rozmowa projektowa, pytanie "Środowiska") |
| Baza danych per środowisko | Neon, jeden trwały branch per środowisko (staging, produkcja); podglądy gałęzi funkcji współdzielą branch stagingu | Zgodne z przygotowaniem już zapisanym w spec 0017 (branch bazy na branch kodu); prostsze niż branch efemeryczny per PR przy dzisiejszej skali zespołu (basis: spec 0017 Consequences, rozmowa projektowa) |
| Bramka testów | Lint plus vitest blokują każdy push i wymagane są do zmergowania do main; playwright e2e uruchamia się na wdrożonym stagingu i blokuje tylko promocję na produkcję | Szybki feedback na każdy push, e2e testuje realnie działającą aplikację, nic nie trafia na produkcję bez zielonego e2e (basis: rozmowa projektowa, pytania "Bramka testów" i "Ochrona main") |
| Wdrożenie i orkiestracja | GitHub Actions steruje wdrożeniem przez CLI Vercela (`vercel deploy`), osobny build per środowisko (nie promocja jednego builda na drugie); natywne automatyczne wdrożenie Vercela z Gita jest wyłączone tylko dla głównej gałęzi, inne gałęzie zachowują normalne podglądy | Eliminuje wyścig między automatycznym buildem Vercela a migracją uruchamianą w Actions, bez łamania podglądów gałęzi funkcji; unika opierania się na niepewnym mechanizmie "promocji" buildu między środowiskami o różnych zmiennych (basis: research 2026 08 28 plus cross check 2026 08 28, patrz rationale.md) |
| Migracje bazy danych | Automatyczny krok w GitHub Actions (`npm run db:migrate`), tuż przed buildem i wdrożeniem danego środowiska, w tym samym uruchomieniu workflow, na odpowiednim branchu Neon | Wykorzystuje już istniejące polecenie z `package.json`; migracja i kod idą zawsze razem, minuty, nie godziny, między migracją a wdrożeniem (basis: rozmowa projektowa, pytanie "Migracje"; zawężone po cross check, patrz rationale.md) |
| Świadomy krok produkcji | Ręcznie uruchomiony workflow (`workflow_dispatch`), który w jednym ciągu ponownie sprawdza e2e na stagingu, migruje produkcyjną bazę, buduje i wdraża osobny build produkcyjny | Świadomy, ręcznie wyzwalany krok, ale z technicznie wymuszoną bramką e2e w tym samym uruchomieniu, nie opartą tylko na dyscyplinie człowieka (basis: rozmowa projektowa, pytanie "Gate produkcji"; skorygowane po cross check, patrz rationale.md) |
| Ochrona głównej gałęzi | Wymagany pull request z przechodzącym statusem lint plus vitest przed scaleniem do main | Nic nie trafia na main, dopóki CI nie jest zielone, więc automatyczne wdrożenie stagingu zawsze startuje z działającego kodu (basis: rozmowa projektowa, pytanie "Ochrona main") |
| Zmienne środowiskowe i sekrety | Zmienne środowiskowe Vercela osobno per środowisko (staging, produkcja); sekrety GitHub Actions ograniczone do potrzeb samego pipeline (token CLI Vercela, connection stringi Neon do migracji) | Vercel zostaje źródłem prawdy dla zmiennych aplikacji z spec 0017; GitHub Actions trzyma tylko to, czego faktycznie używa sam workflow (basis: rozmowa projektowa, pytanie "Sekrety") |

## Consequences

**Positive**:
- Push na główną gałąź automatycznie buduje, testuje i wdraża na staging bez ręcznej interwencji, spełniając kryterium gotowości funkcji 3.
- Produkcja nigdy nie zmienia się bez świadomej ludzkiej decyzji (ręczne uruchomienie workflow), a bramka e2e w tym workflow jest technicznie wymuszona, nie tylko kwestią dyscypliny; zero przypadkowych wdrożeń.
- Staging ma własne, stałe dane testowe (osobny branch Neon), niezależne od danych produkcyjnych.
- Rozwiązanie w całości opiera się na narzędziach już opłaconych i działających (Vercel, Neon, GitHub), zero nowych dostawców do zarządzania.

**Negative / tradeoffs**:
- Produkcja i staging budują się osobno z tego samego commita (dwa buildy zamiast promowania jednego artefaktu), więc pipeline zużywa więcej minut CI/CD i czas do produkcji jest dłuższy niż przy prostej promocji; świadomy koszt w zamian za brak ryzyka, że build ze złymi zmiennymi środowiskowymi trafi na produkcję.
- GitHub Actions przejmuje sterowanie wdrożeniem przez CLI Vercela zamiast w pełni polegać na natywnej integracji Vercel z Gitem; automatyczne wdrożenie trzeba świadomie wyłączyć, ale tylko dla głównej gałęzi, żeby nie zepsuć podglądów innych gałęzi. Pominięcie tego kroku stworzy wyścig i podwójne wdrożenie na staging.
- Podglądy gałęzi funkcji współdzielą branch bazy danych stagingu, więc równoległa praca nad kilkoma funkcjami naraz może nadpisywać sobie nie tylko dane, ale i schemat (jedna gałąź z migracją zmienia tabele pod inną otwartą gałęzią); przy dzisiejszym małym zespole ryzyko jest niskie, ale rośnie z liczbą równoległych gałęzi i migracji niekompatybilnych wstecz.
- Custom Environments Vercela (potrzebne do trwałego środowiska staging odrębnego od produkcji) wymagają planu Pro; jeśli projekt jest dziś na niższym planie, to dodatkowy koszt miesięczny do potwierdzenia.
- Migracja produkcyjna uruchamia się tuż przed nowym kodem w tym samym uruchomieniu workflow (minuty, nie godziny), ale nowy schemat i tak przez chwilę serwuje stary kod aż build się skończy; migracje muszą być projektowane jako wstecznie kompatybilne (dodawanie, nie usuwanie/zmiana w miejscu), inaczej krótkie okno niezgodności zepsuje produkcję.

**Neutral**:
- Zespół uczy się CLI Vercela i pisania workflow GitHub Actions; trzy nowo zainstalowane Agent Skille (`github-actions-templates`, `github-actions`, `vercel-deployments-builds`) to łagodzą.
- Powstaje drugi trwały branch bazy danych Neon (staging) obok dzisiejszego produkcyjnego z spec 0017, kolejny zasób do monitorowania kosztowo.

## Follow-up

- [ ] Skonfiguruj Vercel Custom Environments (wymaga planu Pro): staging i produkcja jako dwa oddzielne, trwałe środowiska, każde z własnymi zmiennymi środowiskowymi. Podczas `/develop` zweryfikuj w aktualnej dokumentacji Vercela, czy i jak CLI pozwala kierować build do konkretnego nazwanego środowiska (np. flaga `--target`/`--environment`, dokładna nazwa nie została zweryfikowana w tym researchu z 2026 08 28), zamiast zakładać z góry składnię.
- [ ] Wyłącz albo dostosuj automatyczne wdrożenia Vercela z Gita, ale warunkowo, tylko dla głównej gałęzi (np. "Ignore Build Step" ze skryptem sprawdzającym nazwę gałęzi, nie globalne wyłączenie), żeby podglądy innych gałęzi funkcji dalej działały natywnie, a jedynym źródłem wdrożeń stagingu i produkcji było GitHub Actions.
- [x] **Blokujące przed napisaniem workflow produkcyjnego**: cross check tej specyfikacji (inny model, 2026 08 28) zakwestionował, czy "promowanie" jednego builda z jednego środowiska Vercela na inne, gdy mają różne zmienne środowiskowe, jest w ogóle udokumentowanym, wspieranym mechanizmem. Potwierdź w aktualnej dokumentacji Vercela podczas `/develop`, czy taki mechanizm istnieje; jeśli nie, zbuduj produkcję jako osobny, niezależny build tego samego commita (tak jak zapisano w tej decyzji), nie jako promocję. **Potwierdzone podczas `/develop` (2026 08 28):** oficjalna dokumentacja Vercela (Promoting a Deployment) wprost mówi, że promowanie przebudowuje wdrożenie ze zmiennymi docelowego środowiska, więc bezpiecznym mechanizmem jest osobny build per środowisko, tak jak zapisano w tej decyzji; `.github/workflows/deploy-staging.yml` i `.github/workflows/deploy-production.yml` budują niezależnie przez `vercel build`/`vercel deploy --prebuilt` z `--target=staging` / `--prod`.
- [ ] Projektuj migracje bazy danych jako wstecznie kompatybilne (dodawanie kolumn/tabel, nie usuwanie ani zmiana typu w miejscu) przynajmniej dopóki nie istnieje w pełni zautomatyzowany, atomowy krok migracja plus wdrożenie; krótkie okno między migracją a wdrożeniem w tym samym uruchomieniu workflow inaczej może zepsuć produkcję (basis: cross check tej specyfikacji, 2026 08 28).
- [ ] Załóż drugi trwały branch Neon "staging" (oddzielny od dzisiejszego brancha produkcyjnego z spec 0017) i wygeneruj jego `DATABASE_URL`/`DATABASE_URL_UNPOOLED`. **Częściowo zrobione podczas `/develop` (2026 08 28):** branch `staging` (`br-dawn-tree-b1n3f9lb`) założony w projekcie Neon `modularhub`; connection stringi trzeba jeszcze pobrać z konsoli Neon i dodać jako sekrety GitHub Actions (patrz zadanie niżej o sekretach).
- [ ] Dodaj sekrety GitHub Actions: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, connection string Neon (staging), connection string Neon (produkcja). Rozważ nazwane GitHub Environments "staging"/"production" czysto jako kontener na te sekrety, bez reguł ochrony (te zostały świadomie odrzucone jako mechanizm bramy, patrz rationale.md Option 3).
- [ ] Ustaw ochronę gałęzi `main` w ustawieniach repo GitHub: wymagany pull request, wymagany przechodzący status check z workflow lint plus vitest.
- [x] Skonfiguruj Playwright, żeby e2e uruchamiane w pipeline celowały w URL wdrożonego stagingu (zmienna bazowego URL), nie w lokalny build. (`playwright.config.ts`, `PLAYWRIGHT_BASE_URL`; użyte w `deploy-production.yml` jako `vars.STAGING_URL`.)
- [ ] Podłącz oficjalny zdalny serwer MCP Vercela (`https://mcp.vercel.com`), zgodnie z decyzją z rozmowy projektowej: uruchom polecenie dodania zdalnego serwera MCP w swoim kliencie (np. `claude mcp add --transport http vercel https://mcp.vercel.com`, zweryfikuj dokładną składnię w swojej wersji CLI) i przejdź proces OAuth. Po podłączeniu narzędzia do zarządzania projektami, wdrożeniami i logami Vercela będą dostępne automatycznie.
- [ ] Zaprojektuj strategię rollbacku bazy danych (nie tylko kodu) na wypadek złej migracji produkcyjnej; ta decyzja pokrywa tylko rollback kodu (natywny Instant Rollback Vercela). Powiązane z zadaniem o historii branchy/PITR Neon już zapisanym w spec 0017.
- [ ] Funkcja 18 epiki Produkcja ("Testy regresyjne ścieżek krytycznych") rozbuduje dzisiejszy zestaw e2e; ten pipeline jest miejscem, gdzie te testy będą uruchamiane przed każdym uruchomieniem workflow produkcyjnego.
- [ ] Funkcja 4 epiki Produkcja ("Obserwowalność produkcyjna") doda alerty o niepowodzeniu wdrożenia/pipeline; dzisiejsza decyzja opiera się tylko na domyślnych powiadomieniach e mail GitHuba.
- [ ] Jeśli repo `stanislaw-design/modularhub-europe` kiedykolwiek stanie się prywatne, potwierdź, że nie polegasz na regułach ochrony środowiska GitHub Environments (wymagają płatnego planu dla prywatnych repo); dzisiejsza decyzja i tak ich nie używa jako bramy, więc to ryzyko dotyczy tylko ewentualnej przyszłej zmiany.

## References

**Project sources** (verifiable, in this repo):
- `docs/specs/0017-zaplecze-produkcyjne/index.md`, wybór Vercel i Neon, branch bazy na branch kodu jako przygotowanie na tę funkcję.
- `docs/scope/produkcja.md`, funkcja 3, kryterium "Done when".
- `lib/db/AGENTS.md`, konwencje `DATABASE_URL` i `DATABASE_URL_UNPOOLED`.
- `package.json`, istniejące polecenia `lint`, `test`, `test:e2e`, `db:migrate`.

**Practices & standards**:
- Bramkowanie wdrożenia testami przed przypisaniem domeny produkcyjnej.
- Trwały branch bazy per środowisko jako wzorzec izolacji danych testowych od produkcyjnych.

**Links** (web verified 2026 08 28, pełny zapis researchu: `docs/.agent-cache/research/ci-cd-i-srodowiska.md`):
- Vercel, Deployment Checks: https://vercel.com/docs/deployment-checks
- Vercel, środowiska (Custom Environments): https://vercel.com/docs/deployments/environments
- Vercel, promowanie wdrożenia: https://vercel.com/docs/deployments/promoting-a-deployment
- Neon, automatyzacja branchowania przez GitHub Actions: https://neon.com/docs/guides/branching-github-actions
- Oficjalny zdalny serwer MCP Vercela: https://vercel.com/docs/agent-resources/vercel-mcp

Pełna lista zweryfikowanych linków i porównanie opcji: patrz [rationale.md](rationale.md).
