# Fiverr Positioning Intelligence System Requirements

## 1. Product Goal

Fiverr Positioning Intelligence System is a web app that helps users analyze user-provided Fiverr gig datasets and identify positioning opportunities across keywords, pricing, competitors, and feature differentiation.

The MVP must be deterministic first. All core analytics must be reproducible from the imported CSV or XLSX file without automated Fiverr scraping, login automation, live Fiverr access, or AI-generated assumptions.

## 2. Target User

The target users are:

- Fiverr sellers evaluating how their gigs compare against similar gigs.
- Freelancers researching how to position a new or existing Fiverr offer.
- Consultants or marketplace analysts reviewing manually collected Fiverr gig data.
- Agencies supporting sellers with pricing, keyword, and competitor analysis.

Users are expected to provide their own dataset through a CSV or XLSX import.

## 3. MVP Scope

The MVP workflow is:

```text
CSV/XLSX Import -> Data Cleaning -> Keyword Analytics -> Pricing Analytics -> Competitor Comparison -> Opportunity Matrix
```

The MVP must support only the following imported fields:

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

The MVP must provide:

- File import for CSV and XLSX datasets.
- A cleaning report that shows valid rows, invalid rows, warnings, duplicates, and normalized values.
- Deterministic keyword analytics based on imported text fields.
- Deterministic pricing analytics based on imported `starting_price` values.
- Competitor comparison using imported gig and seller fields only.
- An opportunity matrix with transparent scoring rules.

## 4. Explicit Non-Goals

The MVP must not include:

- Automated Fiverr scraping.
- Fiverr login automation.
- Automated browsing of Fiverr pages.
- Live Fiverr rank tracking.
- Claims that the app can guarantee Fiverr ranking improvements.
- Claims that the app can guarantee revenue, income, orders, impressions, or conversion improvements.
- Unsupported Fiverr data fields that are not present in the imported dataset.
- Inferred seller metrics that are not provided by the import.
- Hidden AI scoring for MVP analytics.
- Recommendations that depend on undisclosed or non-deterministic calculations.

## 5. Data Import Requirements

The app must allow users to upload CSV and XLSX files containing user-provided Fiverr gig data.

Import behavior:

- Accept `.csv` and `.xlsx` files.
- Validate headers before processing rows.
- Match supported field names exactly as listed in the MVP scope.
- Treat unknown columns as ignored import columns unless a later product decision introduces custom fields.
- Preserve original raw values for audit and debugging.
- Produce deterministic parsed values from the same file every time.
- Show row-level validation errors and warnings.
- Allow partial imports when some rows are invalid, as long as valid rows can still be analyzed.
- Reject files with no recognized supported fields.
- Reject files with no analyzable gig rows after validation.

Required MVP fields:

- `gig_url`
- `gig_title`
- `starting_price`

Optional MVP fields:

- `gig_image_url`
- `seller_profile_image_url`
- `seller_profile_url`
- `seller_name`
- `seller_badge_icon_url`
- `seller_badge_text`
- `rating`
- `review_count`
- `extra_features`

The app must not fetch missing values from Fiverr or any other external website.

## 6. Data Cleaning Rules

Cleaning must be deterministic and explainable.

Text normalization:

- Trim leading and trailing whitespace.
- Collapse repeated internal whitespace for display and analytics.
- Preserve the original raw value separately from the cleaned value.
- Treat empty strings as missing values.

URL normalization:

- Trim whitespace.
- Require URLs to use `http://` or `https://`.
- Mark malformed URLs as row warnings or errors depending on whether the field is required.
- Do not visit URLs to validate page existence.
- Do not extract additional Fiverr data from URLs.

Rating parsing:

- Parse numeric ratings from imported values.
- Accept ratings from `0` to `5`.
- Mark ratings outside `0` to `5` as invalid.
- Treat missing ratings as unknown, not as `0`.

Review count parsing:

- Parse non-negative integer review counts.
- Support common formatted numbers such as `1,200`.
- Mark negative or non-numeric review counts as invalid.
- Treat missing review counts as unknown, not as `0`.

Starting price parsing:

- Parse numeric prices from imported values.
- Support common currency-formatted values such as `$25`, `25`, and `USD 25`.
- Store the parsed numeric amount separately from the raw value.
- Mark negative or non-numeric prices as invalid.
- Do not infer currency conversion rates unless explicitly added in a later requirement.

Duplicate handling:

- Detect duplicate rows by normalized `gig_url`.
- Keep duplicate rows visible in the cleaning report.
- Exclude duplicate rows from aggregate analytics by default, using the first valid occurrence.
- Do not merge duplicate rows by guessing missing values across records.

Missing media and badge fields:

- Missing `gig_image_url`, `seller_profile_image_url`, `seller_badge_icon_url`, and `seller_badge_text` are allowed.
- Missing media fields must not block analytics.
- Missing badge fields must not be interpreted as proof that a seller has no badge.

