# Product

## Register

product

## Users

Two sides of a cross-border modular-home marketplace:

- **Klient (buyer)**: typically a first-time buyer of a prefabricated/modular house, often purchasing across a border (e.g. producer in PL, build site in DE/NL). Stakes are high — tens to hundreds of thousands of euros, months of lead time, a legal and logistical process they've never navigated before. Their job across the flow: find a house that fits budget and country rules, trust the producer and the numbers enough to send an inquiry, get the plot checked, accept a binding offer, and track the build to completion.
- **Producent (manufacturer)**: a modular-home producer expanding export reach. Their job: register, list projects, prove export readiness (certifications, per-country eligibility), and manage inbound inquiries/offers/payouts.

This task concerns the klient-side project detail page (`app/[locale]/klient/projekt/[id]`) — the screen a buyer lands on after shortlisting a house from results, right before deciding whether to send an inquiry.

## Product Purpose

A platform that carries a cross-border modular-home purchase from discovery to handover: browse eligible projects by country, compare, send one inquiry across 1–3 shortlisted houses, get the plot analyzed, receive a binding offer, and track the build via a status timeline. Success looks like a buyer confident enough in what they're seeing to send a real inquiry on a large, unfamiliar purchase — and a producer able to demonstrate export readiness without a sales team on every call.

## Brand Personality

Engineered confidence: precise, calm, competent. Black carries authority and hierarchy; orange is reserved for the one action that matters. Nothing decorative competes with the decision the screen is asking for.

On the project detail page specifically, the personality has to do three things at once for a buyer who has never made this purchase before:
- **Aspiration** — the photography should make them want *this* house, the way a good real-estate listing does, not a spec sheet.
- **Trust** — certifications, warranty, and status read as evidence, not decoration.
- **Control** — commercial terms and technical specs leave no ambiguity about what's included, what it costs, and what happens next.

## Anti-references

- **Generic e-commerce product page** (Allegro/Amazon-style): icon grid of "specs," flat and interchangeable, no tension, no sense this is a specific physical building.
- **Developer/investment prospectus PDF**: a rigid technical data table dumped on the page with zero emotional register — accurate but cold, easy to bounce off of.
- Also inherits the shared impeccable bans: no hero-metric template, no identical repeating card grids, no gradient text, no side-stripe accent borders, no glassmorphism, no modal-as-first-resort.

## Design Principles

1. **Show the house before the spreadsheet.** Photography and the emotional case for this specific home come first; dense data earns its place only after desire is established.
2. **Every technical detail answers an unasked objection.** Specs, certifications, and warranty aren't a data dump — each one exists because a first-time cross-border buyer would worry about it (is this legal here? will it actually arrive on time? what happens if something's wrong?).
3. **One hierarchy, one page.** The price + primary CTA (send inquiry) stays the anchor; everything else layers below it in the order a buyer would actually need it, not in database-field order.
4. **Confidence through clarity, not decoration.** Trust is built with real signals (producer track record, legal status, certifications) rendered plainly — never with visual flourish standing in for substance.
5. **A six-figure decision should never feel like filling out a form.** Even commercial terms and technical tables should read as a considered narrative about *this house*, not a bureaucratic checklist.

## Accessibility & Inclusion

WCAG 2.2 AA project-wide. Single `<main id="main-content">` landmark per route, reachable via a "Przejdź do treści" skip link. Every interactive element carries the shared `.focus-ring` (visible box-shadow, not native `ring-*`). Status is always paired with text and an icon, never color alone.
