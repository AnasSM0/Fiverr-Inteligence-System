import { parseExtraFeatures } from "../cleaning/cleaning-engine.js";

/**
 * @typedef {import("../../types/domain.js").KeywordAnalyticsResult} KeywordAnalyticsResult
 * @typedef {import("../../types/domain.js").NormalizedGig} NormalizedGig
 * @typedef {import("../../types/domain.js").OpportunityMetric} OpportunityMetric
 */

/**
 * @param {NormalizedGig[]} gigs
 * @param {KeywordAnalyticsResult} keywordAnalytics
 * @param {{ maxResults?: number }} options
 * @returns {OpportunityMetric[]}
 */
export function scoreOpportunityMatrix(gigs, keywordAnalytics, options = {}) {
  const eligibleGigs = gigs.filter((gig) => gig.isValid && !gig.isDuplicate);
  const gigById = new Map(eligibleGigs.map((gig) => [gig.id, gig]));
  const maxResults = options.maxResults ?? 25;

  return keywordAnalytics.keywordMetrics
    .map((metric) => {
      const matchingGigs = metric.matchingGigIds.map((id) => gigById.get(id)).filter(Boolean);
      return buildOpportunityMetric(metric, matchingGigs, eligibleGigs.length);
    })
    .filter((metric) => metric.frequency > 0)
    .sort((a, b) => b.opportunity_score - a.opportunity_score || b.frequency - a.frequency || a.keyword.localeCompare(b.keyword))
    .slice(0, maxResults);
}

/**
 * @param {import("../../types/domain.js").KeywordMetric} metric
 * @param {NormalizedGig[]} matchingGigs
 * @param {number} totalEligibleGigs
 * @returns {OpportunityMetric}
 */
function buildOpportunityMetric(metric, matchingGigs, totalEligibleGigs) {
  const reviewCounts = matchingGigs.map((gig) => gig.review_count.value).filter(isNumber);
  const prices = matchingGigs.map((gig) => gig.starting_price.value).filter(isNumber);
  const ratings = matchingGigs.map((gig) => gig.rating.value).filter(isNumber);
  const featureTerms = collectFeatureTerms(matchingGigs);

  const competition_score = scoreCompetition(matchingGigs.length, totalEligibleGigs, reviewCounts);
  const price_score = scorePriceGap(prices);
  const differentiation_score = scoreDifferentiation(featureTerms, matchingGigs.length, ratings);
  const opportunity_score = round((competition_score * 0.4) + (price_score * 0.3) + (differentiation_score * 0.3));

  return {
    id: `opportunity_${slug(metric.nicheId)}_${slug(metric.keyword)}`,
    importRunId: metric.importRunId,
    nicheId: metric.nicheId,
    keyword: metric.keyword,
    frequency: metric.frequency,
    competition_score,
    price_score,
    differentiation_score,
    opportunity_score,
    evidence: [
      `${metric.keyword} appears in ${metric.frequency} valid deduplicated imported gig(s)`,
      `Competition score uses matching gig count and imported review-count concentration`,
      `Price score uses parsed starting_price spread across ${prices.length} matching priced gig(s)`,
      `Differentiation score uses ${featureTerms.size} feature term(s) and available rating variation`,
    ],
    caution: [
      "Directional analysis from the uploaded dataset only; it does not use live Fiverr ranking, traffic, orders, or revenue data",
      matchingGigs.length < 3 ? "Small matching sample; interpret this opportunity cautiously" : "Missing optional fields remain unknown and are not treated as negative signals",
    ],
  };
}

/**
 * @param {number} matchingCount
 * @param {number} totalEligibleGigs
 * @param {number[]} reviewCounts
 */
function scoreCompetition(matchingCount, totalEligibleGigs, reviewCounts) {
  if (matchingCount === 0 || totalEligibleGigs === 0) return 0;
  const sharePenalty = (matchingCount / totalEligibleGigs) * 45;
  const concentrationPenalty = reviewCounts.length > 0 ? reviewConcentration(reviewCounts) * 55 : 15;
  return clampScore(100 - sharePenalty - concentrationPenalty);
}

/**
 * @param {number[]} prices
 */
function scorePriceGap(prices) {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return 35;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max <= 0) return 0;
  return clampScore(((max - min) / max) * 100);
}

/**
 * @param {Set<string>} featureTerms
 * @param {number} matchingCount
 * @param {number[]} ratings
 */
function scoreDifferentiation(featureTerms, matchingCount, ratings) {
  const featureScore = matchingCount > 0 ? Math.min(70, (featureTerms.size / Math.max(1, matchingCount * 3)) * 70) : 0;
  const ratingScore = ratings.length > 1 ? Math.min(30, (Math.max(...ratings) - Math.min(...ratings)) * 30) : 10;
  return clampScore(featureScore + ratingScore);
}

/**
 * @param {number[]} reviewCounts
 */
function reviewConcentration(reviewCounts) {
  const total = reviewCounts.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return 0;
  return Math.max(...reviewCounts) / total;
}

/**
 * @param {NormalizedGig[]} gigs
 */
function collectFeatureTerms(gigs) {
  const terms = new Set();
  for (const gig of gigs) {
    for (const feature of parseExtraFeatures(gig.extra_features).cleaned) {
      for (const term of feature.match(/[a-z0-9]+(?:[.+#-][a-z0-9]+)*/g) ?? []) {
        if (term.length > 1) terms.add(term);
      }
    }
  }
  return terms;
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * @param {number} value
 */
function clampScore(value) {
  return Math.max(0, Math.min(100, round(value)));
}

/**
 * @param {number} value
 */
function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * @param {string} value
 */
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "value";
}
