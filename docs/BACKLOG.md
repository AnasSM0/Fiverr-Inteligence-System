# Backlog

This backlog organizes future work without implementing features. `docs/REQUIREMENTS.md`, `docs/MVP_SCOPE.md`, and `docs/DECISIONS.md` remain the source of truth for scope.

## Epic: App Scaffold

- Initialize Next.js App Router project when feature work begins.
- Configure TypeScript, linting, testing, and build scripts.
- Add local-first SQLite setup.
- Establish shared types for imports, cleaned gigs, analytics, and opportunities.

## Epic: Data Import

- Implement CSV upload.
- Implement XLSX upload.
- Validate supported headers.
- Preserve raw imported rows.
- Create import run metadata with unique import ID, timestamp, original file name, and assigned niche.
- Report row-level import errors and warnings.

## Epic: Data Cleaning

- Normalize text fields.
- Normalize URLs without visiting them.
- Parse `rating`, `review_count`, and `starting_price`.
- Detect duplicate normalized `gig_url` rows.
- Keep optional missing values as unknown.
- Produce Cleaning Report output.

## Epic: Analytics Engine

- Implement deterministic keyword analytics from `gig_title` and `extra_features`.
- Add configurable technology keyword dictionary support.
- Implement deterministic pricing summaries and price bands.
- Implement rating and review summaries.
- Implement competitor grouping by keyword overlap and price band.
- Implement Opportunity Matrix scoring with visible score components.

## Epic: Reports And UI

- Build Import Summary.
- Build Cleaning Report.
- Build Keyword Report.
- Build Pricing Report.
- Build Competitor Report.
- Build Opportunity Matrix.
- Build Exportable Market Report when export support is implemented.

## Epic: Persistence

- Store projects, imports, raw rows, cleaned rows, row issues, analytics snapshots, and opportunity matrix entries.
- Keep schema portable for future Postgres or Supabase migration.
- Support repeated import versions such as `n8n.csv` and `n8n_v2.csv`.

## Epic: OpenRouter Later

- Add isolated OpenRouter strategy service interface.
- Generate summaries from deterministic analytics.
- Generate strategy explanations from visible score components.
- Generate report narration.
- Keep OpenRouter out of import, cleaning, and core analytics.

## Epic: Testing And Verification

- Add fixture-based import parser tests.
- Add cleaning parser tests.
- Add deterministic analytics tests.
- Add Opportunity Matrix output schema tests.
- Add OpenRouter isolation tests.
- Add UI tests for guardrail language and score evidence.

## Future Features Out Of MVP

- Strategy Studio
- Gig Generator
- Profile Optimizer
- OpenRouter Recommendations
- Image Analysis
- Multi-platform Support
- Historical Trend Analysis
