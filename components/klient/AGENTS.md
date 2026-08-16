# components/klient/

Feature specific, presentational and interactive components for the customer (klient) buying journey: home search, results, shortlist/inquiry, plot analysis, binding offer, realizacja (fulfillment status). Distinct from `components/ui/`, which holds the generic, domain free design system primitives (`Button`, `Card`, `Heading`, `StageTimeline`, …) these components compose.

## Conventions

- One component per screen/concern, named after what it renders (`Hero`, `ResultsFilterBar`, `PlotDossierPanel`, `BindingOfferView`, …), not after the route.
- Server component by default; add `"use client"` only when the component holds interactive state (forms, accordions, the offer accept button, filter controls). Purely presentational components (`ResultCard`, `ResultsHeader`, `EmptyResults`, `SiteHeader`, …) stay server components.
- Data flows in as typed props (`Project`, `FulfillmentOrder`, …) from the owning `app/[locale]/klient/**/page.tsx` server component, which does the `lib/data` fetch. A component calls a `lib/data`/`lib/*` getter directly only for an interaction triggered fetch after mount (e.g. `PlotAnalysisRow` calling `getPlotAnalysisResult` on the "pay" click), never for its initial render data.
- Tests are co-located: `Component.test.tsx` beside `Component.tsx`, Vitest + Testing Library (`@testing-library/react`, `@testing-library/user-event`); E2E flows for the pages these components make up live in `e2e/`, Playwright.
- WCAG 2.2 AA per screen: one real `<h1>`, logical focus order, status conveyed by icon plus text (never color alone), visible `.focus-ring` on every interactive element.

## Screens this area serves

- `dzialka/` — plot analysis and dossier: `PlotDossierPanel`, `PlotAnalysisRow`
- `oferta/` — binding offer: `BindingOfferView`
- `realizacja/` — fulfillment status axis: consumes `components/ui/StageTimeline` directly, no dedicated klient component of its own
- `wyniki/` — results list: `ResultsHeader`, `ResultCard`, `ResultsFilterBar`, `ResultsSelection`, `ShortlistActionBar`, `CategoryFilterBar`, `EmptyResults`
- `zapytanie/` — inquiry flow: `InquiryFlow`, `InquiryConfirmationCard`
- klient home (`page.tsx`) and shared layout — `Hero`, `SearchSegment`, `FeaturedHomes`, `HowItWorks`, `SiteHeader`

Governing specs: `docs/specs/0003-strona-startowa/`, `0004-wyniki-z-filtrem-prawnym/`, `0005-zapytanie-shortlista/`, `0006-analiza-dzialki-i-dossier/`, `0007-realizacja-os-statusow/`.

_Drafted by /sync from the introducing change, worth a quick human pass._
