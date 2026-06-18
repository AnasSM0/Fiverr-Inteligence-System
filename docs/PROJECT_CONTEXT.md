# Project Context

## Product

Fiverr Positioning Intelligence System is a local-first web app for analyzing user-provided Fiverr gig datasets. It helps sellers, freelancers, consultants, agencies, and marketplace researchers identify positioning opportunities across keywords, pricing, competitors, and feature differentiation.

## Source Of Truth

Read these docs before feature work:

- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/MVP_SCOPE.md`
- `docs/DECISIONS.md`
- `docs/GUARDRAILS.md`

Use this file only as orientation.

## MVP Workflow

```text
CSV/XLSX Import -> Data Cleaning -> Keyword Analytics -> Pricing Analytics -> Competitor Comparison -> Opportunity Matrix
```

## Planned Architecture

- Frontend: Next.js App Router.
- Backend/API: Next.js route handlers in the same app.
- Database: SQLite for local-first MVP persistence.
- Import: CSV/XLSX parser.
- Analytics: deterministic TypeScript functions.
- AI: OpenRouter adapter isolated behind a future strategy/explanation interface.

The repo is currently documentation-first. Do not create app code until feature implementation is explicitly requested.

## Supported Imported Fields

- `gig_url`
- `gig_image_url`
- `seller_profile_image_url`
- `seller_profile_url`
- `seller_name`
- `seller_badge_icon_url`
- `seller_badge_text`
- `gig_title`
- `rating`
- `review_count`
- `starting_price`
- `extra_features`

Required fields are `gig_url`, `gig_title`, and `starting_price`.

## Reports And Outputs

The MVP report outputs are:

- Import Summary
- Cleaning Report
- Keyword Report
- Pricing Report
- Competitor Report
- Opportunity Matrix
- Exportable Market Report

All outputs must be based on imported data and deterministic analytics.

## Niche And Import Metadata

Users must assign a niche during import. Every import run must have a unique import identifier, timestamp, original file name, and assigned niche. Analytics are computed per niche.

## OpenRouter Boundary

OpenRouter is out of MVP core analytics. It may be used later only for strategy explanations, report narration, recommendations, or summaries based on deterministic outputs already visible to the user.

OpenRouter must not parse files, clean rows, score keywords, score opportunities, group competitors, invent missing data, or produce ranking or income guarantees.
