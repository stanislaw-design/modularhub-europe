# 0056. Rationale: outdoor TV product family and product page

## Context

> Premise note: two things are worth naming before the decision below. First, the "outdoor-tv" database value was already added to the live enum before this spec existed, at the engineer's explicit request, because Postgres enums cannot drop a value once added. If the category's final name changes after MirageVision's meeting, that old value stays in the database forever as harmless, unused history; this is an accepted tradeoff, not an oversight. Second, this spec deliberately does not design the order, lead, and commission tracking model. That is real, load bearing work MirageVision's business terms have not settled yet, and a rushed guess now would likely need a rewrite later. It is called out here as a known gap, not solved.

ModularHub Europe already groups two non house product families, modular spa and modular container, under one "More than a house" ("Więcej niż dom") switch in search (spec 0035), on the real production database, not sample data (spec 0023). MirageVision is the first partner whose products are not built to order by a producer in the usual sense: it is a fixed catalog of a few SKUs (an American company reselling outdoor TV lift cabinets), sold under a reseller agreement with a 5 percent commission paid after delivery, confirmed by MirageVision's EMEA and APAC sales director, Martijn Roodenrijs, in writing to the engineer's team.

The one shared product detail page every other family uses today (room layout, plot and foundation, construction timeline, a producer's built house photos) does not fit a resold, ready made cabinet. A collaborative page mockup review (built as a live design canvas, styled with the project's real brand tokens and real product facts already gathered from MirageVision's own site, so both sides could look at the same thing) confirmed a materially different page: a shorter, catalog style layout with a product video and a "how it looks in real use" photo section, and no construction timeline or plot logistics at all.

The forces at play: the real content this family needs (final SKUs on offer, exact technical specification shape, final EUR pricing, who ships and who owes what warranty) waits on a meeting with MirageVision on 2026-10-02 that has not happened yet, so anything this spec locks in today must not block on facts nobody has yet; the database is real production, not sample data, so every schema choice here is close to permanent; and the existing `product`, `producer`, and `product_variant` tables already model almost everything a fixed catalog item needs (a name, a price, variants, photos, an FAQ), so the natural question was what to reuse versus what is genuinely new, not whether to build a new system from nothing.

## Options considered

### Option 1: Reuse the existing product and producer tables, add a dedicated product page route, guard the two routes against each other

Keep `outdoor-tv` as one more value of the existing `product`/`producer`/`product_variant` model. Add two small, generic columns (a producer description, a product video URL). Give the family its own page route because the shared one does not fit, and add a redirect so the two routes can never show the wrong template for a given product.

**Pros**:
- Reuses gallery, variant, pricing, inquiry, and search machinery that already works for spa and container listings, proven by two earlier families.
- Keeps one product table, so a future report, search filter, or admin screen still sees every family in one place.
- Small, additive migration (two nullable columns), safe to ship in one deployment.

**Cons**:
- Two nearly parallel product detail routes now exist long term, one house shaped, one catalog shaped, and someone has to remember which family goes where.

### Option 2: Keep everything on the existing `/project/[id]` route, branch the page by family

Add `if (family === "outdoor-tv")` branches inside the current product page instead of a new route, hiding the house specific sections the same way `hasCenaSection`, `hasDzialkaSection`, and the rest already hide missing sections today. This is what the engineer was offered first and turned down in favor of Option 1's separate route.

**Pros**:
- One route, one file, no redirect logic to build or maintain.
- The URL and SEO story stay simplest, since nothing ever needs to move a product from one route to another.

**Cons**:
- The house page's "producer realizations" section shows built houses; reusing it for a resold cabinet needs the same kind of deep reinterpretation a wholesale new section would, just squeezed inside an already large file.
- Every future non house family adds another silent branch to the same file, and the file already carries fourteen sections worth of conditional logic.

### Option 3: Model MirageVision as a fully separate subsystem, outside `product`/`producer` entirely

Give the reseller catalog its own tables, its own route, its own everything, decoupled from the family and search system this spec's earlier half already shipped.

**Pros**:
- Zero risk of a reseller specific requirement ever leaking into the shared product model.

**Cons**:
- Throws away the "More than a house" search integration already live this session (AC-1, AC-2) and forces rebuilding gallery, variant, and inquiry handling a second time.
- Creates a second, parallel catalog concept for the team to maintain forever, for a partner that is, structurally, still just a producer with one fixed catalog.

## Rationale

The house shaped page cannot host this family without either a new route or heavy internal branching; the collaborative mockup review showed the two pages genuinely differ in almost every section, not just cosmetically (hero and price card aside, nothing else carried over unchanged), which favors a clean split (Option 1) over squeezing a second identity into one already large file (Option 2). The engineer chose the separate route directly when offered this exact tradeoff.

Reusing `product`, `producer`, and `product_variant` instead of a parallel subsystem (Option 3) keeps the "More than a house" search integration this session already shipped working for free, and avoids paying twice for gallery, pricing, and inquiry handling that spa and container listings already proved out (spec 0035, spec 0039).

The two new columns are deliberately generic (`producer.description`, `product.videoUrl`) rather than named after MirageVision, because a company description and a product video are useful to any future producer or product, not a reseller specific need. This follows the same reuse instinct the engineer already applied earlier in this design: declining a new `producer.kind` column, declining a subcategory enum for the five known SKUs, and declining per product columns for a partner SKU number, all on the same "wait until a second real case needs it" basis.

The narrow scope itself (no order, lead, or commission model; no final pricing; no producer self service wizard support) is not a limitation of this option, it is a separate, deliberate choice the engineer made before this design conversation started: build only what is decidable before MirageVision's 2026-10-02 meeting, and record everything that meeting will settle as Follow up rather than guess at it now.
