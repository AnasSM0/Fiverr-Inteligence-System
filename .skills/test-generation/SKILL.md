---
name: test-generation
description: Use when adding or updating tests for Fiverr Positioning Intelligence System import, cleaning, deterministic analytics, Opportunity Matrix output, UI guardrails, OpenRouter isolation, and documentation verification.
---

# Test Generation Skill

## Trigger Conditions

- Use when creating or updating unit, integration, UI, regression, or documentation verification tests.
- Use when adding fixtures for CSV/XLSX import, cleaning, analytics, or Opportunity Matrix behavior.
- Use when proving OpenRouter isolation from core analytics.

## When NOT To Use

- Do not use to implement product features without tests.
- Do not use to create AI-dependent expected values for deterministic analytics.
- Do not use to test scraping, login automation, or live Fiverr behavior.
- Do not use to assert ranking or income outcomes.

## Exact Procedure

1. Read `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/GUARDRAILS.md`.
2. Prefer fixture-driven tests with stable inputs and expected outputs.
3. Cover CSV and XLSX import, supported headers, missing required fields, unknown columns, invalid rows, and partial imports.
4. Cover cleaning for text, URLs, ratings, review counts, starting prices, duplicates, and missing optional fields.
5. Cover deterministic analytics for keywords, technology dictionary matches, pricing, rating/review summaries, competitors, and Opportunity Matrix columns.
6. Cover UI or report guardrails that prevent ranking guarantees and income guarantees.
7. Add regression tests proving core analytics do not import or call OpenRouter.
8. Run available tests before final response.
9. If scripts do not exist yet, document that tests could not be run and provide the intended verification command.

## Expected Output Format

Return or document:

- Test files or test plan grouped by import, cleaning, analytics, UI/report guardrails, and OpenRouter isolation.
- Fixture names and purpose.
- Deterministic expected outputs.
- Commands run and results.
- Explicit note for unavailable test scripts.
