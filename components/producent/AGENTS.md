# components/producent/

Feature specific, mostly interactive components for the producer (producent) side: registration, the multi step project wizard, export readiness, gap closure, inbound inquiries and offers, fulfillment/payout, company verification, and the product catalog. Distinct from `components/klient/` (customer journey) and `components/ui/` (generic design system primitives) these components compose.

## Conventions

- Almost every component here is a Client Component (`"use client"`): the producer side has no login yet, so screen state, drafts, and cross screen identity all live client side (`useState`, `localStorage`), unlike `components/klient/`'s server-by-default default.
- No server session: a producer is identified by NIP (tax id), carried through URL search params between screens (e.g. `RegistrationForm` → `/producent/projekt?nip=...&countries=...&technology=...`) and used as the `localStorage` key for drafts and saved products (`lib/producer-project-draft.ts`, `lib/producer-registration-storage.ts`, `lib/producer-products.ts`, all outside this directory). Never assume a server-known "current producer".
- Reads generic primitives from the barrel `@/components/ui` (`Button`, `Card`, `Input`, `Select`, `Stack`, …), never a deep import.
- Tests are co-located: `Component.test.tsx` beside `Component.tsx`, Vitest + Testing Library. E2E flows live in `e2e/` (`pierwszy-projekt.spec.ts`, `rejestracja-producenta.spec.ts`, `domykanie-luk.spec.ts`, `realizacja-i-wyplata.spec.ts`, …).
- WCAG 2.2 AA per screen, same bar as `components/klient/` (`aria-current="step"` on the wizard progress indicator, accessible accordions in gap closure).

## Screens this area serves

- Rejestracja (scope feature 11, `app/[locale]/producent/page.tsx`) — `RegistrationForm`, `ProducerHeader`
- Pierwszy projekt (scope feature 12, `docs/specs/0008-pierwszy-projekt/`, `app/[locale]/producent/projekt/`) — `ProjectWizard` and its steps (`ProjectWizardBasicInfoStep`, `ProjectWizardTechnicalStep`, `ProjectWizardTechnicalField`, `ProjectWizardFilesStep`, `ProjectWizardSummaryStep`), `ProjectWizardProgress`, `ProducerRegistrationBar`
- Gotowość eksportowa (scope feature 13, `docs/specs/0009-gotowosc-eksportowa/`, `app/[locale]/producent/gotowosc-eksportowa/`) — `ExportReadinessMap`, `ExportReadinessCountryRow`
- Domykanie luk (scope feature 14, `docs/specs/0010-domykanie-luk/`, `app/[locale]/producent/domykanie-luk/`) — `GapClosureView`, `GapClosureUploadSection`, `GapClosurePackageSection`
- Zapytania i oferty (scope feature 15, `app/[locale]/producent/zapytania/`) — `ProducerInquiryList`, `ProducerInquiryRow`, `ProducerOfferForm`
- Realizacja i wypłata (scope feature 16, `app/[locale]/producent/realizacje/`, `.../realizacja/`, `.../weryfikacja-firmy/`) — `ProducerFulfillmentList` (reuses `components/ui/StageTimeline`), `CompanyVerificationView`
- Katalog produktów (scope feature 18, `docs/specs/0016-katalog-produktow-producenta/`, `app/[locale]/producent/produkty/`) — `ProductCatalogList`, `ProductEditWizard`, `DeleteProductDialog`, plus the wizard's 7th step `ProjectWizardPricingStep`

Governing scope: `docs/scope/prototyp.md` features 11–18 (odd numbering: 17 is a design token feature, not producer specific).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
