---
name: data-cleaning
description: Use for deterministic cleaning of imported Fiverr gig rows, including text normalization, URL validation without fetching, rating parsing, review count parsing, starting price parsing, duplicate detection, and missing optional value handling.
---

# Data Cleaning Skill

## Trigger Conditions

- Use when implementing, reviewing, testing, or documenting cleaning of imported gig rows.
- Use when normalizing text or URLs.
- Use when parsing `rating`, `review_count`, or `starting_price`.
- Use when detecting duplicate normalized `gig_url` values.

## When NOT To Use

- Do not use for raw file parsing or upload handling; use `data-import`.
- Do not use for keyword, pricing, competitor, or opportunity analytics; use `analytics-engine`.
- Do not use for OpenRouter strategy text; use `openrouter-integration`.
- Do not use to infer missing Fiverr data or validate URL existence.

## Exact Procedure

1. Read `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/GUARDRAILS.md`.
2. Preserve every raw imported value separately from cleaned values.
3. Trim text, collapse repeated whitespace, and treat empty strings as missing.
4. Normalize URLs by trimming and requiring `http://` or `https://`; do not visit URLs.
5. Parse ratings as numbers from `0` to `5`; keep missing ratings unknown.
6. Parse review counts as non-negative integers; keep missing review counts unknown.
7. Parse starting prices as non-negative numeric values from common currency-formatted strings; do not convert currencies.
8. Detect duplicate rows by normalized `gig_url`.
9. Keep duplicates visible in the Cleaning Report and exclude duplicate rows from aggregate analytics by default.
10. Treat missing optional media, badge, rating, review count, and extra feature values as unknown, not negative.
11. Never merge duplicate rows by guessing missing values across records.

## Expected Output Format

Return or document:

- Cleaned row records with raw values, cleaned values, parsed numeric values, validity, and duplicate status.
- Cleaning Report summary with valid rows, invalid rows, warnings, duplicate count, and unknown optional value counts.
- Row-level issue list with row number, field, severity, code, and message.
- Explicit confirmation that no URL fetching, scraping, or AI cleaning was used.
