# 0019. CI/CD i środowiska: uzasadnienie

## Context

ModularHub Europe nie ma dziś żadnego pipeline CI/CD. Kod trafia na Vercel przez natywną integrację z Gitem (build się odpala automatycznie), ale nikt nie uruchamia lintu, testów jednostkowych (vitest) ani e2e (playwright) automatycznie przy push, i nie ma osobnego środowiska staging odróżnionego od produkcji. `npm run test`, `npm run test:e2e` i `npm run lint` istnieją tylko jako polecenia lokalne. Repo `stanislaw-design/modularhub-europe` jest publiczne na GitHubie, bez skonfigurowanego `.github/workflows/`.

Funkcja 3 epiki Produkcja ("CI/CD i środowiska") ma jasno zapisane kryterium gotowości: push na główną gałąź uruchamia build i testy automatycznie, wdrożenie na staging jest automatyczne, a wdrożenie na produkcję wymaga świadomego kroku. To fundament, na którym stoi reszta epiki: funkcja 18 (testy regresyjne ścieżek krytycznych) zakłada wprost, że pipeline z tej decyzji istnieje i uruchamia e2e przed produkcją.

Decyzja 0017 (wybór zaplecza produkcyjnego) już przygotowała grunt: Neon Postgres wspiera osobny branch bazy na branch kodu, i jej Consequences wprost wskazują tę funkcję jako miejsce, gdzie ten mechanizm zacznie być używany. Ta decyzja nie wybiera nowego hostingu ani nowej bazy danych, tylko sposób, w jaki istniejący Vercel, Neon i GitHub współpracują w zautomatyzowanym pipeline.

Zespół jest mały (pojedynczy inżynier plus AI), bez twardego terminu ani budżetu narzuconego z zewnątrz (ustalone przy planowaniu epiki Produkcja), z pilotażem ograniczonym do Polski. To wyklucza rozwiązania wymagające dedykowanego zespołu platformowego albo płatnych, ciężkich narzędzi enterprise. RODO nie tworzy tu nowego wymogu wprost (żadne dane osobowe nie przepływają przez sam pipeline), ale sposób przechowywania sekretów (connection stringi do bazy z danymi osobowymi) musi być spójny z już przyjętą zasadą trzymania danych w Unii Europejskiej.

## Options considered

### Option 1: GitHub Actions jako orkiestrator, osobny wymuszony build produkcyjny, jeden trwały branch Neon per środowisko

GitHub Actions prowadzi cały pipeline (lint, testy, migracja, wdrożenie przez CLI Vercela), a nie tylko raportuje wyniki. Automatyczne wdrożenie z Gita w Vercelu jest wyłączone tylko dla głównej gałęzi (inne gałęzie zachowują normalne podglądy), żeby uniknąć wyścigu z migracją uruchamianą w Actions. Staging i produkcja to dwa trwałe środowiska, każde z własnym, nazwanym branchem bazy Neon. Podglądy gałęzi funkcji (przed zmergowaniem do main) współdzielą branch stagingu. Produkcja rusza dopiero po ręcznym uruchomieniu jednego workflow, który w jednym ciągu ponownie sprawdza e2e na stagingu, migruje produkcyjną bazę, i buduje oraz wdraża osobny, niezależny build z produkcyjnymi zmiennymi środowiskowymi (nie "promuje" buildu stagingu, patrz uwaga niżej).

**Pros**:
- Pełna kontrola nad kolejnością (test, potem migracja, potem wdrożenie), bez wyścigu między automatycznym buildem Vercela a migracją.
- Wykorzystuje w całości narzędzia już opłacone i działające (Vercel, Neon, GitHub), zero nowych dostawców.
- Staging ma własne, stałe dane, niezależne od produkcji, bez ryzyka wymieszania.
- Zgodne z przygotowaniem już zapisanym w spec 0017 (branch bazy na branch kodu).
- Bramka e2e przed produkcją jest wymuszona przez sam workflow (uruchamia się w tym samym przebiegu co migracja i wdrożenie), nie tylko przez dyscyplinę człowieka klikającego gdzieś w panelu.

**Cons**:
- Produkcja i staging budują się osobno z tego samego commita zamiast jeden artefakt być promowany na drugie środowisko, więc pipeline zużywa więcej czasu i minut CI/CD.
- Wymaga świadomego, warunkowego wyłączenia natywnego automatycznego wdrożenia Vercela tylko dla głównej gałęzi (nie globalnie), inaczej powstanie wyścig albo podwójne wdrożenie.
- GitHub Actions potrzebuje własnych sekretów (token Vercel CLI, connection stringi Neon), kolejne miejsce, gdzie dane dostępowe muszą być zarządzane.

