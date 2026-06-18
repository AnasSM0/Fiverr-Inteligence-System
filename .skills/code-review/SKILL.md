---
name: code-review
description: Use for reviewing Fiverr Positioning Intelligence System code or docs against requirements, architecture, MVP scope, guardrails, deterministic analytics boundaries, OpenRouter isolation, testing evidence, and user-facing claim safety.
---

# Code Review Skill

## Trigger Conditions

- Use when asked to review code, docs, architecture, tests, or implementation changes.
- Use before finalizing feature work that touches import, cleaning, analytics, reports, persistence, or OpenRouter boundaries.
- Use when checking for guardrail violations.

## When NOT To Use

- Do not use as a replacement for implementing requested changes.
- Do not use to approve scraping, login automation, unsupported Fiverr fields, hidden AI scoring, ranking guarantees, or income guarantees.
- Do not use for general style-only review when correctness or product safety has not been checked.

## Exact Procedure

1. Read `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/GUARDRAILS.md`.
2. Identify changed files and the stated task scope.
3. Check whether changes preserve deterministic analytics before AI.
4. Check that import and cleaning preserve raw values and keep missing optional values unknown.
5. Check that analytics expose evidence, caution, and visible score components.
6. Check that OpenRouter remains isolated from import, cleaning, analytics, competitor grouping, and opportunity scoring.
7. Check that no scraping, Fiverr login automation, browser enrichment, unsupported fields, or invented metrics were added.
8. Check user-facing copy for ranking guarantees and income guarantees.
9. Review tests and verification evidence.
10. Report findings first, ordered by severity, with file and line references where available.

## Expected Output Format

Return:

- Findings first, ordered by severity.
- File and line references for each actionable issue.
- Open questions or assumptions.
- Verification performed and any missing tests.
- Brief change summary only after findings.
