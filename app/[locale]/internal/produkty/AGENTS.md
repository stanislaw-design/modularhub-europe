# app/[locale]/internal/produkty/

The admin screen for managing product photos, introduced by spec 0031 (realne przechowywanie plików): `/internal/produkty` (product list with photo counts) and `/internal/produkty/[id]` (photo manager for one product). Sibling of `/internal/zapytania` (spec 0023, undocumented — see root AGENTS.md Context files), which this screen deliberately copies the auth pattern from rather than introducing a new one.

## Conventions

- Same auth gate as `/internal/zapytania`: `auth()` in the page (Server Component), redirect to `/${locale}/logowanie?callbackUrl=...` when there is no session, redirect to `/${locale}/klient` when the session's role isn't `admin`. Repeat this exact pattern for any future `/internal/*` screen rather than inventing a variant.
- Data reads (`getAllProductsForAdmin`, `getProductForAdmin`, `getProductPhotosForAdmin`) live in `lib/db/queries.ts`, not here — this directory holds only the page shells and the one interactive piece, `ProductPhotoManager.tsx`.
- `ProductPhotoManager` (Client Component) calls the server actions in `lib/product-photo-actions.ts` directly and then `router.refresh()` on success, instead of holding local optimistic state: this is a low traffic admin tool where staying in sync with the database (especially the "at most one cover photo" invariant) matters more than optimistic UI.
- Mutations go through the server actions in `lib/product-photo-actions.ts` (outside this directory, gated on `admin` role independently of the page's own gate); this directory never calls `lib/storage/` or `lib/db/` for writes directly.

Governing spec: `docs/specs/0031-realne-przechowywanie-plikow/`.

_Drafted by /sync from the introducing change, worth a quick human pass._
