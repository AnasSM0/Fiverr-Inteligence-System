# Agent Instructions

These instructions apply to all agents working in this repository.

## Required Reading Before Coding

Before making app code changes, read:

- `docs/REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/MVP_SCOPE.md`
- `docs/DECISIONS.md`
- `docs/GUARDRAILS.md`
- `docs/UI_PRINCIPLES.md` before UI or dashboard work
- Any relevant `.skills/*/SKILL.md` file for the task area

Use `docs/PROJECT_CONTEXT.md` for a quick orientation, but treat the source docs above as authoritative.

## Working Rules

- State the plan first before coding.
- Make small, scoped changes that map to the requested task.
- Prefer deterministic analytics before AI for all MVP behavior.
- Preserve raw imported data separately from cleaned or derived values.
- Treat missing optional imported values as unknown, not as negative signals.
- Keep OpenRouter isolated behind a service interface and out of core import, cleaning, analytics, competitor grouping, and opportunity scoring.
- Do not add automated Fiverr scraping.
- Do not add Fiverr login automation.
- Do not add browser automation that visits Fiverr or enriches missing Fiverr data.
- Do not invent unsupported Fiverr fields or metrics.
- Do not claim guaranteed Fiverr ranking improvements.
- Do not claim guaranteed income, revenue, orders, impressions, clicks, or conversions.
- For UI work, build a polished SaaS-style dashboard using `docs/UI_PRINCIPLES.md`; avoid raw browser defaults, generic developer UI, and lorem ipsum.

## Verification Rules

- Run available tests before the final response.
- For a scaffolded app, run the relevant commands from `docs/workflows/CODEX_VERIFICATION.md`.
- If tests, lint, or build scripts are unavailable, say that explicitly in the final response.
- For documentation-only changes, verify file presence, headings, guardrail language, and repository status.

## Change Discipline

- Do not initialize new frameworks, install dependencies, or add feature code unless the user asks for implementation.
- Keep documentation updates aligned with the requirements, architecture, scope, and decisions docs.
- Do not rewrite unrelated docs or refactor unrelated files while completing a scoped task.