Extra features:

- Preserve `extra_features` as imported text for the MVP.
- Use `extra_features` only for deterministic keyword and feature-term analysis.
- Do not assume a hidden schema inside `extra_features` unless a future requirement defines one.

## 7. Analytics Requirements

All MVP analytics must be deterministic, transparent, and reproducible from imported data.

Keyword analytics:

- Extract keyword terms from `gig_title` and `extra_features`.
- Normalize keyword text by lowercasing, trimming, and removing punctuation used only as separators.
- Remove a documented default stop-word list.
- Count keyword frequency across valid, deduplicated gigs.
- Show which imported fields contributed to each keyword.
- Allow users to inspect the gigs behind each keyword count.
- Do not use OpenRouter or any other AI provider to create MVP keyword scores.

Pricing analytics:

- Calculate minimum, maximum, median, mean, and quartiles for `starting_price`.
- Group prices into deterministic price bands.
- Show price distribution by keyword where enough rows exist.
- Identify low, mid, and high price bands using dataset-derived percentiles.
- Do not recommend exact price changes as guaranteed business outcomes.

Rating and review analytics:

- Summarize rating distribution for rows with valid ratings.
- Summarize review count distribution for rows with valid review counts.
- Treat missing ratings and missing review counts as unknown.
- Do not infer sales, impressions, clicks, orders, or conversion rate from reviews.

Competitor comparison:

- Compare gigs using imported `gig_title`, `starting_price`, `rating`, `review_count`, `seller_name`, `seller_badge_text`, and `extra_features`.
- Group potential competitors by keyword overlap and price band.
- Show comparable gigs side by side with their imported values.
- Surface gaps in pricing, rating, review count, keyword coverage, and feature terms.
- Do not claim that a competitor is outranking another gig unless ranking data is explicitly imported in a future requirement.

Scoring transparency:

- Every score must expose its input factors.
- Every score must be recalculable from visible imported data.
- Missing values must be handled consistently and displayed as unknown where relevant.

## 8. Opportunity Matrix Rules

The opportunity matrix must identify potential positioning opportunities using deterministic scoring only.

Each opportunity entry should include:

- Keyword or keyword cluster.
- Number of matching gigs in the imported dataset.
- Typical starting price range.
- Rating and review count context where available.
- Feature terms commonly present in matching gigs.
- Potential gaps based on imported data.
- A transparent opportunity score.
- A plain-language explanation of the deterministic factors behind the score.

Opportunity scoring factors:

- Keyword frequency proxy: how often a keyword appears in the imported dataset.
- Competition proxy: number of gigs and review-count concentration for that keyword.
- Price gap: whether the keyword group has visible price spread or underserved price bands.
- Rating gap: whether comparable gigs show rating variation.
- Feature differentiation gap: whether some gigs mention feature terms that others do not.

Default scoring behavior:

- Use only valid, deduplicated rows.
- Treat missing optional values as unknown, not negative.
- Avoid penalizing a row solely because optional media, badge, rating, or review data is missing.
- Display score components separately from the final score.
- Label scores as directional analysis, not predictions.

The matrix must not:

- Guarantee ranking gains.
- Guarantee order volume.
- Guarantee revenue or income.
- Invent demand volume beyond the imported dataset.
- Use undisclosed AI reasoning in the MVP score.

## 9. OpenRouter Usage Boundaries

OpenRouter is approved only for later strategy and explanation features, not for MVP deterministic analytics.

OpenRouter must not be used in the MVP to:

- Parse imported files.
- Clean imported data.
- Generate core keyword scores.
- Generate core pricing scores.
- Generate competitor groupings.
- Generate opportunity matrix scores.
- Invent missing Fiverr data.
- Produce ranking or income guarantees.

Future OpenRouter-supported features may include:

- Plain-language summaries of deterministic analytics.
- Strategy explanations based on already-computed scores.
- Report narration for exported insights.
- User-facing interpretation of visible opportunity matrix factors.
- Drafting positioning suggestions clearly labeled as AI-assisted strategy text.

Any OpenRouter output must be grounded in imported data and deterministic analytics already shown to the user.

## 10. Success Criteria

The MVP is successful when:

- A user can import a valid CSV or XLSX file containing the supported fields.
- The app validates headers and rows before analytics are shown.
- The app displays a cleaning report with errors, warnings, duplicate detection, and normalized values.
- Deterministic keyword analytics are generated from `gig_title` and `extra_features`.
- Deterministic pricing analytics are generated from `starting_price`.
- Competitor comparisons are based only on imported fields.
- The opportunity matrix displays transparent factors and reproducible scores.
- Re-importing the same file produces the same cleaned data, analytics, and opportunity scores.
- The app works without automated Fiverr scraping, login automation, or live Fiverr access.
- The product does not make ranking guarantees, income guarantees, or unsupported claims.

## 11. Open Questions

