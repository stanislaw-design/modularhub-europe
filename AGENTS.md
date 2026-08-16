<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ModularHub Europe

## Stack

- **Language / Runtime**: TypeScript, Node.js
- **Framework**: Next.js 16 (App Router), Tailwind CSS v4
- **Key dependencies**: react 19, react-dom 19, tailwindcss v4 (`@tailwindcss/postcss`)
- **Package manager**: npm

## Build approach

Facade (najpierw pełny, klikalny interfejs na danych przykładowych; prawdziwe zaplecze podłączane ekran po ekranie w kolejnym etapie).

## Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Lint
npm run lint

# Test
npm run test         # vitest (unit/component)
npm run test:watch   # vitest, watch mode
npm run test:e2e     # playwright (E2E)
```

## Specs

Stored in `docs/specs/`. Each is a directory `docs/specs/NNNN-title/` with `index.md` (the spec itself) plus `rationale.md` and, once built, `verify.md`.

## Rules

- Tailwind CSS v4 is configured through `@theme` in `app/globals.css`, not a `tailwind.config.js`; brand tokens live in `assets/tokens/brand-v3-tokens.css` and are imported there.
- Routes use real folder segments, `app/[locale]/klient/...` and `app/[locale]/producent/...`, never a parenthesized route group in their place (two same named routes in different flows would otherwise collide on the same address).
- The locale segment `app/[locale]/` is already in place with only `pl` active; `proxy.ts` redirects unprefixed paths to `/pl` (Next.js 16 renamed `middleware.ts` to `proxy.ts`, use the new convention).
- Data access functions (even ones just reading a local mock file) are asynchronous from the start, so the second stage can swap in a real API call without changing call signatures.
- UI state that must survive a route change (e.g. country and budget from the wizard, visible on the results screen) goes through URL search params, not shared component state.
- No database, no login, no real payments in this stage; every "paid step" and file upload is a mock (see `docs/scope/scope.md`, Deferred section).
- Lint/format/pre commit tooling is not finalized yet; only Next.js's default ESLint config exists so far (tracked as scope feature 2).
- `next.config.ts` allowlists `next/image` remote patterns explicitly (`images.remotePatterns`); mock project cover images come from `picsum.photos` today, add any other external image host there before using it.

## Agent skills

- [nextjs-app-router-patterns](.agents/skills/nextjs-app-router-patterns/): `wshobson/agents`, Next.js App Router conventions (routing, server components, data loading)
- [typescript-advanced-types](.agents/skills/typescript-advanced-types/): `wshobson/agents`, advanced TypeScript type patterns for the typed mock data model
- [tailwindcss-advanced-layouts](.agents/skills/tailwindcss-advanced-layouts/): `josiahsiegel/claude-plugin-marketplace`, Tailwind v4 layout patterns (grid/flex)
- [vercel-react-best-practices](.agents/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, React/Next.js performance best practices
- [headlessui](.agents/skills/headlessui/): `bobmatnyc/claude-mpm-skills`, Headless UI (`@headlessui/react`) unstyled accessible component conventions
- [lucide-icons](.agents/skills/lucide-icons/): `aksuharun/skills`, Lucide icon usage conventions (used across the design system and StageTimeline stage/document icons)
- [vitest](.agents/skills/vitest/): `antfu/skills`, Vitest unit/component test conventions (mocking, fixtures, coverage)
- [playwright-cli](.agents/skills/playwright-cli/): `microsoft/playwright-cli`, Playwright E2E browser automation and test conventions

MCP servers: playwright (connected)

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

- [components/klient/AGENTS.md](components/klient/AGENTS.md): feature specific components for the customer buying journey (results, shortlist, plot analysis, offer, realizacja)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
