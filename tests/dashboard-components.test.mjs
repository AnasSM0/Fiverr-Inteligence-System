import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createDashboardView } from "../src/components/dashboard/dashboard-components.js";
import { createDashboardModelFromImport } from "../src/lib/dashboard/dashboard-model.js";
import { importGigFile } from "../src/lib/import/import-service.js";

test("renders market intelligence dashboard sections without demo analytics", () => {
  const html = createDashboardView();

  for (const sectionTitle of [
    "Import Dataset",
    "Executive Market Brief",
    "Opportunity Highlights",
    "Market Health",
    "Keyword Intelligence",
    "Pricing Intelligence",
    "Competitor Intelligence",
    "Opportunity Matrix",
    "Positioning Strategy",
    "Fiverr Positioning Suggestions",
    "Profile Optimization Insights",
    "Cleaning Report",
    "Deterministic Notes",
  ]) {
    assert.match(html, new RegExp(sectionTitle));
  }

  assert.match(html, /No file selected/);
  assert.match(html, /No executive brief yet/);
  assert.match(html, /No opportunity matrix yet/);
  assert.doesNotMatch(html.toLowerCase(), /lorem ipsum/);
  assert.doesNotMatch(html.toLowerCase(), /guarantee revenue|guarantee ranking/);
});

