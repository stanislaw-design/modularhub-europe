# Verify: poprawki nagłówka i nawigacji klienta · spec 0030 · updated 2026-09-08

_Steps derived from spec 0030 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Open `/pl/klient` at 320px, 360px, 375px, 414px and 428px viewport widths → the hamburger button is fully inside the header bar at every width, not clipped and not overflowing past the screen edge, sitting next to the logo and "Zacznij" → AC-1
- [ ] Measure the hamburger button's box at any of those widths → at least 44×44px → AC-1
- [ ] Repeat the same five widths on `/en/klient` (longest label, "Get started") → hamburger still fully visible and not clipped → AC-1, AC-7
- [ ] Open the slide out menu on `/pl/klient` → see two visually separated sections, "Nawigacja" then "Konto", each with its own heading → AC-2
- [ ] Inspect the accessibility tree (or a screen reader) for the open menu → the nav landmark and the account group each expose a distinct accessible name → AC-2
- [ ] In the open menu's Navigation group → only "Domy", "Projekty", "Jak to działa" are listed; "Producenci", "Inspiracje", "O nas" are gone → AC-3
- [ ] Click "Projekty" in the menu → navigates to `/pl/klient/wyniki` → AC-3
- [ ] Click "Jak to działa" in the menu → navigates to `/pl/klient#jak-to-dziala` and scrolls to that section → AC-3
- [ ] Open the menu while signed out → Account group shows Ulubione, a sign in link, and PL/EN/NL as three plain buttons, not a dropdown → AC-4
- [ ] Sign in as a client and open the menu → Account group shows "Mój profil" instead of the sign in link, Ulubione still present → AC-4
- [ ] Sign in as an admin and open the menu → Account group additionally shows "Panel administratora" → AC-4
- [ ] Click a language button that is not already active in the menu → navigates to the same page under that locale → AC-4
- [ ] At `sm`/`md` widths and above (desktop) → the header row's language switcher, Favorites, and sign in and profile icons are still visible inline, unchanged from before this spec → AC-5
- [ ] Open the menu at a desktop width (1024px or wider) → the Account group (Ulubione, sign in or profile, language buttons) is gone entirely from the menu, since the header row above already shows all of it → AC-5
- [ ] Open the menu at a width between `sm` and `md` (for example 700px) while signed out → Account group shows only the sign in link, not Ulubione or the language buttons (already visible in the header row from `sm`) → AC-5
- [ ] Tab to the hamburger with the keyboard, open the menu, Tab through its contents → focus stays trapped inside the dialog and every interactive element shows a visible `.focus-ring` → AC-6
- [ ] Press `Escape` with the menu open → menu closes and focus returns to the hamburger button → AC-6
- [ ] Open the menu at 320px width in `pl`, `en`, and `nl` (including the longest labels, "Panel administratora" / "Admin panel" / "Beheerderspaneel") → no text is clipped and no element overflows the panel → AC-7

## Commands

- [ ] `npx vitest run components/klient/SiteHeader.test.tsx` → 9 of 9 pass → AC-1, AC-2, AC-3, AC-4, AC-5
- [ ] `npx playwright test e2e/site-header.spec.ts` → 2 of 2 pass → AC-1, AC-2, AC-3
- [ ] `npx tsc --noEmit -p .` → no errors → all ACs (regression guard)
- [ ] `npm run lint` → no new errors or warnings in `components/klient/SiteHeader.tsx` or `messages/*.json` → all ACs (regression guard)

## Acceptance criteria coverage

- AC-1 (hamburger fits, 44×44 touch target, 320 to 428px) · covered by UI steps 1 to 3 and the e2e spec
- AC-2 (two labelled, visually separated menu groups) · covered by UI steps 4 and 5 and the Vitest suite
- AC-3 (only live nav links, `/wyniki` route) · covered by UI steps 6 to 8, the Vitest suite, and the e2e spec
- AC-4 (Account group: Ulubione, signIn, myProfile, adminPanel, language buttons) · covered by UI steps 9 to 12 and the Vitest suite
- AC-5 (desktop header row unchanged, menu Account group never duplicates it) · covered by UI steps 13 to 15 and the Vitest suite
- AC-6 (WCAG 2.2 AA: focus trap, focus ring, aria labels) · covered by UI steps 16 and 17
- AC-7 (menu content fits at 320px in pl, en, nl) · covered by UI steps 3 and 18
