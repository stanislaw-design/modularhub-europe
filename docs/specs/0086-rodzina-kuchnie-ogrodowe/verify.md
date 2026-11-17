# Verify: kuchnie ogrodowe · spec 0086 · updated 2026-11-17 (left panel with filters added)
_Steps derived from spec 0086 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `/pl/outdoor-kitchen` → one h1 "Kuchnie ogrodowe", intro, breadcrumb (Strona główna / Kuchnie ogrodowe), section "Kuchnie w obudowie" with 4 cards and "Zestawy modułowe" with 6 cards, each sorted by price from lowest → AC-12
- [ ] Open `/en/outdoor-kitchen`, `/de/outdoor-kitchen`, `/nl/outdoor-kitchen` → 200, h1 "Outdoor kitchens" / "Outdoorküchen" / "Buitenkeukens" → AC-12
- [ ] Left panel on `/pl/outdoor-kitchen` like `/sauna`: family switcher (Domy / Więcej niż dom, Rodzaj: Kuchnie), then Rodzaj kuchni, Cena od, Sortuj and "Szukaj" (owner decision 2026-11-17, extends AC-14) → AC-14
- [ ] Choose "Zestaw modułowy", "7 500 do 10 000 €", "Cena malejąco", click Szukaj → URL `?type=modular&priceMin=7500&priceMax=10000&sort=price-desc`, only Premium 360; "Wyczyść filtry" returns to the bare URL → AC-14
- [ ] A filtered view has `<meta name="robots" content="noindex, follow">` and no ItemList; canonical stays `/pl/outdoor-kitchen`; unknown parameters (`?x=1&type=island`) are ignored → AC-14
- [ ] A filter with no match (for example box kitchens up to 5 000 €) shows "Żadna kuchnia nie pasuje do wybranych filtrów." with a clear filters link → AC-14
- [ ] Unpublish all kitchens on a disposable branch (or mock `getOutdoorKitchens` to return []) → `/pl/outdoor-kitchen` returns 200 with the empty state and a link to `/pl/results` → AC-13
- [ ] Open `/pl/outdoor-kitchen/sky-kitchen-prestige-set` in pl, en, de, nl → 200, gallery, name, producer "Wooden Dream House", price "15 600 € netto" with the VAT note, "Wyślij zapytanie" button → AC-6
- [ ] Open `/pl/outdoor-kitchen/nie-ma-takiej` → 404; open `/pl/outdoor-kitchen/<a sauna slug>` → redirect to `/pl/sauna/<slug>` → AC-6
- [ ] On any WDH kitchen, section "Wymiary i wyposażenie" shows "340 × 90 × 240 cm", internal "300 × 80 × 220 cm", five equipment rows with "w cenie" / "za dopłatą" / "brak" (icon plus text), "Zamykana: tak" and the standard list; on Premium 300 only "300 cm" → AC-7
- [ ] On `/pl/outdoor-kitchen/premium-360` choose "Wyspa" → price changes from 8 750 € to 10 554 € → AC-8
- [ ] On `/pl/outdoor-kitchen/compact-240` choose "Azzurro" → price changes from 4 554 € to 4 880 € → AC-8
- [ ] On `/pl/outdoor-kitchen/sky-kitchen-wood` choose "Lodówka" → it shows "cena na zapytanie", the price stays 6 500 € and a note says the add on is priced in the offer → AC-8
- [ ] Section "Dostawa i montaż": WDH kitchens show delivery, 600 kg and the 15 cm slab; ModularHub sets show only the delivery note → AC-9
- [ ] On `/pl/outdoor-kitchen/premium-360` the producer reads "ModularHub Europe" with no link and no "O partnerze" section; on a WDH kitchen the partner section shows → AC-10
- [ ] View source of a product page → canonical to itself, hreflang pl/en/de/nl plus x-default, translated title and description, JSON-LD `Product` with `brand.name` "ModularHub Europe" (for a set) and `offers.priceCurrency` "EUR" → AC-10, AC-11
- [ ] View source of `/de/outdoor-kitchen` → canonical, four hreflang links, JSON-LD `ItemList` with 10 product URLs → AC-14
- [ ] Home page hero, tab "Więcej niż dom" → link "Kuchnie ogrodowe" to `/pl/outdoor-kitchen`; same link in the header menu (Katalog) and the footer; sauna and Outdoor TV links unchanged → AC-15
- [ ] Open `/pl/results?family=outdoor-kitchen` → 10 kitchen cards linking to `/pl/outdoor-kitchen/...`; `/pl/results?family=wiecej-niz-dom` includes kitchens → AC-15
- [ ] Send an inquiry from a kitchen page through `/pl/inquiry` → neutral labels; the created case gets the start cards "miejsce_ustawienia", "liczba_sztuk", "termin" → AC-17
- [ ] `/pl/verified-manufacturers` and the home producer showcase do not list "ModularHub Europe"; `/pl/producers/5d4b2662-168d-5a6d-a450-935505789db1` returns 404 → AC-18
- [ ] Sign in as a Wooden Dream House producer, open the product list → the four kitchens show "Zarządza ModularHub" with no edit or delete buttons; opening `/pl/producer/panel/products/<kitchen id>/edit` sends you back to the list; the "add product" wizard offers only dom, spa and containers → AC-19
- [ ] Spot check `/pl/sauna`, `/pl/commercial-displays`, `/pl/results` and a house page → unchanged → AC-20

