# Guardrails

## Hard Product Constraints

- Do not add automated Fiverr scraping.
- Do not add Fiverr login automation.
- Do not add automated browsing of Fiverr pages.
- Do not fetch or enrich missing Fiverr data from external websites.
- Do not add live Fiverr ranking checks.
- Do not invent unsupported Fiverr fields.
- Do not infer seller metrics that are not present in the imported dataset.
- Do not infer sales, impressions, clicks, orders, conversion rates, live rankings, or external demand volume from reviews.
- Do not claim guaranteed Fiverr ranking improvements.
- Do not claim guaranteed income, revenue, orders, impressions, clicks, or conversions.

## Deterministic Analytics Constraints

- Core MVP analytics must be deterministic and reproducible from the same imported file.
- All score components must be visible and recalculable from imported data.
- Opportunity Matrix outputs must include evidence and caution.
- Missing optional values must stay unknown.
- Missing rating or review count must not become `0`.
- Missing seller badge data must not prove that a seller has no badge.
- Duplicate `gig_url` rows must remain visible in cleaning reports and be excluded from aggregate analytics by default.

## AI Constraints

- Use deterministic analytics before AI.
- Keep OpenRouter behind an isolated service interface.
- Do not call OpenRouter from file import, data cleaning, keyword scoring, pricing scoring, competitor grouping, or opportunity scoring.
- OpenRouter output must be grounded in visible deterministic analytics.
- Label AI-assisted future strategy text clearly.
- Do not use AI to invent missing Fiverr data.

## Data Handling Constraints

- Preserve raw imported values separately from cleaned values.
- Validate headers before row analytics.
- Keep row-level errors and warnings inspectable.
- Parse values deterministically.
- Do not visit imported URLs to validate existence.
- Do not perform currency conversion in MVP unless requirements change.

## User-Facing Language Constraints

- Describe analytics as directional analysis, not predictions.
- Use cautious wording for opportunities and limitations.
- Include cautions where missing data or small datasets may affect interpretation.
- Do not imply the app has access to live Fiverr marketplace data.
