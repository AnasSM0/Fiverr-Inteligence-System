---
name: ui-dashboard
description: Use for Fiverr Positioning Intelligence System UI and dashboard work, including SaaS-style layouts, reusable dashboard components, report surfaces, Opportunity Matrix presentation, responsive behavior, empty states, and visual quality checks.
---

# UI Dashboard Skill

## Trigger Conditions

- Use when implementing, reviewing, or planning dashboard UI.
- Use when creating Import Summary, Cleaning Report, Keyword Report, Pricing Report, Competitor Report, Opportunity Matrix, or Exportable Market Report views.
- Use when building reusable visual components such as cards, badges, tables, empty states, score chips, or report panels.
- Use when checking whether UI work meets the project visual quality bar.

## When NOT To Use

- Do not use for data import parsing, data cleaning, analytics scoring, or OpenRouter integration.
- Do not use to change product requirements.
- Do not use to add scraping, login automation, browser automation, or unsupported Fiverr claims.
- Do not use to install UI dependencies unless the user explicitly requests dependency setup.
- Do not use to implement app code when the user requested guidance only.

## Exact UI Implementation Procedure

1. Read `AGENTS.md`, `docs/UI_PRINCIPLES.md`, `docs/REQUIREMENTS.md`, `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, and `docs/GUARDRAILS.md`.
2. State the UI plan before coding.
3. Design the dashboard as a polished SaaS-style analytics tool inspired by Linear, Stripe Dashboard, Vercel, and modern analytics tools.
4. Build reusable components for repeated surfaces: layout, section headers, metric cards, badges, tables, empty states, callouts, and score displays.
5. Make the Opportunity Matrix the visual centerpiece.
6. Keep evidence and caution visible near Opportunity Matrix scores.
7. Show data quality warnings instead of hiding them.
8. Use clean typography, spacing, responsive grids, cards, badges, and tables.
9. Use real product copy; do not use lorem ipsum.
10. Avoid raw browser defaults, Bootstrap-like styling, and generic developer UI.
11. Ensure unknown values are displayed as unknown.
12. Avoid ranking guarantees, income guarantees, live Fiverr access claims, and unsupported Fiverr metrics.
13. Verify the UI at desktop and mobile sizes before final response when app code exists.

## Dashboard Sections

- Import Summary: show file name, niche, import ID, upload timestamp, total rows, imported rows, invalid rows, duplicates, and warnings.
- Cleaning Report: show row-level errors/warnings, normalized values, duplicates, and unknown optional values.
- Keyword Report: show keyword frequency, source fields, matching rows, and technology dictionary matches.
- Pricing Report: show parsed price summaries, currency text, ranges, and price bands without currency conversion.
- Competitor Report: show comparable gigs by keyword overlap and price band using imported fields only.
- Opportunity Matrix: show `keyword`, `frequency`, `competition_score`, `price_score`, `differentiation_score`, `opportunity_score`, `evidence`, and `caution`.
- Exportable Market Report: summarize deterministic reports in a presentable shareable layout once export support exists.

## Acceptance Criteria

- The dashboard looks polished enough to show friends, family, or early users.
- The UI reads as a modern SaaS analytics dashboard, not generic HTML.
- The Opportunity Matrix is the clearest and most prominent visual section.
- Cards, badges, tables, empty states, and responsive layout are used appropriately.
- Components are reusable and not one-off markup.
- Empty and error states are designed, not left as raw text.
- Evidence and caution are visible for opportunity scores.
- Missing or unknown data is clearly labeled.
- The UI contains no lorem ipsum, raw browser defaults, Bootstrap-like generic styling, ranking guarantees, income guarantees, or unsupported Fiverr claims.
