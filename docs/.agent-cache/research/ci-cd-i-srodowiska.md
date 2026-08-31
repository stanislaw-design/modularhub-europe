# Research cache: CI/CD i środowiska

Data: 2026-08-28. Zebrane przez /architect przed rozmową projektową (poziom referencji: źródła plus zweryfikowane linki).

## 1. CI runner: GitHub Actions vs natywne sprawdzenia Vercela

Vercel builduje i wdraża, ale **nie uruchamia testów** (vitest/playwright) samodzielnie. Bramkowanie testów przed wdrożeniem wymaga zewnętrznego CI. GitHub Actions to standardowe, bezpłatne (w rozsądnym limicie) rozwiązanie sparowane z repo już hostowanym na GitHub.

Vercel ma też natywną funkcję **Deployment Checks**: import wyników workflow z GitHub Actions jako "Checks" blokujących przypisanie domeny do wdrożenia produkcyjnego, dopóki nie przejdą.

Źródła:
- https://vercel.com/docs/deployment-checks
- https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel
- https://aaronfrancis.com/2021/the-perfect-vercel-github-actions-deployment-pipeline-faa0d4ac (wzorzec: testy lokalnie/w Actions → wdrożenie stagingu → `vercel deploy --prod` warunkowo na głównej gałęzi)

## 2/3. Środowiska Vercela i promocja do produkcji

Vercel ma od niedawna **Custom Environments** (oprócz domyślnych Production/Preview/Development), dostępne od planu Pro (1 środowisko niestandardowe), Enterprise (do 12). Pozwala zdefiniować trwałe środowisko typu staging bez obejść.

Mechanizm "**Staged deployment**": commit trafia na główną gałąź, buduje się wdrożenie, ale domena produkcyjna nie jest automatycznie przypisywana (opcja w ustawieniach projektu, "Skip assignment of Domains to your Production Branch"). Świadomy krok: ręczne "**Promote to Production**" z listy wdrożeń, gdy staging jest zweryfikowany.

Źródła:
- https://vercel.com/docs/deployments/environments
- https://vercel.com/docs/deployments/promoting-a-deployment
- https://vercel.com/changelog/custom-environments-are-now-available-on-vercel
- https://vercel.com/changelog/stage-and-manually-promote-deployments-to-production
- https://vercel.com/kb/guide/set-up-a-staging-environment-on-vercel

## 4. Neon + CI/CD (branch bazy per środowisko/PR)

Neon ma oficjalne GitHub Actions (`create-branch`, `delete-branch`) do automatycznego tworzenia efemerycznego brancha bazy per pull request, uruchamiania migracji na nim i sprzątania po zamknięciu PR. Konwencja nazw: `preview/pr-<numer>-<nazwa-brancha>`.

Alternatywnie: oficjalna integracja Neon–Vercel automatycznie tworzy branch Neon i podłącza go jako zmienne środowiskowe dla każdego Preview Deployment Vercela, bez pisania własnego workflow.

Dla trwałych środowisk (staging, produkcja) wzorzec to jeden trwały, nazwany branch Neon per środowisko (nie efemeryczny), co pasuje do przygotowania zapisanego już w spec 0017.

Źródła:
- https://neon.com/docs/guides/branching-github-actions
- https://neon.com/docs/guides/vercel-previews-integration
- https://neon.com/blog/branching-with-preview-environments

## 5. GitHub Environments (required reviewers) jako bramka produkcji

GitHub Environments pozwalają ustawić "required reviewers" (do 6 osób/zespołów, wystarczy zatwierdzenie jednej) blokujące job dopóki ktoś nie zatwierdzi wdrożenia; opcja blokady samo zatwierdzenia też istnieje.

**Ważne ograniczenie planu**: na GitHub Free/Pro/Team reguły ochrony środowiska (required reviewers, wait timer) działają tylko dla **repozytoriów publicznych**. Dla prywatnego repo potrzebny jest GitHub Team lub Enterprise. Repo tego projektu (`stanislaw-design/modularhub-europe`) nie zostało zweryfikowane co do widoczności w tej sesji (brak `gh` CLI) — do potwierdzenia z inżynierem.

Źródła:
- https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- https://docs.github.com/actions/managing-workflow-runs/reviewing-deployments
