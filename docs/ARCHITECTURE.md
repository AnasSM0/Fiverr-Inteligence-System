# Fiverr Positioning Intelligence System Architecture

## Overview

Fiverr Positioning Intelligence System is a local-first web app for importing user-provided Fiverr gig datasets and producing deterministic positioning analytics. The MVP runs as a single Next.js application with API routes, SQLite persistence, CSV/XLSX import, and pure TypeScript analytics services.

Core analytics must not depend on OpenRouter, scraping, login automation, or live Fiverr access. OpenRouter is isolated behind a future strategy/explanation service boundary and must only operate on already-computed deterministic outputs.

## Recommended Stack

- Frontend: Next.js App Router.
- Backend/API: Next.js route handlers in the same app.
- Database: SQLite for local-first MVP persistence.
- Import parsing: CSV and XLSX parser libraries.
- Analytics: deterministic TypeScript functions.
- AI: OpenRouter adapter behind an interface, disabled for MVP core analytics.

SQLite is the MVP default because the current repo has no initialized app, no existing database, and no deployment dependency. The schema should remain portable so it can move to Postgres or Supabase later.

## Folder Structure

```text
docs/
  ARCHITECTURE.md
  DECISIONS.md
  MVP_SCOPE.md
  REQUIREMENTS.md

src/
  app/
    page.tsx
    api/
      import/
        route.ts
      projects/
        route.ts
      analytics/
        route.ts
  components/
    import/
    cleaning/
    analytics/
    competitors/
    opportunity-matrix/
    ui/
  lib/
    import/
      csv-parser.ts
      xlsx-parser.ts
      import-validator.ts
    cleaning/
      clean-gig-row.ts
      parse-rating.ts
      parse-review-count.ts
      parse-starting-price.ts
      normalize-url.ts
      normalize-text.ts
    analytics/
      keyword-analytics.ts
      pricing-analytics.ts
      rating-review-analytics.ts
      competitor-comparison.ts
      opportunity-scoring.ts
      analytics-pipeline.ts
    ai/
      strategy-service.ts
      openrouter-strategy-service.ts
    db/
      client.ts
      schema.ts
      repositories/
    types/
      gig.ts
      import.ts
      analytics.ts
      opportunity.ts

tests/
  fixtures/
  import/
  cleaning/
  analytics/
```

This is a target structure for implementation. These folders should not be created until the app scaffold is implemented.

## Data Flow

```text
User uploads CSV/XLSX
  -> API route receives file
  -> import parser reads rows
  -> header validator checks supported fields
  -> cleaning service normalizes values and records row issues
  -> persistence service stores raw rows, cleaned gigs, and issues
  -> analytics pipeline runs deterministic TypeScript functions
  -> results are stored as analytics snapshots
  -> frontend renders cleaning report, analytics, competitor comparison, and opportunity matrix
```

Flow requirements:

- The app must never fetch missing data from Fiverr or other websites.
- The same import file must produce the same cleaned rows, analytics, and opportunity scores.
- Invalid rows must remain inspectable through row-level issues.
- Duplicate `gig_url` rows must be visible in the cleaning report and excluded from aggregate analytics by default.
- Missing optional values must be represented as unknown, not as negative evidence.

## Schema Draft

The initial schema should support project-level persistence, raw import auditability, cleaned data, row-level issues, and reproducible analytics snapshots.

### `projects`

- `id`: stable project identifier.
- `name`: user-visible project name.
- `created_at`: creation timestamp.
- `updated_at`: last update timestamp.

### `imports`

- `id`: import identifier.
- `project_id`: owning project.
- `file_name`: uploaded file name.
- `file_type`: `csv` or `xlsx`.
- `file_hash`: deterministic hash for duplicate import detection.
- `status`: `uploaded`, `processed`, `failed`.
- `created_at`: import timestamp.

### `raw_import_rows`

- `id`: raw row identifier.
- `import_id`: owning import.
- `row_number`: source row number.
- `raw_data_json`: original supported and ignored columns.
- `created_at`: row ingestion timestamp.

### `cleaned_gigs`

- `id`: cleaned gig identifier.
- `import_id`: owning import.
- `raw_row_id`: source raw row.
- `is_valid`: whether row can participate in analytics.
- `is_duplicate`: whether normalized `gig_url` duplicates an earlier valid row.
- `gig_url`
- `gig_image_url`
- `seller_profile_image_url`
- `seller_profile_url`
- `seller_name`
- `seller_badge_icon_url`
- `seller_badge_text`
- `gig_title`
- `rating_raw`
- `rating_value`
- `review_count_raw`
- `review_count_value`
- `starting_price_raw`
- `starting_price_value`
- `extra_features`
- `cleaned_data_json`: normalized display values.
- `created_at`

### `row_issues`

- `id`: issue identifier.
- `import_id`: owning import.
- `raw_row_id`: source raw row.
- `cleaned_gig_id`: optional cleaned row reference.
- `severity`: `error` or `warning`.
- `field_name`: affected field.
- `code`: stable issue code.
- `message`: user-facing explanation.

### `analytics_snapshots`

- `id`: snapshot identifier.
- `project_id`: owning project.
- `import_id`: source import.
- `input_hash`: hash of valid deduplicated cleaned rows.
- `keyword_summary_json`
- `pricing_summary_json`
- `rating_review_summary_json`
- `competitor_summary_json`
- `created_at`

### `opportunity_matrix_entries`

