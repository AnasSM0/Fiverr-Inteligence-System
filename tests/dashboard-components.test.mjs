import test from "node:test";
import assert from "node:assert/strict";

import { createDashboardView } from "../src/components/dashboard/dashboard-components.js";

test("renders all MVP dashboard sections without demo analytics", () => {
  const html = createDashboardView();

  for (const sectionTitle of [
    "Import Overview",
    "Market Snapshot",
    "Keyword Intelligence",
    "Pricing Intelligence",
    "Competitor Intelligence",
    "Opportunity Matrix",
    "Insights Panel",
  ]) {
    assert.match(html, new RegExp(sectionTitle));
  }

  assert.match(html, /No file selected/);
  assert.match(html, /No opportunity matrix yet/);
  assert.doesNotMatch(html.toLowerCase(), /lorem ipsum/);
});

test("renders supplied deterministic analytics with evidence and caution", () => {
  const html = createDashboardView({
    niche: { name: "AI Agents" },
    importSummary: {
      totalRows: 4,
      validRows: 3,
      invalidRows: 1,
      duplicateRows: 0,
      lastImportedAt: "2026-06-18T09:00:00.000Z",
    },
    marketSnapshot: {
      totalGigs: 3,
      averagePrice: 50,
      medianPrice: 45,
      averageReviews: 450,
      badgeDistribution: [{ label: "top rated seller", count: 2 }],
    },
    keywords: [
      {
        keyword: "openai",
        frequency: 2,
        opportunityScore: 84,
        evidence: ["openai appears in 2 imported gig titles"],
      },
    ],
    pricing: {
      medianPrice: 45,
      lowBand: 25,
      midBand: 45,
      highBand: 80,
      bandShares: { low: 33.33, mid: 33.33, high: 33.33 },
    },
    competitors: [
      {
        sellerName: "Alpha",
        gigTitle: "I will build OpenAI automation",
        sellerBadgeText: "top rated seller",
        reviewCount: 1000,
        rating: 4.9,
        price: 80,
        competitorScore: 99.5,
      },
    ],
    opportunities: [
      {
        keyword: "claude",
        frequency: 1,
        opportunity_score: 82,
        competition_score: 40,
        price_score: 70,
        differentiation_score: 88,
        evidence: ["claude appears in 1 imported gig"],
        caution: ["Directional analysis from imported dataset only"],
      },
    ],
    insights: ["Median price for AI Agents is $45."],
  });

  assert.match(html, /AI Agents/);
  assert.match(html, /claude/);
  assert.match(html, /Directional analysis from imported dataset only/);
  assert.match(html, /Median price for AI Agents is \$45/);
  assert.match(html, /data-opportunity_score="82"/);
});
