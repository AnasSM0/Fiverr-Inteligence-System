import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeCompetitorComparison,
  COMPETITOR_SCORE_FORMULA,
  DEFAULT_COMPETITOR_SCORE_WEIGHTS,
} from "../src/lib/analytics/competitor-comparison.js";

const gigs = [
  normalizedGig({
    id: "automation_pro",
    seller_name: "Alpha",
    gig_title: "I will build OpenAI automation",
    review_count: 1000,
    rating: 4.9,
    price: 80,
    seller_badge_text: "top rated seller",
  }),
  normalizedGig({
    id: "automation_starter",
    seller_name: "Beta",
    gig_title: "I will build OpenAI automation",
    review_count: 200,
    rating: 5,
    price: 25,
    seller_badge_text: "level 2 seller",
  }),
  normalizedGig({
    id: "n8n_workflow",
    seller_name: "Alpha",
    gig_title: "I will create n8n workflow",
    review_count: 150,
    rating: 4.8,
    price: 45,
    seller_badge_text: "top rated seller",
  }),
  normalizedGig({
    id: "wordpress_site",
    nicheId: "niche_web",
    seller_name: "Gamma",
    gig_title: "I will build WordPress website",
    review_count: 500,
    rating: 4.7,
    price: 60,
    seller_badge_text: null,
  }),
  normalizedGig({
    id: "duplicate",
    seller_name: "Delta",
    review_count: 9999,
    rating: 5,
    isDuplicate: true,
  }),
  normalizedGig({
    id: "invalid",
    seller_name: "Echo",
    review_count: 9999,
    rating: 5,
    isValid: false,
  }),
];

test("sorts top competitors by review_count within valid deduplicated gigs", () => {
  const result = analyzeCompetitorComparison(gigs);

  assert.deepEqual(
    result.topByReviewCount.map((metric) => metric.gigId),
    ["automation_pro", "wordpress_site", "automation_starter", "n8n_workflow"],
  );
  assert.equal(result.topByReviewCount.some((metric) => metric.gigId === "duplicate"), false);
  assert.equal(result.topByReviewCount.some((metric) => metric.gigId === "invalid"), false);
});

test("sorts top competitors by rating with a minimum review threshold", () => {
  const result = analyzeCompetitorComparison(gigs, { minReviewsForTopRating: 180 });

  assert.deepEqual(
    result.topByRating.map((metric) => metric.gigId),
    ["automation_starter", "automation_pro", "wordpress_site"],
  );
  assert.equal(result.topByRating.some((metric) => metric.gigId === "n8n_workflow"), false);
});

test("computes badge distribution and seller concentration per niche", () => {
  const result = analyzeCompetitorComparison(gigs);
  const topRated = result.badgeDistribution.find((metric) => metric.nicheId === "niche_ai_agents" && metric.badgeText === "top rated seller");
  const unknown = result.badgeDistribution.find((metric) => metric.nicheId === "niche_web" && metric.badgeText === null);
  const alpha = result.sellerConcentration.find((metric) => metric.nicheId === "niche_ai_agents" && metric.sellerName === "Alpha");

  assert.equal(topRated.count, 2);
  assert.equal(topRated.shareOfNiche, 66.67);
  assert.equal(unknown.label, "unknown");
  assert.match(unknown.caution[0], /unknown/);
  assert.equal(alpha.gigCount, 2);
  assert.equal(alpha.shareOfNiche, 66.67);
  assert.equal(alpha.totalReviewCount, 1150);
});

test("compares price vs review positioning by niche and currency", () => {
  const result = analyzeCompetitorComparison(gigs);
  const pro = result.priceReviewPositioning.find((metric) => metric.gigId === "automation_pro");
  const starter = result.priceReviewPositioning.find((metric) => metric.gigId === "automation_starter");
  const workflow = result.priceReviewPositioning.find((metric) => metric.gigId === "n8n_workflow");

  assert.equal(pro.position, "premium_social_proof");
  assert.equal(starter.position, "value_social_proof");
  assert.equal(workflow.position, "value_low_review");
  assert.equal(pro.currencyText, "$");
  assert.equal(pro.nicheCurrencyMedianPrice, 45);
  assert.equal(pro.nicheMedianReviewCount, 200);
});