## Commands
- [ ] Query the dev DB: `select enum_range(null::product_family)` contains `outdoor-kitchen`; `producer.is_platform_brand` exists, default false → AC-1, AC-4
- [ ] `npm run import:outdoor-kitchens -- --dry-run` → validates all 10, writes nothing → AC-1, AC-5
- [ ] `npm run import:outdoor-kitchens` twice; row counts for products (10), variants (10), product translations (30), options (38), option translations (114), photos (21), covers (10), brand producer (1), brand user (1) are the same after the second run → AC-2
- [ ] Query: kitchen prices in EUR are 4 554, 6 500, 6 500, 6 827, 7 328, 7 448, 7 500, 8 750, 10 813, 15 600 → AC-2
- [ ] Query: the brand producer has `nip = 'MHE-OWN'`, `is_platform_brand = true`, user role `producer`, e-mail ending `.invalid` → AC-4
- [ ] `npm run check:translations` → "Brak braków w tłumaczeniach" (includes the new kitchen technicalSpecs section) → AC-3
- [ ] `npx vitest run scripts/data/outdoor-kitchens-catalog.test.ts` → passes, including the supplier name check on every field, slug and R2 file name → AC-1, AC-5
- [ ] `npx vitest run lib/product-technical-specs.test.ts lib/data/translated-specs.test.ts lib/outdoor-kitchen-sections.test.ts lib/product-family-groups.test.ts lib/translations/gaps.test.ts` → passes → AC-1, AC-3, AC-7, AC-12, AC-15, AC-19
- [ ] Call `updateProducerProduct`, `deleteProducerProduct`, `createVariant`, `uploadProductPhoto`, `generateProjectTranslations`, `recognizeRoomLayout`, `extractStandardsFromMaterial` and `upsertProductEnvelopeParameter` as the WDH producer for Sky Kitchen Wood → each returns the same error as for a missing product and the DB is unchanged → AC-19
- [ ] `curl -s localhost:3000/sitemap.xml | grep -c outdoor-kitchen` → 44 (4 category URLs plus 40 product URLs) → AC-16
- [ ] Full `npx vitest run` (run from PowerShell, not Git Bash) → passes; family enumeration tests were updated for the new family → AC-20

## Acceptance-criteria coverage
- AC-1: DB enum query, dry run, schema tests · AC-2: double import counts, price query · AC-3: check:translations · AC-4: brand producer query · AC-5: catalog test · AC-6: product page in four languages, 404 and redirect · AC-7: dimensions and equipment section · AC-8: island, Azzurro, WDH add on · AC-9: delivery section · AC-10: brand producer display and JSON-LD · AC-11: product page metadata · AC-12: category page sections · AC-13: empty state · AC-14: category metadata and ignored parameters · AC-15: hero, menu, footer, results · AC-16: sitemap · AC-17: inquiry start cards · AC-18: producer lists and profile 404 · AC-19: producer panel and server actions · AC-20: other families and full test run
