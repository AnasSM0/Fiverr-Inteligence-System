# Fiverr Positioning Intelligence System MVP Scope

## Summary

The MVP is a local-first web app that imports user-provided Fiverr gig datasets and produces deterministic cleaning, keyword, pricing, competitor, and opportunity analytics.

The MVP must not scrape Fiverr, automate login, fetch missing marketplace data, guarantee rankings, guarantee income, or invent unsupported Fiverr fields.

## In-Scope Workflow

```text
CSV/XLSX Import -> Data Cleaning -> Keyword Analytics -> Pricing Analytics -> Competitor Comparison -> Opportunity Matrix
```

## Supported Input Fields

The MVP supports only these imported fields:

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

Required fields:

- `gig_url`
- `gig_title`
- `starting_price`

Optional fields:

- `gig_image_url`
- `seller_profile_image_url`
- `seller_profile_url`
- `seller_name`
- `seller_badge_icon_url`
- `seller_badge_text`
- `rating`
- `review_count`
- `extra_features`

## MVP Capabilities

### File Import

- Accept CSV and XLSX uploads.
- Validate headers before row processing.
- Preserve raw imported values.
- Ignore unknown columns unless later product requirements define custom fields.
- Reject files with no recognized supported fields.
- Reject files with no analyzable gig rows after validation.

### Data Cleaning

- Trim and normalize text.
- Normalize URLs without visiting them.
- Parse ratings from `0` to `5`.
- Parse non-negative integer review counts.
- Parse numeric starting prices from common currency-formatted values.
- Detect duplicate `gig_url` rows.
- Keep row-level errors and warnings visible.
- Treat missing optional values as unknown.

### Keyword Analytics

- Extract keyword terms from `gig_title` and `extra_features`.
- Apply deterministic normalization and stop-word removal.
- Count keyword frequency across valid, deduplicated gigs.
- Show source fields and matching gigs behind keyword counts.

### Pricing Analytics

- Calculate min, max, mean, median, quartiles, and deterministic price bands.
- Segment pricing by keyword where enough rows exist.
- Treat pricing output as analysis, not guaranteed pricing advice.

### Rating And Review Analytics

- Summarize valid ratings and review counts.
- Keep missing values as unknown.
- Do not infer sales, orders, impressions, clicks, or conversion rates.

### Competitor Comparison

- Group comparable gigs by keyword overlap and price band.
- Compare imported values side by side.
- Surface gaps in pricing, rating, review count, keyword coverage, seller badge text, and feature terms.
- Do not claim live Fiverr ranking position.

### Opportunity Matrix

- Create deterministic opportunity entries by keyword or keyword cluster.
- Use visible score factors:
  - keyword frequency proxy.
  - competition proxy.
  - price gap.
  - rating gap.
  - feature differentiation gap.
- Show score components and plain-language deterministic explanations.
- Label outputs as directional analysis, not predictions.

## Out Of Scope

The MVP excludes:

- Automated Fiverr scraping.
- Fiverr login automation.
- Automated browsing of Fiverr pages.
- Live Fiverr ranking checks.
- Ranking guarantees.
- Income, revenue, order, impression, click, or conversion guarantees.
- AI-generated core analytics.
- Hidden or non-deterministic scoring.
- Unsupported Fiverr fields not present in the imported file.
- Inferred seller metrics not present in the imported file.
- Currency conversion.
- Multi-dataset comparison unless later explicitly added.
- Custom scoring weights unless later explicitly added.

## OpenRouter Boundary

OpenRouter is out of scope for MVP core analytics.

OpenRouter may be introduced later only for:

- Plain-language summaries of deterministic analytics.
- Strategy explanations based on visible score components.
- Report narration.
- AI-assisted positioning suggestions clearly labeled as strategy text.

OpenRouter must not:

- Parse files.
- Clean rows.
- Generate keyword scores.
- Generate pricing scores.
- Group competitors.
- Generate opportunity scores.
- Invent missing Fiverr data.
- Produce ranking or income guarantees.

## Acceptance Criteria

The MVP is acceptable when:

- A valid CSV or XLSX file can be imported.
- Header validation and row validation run before analytics are shown.
- The cleaning report displays valid rows, invalid rows, warnings, duplicates, and normalized values.
- Keyword analytics use only `gig_title` and `extra_features`.
- Pricing analytics use only parsed `starting_price` values.
- Competitor comparison uses only imported fields.
- Opportunity matrix scores expose their deterministic components.
- Re-importing the same file produces the same outputs.
- The app works without live Fiverr access.
- The UI and reports avoid ranking guarantees, income guarantees, and unsupported claims.

## Testing Strategy

- Use fixture CSV and XLSX files for import tests.
- Unit test cleaning functions for each supported field.
- Unit test deterministic analytics with fixed input fixtures.
- Integration test upload-to-cleaning-report flow.
- Integration test cleaning-to-analytics snapshot flow.
- UI test that score components are visible in the opportunity matrix.
- Regression test that OpenRouter services are not imported by core analytics modules.

## Verification Commands

Use these commands once the app scaffold and scripts exist:

```bash
npm run lint
npm run test
npm run build
```

Use targeted commands once test filtering is configured:

```bash
npm run test -- import
npm run test -- cleaning
npm run test -- analytics
```

For the current documentation-only repo, verify scope by reviewing:

```bash
docs/REQUIREMENTS.md
docs/ARCHITECTURE.md
docs/DECISIONS.md
docs/MVP_SCOPE.md
```

## Risks

- File size and row count limits are not finalized.
- `extra_features` is plain text for MVP, which may limit feature extraction quality.
- Ambiguous currency formats may confuse users because currency conversion is out of scope.
- Duplicate exclusion may surprise users if the UI does not explain it clearly.
- OpenRouter must remain isolated to prevent non-deterministic analytics.
- Future hosted deployment may require migration from SQLite to Postgres or Supabase.
