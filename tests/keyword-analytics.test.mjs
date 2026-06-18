import test from "node:test";
import assert from "node:assert/strict";

import { analyzeKeywordAnalytics, tokenizeAnalyticsText } from "../src/lib/analytics/keyword-analytics.js";

const gigs = [
  normalizedGig({
    id: "gig_ai_1",
    nicheId: "niche_ai_agents",
    gig_title: "I will build OpenAI n8n AI agents",
    extra_features: "OpenAI integration, n8n workflow automation",
    seller_badge_text: "top rated seller",
    review_count: 1200,
  }),
  normalizedGig({
    id: "gig_ai_2",
    nicheId: "niche_ai_agents",
    gig_title: "I will create Claude MCP agent workflows",
    extra_features: "Claude, MCP, LangGraph orchestration",
    seller_badge_text: "level 2 seller",
    review_count: 30,
  }),
  normalizedGig({
    id: "gig_ai_3",
    nicheId: "niche_ai_agents",
    gig_title: "I will build FastAPI AI backend automations",
    extra_features: "FastAPI backend, OpenAI API",
    seller_badge_text: null,
    review_count: 20,
  }),
  normalizedGig({
    id: "gig_web_1",
    nicheId: "niche_web",
    gig_title: "I will build WordPress website",
    extra_features: "WordPress theme setup",
    seller_badge_text: "top rated seller",
    review_count: 300,
  }),
];

test("tokenizeAnalyticsText applies stopword filtering", () => {
  assert.deepEqual(tokenizeAnalyticsText("I will build OpenAI and FastAPI for your app"), ["openai", "fastapi", "app"]);
});

test("computes keyword frequency per niche from titles and extra_features", () => {
  const result = analyzeKeywordAnalytics(gigs);
  const openai = result.keywordMetrics.find((metric) => metric.nicheId === "niche_ai_agents" && metric.keyword === "openai");
  const wordpress = result.keywordMetrics.find((metric) => metric.nicheId === "niche_web" && metric.keyword === "wordpress");

  assert.equal(openai.frequency, 2);
  assert.deepEqual(openai.matchingGigIds, ["gig_ai_1", "gig_ai_3"]);
  assert.deepEqual(openai.sourceFields, ["gig_title", "extra_features"]);
  assert.equal(wordpress.frequency, 1);
  assert.deepEqual(wordpress.matchingGigIds, ["gig_web_1"]);
});

test("computes 2-word and 3-word phrase frequency from gig titles", () => {
  const result = analyzeKeywordAnalytics(gigs);

  assert.ok(result.phraseMetrics.some((metric) => metric.nicheId === "niche_ai_agents" && metric.phrase === "openai n8n" && metric.phraseSize === 2));
  assert.ok(result.phraseMetrics.some((metric) => metric.nicheId === "niche_ai_agents" && metric.phrase === "openai n8n ai" && metric.phraseSize === 3));
  assert.ok(result.phraseMetrics.some((metric) => metric.nicheId === "niche_web" && metric.phrase === "wordpress website" && metric.phraseSize === 2));
});

test("detects configurable technology keywords with source evidence", () => {
  const result = analyzeKeywordAnalytics(gigs, {
    technologyDictionary: ["OpenAI", "Claude", "MCP", "LangGraph", "FastAPI"],
  });
  const openai = result.technologyKeywordMetrics.find((metric) => metric.keyword === "openai");
  const langGraph = result.technologyKeywordMetrics.find((metric) => metric.keyword === "langgraph");

  assert.equal(openai.frequency, 2);
  assert.deepEqual(openai.matchingGigIds, ["gig_ai_1", "gig_ai_3"]);
  assert.ok(openai.evidence.some((item) => item.includes("extra_features contains technology keyword OpenAI")));
  assert.equal(langGraph.frequency, 1);
  assert.deepEqual(langGraph.sourceFields, ["extra_features"]);
});

test("breaks down seller badge keywords per niche", () => {
  const result = analyzeKeywordAnalytics(gigs);
  const top = result.sellerBadgeKeywordMetrics.find((metric) => metric.nicheId === "niche_ai_agents" && metric.keyword === "top");
  const seller = result.sellerBadgeKeywordMetrics.find((metric) => metric.nicheId === "niche_ai_agents" && metric.keyword === "seller");

  assert.equal(top.frequency, 1);
  assert.equal(seller.frequency, 2);
  assert.deepEqual(seller.matchingGigIds, ["gig_ai_1", "gig_ai_2"]);
});

test("computes top keywords among high-review gigs only", () => {
  const result = analyzeKeywordAnalytics(gigs, { highReviewMinimum: 100 });
  const openai = result.topHighReviewKeywords.find((metric) => metric.nicheId === "niche_ai_agents" && metric.keyword === "openai");
  const claude = result.topHighReviewKeywords.find((metric) => metric.keyword === "claude");

  assert.equal(openai.frequency, 1);
  assert.deepEqual(openai.matchingGigIds, ["gig_ai_1"]);
  assert.equal(claude, undefined);
});

test("surfaces low-competition keyword candidates without live-market claims", () => {
  const result = analyzeKeywordAnalytics(gigs, {
    lowCompetitionMaxGigCount: 1,
    lowCompetitionMaxAverageReviews: 50,
  });
  const fastapi = result.lowCompetitionKeywordCandidates.find((candidate) => candidate.keyword === "fastapi");
  const claude = result.lowCompetitionKeywordCandidates.find((candidate) => candidate.keyword === "claude");
  const openai = result.lowCompetitionKeywordCandidates.find((candidate) => candidate.keyword === "openai");

  assert.equal(fastapi.frequency, 1);
  assert.equal(fastapi.averageReviewCount, 20);
  assert.equal(claude.averageReviewCount, 30);
  assert.equal(openai, undefined);
  assert.match(fastapi.caution[0], /imported dataset/);
});

/**
 * @param {Partial<import("../src/types/domain.js").NormalizedGig>} overrides
 * @returns {import("../src/types/domain.js").NormalizedGig}
 */
function normalizedGig(overrides) {
  return {
    id: "gig",
    importRunId: "import_keywords",
    rawRowId: "raw",
    nicheId: "niche",
    isValid: true,
    isDuplicate: false,
    gig_url: "https://www.fiverr.com/example/gig",
    gig_image_url: null,
    seller_profile_image_url: null,
    seller_profile_url: null,
    seller_name: "Seller",
    seller_badge_icon_url: null,
    seller_badge_text: null,
    gig_title: "I will build an app",
    rating: { raw: null, value: null },
    review_count: { raw: null, value: null },
    starting_price: { raw: "$10", currencyText: "$", value: 10 },
    extra_features: null,
    normalizedAt: "2026-06-18T09:00:00.000Z",
    ...overrides,
    review_count: {
      raw: String(overrides.review_count ?? ""),
      value: typeof overrides.review_count === "number" ? overrides.review_count : null,
    },
  };
}
