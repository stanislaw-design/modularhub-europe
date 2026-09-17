# components/klient/

Feature specific, presentational and interactive components for the customer (klient) buying journey: home search, results, shortlist/inquiry, plot analysis, binding offer, realizacja (fulfillment status). Distinct from `components/ui/`, which holds the generic, domain free design system primitives (`Button`, `Card`, `Heading`, `StageTimeline`, …) these components compose.

## Conventions

- One component per screen/concern, named after what it renders (`Hero`, `ResultsFilterBar`, `PlotDossierPanel`, `BindingOfferView`, …), not after the route.
- Server component by default; add `"use client"` only when the component holds interactive state (forms, accordions, the offer accept button, `SiteHeader`'s slide-out menu). Purely presentational components (`ResultCard`, `ResultsHeader`, `EmptyResults`, …) stay server components. A filter control that only toggles URL search params through `<Link>` (`CategoryFilterBar`, `SubcategoryFilterBar`, `FamilyTabs`) also stays a server component; `"use client"` is for filter controls that hold real client state (`ResultsFilterBar`'s local `useState` before the "Szukaj" click).
- Data flows in as typed props (`Project`, `FulfillmentOrder`, …) from the owning `app/[locale]/klient/**/page.tsx` server component, which does the `lib/data` fetch. A component calls a `lib/data`/`lib/*` getter directly only for an interaction triggered fetch after mount (e.g. `PlotAnalysisRow` calling `getPlotAnalysisResult` on the "pay" click), never for its initial render data. The one exception is client side, cross tab local data the server cannot see (e.g. producer products kept in `localStorage`, spec 0016): `ResultsSelection` reads `getAllLocalProducerProjects()` once after mount and merges it into the server rendered list, still never on the initial server render.
- Tests are co-located: `Component.test.tsx` beside `Component.tsx`, Vitest + Testing Library (`@testing-library/react`, `@testing-library/user-event`); E2E flows for the pages these components make up live in `e2e/`, Playwright.
- WCAG 2.2 AA per screen: one real `<h1>`, logical focus order, status conveyed by icon plus text (never color alone), visible `.focus-ring` on every interactive element.
- Dark mode (spec 0043, `.theme-klient` scope in `app/globals.css`): most v5 tokens invert with the theme (`v5-ink`, `v5-surface`, `v5-muted`, `v5-line` — the normal "text/card background" role), but `v5-night` and `v5-paper` stay pinned across both themes, for a fixed dark accent fill (a modal backdrop, an icon badge, a photo caption pill) paired with fixed light text/icons — reach for `v5-night`/`v5-paper` there, not `v5-ink`/`v5-surface`, or the element goes light-on-light in dark mode.

## Screens this area serves

- `dzialka/` — plot analysis and dossier: `PlotDossierPanel`, `PlotAnalysisRow`
- `oferta/` — binding offer: `BindingOfferView`
- `realizacja/` — fulfillment status axis: consumes `components/ui/StageTimeline` directly, no dedicated klient component of its own
- `wyniki/` — results list: `ResultsHeader`, `ResultCard`, `ResultsFilterBar`, `ResultsSelection`, `ShortlistActionBar`, `CategoryFilterBar`, `SubcategoryFilterBar`, `EmptyResults`
- `zapytanie/` — inquiry flow: `InquiryFlow`, `InquiryConfirmationCard`
- klient home (`page.tsx`) and shared layout — `Hero`, `SearchSegment`, `SiteHeader`
- `project/` — project details page: `ProjectVariantPicker`, `ProjectCostComparisonTable`, `ProjectRoomLayout`, `ProjectLogistics`, `ProjectTimeline`, `ProjectGalleryTabs`, `ProjectSectionNav`, `ProjectTechnicalSpecs`, `ProjectCertifications`

Governing specs: `docs/specs/0003-strona-startowa/`, `0004-wyniki-z-filtrem-prawnym/`, `0005-zapytanie-shortlista/`, `0006-analiza-dzialki-i-dossier/`, `0007-realizacja-os-statusow/`, `0016-katalog-produktow-producenta/` (the local product preview on `wyniki/`), `0026-dopracowanie-wyszukiwania-i-wynikow/` (attribute/price/subcategory filters, sort, full-text search on `wyniki/`), `0042-nowy-uklad-strony-projektu/` (`project/`), `0043-tryb-ciemny-flow-klienta/` (dark mode, this whole route group).

_Note: the route folder is `app/[locale]/(customer)/`, not a `klient/` segment; this doc's Polish screen labels above (`wyniki/`, `dzialka/`, `oferta/`, `zapytanie/`, `realizacja/`) predate that and weren't re-verified against every current folder name in this pass — worth a full /audit re-derive._

_Drafted by /sync from the introducing change, worth a quick human pass._
