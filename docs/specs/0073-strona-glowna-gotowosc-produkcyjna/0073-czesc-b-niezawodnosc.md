# 0073 część B. Niezawodność strony głównej

## Summary

Dziś trzy zapytania na stronie głównej idą w jednym `Promise.all` bez obsługi błędu, a w całej aplikacji jest tylko `global-error.tsx`. Awaria jednego zapytania (np. wyczerpany limit Neon) zastępuje całą stronę ekranem błędu. Ta część sprawia, że znikają tylko dotknięte sekcje, że puste listy nie zostawiają pustych nagłówków, że reszta serwisu ma przyjazny ekran błędu i że całość pilnuje test e2e. Kryteria AC-8 do AC-11 są w [index.md](index.md).

## Design

**Odporne ładowanie (AC-8)**
- W `app/[locale]/(customer)/page.tsx` `Promise.all` zamieniamy na `Promise.allSettled` dla `getProjects` i `getProducers`. `getCountries` jest statyczne i zostaje poza tym, bo nie dotyka bazy.
- Przy statusie `rejected` wołamy `captureError(reason, { area: "home", section: "projects" | "producers" })` z `lib/observability` (sprawdzić dokładny kształt kontekstu w `lib/observability/types.ts` i dopisać nowe wartości, jeśli typ jest zamknięty). Zmienna sekcji dostaje pustą tablicę.
- Hero, `SearchCard`, `FeaturedProjectShowcase`, `ComplianceEngineShowcase`, `HowItWorksExplainer`, `ClosingCta`, `Faq` nie zależą od tych danych i renderują się zawsze.

**Puste listy (AC-9)**
- `PopularHomes`: po filtrze `featured`, gdy lista pusta, zwraca `null`.
- `ProducerShowcase`: gdy `producers.length === 0`, zwraca `null`.
- `CompareHomesTeaser`: po `slice(0, 3)`, gdy mniej niż dwa projekty, zwraca `null`.
- Brak komunikatu "brak danych". Strona główna ma wyglądać na kompletną, nie na uszkodzoną.

**error.tsx (AC-10)**
- Nowy `app/[locale]/(customer)/error.tsx`, komponent kliencki. Przyjmuje `{ error, retry }` (w tej wersji Next.js 16 funkcja nazywa się `retry`, nie `reset`, patrz `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`).
- W `useEffect` woła `captureError(error)` z `@/lib/observability/errors` (nie z barrel, bo barrel ciągnie PostHog tylko dla serwera, wzór z `global-error.tsx`).
- Teksty z nowej przestrzeni `ErrorPage` (`heading`, `body`, `retry`, `home`) w czterech językach, przez `useTranslations`. Dwa przyciski: "Spróbuj ponownie" i link do strony głównej bieżącego języka.
- Obejmuje wszystkie trasy klienta w grupie `(customer)`. Panele i producent mają własne layouty i poza zakresem.

**Test e2e (AC-11)**
- Nowy `e2e/strona-glowna.spec.ts` (Playwright, wzór z `e2e/site-header.spec.ts`). Przebiegi `/pl` i `/de`:
  - jeden `h1` w hero,
  - `title` i `link[rel=canonical]` zgodne z językiem,
  - jeden `script[type="application/ld+json"]` z `Organization`,
  - lista krajów w wyszukiwarce w języku strony,
  - wybór budżetu i Szukaj prowadzi do `/results` z `priceMax`,
  - żaden `h2` w `main` nie jest pusty (brak sekcji z pustym nagłówkiem).
- E2E używa dev DB (`.env.local`, zgodnie z regułą AGENTS.md o `DATABASE_URL`).

**Key invariants**
- Awaria danych nigdy nie powoduje statusu 500 na stronie głównej. Błąd renderowania nieobsłużony przez `allSettled` trafia do `error.tsx`.
- Każda ukryta z powodu błędu sekcja zostawia ślad w Sentry (inaczej jest niewidoczna dla zespołu).

**Critical test scenarios**
- Test jednostkowy `page`: mock `getProjects` rzuca błąd, wynik zawiera Hero i Faq, nie zawiera "Popularne domy", `captureError` wywołane raz, verifies **AC-8**.
- Mock `getProducers` zwraca `[]`: brak sekcji producentów, verifies **AC-9**.
- Jeden polecany projekt: brak tabeli porównawczej, verifies **AC-9**.
- `error.test.tsx`: renderuje komunikat w wybranym języku, klik "Spróbuj ponownie" woła `retry`, `captureError` wołane z błędem, verifies **AC-10**.
- E2E z listy powyżej, verifies **AC-11**.

## Rationale (krótko)

`allSettled` ogranicza zasięg awarii do sekcji, a `error.tsx` łapie to, co zostaje. Bez alertu ukrycie sekcji byłoby ciche, dlatego błąd jest zawsze raportowany (ryzyko zapisane w Consequences w `index.md`).
