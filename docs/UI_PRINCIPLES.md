# UI Principles

## Product Standard

Build Fiverr Positioning Intelligence System as a polished SaaS-style analytics dashboard, not generic HTML.

The interface should feel credible enough to show friends, family, and early users. Keep it simple, but make it visually deliberate: clean typography, disciplined spacing, reusable components, responsive layout, and well-structured analytics surfaces.

## Visual Direction

Use modern analytics dashboard patterns inspired by:

- Linear
- Stripe Dashboard
- Vercel
- Modern SaaS analytics tools

These are references for quality and restraint, not sources to copy exactly.

## Core UI Qualities

- Use clean typography with clear hierarchy.
- Use consistent spacing and alignment.
- Use cards for summarized metrics, reports, and grouped content.
- Use badges for statuses, niches, warnings, missing data, and score labels.
- Use tables for imported rows, cleaning issues, competitor comparisons, and Opportunity Matrix details.
- Use empty states for no file uploaded, no valid rows, no competitors, and no opportunities.
- Use responsive layouts that remain useful on mobile, tablet, and desktop.
- Use reusable components rather than one-off markup.
- Keep visual density appropriate for repeated analysis work.

## Dashboard Priority

The Opportunity Matrix must be the visual centerpiece of the dashboard.

It should be easy to scan:

- `keyword`
- `frequency`
- `competition_score`
- `price_score`
- `differentiation_score`
- `opportunity_score`
- `evidence`
- `caution`

Use visual emphasis for `opportunity_score`, but keep evidence and caution visible enough that the score is not treated as a black box.

## Expected Dashboard Sections

- Import Summary
- Cleaning Report
- Keyword Report
- Pricing Report
- Competitor Report
- Opportunity Matrix
- Exportable Market Report

The dashboard should guide users from import health to market insight without hiding data quality warnings.

## Component Guidance

Prefer reusable components for:

- App shell and page layout
- Section headers
- Metric cards
- Status badges
- Data tables
- Empty states
- Warning/error callouts
- Score bars or score chips
- Report panels
- Upload/import summary blocks

Components should receive typed data and avoid embedding business logic in presentation markup.

## Avoid

- Raw browser defaults.
- Bootstrap-like generic styling.
- Lorem ipsum or placeholder copy.
- Generic developer UI.
- Decorative visuals that distract from analytics.
- Hiding missing-data warnings.
- Presenting scores without evidence and caution.
- Ranking guarantees, income guarantees, or unsupported Fiverr claims.

## Copy Guidelines

- Use plain, specific product language.
- Label unknown values as unknown.
- Label opportunities as directional analysis, not predictions.
- Keep cautions visible near scores.
- Do not imply live Fiverr access.
- Do not imply scraping, ranking tracking, or income forecasting.

## Acceptance Bar

A UI change is acceptable when:

- It looks like a modern SaaS dashboard rather than unstyled HTML.
- It uses reusable components.
- It is responsive.
- It has meaningful empty states.
- It makes the Opportunity Matrix prominent.
- It keeps evidence, cautions, and data quality warnings visible.
- It avoids generic placeholder text and unsupported claims.