- `id`: opportunity entry identifier.
- `snapshot_id`: owning analytics snapshot.
- `keyword_or_cluster`: displayed keyword or cluster.
- `matching_gig_count`
- `typical_price_min`
- `typical_price_max`
- `score`
- `score_components_json`
- `explanation`

## Service Boundaries

### Import Parser

Responsibilities:

- Accept CSV and XLSX files.
- Read headers and rows.
- Return raw row objects without cleaning or analytics.
- Preserve original values.

Must not:

- Fetch URLs.
- Infer missing Fiverr data.
- Run analytics.

### Import Validation And Cleaning Service

Responsibilities:

- Validate required headers.
- Normalize text and URLs.
- Parse ratings, review counts, and prices.
- Detect duplicate normalized `gig_url` values.
- Produce cleaned rows plus row-level issues.

Must not:

- Merge duplicates by guessing values.
- Treat missing optional fields as negative signals.
- Call OpenRouter.

### Persistence Service

Responsibilities:

- Store projects, imports, raw rows, cleaned gigs, row issues, and analytics snapshots.
- Preserve enough raw data to audit cleaning decisions.
- Keep query boundaries simple for local SQLite.

Must not:

- Apply business scoring logic.
- Mutate analytics outputs after snapshot creation without a new snapshot.

### Analytics Services

Responsibilities:

- Run pure deterministic TypeScript functions over valid, deduplicated cleaned gigs.
- Produce keyword analytics, pricing analytics, rating/review summaries, competitor groups, and opportunity scores.
- Expose score components.

Must not:

- Use OpenRouter.
- Use random or time-dependent scoring.
- Invent ranking, income, sales, impressions, clicks, orders, or conversion data.

### OpenRouter Strategy Service

Responsibilities:

- Provide a future interface for narrative explanations and strategy text.
- Consume already-computed deterministic analytics as input.
- Clearly label AI-assisted strategy text.

Must not:

- Participate in MVP import, cleaning, core analytics, competitor grouping, or opportunity scoring.
- Invent missing data.
- Make ranking or income guarantees.

## Analytics Pipeline

The analytics pipeline receives valid, deduplicated cleaned gigs and returns deterministic result objects.

### 1. Keyword Analytics

- Source fields: `gig_title` and `extra_features`.
- Normalize by lowercasing, trimming, and removing separator punctuation.
- Remove documented stop words.
- Count keyword frequency across gigs.
- Track source fields and matching gig IDs for each keyword.

### 2. Pricing Analytics

- Source field: parsed `starting_price_value`.
- Calculate min, max, mean, median, quartiles, and price bands.
- Derive low, mid, and high bands from dataset percentiles.
- Segment pricing summaries by keyword when enough rows exist.

### 3. Rating And Review Analytics

- Source fields: parsed `rating_value` and `review_count_value`.
- Summarize only rows with valid values.
- Keep missing values as unknown.
- Avoid sales or demand inference beyond imported review counts.

### 4. Competitor Comparison

- Group comparable gigs by keyword overlap and price band.
- Compare imported values side by side.
- Surface gaps in pricing, rating, review count, keyword coverage, seller badge text, and feature terms.
- Do not claim live marketplace rank.

### 5. Opportunity Matrix

- Score keyword or keyword-cluster opportunities using visible components:
  - keyword frequency proxy from imported dataset frequency.
  - competition proxy from matching gig count and review-count concentration.
  - price gap from visible price spread or underserved bands.
  - rating gap from rating variation where available.
  - feature differentiation gap from feature-term coverage.
- Label results as directional analysis.
- Store score components with each final score.

## Testing Strategy

### Unit Tests

- CSV and XLSX parser behavior with supported headers, unknown columns, missing required fields, and empty files.
- Cleaning functions for text, URLs, ratings, review counts, prices, missing values, and duplicates.
- Analytics functions using fixed fixtures to verify reproducible keyword, pricing, competitor, and opportunity outputs.
- OpenRouter adapter tests should use mocks and must prove core analytics do not import or call AI services.

### Integration Tests

- Import API route accepts valid files and returns cleaning report data.
- Import API route rejects files with no recognized supported fields.
- Partial import keeps valid rows while reporting invalid rows.
- Analytics endpoint returns stable snapshots for the same cleaned input.

### UI Tests

- Upload flow displays cleaning report before analytics.
- Analytics views show unknown optional values clearly.
- Opportunity matrix exposes score components.
- The interface does not present ranking guarantees or income guarantees.

## Verification Commands

These commands should be used once the Next.js project scaffold exists:

```bash
npm run lint
npm run test
npm run build
```

Targeted verification examples after test scripts exist:

```bash
npm run test -- import
npm run test -- cleaning
npm run test -- analytics
```

Before the app scaffold exists, documentation verification is limited to reading the Markdown files and checking that requirements, architecture, scope, and decisions remain aligned.

## Risks

- Malformed CSV/XLSX files may produce confusing row-level errors if validation messages are not precise.
- Ambiguous currency formats may cause pricing confusion because MVP does not perform currency conversion.
- Duplicate handling can affect aggregates if users expect duplicate rows to be counted.
- Missing optional fields may be misread as negative signals unless the UI consistently displays unknown.
- Oversized uploads may exceed local processing limits without explicit file size and row count constraints.
- OpenRouter integration may leak into analytics unless service boundaries and tests enforce isolation.
- Future feature pressure may introduce unsupported Fiverr assumptions, scraping, or ranking claims.
- SQLite is appropriate for local-first MVP but may need migration planning for multi-user hosted deployments.
