---
name: analytics-engine
description: Use for deterministic Fiverr Positioning Intelligence System analytics, including keyword analytics, technology keyword dictionaries, pricing analytics, rating/review summaries, competitor comparison, and Opportunity Matrix scoring/output schema.
---

# Analytics Engine Skill

## Trigger Conditions

- Use when implementing, reviewing, testing, or documenting keyword analytics, pricing analytics, rating/review summaries, competitor comparison, or Opportunity Matrix scoring.
- Use when working with technology keyword dictionary matching.
- Use when shaping report outputs or Opportunity Matrix columns.

## When NOT To Use

- Do not use for raw CSV/XLSX parsing; use `data-import`.
- Do not use for row cleaning/parsing before analytics; use `data-cleaning`.
- Do not use for AI-generated strategy or narrative text; use `openrouter-integration`.
- Do not use to add hidden AI scoring, ranking guarantees, or income guarantees.

## Exact Procedure

1. Read `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/GUARDRAILS.md`.
2. Use only valid, deduplicated cleaned rows.
3. Compute all analytics per assigned niche.
4. Keep analytics as pure deterministic TypeScript functions when implementing code.
5. Extract keywords from `gig_title` and `extra_features`.
6. Apply deterministic stop-word removal and configurable technology keyword dictionary matching.
7. Expose evidence for dictionary matches by imported field and row.
8. Compute pricing summaries from parsed `starting_price` values.
9. Summarize ratings and review counts only from valid imported values.
10. Group competitors by keyword overlap and price band.
11. Produce Opportunity Matrix entries with `keyword`, `frequency`, `competition_score`, `price_score`, `differentiation_score`, `opportunity_score`, `evidence`, and `caution`.
12. Do not import or call OpenRouter from core analytics.
13. Do not infer sales, impressions, clicks, orders, conversions, live rankings, or demand outside the imported dataset.

## Expected Output Format

Return or document:

- Keyword Report with keyword, frequency, source fields, matching rows, and technology dictionary matches.
- Pricing Report with min, max, mean, median, quartiles, and price bands.
- Competitor Report with comparable gig groups and visible imported comparison fields.
- Opportunity Matrix with required columns and visible score components.
- Caution text for missing data, small datasets, and directional-only interpretation.
