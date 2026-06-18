---
name: openrouter-integration
description: Use only for future OpenRouter strategy, explanation, recommendation, and report narration features that consume deterministic analytics; never use for core import, cleaning, analytics, competitor grouping, or opportunity scoring.
---

# OpenRouter Integration Skill

## Trigger Conditions

- Use when implementing, reviewing, testing, or documenting future OpenRouter strategy summaries, explanation text, report narration, or recommendations.
- Use when defining an OpenRouter adapter or service interface.
- Use when checking that AI remains isolated from deterministic analytics.

## When NOT To Use

- Do not use for MVP file parsing.
- Do not use for data cleaning.
- Do not use for keyword, pricing, competitor, or opportunity scoring.
- Do not use to invent missing Fiverr data.
- Do not use to produce ranking guarantees or income guarantees.

## Exact Procedure

1. Read `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/GUARDRAILS.md`.
2. Keep OpenRouter behind an isolated service interface.
3. Accept only already-computed deterministic analytics and visible imported data as inputs.
4. Label generated text as AI-assisted strategy, explanation, recommendation, or narration.
5. Include cautions when data is missing, narrow, duplicated, or imported from a small niche dataset.
6. Never call OpenRouter from import, cleaning, analytics, competitor grouping, or Opportunity Matrix scoring modules.
7. Never ask OpenRouter to infer unavailable Fiverr metrics.
8. Never produce ranking, income, revenue, order, impression, click, or conversion guarantees.
9. Add tests or dependency checks that prove core analytics do not import the OpenRouter adapter.

## Expected Output Format

Return or document:

- Service interface or adapter boundary summary.
- Input contract listing deterministic analytics consumed.
- AI-assisted text output labeled by type.
- Grounding notes that point to visible analytics inputs.
- Guardrail checklist confirming no parsing, cleaning, scoring, grouping, invented data, ranking guarantees, or income guarantees.