> **Uwaga po cross check (inny model, 2026 08 28):** pierwotna wersja tej opcji zakładała ręczne "Promote to Production" w Vercelu na już zbudowanym wdrożeniu stagingu. Cross check wskazał, że promowanie jednego builda z jednego środowiska (własne zmienne, własna baza) na inne środowisko o innych zmiennych nie jest udokumentowanym, pewnym mechanizmem Vercela; realnie groziłoby to albo brakiem możliwości promocji, albo (gorzej) uruchomieniem produkcji ze zmiennymi stagingu. Poprawiona wersja buduje produkcję niezależnie, tym samym commitem, z własnymi zmiennymi, kosztem podwójnego builda. To wymaga jeszcze potwierdzenia w aktualnej dokumentacji Vercela podczas `/develop`, patrz Follow-up w `index.md`.

### Option 2: Czysto natywny Vercel, GitHub Actions tylko jako raport (Deployment Checks)

Vercel zostaje jedynym właścicielem wdrożenia przez swoją natywną integrację z Gitem (auto build i deploy na każdy push, "Staged" deployment dla głównej gałęzi bez automatycznego przypisania domeny). GitHub Actions uruchamia tylko lint i testy, a wyniki są importowane jako Vercel Deployment Checks blokujące przypisanie domeny produkcyjnej. Migracja bazy danych uruchamia się jako część komendy builda Vercela (`db:migrate && next build`), nie jako osobny krok w Actions.

**Pros**:
- Najmniej ruchomych części: jeden właściciel wdrożenia (Vercel), zero orkiestracji przez CLI z Actions.
- Migracja w komendzie builda eliminuje ryzyko wyścigu, bo build i tak jest sekwencyjny na jednej maszynie Vercela.
- Mniej sekretów do zarządzania w GitHub Actions (bez tokenu Vercel CLI).

**Cons**:
- Nie spełnia dosłownie odpowiedzi z rozmowy projektowej, w której migracja miała być krokiem w GitHub Actions, nie w komendzie builda Vercela.
- Deployment Checks to mechanizm bardziej nastawiony na blokowanie przypisania domeny niż na pełną kontrolę kolejności; mniej elastyczny przy przyszłym rozroście pipeline (np. dodatkowe kroki przed wdrożeniem).
- Mniejsza przejrzystość: sekwencja zdarzeń jest rozproszona między konfigurację Vercela i workflow Actions, trudniej to prześledzić w jednym miejscu.
- Migracja w komendzie builda uruchamia się przy każdym buildzie, w tym przy ponownych próbach po nieudanym buildzie i przy równoległych buildach podglądów gałęzi funkcji, nie tylko przy faktycznym wdrożeniu; wymaga migracji idempotentnych (bezpiecznych do wielokrotnego uruchomienia) bardziej rygorystycznie niż Option 1 (basis: cross check tej specyfikacji, 2026 08 28).

### Option 3: GitHub Environments z wymaganym recenzentem jako brama, osobna gałąź `production`

Zamiast polegać na natywnym Promote to Production Vercela, brama produkcji to reguła ochrony środowiska GitHub Environments (wymagany recenzent zatwierdza job wdrożeniowy w Actions), a wdrożenie na produkcję wyzwala push albo pull request scalający do osobnej, długo żyjącej gałęzi `production`.

**Pros**:
- Zatwierdzenie jest zarejestrowane w historii GitHub (kto, kiedy), bardziej audytowalne niż kliknięcie w panelu Vercela.
- Działa nawet bez planu Pro Vercela (bo nie korzysta z Custom Environments), repo jest dziś publiczne więc reguły ochrony środowiska są dostępne za darmo.

**Cons**:
- Dokłada osobną, długo żyjącą gałąź `production` do utrzymania w synchronizacji z `main`, kolejne źródło rozjazdu.
- Duplikuje funkcjonalność, którą Vercel już oferuje natywnie (promocja wdrożenia), więcej własnego kodu workflow do utrzymania.
- Przy zespole liczącym praktycznie jedną osobę wymóg recenzenta jest czystą formalnością bez realnej drugiej pary oczu.

## Rationale

Option 1 wygrywa, bo odzwierciedla ducha każdej odpowiedzi z rozmowy projektowej: GitHub Actions jako silnik CI, migracja jako krok w Actions, i ręczny, świadomy krok jako brama produkcji (basis: odpowiedzi inżyniera w rozmowie projektowej 2026 08 28). Żadna z tych trzech decyzji osobno nie jest kontrowersyjna, ale Option 2 i Option 3 każda łamie jedną z nich (Option 2 przenosi migrację poza Actions, Option 3 zastępuje natywne mechanizmy Vercela regułą GitHub). Ryzyko wyścigu między automatycznym wdrożeniem Vercela a migracją w Actions (zidentyfikowane podczas researchu, patrz References) jest realne, ale rozwiązywalne przez świadome, warunkowe wyłączenie automatycznego wdrożenia głównej gałęzi w ustawieniach Vercela, co i tak trzeba by zrobić w Option 1, a jest to jednorazowa konfiguracja, nie stały koszt operacyjny.

