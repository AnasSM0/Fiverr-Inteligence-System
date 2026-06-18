import { parseExtraFeatures } from "../cleaning/cleaning-engine.js";
import { tokenizeAnalyticsText } from "./keyword-analytics.js";

/**
 * @typedef {import("../../types/domain.js").NormalizedGig} NormalizedGig
 * @typedef {import("../../types/domain.js").PricingAnalyticsResult} PricingAnalyticsResult
 */

const UNKNOWN_CURRENCY_KEY = "__unknown_currency__";

/**
 * @param {NormalizedGig[]} gigs
 * @param {{ highReviewMinimum?: number }} options
 * @returns {PricingAnalyticsResult}
 */
export function analyzePricingAnalytics(gigs, options = {}) {
  const eligibleGigs = gigs.filter(hasUsablePrice);
  const highReviewMinimum = options.highReviewMinimum ?? 100;

  return {
    overall: buildOverallPricing(eligibleGigs),
    byKeyword: buildKeywordPricing(eligibleGigs),
    byBadge: buildBadgePricing(eligibleGigs),
    highReview: buildHighReviewPricing(eligibleGigs, highReviewMinimum),
  };
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildOverallPricing(gigs) {
  return sortByNicheCurrency([...groupByNicheAndCurrency(gigs).values()].map((group) => {
    const stats = computePriceStats(group.gigs);
    return {
      id: `pricing_${slug(group.nicheId)}_${slug(currencyDisplay(group.currencyText))}`,
      nicheId: group.nicheId,
      currencyText: group.currencyText,
      ...stats,
      priceBands: buildPriceBands(group.gigs, stats.p25, stats.p75),
      matchingGigIds: group.gigs.map((gig) => gig.id),
    };
  }));
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildKeywordPricing(gigs) {
  const index = new Map();

  for (const gig of gigs) {
    for (const keyword of collectGigKeywords(gig)) {
      const key = `${gig.nicheId}:${currencyKey(gig.starting_price.currencyText)}:${keyword}`;
      if (!index.has(key)) {
        index.set(key, {
          nicheId: gig.nicheId,
          currencyText: gig.starting_price.currencyText,
          keyword,
          gigs: [],
        });
      }
      index.get(key).gigs.push(gig);
    }
  }

  return [...index.values()]
    .map((group) => {
      const stats = computePriceStats(group.gigs);
      return {
        id: `keyword_price_${slug(group.nicheId)}_${slug(currencyDisplay(group.currencyText))}_${slug(group.keyword)}`,
        nicheId: group.nicheId,
        currencyText: group.currencyText,
        keyword: group.keyword,
        count: stats.count,
        min: stats.min,
        max: stats.max,
        average: stats.average,
        median: stats.median,
        matchingGigIds: group.gigs.map((gig) => gig.id),
        evidence: [`${group.keyword} appears in ${group.gigs.length} priced gig(s) in the imported dataset`],
        caution: ["Keyword-to-price correlation is directional and based only on imported rows with parsed numeric prices"],
      };
    })
    .sort((a, b) => a.nicheId.localeCompare(b.nicheId) || currencyDisplay(a.currencyText).localeCompare(currencyDisplay(b.currencyText)) || b.count - a.count || a.keyword.localeCompare(b.keyword));
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildBadgePricing(gigs) {
  const index = new Map();

  for (const gig of gigs) {
    if (!gig.seller_badge_text) continue;
    const key = `${gig.nicheId}:${currencyKey(gig.starting_price.currencyText)}:${gig.seller_badge_text}`;
    if (!index.has(key)) {
      index.set(key, {
        nicheId: gig.nicheId,
        currencyText: gig.starting_price.currencyText,
        badgeText: gig.seller_badge_text,
        gigs: [],
      });
    }
    index.get(key).gigs.push(gig);
  }

  return [...index.values()]
    .map((group) => ({
      id: `badge_price_${slug(group.nicheId)}_${slug(currencyDisplay(group.currencyText))}_${slug(group.badgeText)}`,
      nicheId: group.nicheId,
      currencyText: group.currencyText,
      badgeText: group.badgeText,
      ...computePriceStats(group.gigs),
      matchingGigIds: group.gigs.map((gig) => gig.id),
    }))
    .sort((a, b) => a.nicheId.localeCompare(b.nicheId) || currencyDisplay(a.currencyText).localeCompare(currencyDisplay(b.currencyText)) || b.count - a.count || a.badgeText.localeCompare(b.badgeText));
}

/**
 * @param {NormalizedGig[]} gigs
 * @param {number} highReviewMinimum
 */
function buildHighReviewPricing(gigs, highReviewMinimum) {
  const highReviewGigs = gigs.filter((gig) => (gig.review_count.value ?? 0) >= highReviewMinimum);

  return sortByNicheCurrency([...groupByNicheAndCurrency(highReviewGigs).values()].map((group) => ({
    id: `high_review_price_${slug(group.nicheId)}_${slug(currencyDisplay(group.currencyText))}`,
    nicheId: group.nicheId,
    currencyText: group.currencyText,
    highReviewMinimum,
    ...computePriceStats(group.gigs),
    matchingGigIds: group.gigs.map((gig) => gig.id),
  })));
}

/**
 * @param {NormalizedGig[]} gigs
 */
function groupByNicheAndCurrency(gigs) {
  const groups = new Map();
  for (const gig of gigs) {
    const key = `${gig.nicheId}:${currencyKey(gig.starting_price.currencyText)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        nicheId: gig.nicheId,
        currencyText: gig.starting_price.currencyText,
        gigs: [],
      });
    }
    groups.get(key).gigs.push(gig);
  }
  return groups;
}

/**
 * @param {NormalizedGig[]} gigs
 */
export function computePriceStats(gigs) {
  const values = gigs
    .map((gig) => gig.starting_price.value)
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      average: null,
      median: null,
      p25: null,
      p75: null,
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    min: values[0],
    max: values[values.length - 1],
    average: round(total / values.length),
    median: round(percentile(values, 0.5)),
    p25: round(percentile(values, 0.25)),
    p75: round(percentile(values, 0.75)),
  };
}

/**
 * @param {NormalizedGig[]} gigs
 * @param {number | null} p25
 * @param {number | null} p75
 */
function buildPriceBands(gigs, p25, p75) {
  const bands = [
    { band: "low", gigs: [] },
    { band: "mid", gigs: [] },
    { band: "high", gigs: [] },
  ];

  if (p25 === null || p75 === null) {
    return bands.map((entry) => toPriceBandMetric(entry.band, entry.gigs));
  }

  for (const gig of gigs) {
    const price = gig.starting_price.value;
    if (typeof price !== "number") continue;
    if (price <= p25) {
      bands[0].gigs.push(gig);
    } else if (price <= p75) {
      bands[1].gigs.push(gig);
    } else {
      bands[2].gigs.push(gig);
    }
  }

  return bands.map((entry) => toPriceBandMetric(entry.band, entry.gigs));
}

/**
 * @param {"low" | "mid" | "high"} band
 * @param {NormalizedGig[]} gigs
 */
function toPriceBandMetric(band, gigs) {
  const stats = computePriceStats(gigs);
  return {
    band,
    count: stats.count,
    min: stats.min,
    max: stats.max,
    matchingGigIds: gigs.map((gig) => gig.id),
  };
}

/**
 * @param {NormalizedGig} gig
 */
function collectGigKeywords(gig) {
  const titleTokens = tokenizeAnalyticsText(gig.gig_title);
  const featureTokens = parseExtraFeatures(gig.extra_features).cleaned.flatMap((feature) => tokenizeAnalyticsText(feature));
  return [...new Set([...titleTokens, ...featureTokens])];
}

/**
 * @param {NormalizedGig} gig
 */
function hasUsablePrice(gig) {
  return gig.isValid && !gig.isDuplicate && typeof gig.starting_price.value === "number" && Number.isFinite(gig.starting_price.value);
}

/**
 * @param {number[]} sortedValues
 * @param {number} fraction
 */
function percentile(sortedValues, fraction) {
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (sortedValues.length - 1) * fraction;
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];
  const weight = rank - lowerIndex;
  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight;
}

/**
 * @param {number} value
 */
function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * @param {string | null} value
 */
function currencyKey(value) {
  return value ?? UNKNOWN_CURRENCY_KEY;
}

/**
 * @param {string | null} value
 */
function currencyDisplay(value) {
  return value ?? "unknown";
}

/**
 * @param {Array<{ nicheId: string, currencyText: string | null }>} metrics
 */
function sortByNicheCurrency(metrics) {
  return metrics.sort((a, b) => a.nicheId.localeCompare(b.nicheId) || currencyDisplay(a.currencyText).localeCompare(currencyDisplay(b.currencyText)));
}

/**
 * @param {string} value
 */
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "value";
}
