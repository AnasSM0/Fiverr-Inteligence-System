---
name: data-import
description: Use for Fiverr Positioning Intelligence System CSV/XLSX import work, including upload parsing, supported header validation, import run metadata, raw row preservation, niche assignment, and row-level import errors.
---

# Data Import Skill

## Trigger Conditions

- Use when implementing, reviewing, testing, or documenting CSV/XLSX import.
- Use when handling import run metadata, niche assignment, original file names, import IDs, timestamps, or file hashes.
- Use when validating supported imported fields or reporting row-level import errors.

## When NOT To Use

- Do not use for row cleaning logic after raw rows are parsed; use `data-cleaning`.
- Do not use for keyword, pricing, competitor, or opportunity analytics; use `analytics-engine`.
- Do not use for OpenRouter strategy or explanation features; use `openrouter-integration`.
- Do not use to add Fiverr scraping, login automation, URL fetching, or browser automation.

## Exact Procedure

1. Read `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/GUARDRAILS.md`.
2. Accept only user-provided `.csv` and `.xlsx` files.
3. Validate headers against the supported fields in `docs/REQUIREMENTS.md`.
4. Require `gig_url`, `gig_title`, and `starting_price` for analyzable rows.
5. Require users to assign a niche during import.
6. Create import run metadata with unique import identifier, upload timestamp, original file name, file type, and assigned niche.
7. Preserve raw row values before any cleaning or parsing.
8. Keep unknown columns ignored unless requirements explicitly add custom fields.
9. Produce row-level errors and warnings for invalid or missing required values.
10. Never visit imported URLs, fetch missing values, scrape Fiverr, or automate login.

## Expected Output Format

Return or document:

- Import Summary with import ID, timestamp, file name, file type, assigned niche, total rows, accepted rows, rejected rows, and warning count.
- Header validation result with recognized, missing required, and ignored columns.
- Raw row preservation confirmation.
- Row-level issue list with row number, field, severity, code, and message.
- Explicit note that no external Fiverr data was fetched.