- What maximum CSV/XLSX file size should the MVP support?
- What maximum row count should be supported before performance warnings appear?
- Should `extra_features` remain plain text in the MVP, or should it support structured values later?
- What exact default stop-word list should keyword analytics use?
- What default price bands or percentile thresholds should be used?
- What weights should be assigned to opportunity score factors?
- Should users be able to customize opportunity scoring weights in the MVP?
- Should the MVP support exporting cleaned data and analytics? If yes, should exports be CSV, XLSX, PDF, or all three?
- Should projects be saved in persistent storage in the MVP, or is single-session analysis acceptable?
- Should the app support multiple uploaded datasets for comparison, or only one dataset at a time?
- Should currency be treated as display-only in MVP, or should explicit currency handling be added?

## MVP Report Outputs

The MVP must present analytics as user-visible report outputs, not only internal calculations.

Expected MVP outputs:

- Import Summary
- Cleaning Report
- Keyword Report
- Pricing Report
- Competitor Report
- Opportunity Matrix
- Exportable Market Report

Report requirements:

- Each report must be based only on imported user-provided data and deterministic analytics.
- Reports must make unknown or missing values visible where relevant.
- Reports must not include ranking guarantees, income guarantees, or unsupported Fiverr data.
- Exportable Market Report must summarize the deterministic reports in a shareable format once export support is implemented.

## Niche Handling

A niche is the market category, service area, or offer type being analyzed within an imported dataset.

Example niches include:

- AI Agents
- Web Development
- Shopify
- WordPress
- Video Editing
- Graphic Design

Niche requirements:

- Users must assign a niche during import.
- Each import run must be associated with one niche.
- All cleaning reports, keyword analytics, pricing analytics, competitor comparisons, and opportunity matrix outputs must be computed per niche.
- Niche labels must be user-provided or user-selected, not inferred from Fiverr or external sources.
- The system must not treat a niche as proof of Fiverr category placement unless that category is explicitly imported in a future requirement.

## Import Run Metadata

Each imported file must create an import run record so datasets can be identified and compared later without requiring historical trend analysis in the MVP.

Import run metadata requirements:

- Each import run must receive a unique import identifier.
- Each import run must store an upload timestamp.
- Each import run must store the original file name.
- Each import run must store the assigned niche.
- Each import run should support distinct versions of similar datasets, such as `n8n.csv` and `n8n_v2.csv`.
- Import run metadata must not imply that the system tracks live Fiverr changes.
- Import run metadata must support future growth into historical trend analysis without making trend analysis part of the MVP.

## Technology Keyword Dictionary Support

The system must support configurable technology keyword dictionaries to improve deterministic keyword analytics and Opportunity Matrix quality.

Initial technology keyword examples include:

- OpenAI
- Claude
- Gemini
- MCP
- LangGraph
- CrewAI
- n8n
- Zapier
- Make
- FastAPI

Dictionary requirements:

- Technology keyword dictionaries must be configurable.
- Dictionary matches must be deterministic.
- Dictionary matches may supplement general keyword extraction from `gig_title` and `extra_features`.
- Dictionary matches must expose evidence showing which imported field contained the matched technology keyword.
- The dictionary must not invent technologies that are not present in the imported row text.
- OpenRouter must not be required for dictionary matching in the MVP.

## Opportunity Matrix Output Schema

The Opportunity Matrix must expose a consistent output structure for each opportunity entry.

Required Opportunity Matrix columns:

- `keyword`
- `frequency`
- `competition_score`
- `price_score`
- `differentiation_score`
- `opportunity_score`
- `evidence`
- `caution`

Column requirements:

- `keyword` must contain the keyword or keyword cluster being evaluated.
- `frequency` must represent occurrence count within the imported niche dataset.
- `competition_score` must be deterministic and based on visible imported data such as matching gig count and review-count concentration.
- `price_score` must be deterministic and based on visible imported `starting_price` values.
- `differentiation_score` must be deterministic and based on visible keyword and feature-term differences.
- `opportunity_score` must be calculated from visible score components.
- `evidence` must summarize the imported data behind the score.
- `caution` must describe limitations, missing data, or reasons not to overinterpret the result.

The Opportunity Matrix output schema must not include unsupported Fiverr fields, live ranking data, revenue predictions, or AI-generated hidden score components.

## Future Features (Out of MVP)

The following features are explicitly out of MVP scope:

- Strategy Studio
- Gig Generator
- Profile Optimizer
- OpenRouter Recommendations
- Image Analysis
- Multi-platform Support
- Historical Trend Analysis

Future feature requirements:

- Future features must preserve the no-scraping and no-login-automation boundaries unless the product requirements are explicitly revised.
- OpenRouter Recommendations must be based on deterministic analytics and imported data already visible to the user.
- Image Analysis must not infer unsupported Fiverr performance data.
- Historical Trend Analysis must rely on stored import run metadata and repeated user-provided imports, not live Fiverr tracking.