test("summarizes title patterns from deterministic title tokens", () => {
  const result = analyzeCompetitorComparison(gigs);
  const pattern = result.titlePatterns.find((metric) => metric.nicheId === "niche_ai_agents" && metric.pattern === "openai automation");

  assert.equal(pattern.frequency, 2);
  assert.deepEqual(pattern.matchingGigIds, ["automation_pro", "automation_starter"]);
});

test("computes transparent competitor score with editable formula weights", () => {
  const result = analyzeCompetitorComparison(gigs);
  const pro = result.competitorScores.find((metric) => metric.gigId === "automation_pro");
  const starter = result.competitorScores.find((metric) => metric.gigId === "automation_starter");

  assert.equal(result.scoringFormula.description, COMPETITOR_SCORE_FORMULA);
  assert.deepEqual(result.scoringFormula.weights, DEFAULT_COMPETITOR_SCORE_WEIGHTS);
  assert.equal(pro.competitorScore, 99.5);
  assert.equal(starter.competitorScore, 56.5);
  assert.deepEqual(
    pro.components.map((component) => component.name),
    ["reviewCount", "rating", "badgePresence", "sellerConcentration"],
  );
  assert.match(pro.caution[0], /does not predict Fiverr ranking/);
});

test("allows competitor score weights to be edited deterministically", () => {
  const result = analyzeCompetitorComparison(gigs, {
    scoreWeights: {
      reviewCount: 1,
      rating: 0,
      badgePresence: 0,
      sellerConcentration: 0,
    },
  });

  assert.deepEqual(
    result.competitorScores.map((metric) => [metric.gigId, metric.competitorScore]),
    [
      ["automation_pro", 100],
      ["wordpress_site", 100],
      ["automation_starter", 20],
      ["n8n_workflow", 15],
    ],
  );
});

/**
 * @param {Partial<import("../src/types/domain.js").NormalizedGig> & {
 *   price?: number | null,
 *   rating?: number | null,
 *   review_count?: number | null
 * }} overrides
 * @returns {import("../src/types/domain.js").NormalizedGig}
 */
function normalizedGig(overrides = {}) {
  const price = Object.hasOwn(overrides, "price") ? overrides.price : 50;
  const rating = Object.hasOwn(overrides, "rating") ? overrides.rating : 4.5;
  const reviewCount = Object.hasOwn(overrides, "review_count") ? overrides.review_count : 0;
  const normalizedOverrides = { ...overrides };
  delete normalizedOverrides.price;
  delete normalizedOverrides.rating;
  delete normalizedOverrides.review_count;

  return {
    id: "gig",
    importRunId: "import_competitors",
    rawRowId: "raw",
    nicheId: "niche_ai_agents",
    isValid: true,
    isDuplicate: false,
    gig_url: "https://www.fiverr.com/example/gig",
    gig_image_url: null,
    seller_profile_image_url: null,
    seller_profile_url: null,
    seller_name: "Seller",
    seller_badge_icon_url: null,
    seller_badge_text: null,
    gig_title: "I will build OpenAI automation",
    rating: {
      raw: rating === null ? null : String(rating),
      value: rating,
    },
    review_count: {
      raw: reviewCount === null ? null : String(reviewCount),
      value: reviewCount,
    },
    starting_price: {
      raw: price === null ? null : `$${price}`,
      currencyText: "$",
      value: price,
    },
    extra_features: null,
    normalizedAt: "2026-06-18T09:00:00.000Z",
    ...normalizedOverrides,
  };
}