Pierwotny projekt tej opcji zakładał, że świadomy krok produkcji to dosłowne kliknięcie "Promote to Production" w Vercelu na już zbudowanym wdrożeniu stagingu. Cross check tej specyfikacji (inny model, 2026 08 28) wykazał, że jest to prawdopodobnie błędne założenie: promowanie buildu z jednego środowiska (własne zmienne, własna baza staging) na inne środowisko o innych zmiennych (produkcja) nie jest udokumentowanym, pewnym mechanizmem Vercela, i groziłoby to uruchomieniem produkcji ze zmiennymi stagingu albo brakiem możliwości promocji w ogóle. Cross check wskazał też, że bramka e2e przed produkcją, opisana jako "nic nie trafia na produkcję bez zielonego e2e", nie była niczym technicznie wymuszona: kliknięcie przycisku w Vercelu nie sprawdza, czy e2e faktycznie przeszło, to czysta kwestia dyscypliny człowieka. Zdecydowałem się skorygować decyzję: produkcja dostaje własny, niezależny build tego samego commita (nie promocję), wyzwalany ręcznie przez jeden workflow, który w tym samym uruchomieniu najpierw wymusza e2e, potem migruje, potem buduje i wdraża. To dalej spełnia "świadomy krok" z kryterium gotowości funkcji 3 (basis: `docs/scope/produkcja.md`, funkcja 3), po prostu innym, sprawdzalnym mechanizmem niż dosłownie wybrany w rozmowie, kosztem podwójnego builda i utraty dosłownej zgodności z jedną odpowiedzią z rozmowy projektowej.

Persistent branch bazy per środowisko (nie efemeryczny per PR) pasuje do małego zespołu i niskiej częstotliwości równoległych gałęzi funkcji dzisiaj; efemeryczne branche per PR (możliwe dzięki natywnym GitHub Actions Neona, patrz References) zostają świadomie odłożone jako naturalne rozszerzenie, gdy zespół urośnie (basis: przygotowanie na branchowanie bazy już zapisane w spec 0017).

## References

**Project sources** (verifiable, in this repo):
- `docs/specs/0017-zaplecze-produkcyjne/index.md`, wybór Vercel, Neon (branch per branch kodu jako przygotowanie na tę funkcję), Drizzle.
- `docs/scope/produkcja.md`, funkcja 3, kryterium "Done when".
- `lib/db/AGENTS.md`, konwencje `DATABASE_URL` (pooled) i `DATABASE_URL_UNPOOLED` (migracje).
- `package.json`, istniejące polecenia `lint`, `test`, `test:e2e`, `db:migrate`.
- Zainstalowane Agent Skille: `neon-postgres`, `drizzle` (już w projekcie), plus nowo zainstalowane `github-actions-templates`, `github-actions`, `vercel-deployments-builds`.

**Practices & standards**:
- Bramkowanie wdrożenia testami przed przypisaniem domeny produkcyjnej (basis: wzorzec "test gate przed promocją", powszechny w CI/CD dla aplikacji webowych).
- Trwały branch bazy per środowisko jako podstawowy wzorzec izolacji danych testowych od produkcyjnych (basis: Neon, wzorzec branchowania bazy danych per środowisko).

**Links** (web verified 2026 08 28, patrz też pełny zapis w `docs/.agent-cache/research/ci-cd-i-srodowiska.md`):
- Vercel, Deployment Checks: https://vercel.com/docs/deployment-checks
- Vercel, jak używać GitHub Actions z Vercelem: https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel
- Vercel, środowiska (Production/Preview/Development, Custom Environments): https://vercel.com/docs/deployments/environments
- Vercel, promowanie wdrożenia (Promote to Production): https://vercel.com/docs/deployments/promoting-a-deployment
- Vercel, Custom Environments (zmiana w produkcie): https://vercel.com/changelog/custom-environments-are-now-available-on-vercel
- Vercel, staged deployment i ręczna promocja (zmiana w produkcie): https://vercel.com/changelog/stage-and-manually-promote-deployments-to-production
- Vercel, jak skonfigurować środowisko staging: https://vercel.com/kb/guide/set-up-a-staging-environment-on-vercel
- Neon, automatyzacja branchowania przez GitHub Actions: https://neon.com/docs/guides/branching-github-actions
- Neon, integracja podglądów z Vercelem: https://neon.com/docs/guides/vercel-previews-integration
- Neon, baza danych per środowisko podglądu (wpis na blogu): https://neon.com/blog/branching-with-preview-environments
- GitHub Docs, deployments i environments (required reviewers, reguły ochrony): https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs, przeglądanie i zatwierdzanie wdrożeń: https://docs.github.com/actions/managing-workflow-runs/reviewing-deployments
- Aaron Francis, wzorzec pipeline Vercel plus GitHub Actions (wdrożenie przez CLI z `--prod` warunkowo na głównej gałęzi): https://aaronfrancis.com/2021/the-perfect-vercel-github-actions-deployment-pipeline-faa0d4ac
- Oficjalny zdalny serwer MCP Vercela: https://vercel.com/docs/agent-resources/vercel-mcp
