# Fiverr Positioning Intelligence System Decisions

This document records architecture and product decisions for the MVP. Decisions are based on `docs/REQUIREMENTS.md`.

## Decisions Made

### Use Next.js App Router For The MVP

Decision: Build the MVP as a single Next.js App Router application.

Why:

- The repo has no existing app scaffold.
- Next.js supports frontend screens and API routes in one project.
- A single app keeps local-first MVP setup simple.
- The workflow is primarily upload, review, analyze, and render results.

Rejected alternative: separate frontend and backend services.

Reason rejected:

- It adds deployment and integration complexity before the MVP needs it.

### Use Same-App API Routes

Decision: Use Next.js route handlers for import, project, and analytics APIs.

Why:

- The MVP API surface is small.
- File import and deterministic analytics can run in the same app process.
- This keeps frontend and backend types close together.

Rejected alternative: lightweight standalone server.

Reason rejected:

- It is viable later, but unnecessary for the initial local-first MVP.

### Use SQLite For Local-First Persistence

Decision: Use SQLite as the MVP database.

Why:

- It supports local persistence with minimal infrastructure.
- It fits single-user or local analysis workflows.
- It can store raw rows, cleaned rows, row issues, and analytics snapshots.
- The schema can remain portable for a future Postgres or Supabase migration.

Rejected alternatives: Postgres and Supabase for MVP.

Reason rejected:

- They introduce external service setup before the MVP requires multi-user hosting.

### Keep Analytics Deterministic First

Decision: Implement core analytics as deterministic TypeScript functions.

Why:

- Requirements require reproducible analytics from the same imported file.
- Users need visible, explainable score components.
- Deterministic functions are easier to test with fixtures.
- This prevents hidden AI reasoning from affecting MVP scores.

Rejected alternative: AI-driven analytics.

Reason rejected:

- It would violate the MVP boundary that OpenRouter is only for later strategy and explanation features.

### Isolate OpenRouter Behind A Strategy Service

Decision: Define an OpenRouter adapter behind a future `StrategyService` interface.

Why:

- OpenRouter is approved only for later summaries, explanations, report narration, and AI-assisted strategy text.
- Isolation prevents accidental use in parsing, cleaning, scoring, or competitor grouping.
- The service can be mocked in tests.

Rejected alternative: direct OpenRouter calls from analytics or UI components.

Reason rejected:

- It would blur the boundary between deterministic analytics and AI-assisted interpretation.

### Preserve Raw Imported Values

Decision: Store raw row values separately from cleaned values.

Why:

- Users need to understand cleaning decisions.
- Row-level issues must reference the original imported values.
- Reproducibility and debugging require an audit trail.

Rejected alternative: store only normalized rows.

Reason rejected:

- It would make cleaning reports less transparent and harder to verify.

### Treat Missing Optional Values As Unknown

Decision: Missing optional fields must be displayed and processed as unknown.

Why:

- Missing imported values do not prove negative facts.
- Missing badge fields do not prove a seller has no badge.
- Missing ratings or review counts should not become zero.

Rejected alternative: convert missing numeric fields to zero.

Reason rejected:

- It would distort analytics and create unsupported conclusions.

### Exclude Duplicate Gigs From Aggregates By Default

Decision: Detect duplicates by normalized `gig_url`, show them in the cleaning report, and exclude duplicate rows from aggregate analytics by default.

Why:

- Duplicate rows can distort keyword, pricing, and opportunity scores.
- Keeping duplicates visible preserves user trust and auditability.

Rejected alternative: merge duplicate rows.

Reason rejected:

- Merging would require guessing which missing values should win, which is outside MVP scope.

### Do Not Automate Fiverr Access

Decision: The app must not scrape Fiverr, automate login, browse Fiverr pages, or fetch missing values.

Why:

- Requirements explicitly prohibit automated Fiverr scraping and login automation.
- MVP analytics must operate only on user-provided imported data.
- Avoiding live Fiverr access prevents unsupported data assumptions.

Rejected alternative: browser automation or scraper-assisted enrichment.

Reason rejected:

- It violates the product boundary and could create compliance and reliability risks.

### Do Not Infer Unsupported Fiverr Metrics

Decision: Do not infer sales, impressions, clicks, orders, conversion rates, live rankings, or demand volume outside the imported dataset.

Why:

- These fields are not supported MVP inputs.
- Review counts are not equivalent to sales or demand.
- Opportunity scores must be directional analysis, not predictions.

Rejected alternative: derive marketplace performance metrics from available fields.

Reason rejected:

- It would invent unsupported Fiverr data and undermine the deterministic MVP.

## Verification Expectations

Future implementation should verify these decisions with:

- Unit tests proving deterministic analytics are stable for fixed fixtures.
- Dependency checks or tests proving analytics modules do not import OpenRouter services.
- Import tests proving raw values and cleaned values are both preserved.
- UI checks proving no ranking or income guarantees are displayed.
