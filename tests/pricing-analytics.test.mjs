import test from "node:test";
import assert from "node:assert/strict";

import { analyzePricingAnalytics, computePriceStats } from "../src/lib/analytics/pricing-analytics.js";

test("computes median and interpolated percentiles", () => {
  const stats = computePriceStats([
    normalizedGig({ id: "gig_10", price: 10 }),
    normalizedGig({ id: "gig_20", price: 20 }),
    normalizedGig({ id: "gig_30", price: 30 }),
    normalizedGig({ id: "gig_40", price: 40 }),
  ]);

  assert.deepEqual(stats, {
    count: 4,
    min: 10,
    max: 40,
    average: 25,
    median: 25,
    p25: 17.5,
    p75: 32.5,
  });
});

test("groups pricing analytics by niche and currency without conversion", () => {
  const result = analyzePricingAnalytics([
    normalizedGig({ id: "usd_1", nicheId: "niche_ai_agents", price: 10, currencyText: "$" }),
    normalizedGig({ id: "usd_2", nicheId: "niche_ai_agents", price: 30, currencyText: "$" }),
    normalizedGig({ id: "pkr_1", nicheId: "niche_ai_agents", price: 5000, currencyText: "PKR" }),
    normalizedGig({ id: "web_usd_1", nicheId: "niche_web", price: 80, currencyText: "$" }),
  ]);

  const aiUsd = result.overall.find((metric) => metric.nicheId === "niche_ai_agents" && metric.currencyText === "$");
  const aiPkr = result.overall.find((metric) => metric.nicheId === "niche_ai_agents" && metric.currencyText === "PKR");
  const webUsd = result.overall.find((metric) => metric.nicheId === "niche_web" && metric.currencyText === "$");

  assert.equal(result.overall.length, 3);
  assert.equal(aiUsd.count, 2);
  assert.equal(aiUsd.average, 20);
  assert.equal(aiPkr.count, 1);
  assert.equal(aiPkr.average, 5000);
  assert.equal(webUsd.count, 1);
  assert.equal(webUsd.average, 80);
});

test("builds price bands from p25 and p75 thresholds", () => {
  const result = analyzePricingAnalytics([
    normalizedGig({ id: "gig_10", price: 10 }),
    normalizedGig({ id: "gig_20", price: 20 }),
    normalizedGig({ id: "gig_30", price: 30 }),
    normalizedGig({ id: "gig_40", price: 40 }),
  ]);
  const overall = result.overall[0];

  assert.deepEqual(
    overall.priceBands.map((band) => ({ band: band.band, count: band.count, matchingGigIds: band.matchingGigIds })),
    [
      { band: "low", count: 1, matchingGigIds: ["gig_10"] },
      { band: "mid", count: 2, matchingGigIds: ["gig_20", "gig_30"] },
      { band: "high", count: 1, matchingGigIds: ["gig_40"] },
    ],
  );
});

test("computes badge-based and high-review pricing comparisons", () => {
  const result = analyzePricingAnalytics(
    [
      normalizedGig({ id: "top_1", price: 50, seller_badge_text: "top rated seller", review_count: 900 }),
      normalizedGig({ id: "top_2", price: 70, seller_badge_text: "top rated seller", review_count: 1200 }),
      normalizedGig({ id: "level_2", price: 25, seller_badge_text: "level 2 seller", review_count: 80 }),
      normalizedGig({ id: "no_badge", price: 15, seller_badge_text: null, review_count: 500 }),
    ],
    { highReviewMinimum: 500 },
  );

  const topBadge = result.byBadge.find((metric) => metric.badgeText === "top rated seller");
  const highReview = result.highReview[0];

  assert.equal(topBadge.count, 2);
  assert.equal(topBadge.average, 60);
  assert.deepEqual(topBadge.matchingGigIds, ["top_1", "top_2"]);
  assert.equal(result.byBadge.some((metric) => metric.badgeText === null), false);
  assert.equal(highReview.highReviewMinimum, 500);
  assert.equal(highReview.count, 3);
  assert.equal(highReview.median, 50);
});

test("summarizes keyword-to-price correlation from titles and extra_features", () => {
  const result = analyzePricingAnalytics([
    normalizedGig({ id: "openai_low", price: 10, gig_title: "I will build OpenAI chatbot", extra_features: "FastAPI backend" }),
    normalizedGig({ id: "openai_high", price: 30, gig_title: "I will create OpenAI agent", extra_features: "n8n automation" }),
    normalizedGig({ id: "wordpress", price: 100, gig_title: "I will build WordPress website", extra_features: "theme setup" }),
  ]);

  const openai = result.byKeyword.find((metric) => metric.keyword === "openai");
  const fastapi = result.byKeyword.find((metric) => metric.keyword === "fastapi");

  assert.equal(openai.count, 2);
  assert.equal(openai.average, 20);
  assert.deepEqual(openai.matchingGigIds, ["openai_low", "openai_high"]);
  assert.match(openai.caution[0], /imported rows/);
  assert.equal(fastapi.count, 1);
  assert.equal(fastapi.average, 10);
});

test("returns empty analytics for empty or unusable data", () => {
  const result = analyzePricingAnalytics([
    normalizedGig({ id: "invalid", isValid: false, price: 10 }),
    normalizedGig({ id: "duplicate", isDuplicate: true, price: 20 }),
    normalizedGig({ id: "missing_price", price: null }),
  ]);

  assert.deepEqual(result, {
    overall: [],
    byKeyword: [],
    byBadge: [],
    highReview: [],
  });
});

/**
 * @param {Partial<import("../src/types/domain.js").NormalizedGig> & {
 *   price?: number | null,
 *   currencyText?: string | null,
 *   review_count?: number | null
 * }} overrides
 * @returns {import("../src/types/domain.js").NormalizedGig}
 */
function normalizedGig(overrides = {}) {
  const price = Object.hasOwn(overrides, "price") ? overrides.price : 10;
  const reviewCount = Object.hasOwn(overrides, "review_count") ? overrides.review_count : 0;
  const normalizedOverrides = { ...overrides };
  delete normalizedOverrides.price;
  delete normalizedOverrides.currencyText;
  delete normalizedOverrides.review_count;

  return {
    id: "gig",
    importRunId: "import_pricing",
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
    rating: { raw: null, value: null },
    review_count: {
      raw: reviewCount === null ? null : String(reviewCount),
      value: reviewCount,
    },
    starting_price: {
      raw: price === null ? null : `${overrides.currencyText ?? "$"}${price}`,
      currencyText: Object.hasOwn(overrides, "currencyText") ? overrides.currencyText : "$",
      value: price,
    },
    extra_features: null,
    normalizedAt: "2026-06-18T09:00:00.000Z",
    ...normalizedOverrides,
  };
}
