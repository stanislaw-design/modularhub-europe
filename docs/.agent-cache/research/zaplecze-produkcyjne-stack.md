# Production Backend Stack Research (2026)
**Date**: August 28, 2026 | **Project**: ModularHub Europe | **Framework**: Next.js 16 App Router + TypeScript

---

## 1. DATABASE

| Option | What it is | EU Region | Key Tradeoff | 
|--------|-----------|-----------|--------------|
| **Neon** (RECOMMENDED) | Serverless Postgres, database branching, HTTP driver for edge | US-based (need to verify EU region via docs) | No UI/auth included; clean database-only approach |
| Supabase | Postgres + Auth + Storage + Functions (Firebase alternative) | EU regions available (need to verify) | More integrated, higher initial complexity; full platform lock-in |
| PlanetScale | MySQL serverless (branching, edge-ready) | US-based | MySQL not Postgres; different ecosystem |

**Best for ModularHub**: **Neon** — serverless architecture, Vercel-native integration (already connected via MCP), database branching for CI/CD, Free tier sufficient for prototype→production transition, clean separation of concerns.

---

## 2. AUTHENTICATION

| Option | What it is | EU/GDPR | Key Tradeoff |
|--------|-----------|---------|--------------|
| **Better Auth** (RECOMMENDED) | Open-source, TypeScript-first, self-hosted capable, minimal setup | Self-hosted = full EU data residency control | Smaller ecosystem than Clerk; newer (stability track record vs established) |
| Clerk | Managed SaaS, fastest integration, pre-built UI, MFA out-of-box | US-based SaaS; EU data residency via business agreement only | Premium pricing ($25/mo free tier cap); vendor lock-in |
| Auth.js v5 | Open-source, mature, requires session DB, callback-based | Self-hosted = full EU data residency control | Requires database schema + session management; more manual setup |
| Supabase Auth | Integrated with Supabase, RLS policies for fine-grained auth | With Supabase EU region | Couples auth to Supabase; less portable |

**Best for ModularHub**: **Better Auth** (or Auth.js v5 as fallback) — open-source, self-hostable for GDPR compliance, minimal bundle overhead, modern TypeScript DX, emerging clear winner in 2026 for independent teams.

---

## 3. FILE STORAGE

| Option | What it is | EU Region | Key Tradeoff |
|--------|-----------|-----------|--------------|
| **Cloudflare R2** (RECOMMENDED) | S3-compatible, $0.015/GB-mo + 10GB free tier, zero egress fees | Global, including EU regions | 5x more popular than Vercel Blob; requires AWS SDK/S3 compatibility layer |
| Vercel Blob | 20 regions, edge-distributed, simplest Next.js API, OIDC auth | EU regions available (verify specifics) | 5x less popular; cost advantage to R2 at scale; vendor lock-in to Vercel |
| Supabase Storage | AWS S3 backend, RLS integration, 500MB free / Pro $25/mo | With Supabase EU region | Couples storage to Supabase; lower free tier; tighter auth integration (may not be needed) |
| AWS S3 | Industry standard, global, highest complexity | EU regions (Frankfurt, Ireland) | Highest operational overhead; pricing granularity |

