# Verify: Realizacja — oś statusów (klient) · spec 0007 · updated 2026-08-14
_Steps derived from spec 0007 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Visit `/pl/klient/realizacja` with no `project` param → redirected to `/pl/klient/wyniki`, no error shown → AC-1
- [ ] Visit `/pl/klient/realizacja?project=nieznane-id` (unknown id) → redirected to `/pl/klient/wyniki`, no error shown → AC-1
- [ ] Visit `/pl/klient/realizacja?project=prj-baltyk-studio-38` (known id, no `FulfillmentOrder`) → redirected to `/pl/klient/oferta?project=prj-baltyk-studio-38` → AC-2
- [ ] Visit `/pl/klient/realizacja?project=prj-modulor-family-90` → header shows project name, producer, floor area at the same density as `BindingOfferView`'s header, then the 5-stage axis directly below → AC-3
- [ ] On that page, confirm the 5 stages render in fixed order: produkcja, transport, montaz, odbior, gwarancja → AC-3
- [ ] Confirm exactly one stage (`montaz`, matching fixture `currentStage`) is marked "Aktualny etap"; every stage before it is "Ukończono", every stage after is "Nadchodzący"; each status is shown with both an icon and text, not color alone → AC-4
- [ ] Confirm completed/current stages show their `reachedAt` date formatted via `Intl.DateTimeFormat("pl-PL")` (e.g. "4 maj 2026"); upcoming stages show no date, only the "Nadchodzący" label → AC-5
- [ ] Confirm completed/current stages list their documents (name + type icon + mock, non-functional download icon); upcoming stages show no document list → AC-6
- [ ] Visit `/pl/klient/realizacja?project=prj-karpaty-alpine-104` (fixture `currentStage: "gwarancja"`) → an order-complete banner is shown, visually separate from the normal "current stage" highlight on the gwarancja row → AC-7
- [ ] On `/pl/klient/oferta?project=<id>&address=<addr>`, click "Zaakceptuj ofertę" → the accepted state now shows a "Śledź realizację" link/button to `/pl/klient/realizacja?project=<id>` (replacing the old placeholder paragraph) → AC-8
- [ ] On the realizacja page, a "Wróć do oferty" link is present and goes to `/pl/klient/oferta?project=<id>`, matching the back-link pattern used on `/dzialka` and `/oferta` → AC-9
- [ ] Accessibility pass on `/pl/klient/realizacja`: exactly one real `<h1>`; DOM/reading order is header then stages in order; every stage status is icon + text (never color alone); every interactive element (back link, "Śledź realizację") shows the `.focus-ring` on keyboard focus → AC-10

## Commands
- [ ] `npx tsc --noEmit` → passes with no errors
- [ ] `npm run lint` → passes with no errors
- [ ] `npm run build` → succeeds; route table lists `ƒ /[locale]/klient/realizacja`

## Acceptance-criteria coverage
- AC-1 … covered by the missing/unknown `project` redirect steps
- AC-2 … covered by the known-id-without-order redirect step
- AC-3 … covered by the header density and stage order steps
- AC-4 … covered by the current/completed/upcoming status step
- AC-5 … covered by the date formatting step
- AC-6 … covered by the document list step
- AC-7 … covered by the gwarancja completion banner step
- AC-8 … covered by the BindingOfferView "Śledź realizację" step
- AC-9 … covered by the back-link step
- AC-10 … covered by the accessibility pass step
