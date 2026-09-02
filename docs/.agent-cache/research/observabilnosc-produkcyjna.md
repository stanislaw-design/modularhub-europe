# Production Observability Research — Error Tracking & Product Analytics
## Research Date: 2026-08-31

---

## 1. ERROR TRACKING TOOLS FOR NEXT.JS 16 (App Router) ON VERCEL

### Sentry
**Status:** Fully supported for Next.js 16  
**Key Facts:**
- SDK version 8.28.0+ required for `onRequestError` hook in `instrumentation.ts`
- Next.js 16: no experimental flag needed (stable since Next.js 15)
- Free tier: 5K errors/month, 1 user, 30-day retention
- Paid plans: Team $26/mo (50K errors), Business $80/mo, Enterprise custom
- EU data center: Frankfurt, Germany (generally available across all plans)
- Source map upload: supported via `authToken` in `next.config.ts`
- Slack/email alerting: available on paid plans
- Distributed tracing: supported
- Real User Monitoring (RUM): supported

**GDPR & EU Compliance:**
- SOC 2 Type 2, ISO 27001 certified, HIPAA attestation
- EU-US Data Privacy Framework certified
- Standard Contractual Clauses for data transfers

**Next.js Integration Pattern:**
```typescript
// instrumentation.ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    });
  }
}

export function onRequestError(error, request) {
  Sentry.captureRequestError(error, request);
}
```

**Strengths:** Battle-tested, wide integration ecosystem, best-in-class documentation for Next.js  
**Considerations:** Commercial product, must choose EU region at org creation (permanent choice)

---

### Bugsnag
**Status:** Fully supported for Next.js/Vercel  
**Key Facts:**
- Supports JavaScript, React, Next.js frameworks
- Stability score metric (release-to-release trend tracking)
- Real User Monitoring (RUM) with real-time performance data
- Distributed tracing across services
- Free tier available (limits not specified in search)
- Integrates with Vercel builds for source map upload
- Slack/email alerting supported

**Strengths:** Lightweight, stability-focused, simpler UX than Sentry  
**Considerations:** Less detailed docs for Next.js specifics; smaller community

**Documentation:** https://docs.bugsnag.com/platforms/javascript/

---

### Highlight.io
**Status:** Modern, unified platform; under transition (important deadline)  
**Key Facts:**
- Combined error tracking + session replay + logging + distributed tracing (single SDK)
- Purpose-built for modern frameworks: Next.js, Remix
- Self-hosting capability (on your own infrastructure)
- GDPR compliant, privacy-focused
- Free tier available for small teams
- Open-source transparency

**CRITICAL NOTICE — March 1, 2026 Migration:**
- Acquired by LaunchDarkly (April 2025)
- Being repositioned as real-time observability layer for LaunchDarkly "Guarded Releases"
- **MIGRATION DEADLINE:** March 1, 2026 — SDK snippets must migrate to LaunchDarkly Observability or face disruption
- Existing customers should plan migration path now

**Strengths:** All-in-one observability (no need for separate session-replay tool), self-hosting option, developer-friendly  
**Considerations:** Transition period may affect API stability; migration to LaunchDarkly required by March 2026

---

## 2. PRODUCT ANALYTICS TOOLS FOR NEXT.JS 16 (App Router)

### PostHog
**Status:** Primary choice for EU-based funnel analytics  
**Key Facts:**
- Free tier: 1M analytics events, 5K session recordings, 1M feature flag requests per month (no credit card)
- 97% of users stay within free tier
- EU Cloud (PostHog Cloud EU): Frankfurt, AWS eu-central-1
- All event data, user data, product hosted on EU infrastructure
- EU Cloud pricing: same as US cloud ($0.000225/event after 1M free)
- Volume discounts: ~$0.000139/event at 50M events/month
- Next.js 16 App Router: fully supported (tested with posthog-js 1.409.x as of Aug 2, 2026)
- Funnel analysis: supported
- Session replay: included in free tier (5K recordings)
- Feature flags: supported
- CDP (customer data platform): included
- Data warehouse: included (1M rows free)

**GDPR & EU Compliance:**
- GDPR compliant
- EU Cloud automatically disables IP data capture for new projects
- Self-hosting option available (Docker)

**Next.js Integration Pattern:**
- Initialize opted out by default
- Gate capture behind existing cookie consent
- Mask sensitive input before session replay
- Route events through typed functions

**Strengths:** Most comprehensive free tier, EU-hosted by default, funnels + replays + flags in one product, 90%+ stay free  
**Considerations:** Event volume tracking required to stay within free tier

**Documentation:** https://posthog.com/pricing  
**Blog post:** https://posthog.com/blog/posthog-cloud-eu

---

### Plausible Analytics
**Status:** Privacy-first alternative (limited funnel support)  
**Key Facts:**
- Free trial: 30 days unlimited (no credit card required)
- Pricing: $9/month (Starter, 10K pageviews), $14–$19/month (Growth/Business), Enterprise custom
- EU-hosted: all visitor data exclusively on servers owned/operated by European companies, never leaves EU
- Built in Estonia, hosted on EU infrastructure
- GDPR compliant: included on all plans at no additional cost
- Funnel analysis: not a primary feature (goals/events supported, but limited funnel capability)
- Session replay: not included
- Cookieless tracking: yes, no consent banner required under GDPR/CCPA/PECR
- Open-source Community Edition available for self-hosting ($0 license cost)