**Best for ModularHub**: **Cloudflare R2** — zero egress fee eliminates runaway costs for photo/floorplan delivery, S3-compatible so portable, free 10GB tier, growing ecosystem. (Alt: Vercel Blob if already all-in on Vercel's stack; R2 wins on egress economics for media-heavy marketplace.)

---

## 4. PRODUCTION HOSTING

**Current**: Vercel Pro (demo deployed)

| Consideration | Finding |
|---------------|---------|
| **Reason to stay** | Neon integrated with Vercel natively; existing workflow; no egress charges for Vercel Postgres (now Neon) within ecosystem; functions cold-start optimized. |
| **Reason to reconsider** | Vercel is US-incorporated; subject to US CLOUD Act; **not on Data Privacy Framework (DPF) list as of early 2026**; GDPR-sensitive deployments should use EU-region functions + separate EU-hosted DB (not default). |
| **Recommendation** | **Stay on Vercel for now** (no red flags for a small pilot; GDPR complexity deferred to a later decision point). Configure functions to EU regions (fra1, cdg1, dub1, lhr1) if handling sensitive personal data; consider Railway/Render later if US data access becomes a legal blocker. |

---

## 5. ORM / DATA ACCESS LAYER

| Option | What it is | Serverless Edge | Key Tradeoff |
|--------|-----------|-----------------|--------------|
| **Drizzle ORM** (RECOMMENDED) | 31-33KB, 0 dependencies, SQL-centric, no code generation | Native edge support, 40ms cold start | SQL-first means less abstraction; ORM learning curve vs Prisma ecosystem |
| Prisma | Mature, high-level abstraction, multi-DB | Prisma 7 works on edge (Prisma Accelerate needed); 200ms+ cold starts from ~800KB bundle | Bundle size penalty; Prisma Accelerate adds cost; code generation slows dev loop |

**Best for ModularHub**: **Drizzle ORM** — serverless-optimized (critical for Vercel edge functions), 5x smaller bundle, no code generation step, full SQL control needed for GDPR audit queries, emerging as standard for Next.js 16 new projects in 2026.

---

## GDPR / EU DATA RESIDENCY SUMMARY

**Current stack legal posture**:
- **Hosting**: Vercel (US corporation, not DPF-listed); functions can be deployed to EU regions, but parent company is US-based → CLOUD Act exposure.
- **Database**: Neon (US company); verify EU region availability in full Neon docs.
- **Auth**: Better Auth / Auth.js (self-hosted) = **full EU residency control**; Clerk / Supabase = managed with contractual DPA.
- **Storage**: Cloudflare R2 / Vercel Blob both claim EU regions; R2 is global edge + allows EU data residency policies.

**Recommendation**: For pilot/MVP (current stage), Vercel + Neon + Cloudflare R2 + Better Auth is acceptable under GDPR if data handling is documented and DPA/SCC agreements in place. For future production with strict EU-only data residency: switch to self-hosted (Railway/Render in EU) + Better Auth (self-hosted in EU) + R2 (configured for EU buckets).

---

## SOURCES & LINKS (Verified, August 2026)

- https://dev.to/whoffagents/neon-vs-supabase-vs-planetscale-managed-postgres-for-nextjs-in-2026-2el4
- https://getautonoma.com/blog/supabase-vs-neon
- https://www.buildmvpfast.com/compare/neon-vs-vercel
- https://makerkit.dev/blog/tutorials/better-auth-vs-clerk
- https://clerk.com/articles/nextjs-authentication-guide-2026
- https://workos.com/blog/nextjs-app-router-authentication-guide-2026
- https://www.wmtips.com/technologies/compare/cloudflare-r2-vs-vercel-blob/
- https://agentdeals.dev/storage-comparison-2026
- https://www.buildmvpfast.com/compare/supabase-vs-r2
- https://dev.to/pockit_tools/drizzle-orm-vs-prisma-in-2026-the-honest-comparison-nobody-is-making-3n6f
- https://makerkit.dev/blog/tutorials/drizzle-vs-prisma
- https://www.buildmvpfast.com/blog/drizzle-vs-prisma-orm-typescript-nextjs-2026
- https://sota.io/blog/vercel-eu-alternative-gdpr-cloud-act-2026
- https://www.flowconsent.com/en/services/hosting/vercel
- https://vercel.com/docs/security/compliance
- https://neon.com/pricing
- https://supabase.com/pricing
- https://clerk.com/pricing
- https://developers.cloudflare.com/r2/pricing/
- https://orm.drizzle.team/docs/overview
- https://vercel.com/docs/vercel-blob

---

## STACK RECOMMENDATION (Quick Summary)

**For ModularHub MVP→Production transition**:

| Layer | Pick | Why |
|-------|------|-----|
| Database | Neon | Native Vercel integration, serverless, database branching for CI/CD, free tier carries to launch |
| Auth | Better Auth | Open-source, self-hostable (EU control later), TypeScript-first, minimal ops |
| File Storage | Cloudflare R2 | Zero egress, $0.015/GB-mo, free 10GB, S3-compatible (portable) |
| Hosting | Vercel (stay) | Neon integration, no egress overhead; acceptable for MVP; defer EU-only if data sensitivity grows |
| ORM | Drizzle | 31KB bundle, serverless-optimized cold starts, SQL control, no code generation |

**Ship next week**: Neon + Better Auth + R2 + Drizzle on Vercel. **Revisit in 2–3 months**: If GDPR compliance becomes mandatory (data classification), migrate hosting to EU-region Railway/Render + Better Auth self-hosted.