test("renders supplied deterministic intelligence with evidence, cautions, and strategy sections", () => {
  const html = createDashboardView({
    niche: { name: "AI Agents" },
    importSummary: {
      totalRows: 4,
      validRows: 3,
      invalidRows: 1,
      duplicateRows: 0,
      warnings: 1,
      ignoredColumns: [],
      columnMapping: { applied: false, mappings: [], ignoredSourceFieldNames: [] },
      lastImportedAt: "2026-06-18T09:00:00.000Z",
    },
    importSuccess: {
      gigsAnalyzed: 3,
      opportunitiesFound: 1,
      strongestOpportunity: "claude",
      topCompetitor: "Alpha",
      medianPrice: 45,
      marketSummary: "AI Agents shows its strongest directional opportunity around claude.",
    },
    executiveBrief: {
      nicheName: "AI Agents",
      totalGigs: 3,
      competitionLevel: "moderate",
      medianPrice: 45,
      averageReviews: 450,
      topKeyword: "openai",
      highestOpportunityKeyword: "claude",
      dominantSellerType: "top rated seller",
      positioningRecommendation: "Use openai for relevance, but make claude the sharper specialization angle.",
    },
    cleaningReport: {
      issues: [
        {
          rowNumber: 4,
          fieldName: "gig_url",
          severity: "error",
          code: "missing_required_value",
          message: "gig_url is required",
        },
      ],
      columnMapping: { applied: false, mappings: [], ignoredSourceFieldNames: [] },
      rows: [
        {
          rowNumber: 4,
          status: "invalid",
          sellerName: "Bad Seller",
          gigTitle: "Broken row",
          startingPrice: 50,
          issueSummary: "row 4 error: gig_url is required",
        },
      ],
    },
    marketHealth: {
      averagePrice: 50,
      medianPrice: 45,
      averageReviews: 450,
      pricedGigShare: 100,
      badgeDistribution: [{ label: "top rated seller", count: 2, shareOfNiche: 66.67 }],
      ratingDistribution: [{ label: "4.8-5.0", count: 3, share: 100 }],
      keywordSaturation: [{ keyword: "openai", frequency: 2, share: 66.67 }],
      keywordConcentrationScore: 45,
      datasetQuality: {
        validShare: 75,
        duplicateRows: 0,
        invalidRows: 1,
        warningCount: 1,
        label: "usable",
        evidence: "3 valid row(s), 1 invalid row(s), and 0 duplicate row(s) from 4 source row(s).",
      },
    },
    keywordIntelligence: {
      dominantKeywords: [
        {
          keyword: "openai",
          frequency: 2,
          opportunityScore: 84,
          evidence: ["openai appears in 2 imported gig titles"],
        },
      ],
      emergingOpportunities: [
        {
          keyword: "claude",
          frequency: 1,
          opportunity_score: 82,
        },
      ],
      underrepresentedTechnologies: [{ dictionaryTerm: "Claude", keyword: "claude", frequency: 1 }],
      leastSaturatedValuableKeywords: [
        {
          keyword: "claude",
          frequency: 1,
          opportunity_score: 82,
        },
      ],
      keywordConcentrationScore: 45,
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
        positioningSummary: "above median price; strong review proof; top rated seller badge.",
        standOutReason: "Highest deterministic competitor score in the uploaded dataset.",
      },
    ],
    opportunityHighlights: [
      {
        keyword: "claude",
        opportunityScore: 82,
        competitionScore: 40,
        monetizationScore: 70,
        differentiationScore: 88,
        frequency: 1,
        explanation: "claude appears in 1 imported gig",
        caution: "Directional analysis from imported dataset only",
        confidence: "limited",
        priority: "Top priority",
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
    positioningSuggestions: [
      {
        title: "Lead with the clearest opportunity",
        detail: "Position AI Agents around claude where the uploaded dataset shows the strongest directional opportunity score.",
      },
    ],
    profileInsights: [
      {
        title: "Headline focus",
        detail: "Make the profile headline point toward claude specialization instead of a broad AI Agents label.",
      },
    ],
    insights: ["Median price for AI Agents is $45."],
  });

  assert.match(html, /AI Agents/);
  assert.match(html, /Executive Market Brief/);
  assert.match(html, /claude/);
  assert.match(html, /Directional analysis from imported dataset only/);
  assert.match(html, /Why they stand out/);
  assert.match(html, /Lead with the clearest opportunity/);
  assert.match(html, /Headline focus/);
  assert.match(html, /gig_url is required/);
  assert.match(html, /Median price for AI Agents is \$45/);
  assert.match(html, /data-opportunity_score="82"/);
});

test("renders column mapping report for Instant Data Scraper uploads", async () => {
  const csv = await readFile(new URL("./fixtures/import/instant-data-scraper-gigs.csv", import.meta.url), "utf8");
  const importResult = importGigFile({
    fileName: "instant-data-scraper-gigs.csv",
    content: csv,
    niche: {
      id: "niche_ai_agents",
      name: "AI Agents",
      createdAt: "2026-06-18T09:00:00.000Z",
    },
    uploadedAt: "2026-06-18T09:01:00.000Z",
    importRunId: "import_dashboard_ids_flow",
  });

  const model = createDashboardModelFromImport(importResult);
  const html = createDashboardView(model);

  assert.equal(model.importSummary.validRows, 2);
  assert.equal(model.importSummary.columnMapping.applied, true);
  assert.ok(model.executiveBrief);
  assert.ok(model.opportunityHighlights.length > 0);
  assert.ok(model.positioningSuggestions.length > 0);
  assert.ok(model.profileInsights.length > 0);
  assert.match(html, /Column Mapping Applied/);
  assert.match(html, /media href/);
  assert.match(html, /gig_url/);
  assert.match(html, /text-bold 2/);
  assert.match(html, /starting_price/);
  assert.match(html, /Import success/);
  assert.match(html, /Opportunity Highlights/);
});

test("renders real uploaded CSV analytics through import, pipeline, and dashboard model", async () => {
  const csv = await readFile(new URL("./fixtures/import/sample-gigs.csv", import.meta.url), "utf8");
  const importResult = importGigFile({
    fileName: "sample-gigs.csv",
    content: csv,
    niche: {
      id: "niche_ai_agents",
      name: "AI Agents",
      createdAt: "2026-06-18T09:00:00.000Z",
    },
    uploadedAt: "2026-06-18T09:01:00.000Z",
    importRunId: "import_dashboard_flow",
  });

  const model = createDashboardModelFromImport(importResult);
  const html = createDashboardView(model);

  assert.equal(model.importSummary.validRows, 2);
  assert.equal(model.importSummary.duplicateRows, 1);
  assert.equal(model.importSummary.invalidRows, 1);
  assert.ok(model.executiveBrief.positioningRecommendation.length > 0);
  assert.ok(model.marketHealth.datasetQuality.evidence.includes("duplicate"));
  assert.ok(model.opportunities.length > 0);
  assert.ok(model.opportunityHighlights.length > 0);
  assert.ok(model.keywordIntelligence.dominantKeywords.length > 0);
  assert.match(html, /AI Agents/);
  assert.match(html, /duplicate_gig_url|Duplicate gig_url/);
  assert.doesNotMatch(html, /Column Mapping Applied/);
  assert.match(html, /n8n|openai|zapier/);
  assert.match(html, /Directional analysis from the uploaded dataset only/);
  assert.match(html, /Fiverr Positioning Suggestions/);
  assert.doesNotMatch(html.toLowerCase(), /lorem ipsum|guarantee revenue|guarantee ranking/);
});