**Strengths:** Simplest setup, EU-native, zero compliance headaches, lightweight  
**Considerations:** Limited funnel/event analysis vs PostHog; no session replay; higher per-site cost at scale

**Documentation:** https://plausible.io/

---

### Umami
**Status:** Open-source, self-hosted optimized  
**Key Facts:**
- Free cloud tier (Hobby): $0/month, 100K events/month on 3 sites, 6-month retention
- Paid cloud tiers: Pro $20/mo, Business $200/mo, Enterprise custom
- Self-hosted: MIT-licensed, free forever (deploy on own PostgreSQL/MySQL)
- Funnel analysis: fully supported, customizable for any pages/events
- Cookieless tracking: yes, GDPR/CCPA compliant by architecture
- No PII, no consent banner required
- Data ownership: 100% when self-hosted

**Strengths:** Complete funnel support, MIT license, 100% data ownership on self-hosted, zero compliance friction  
**Considerations:** Requires own infrastructure to host (PostgreSQL/MySQL); smaller ecosystem than PostHog

**Documentation:** https://umami.is/

---

### Vercel Analytics (Alternative, Built-in)
**Status:** Zero-friction for Vercel-hosted apps, but limited analytics depth  
**Key Facts:**
- Included in Vercel deployments (automatic Web Vitals, pageview tracking)
- Anonymous, aggregated data only
- GDPR/CCPA compliant by design
- Dashboard integrated into Vercel UI
- Limitations: no funnel analysis, no session replay, no event segmentation

**Use Case:** Quick visibility into traffic + Core Web Vitals; not suitable as primary product analytics tool  
**Documentation:** https://vercel.com/docs/analytics

---

## 3. AGENT SKILLS & MCP SERVERS

### Available for Claude Code / Next.js agents:

1. **Sentry Next.js SDK Agent Skill**
   - Enables AI agents to quickly generate Sentry setup boilerplate for Next.js projects
   - Handles `instrumentation.ts`, error boundary configuration, source map setup
   - URL: https://mcpservers.org/agent-skills/sentry/sentry-agent-skills/sentry-nextjs-sdk

2. **PostHog Next.js Integration Skill (Claude Code Marketplace)**
   - Integration pattern for PostHog analytics with Next.js App Router
   - Handles event initialization, consent gating, session tracking
   - URL: https://mcpmarket.com/tools/skills/posthog-integration-for-next-js-app-router

3. **Awesome Agent Skills MCP Server** (Broader option)
   - Universal gateway to 100+ pre-built agent skills
   - Includes Sentry and PostHog among organizations: Anthropic, Vercel, Trail of Bits, Stripe, Expo, Hugging Face
   - Production-ready MCP server for MCP-compatible clients
   - URL: https://mcpservers.org/agent-skills/author/sentry and /author/posthog

---

## RECOMMENDATION SUMMARY FOR MODULARHUB EUROPE

**Error Tracking (choose one):**
- **Primary:** Sentry (most mature for Next.js 16, EU Frankfurt data center, freemium model fits early stage)
- **Alternative:** Bugsnag (if simpler UX preferred over feature breadth)
- **Avoid:** Highlight.io (currently in transition; LaunchDarkly migration deadline March 1, 2026)

**Product Analytics (choose one):**
- **Primary:** PostHog with EU Cloud (single tool for funnels + replays + flags, 1M events free, EU-native)
- **Alternative:** Umami self-hosted (if full data ownership + cost avoidance preferred; requires own PostgreSQL)
- **Note:** Plausible is simpler/lighter but lacks funnel depth; Vercel Analytics insufficient for event funnels

**Implementation Path:**
1. Use Agent Skill `sentry-nextjs-sdk` to wire Sentry error tracking
2. Use Skill `posthog-integration-for-next-js-app-router` to wire PostHog product analytics
3. Both EU-hosted by default; both support Slack/email alerting on premium tiers
4. Proceed with GDPR/RODO consent banner implementation separately (not in scope of error/analytics tools themselves—those are pseudonymous/anonymous)

---

## Sources Checked

- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup
- Sentry Blog (EU region): https://blog.sentry.io/sentrys-eu-data-region-now-in-early-access/
- Sentry Help Center: https://sentry.zendesk.com/hc/en-us/articles/25074658211227
- PostHog Pricing: https://posthog.com/pricing & https://posthog.com/blog/posthog-cloud-eu
- PostHog Review (EU): https://europeanstack.com/software/posthog
- Highlight.io Review: https://europeanpurpose.com/tool/highlight-io & https://cubeapm.com/blog/highlight-io-pricing-and-review/
- Plausible Analytics: https://plausible.io/ & https://europeanpurpose.com/tool/plausible
- Umami Analytics: https://umami.is/ & https://setupanalytics.com/umami-analytics-privacy-first-open-source-analytics-you-can-self-host/
- Vercel Analytics: https://vercel.com/docs/analytics
- Better Stack Community: https://betterstack.com/community/comparisons/error-tracking-tools/
- PricePulse / Comparisons: https://www.pkgpulse.com/guides/vercel-analytics-vs-plausible-vs-umami-privacy-first-2026
- Agent Skills: https://mcpservers.org/agent-skills/sentry/ & https://mcpmarket.com/tools/skills/posthog-integration-for-next-js-app-router

---

**Research freshness:** 2026-08-31 (this space moves fast; re-check pricing & LaunchDarkly migration status Q1 2026)
