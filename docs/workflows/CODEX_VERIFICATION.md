# Codex Verification Workflow

Use this workflow before final responses and before handing off changes.

## Pre-Work Checklist

- Read `AGENTS.md`.
- Read `docs/PROJECT_CONTEXT.md`.
- Read the source docs relevant to the task:
  - `docs/REQUIREMENTS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/MVP_SCOPE.md`
  - `docs/DECISIONS.md`
  - `docs/GUARDRAILS.md`
- Read relevant `.skills/*/SKILL.md` files.
- State the plan before coding.
- Confirm the task does not require scraping, login automation, unsupported Fiverr fields, or AI scoring.

## Implementation Checklist

- Keep changes small and scoped.
- Preserve raw imported data when working on import or cleaning.
- Keep deterministic analytics separate from OpenRouter.
- Keep missing optional values as unknown.
- Expose evidence and caution for opportunity outputs.
- Avoid user-facing ranking or income guarantees.

## Verification Commands

Run these once the app scaffold and scripts exist:

```bash
npm run lint
npm run test
npm run build
```

Run targeted tests once test filtering exists:

```bash
npm run test -- import
npm run test -- cleaning
npm run test -- analytics
```

## Documentation-Only Verification

For the current documentation-only repo:

- Confirm requested files exist.
- Confirm requested headings and sections exist.
- Confirm no app code, framework scaffold, dependencies, or tests were added unless explicitly requested.
- Search for guardrail terms:
  - automated Fiverr scraping
  - login automation
  - deterministic analytics
  - OpenRouter
  - ranking guarantees
  - income guarantees
- Run `git status --short` and summarize changed files.

## Final Response Checklist

- State what changed.
- State verification performed.
- State any unavailable tests or scripts.
- Mention any known limitations or follow-up risks that matter for the task.
