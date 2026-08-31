# Verify: CI/CD i środowiska · spec 0019 · updated 2026-08-28

_Steps derived from spec 0019's "Done when" kryterium (`docs/scope/produkcja.md`, funkcja 3) i listy Follow-up. `/check verify` uruchamia te kroki; `/test` utrwala te trwałe. Wymaga wcześniej dokończonych ręcznych kroków spoza kodu (patrz Follow-up w `index.md`: Vercel Custom Environments, wyłączenie auto deploy Vercela dla main, sekrety GitHub Actions, ochrona gałęzi main)._

## UI / manual

- [ ] Wypchnij commit na gałąź funkcji (nie main) → workflow `CI` (`ci.yml`) uruchamia się automatycznie i raportuje status check          → Done when (build i testy na push)
- [ ] Otwórz pull request do main z niezielonym statusem `CI` → scalenie jest zablokowane przez ochronę gałęzi                              → Done when (main chroniony)
- [ ] Zmerguj pull request z zielonym `CI` do main → workflow `Deploy staging` (`deploy-staging.yml`) uruchamia się automatycznie          → Done when (staging automatyczny)
- [ ] Po zakończeniu `Deploy staging` odwiedź URL środowiska staging → aplikacja odpowiada i widać dane z brancha bazy `staging`, nie `production` → Done when (staging automatyczny, osobna baza)
- [ ] Ręcznie uruchom workflow `Deploy production` (`workflow_dispatch`, zakładka Actions) → job `e2e` uruchamia Playwright celując w `vars.STAGING_URL`                                    → Done when (produkcja świadomy krok)
- [ ] Job `e2e` kończy się niepowodzeniem (np. tymczasowo zepsuty test) → job `deploy` NIE uruchamia się                                    → Done when (bramka e2e wymuszona technicznie)
- [ ] Job `e2e` przechodzi → job `deploy` migruje bazę produkcyjną, buduje i wdraża osobny build z `--prod`                                → Done when (produkcja świadomy krok, osobny build)
- [ ] Po wdrożeniu produkcji odwiedź domenę produkcyjną → aplikacja odpowiada i widać dane z brancha bazy `production`                     → Done when (osobne środowiska)

## Commands

- [x] `npm run lint` → 1 błąd, niezwiązany z tą funkcją (`components/klient/SearchCard.tsx`, `react-hooks/set-state-in-effect`, sprzed tej zmiany) — blokuje dziś zielony status `CI`, do naprawy osobno       → Done when (build i testy na push)
- [x] `npm run test` → 376/376 testów przechodzi (53 pliki)                                                                                → Done when (build i testy na push)
- [x] Parsowanie YAML trzech plików workflow (`ci.yml`, `deploy-staging.yml`, `deploy-production.yml`) → poprawne                          → n/a (składnia)

## Acceptance-criteria coverage

- "Push na główną gałąź uruchamia build i testy automatycznie" — pokryte przez `ci.yml` (na każdy push) plus wymagany status check na PR do main.
- "Wdrożenie na staging jest automatyczne" — pokryte przez `deploy-staging.yml` (trigger `push: branches: [main]`), migracja bazy `staging` przed buildem.
- "Wdrożenie na produkcję wymaga świadomego kroku" — pokryte przez `deploy-production.yml` (`workflow_dispatch`), z technicznie wymuszoną bramką e2e (`needs: e2e`) przed migracją i wdrożeniem produkcji.
- Nie pokryte kodem, wymaga ręcznej konfiguracji poza repo (patrz Follow-up w `index.md`): Vercel Custom Environments (plan Pro), warunkowe wyłączenie auto deploy Vercela z Gita dla main, sekrety GitHub Actions (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `STAGING_DATABASE_URL_UNPOOLED`, `PRODUCTION_DATABASE_URL_UNPOOLED`), zmienna repo `STAGING_URL`, ochrona gałęzi main w ustawieniach GitHub, podłączenie zdalnego serwera MCP Vercela.
