# Tool Discovery: Sentry & PostHog Agent Skills & MCP Servers

**Date:** 2026-08-31  
**Project:** ModularHub Europe  
**Discovery Scope:** Agent Skills and MCP servers for Sentry (error tracking) and PostHog (product analytics)

---

## Sentry

### Agent Skill Candidates

All verified via `npx skills find sentry`:

1. **getsentry/sentry-for-ai@sentry-nextjs-sdk**  
   - Source: `getsentry/sentry-for-ai` repository  
   - Purpose: Full Sentry SDK setup for Next.js applications (App Router compatible)  
   - Installs: 3K+ (subset of sentry-sdk-setup skill family)  
   - Status: Confirmed available via `npx skills add getsentry/sentry-for-ai@sentry-sdk-setup --list`

2. **getsentry/sentry-for-ai@sentry-sdk-setup**  
   - Source: `getsentry/sentry-for-ai` repository  
   - Purpose: Umbrella skill covering SDK setup across platforms; includes sentry-nextjs-sdk  
   - Installs: 3.2K  
   - Status: Confirmed; recommended entry point

3. **getsentry/sentry-for-ai@sentry-node-sdk**  
   - Purpose: Sentry SDK setup for Node.js/server environments  
   - Status: Available in same repo

4. **getsentry/sentry-for-ai@sentry-workflow**  
   - Purpose: Sentry error tracking workflow integration  
   - Installs: 3.7K  
   - Status: Confirmed

5. **getsentry/skills@security-review**  
   - Purpose: Security review capability (not primary Sentry focus)  
   - Status: Available but secondary

### MCP Server Candidates

**None found.** No official Sentry MCP server located in deferred tools, system registry, or via naming conventions.

---

## PostHog

### Agent Skill Candidates

All verified via `npx skills find posthog`:

1. **posthog/posthog-for-claude@posthog-instrumentation**  
   - Source: `posthog/posthog-for-claude` repository  
   - Purpose: Automatically add PostHog analytics instrumentation to code; triggers on tracking/events/feature-flags queries  
   - Installs: 1.8K  
   - Status: Confirmed available via `npx skills add posthog/posthog-for-claude@posthog-instrumentation --list`

2. **posthog/posthog@implementing-agent-modes**  
   - Purpose: Implement PostHog in agent modes (feature flags, A/B testing)  
   - Installs: 2.6K  
   - Status: Confirmed

3. **posthog/ai-plugin@querying-posthog-data**  
   - Purpose: Query PostHog analytics data and dashboards  
   - Installs: 228  
   - Status: Confirmed

4. **posthog/skills@posthog-debugger**  
   - Purpose: Debug PostHog event tracking and data issues  
   - Installs: 210  
   - Status: Confirmed

5. **posthog/skills@posthog-survey-creator**  
   - Purpose: Create in-app surveys via PostHog  
   - Installs: 153  
   - Status: Confirmed

6. **posthog/skills@posthog-onboarding**  
   - Purpose: PostHog onboarding flows  
   - Installs: 146  
   - Status: Confirmed

### MCP Server Candidates

**None found.** No official PostHog MCP server located.

---

## Already Installed / Declined

**None.** Both Sentry and PostHog are new tools being integrated.

---

## Recommendations

**For Sentry:**  
- Primary skill: `getsentry/sentry-for-ai@sentry-sdk-setup` (covers Next.js 16 App Router setup)  
- Secondary: `getsentry/sentry-for-ai@sentry-workflow` (for error triage/workflow)  

**For PostHog:**  
- Primary skill: `posthog/posthog-for-claude@posthog-instrumentation` (instrument events in codebase)  
- Secondary: `posthog/ai-plugin@querying-posthog-data` (query dashboards post-integration)  

**MCP Access:**  
- Neither tool has a published MCP server. Dashboard access will require SDK setup → live data in app, not live MCP queries to external dashboards.
