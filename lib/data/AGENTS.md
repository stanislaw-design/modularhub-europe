# lib/data/

The mock data access layer for the Facade (prototyp) epic: typed local fixtures behind async getter functions, standing in for a real backend until [[lib/db/AGENTS.md|lib/db/]] (the real Neon/Drizzle layer) takes over screen by screen. Serves both the klient and producent sides.

## Conventions

- Every getter is `async` even though it only reads an in-memory array, per the root rule that data access functions are asynchronous from the start (so the second stage swaps only the function body, never the call signature).
- Fixture data lives under `fixtures/` (e.g. `fixtures/projects.ts`, `fixtures/eligibility.ts`, `fixtures/export-readiness.ts`, `fixtures/producer-inquiries.ts`), one file per entity, imported only by its matching top level module (`projects.ts` imports `fixtures/projects.ts`, never another entity's fixture file directly).
- `types.ts` is the single source of shared types for this layer (`Project`, `Country`, `CountryCode`, `ProductFamily`, `ProjectDraft`, …) and is imported by both `lib/data/*` getters and components in `components/klient/` and `components/producent/`; a type that only matters to one screen still belongs in the component/lib file that owns that screen, not here.
- No schema validation at this layer (Zod validation is `lib/product-technical-specs.ts`, outside `lib/data/`, for the one column shape that already varies by product family, spec 0022).
- Tests are co-located per module (`projects.test.ts`, `plot-analysis.test.ts`, `export-readiness.test.ts`, `fulfillment.test.ts`, `producers.test.ts`, `producer-inquiries.test.ts`), Vitest.
- Filtering/business logic that spans fixtures (e.g. `getProjects()`'s country eligibility join in `projects.ts`) lives inside the getter, not in the calling component; a fixture cross-reference invariant worth knowing (e.g. "conditional" counts as a usable eligibility status, not just "approved") is called out in a comment at the join, not duplicated in callers.

Governing specs: this layer predates most numbered specs (spec 0001/0002 established the pattern); individual entities are extended by whichever spec introduced them (`0004` eligibility, `0009` export readiness, `0016`/`0022` product families).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
