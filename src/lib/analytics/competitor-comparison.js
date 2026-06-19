import { tokenizeAnalyticsText } from "./keyword-analytics.js";

/**
 * @typedef {import("../../types/domain.js").CompetitorAnalyticsResult} CompetitorAnalyticsResult
 * @typedef {import("../../types/domain.js").CompetitorScoreWeights} CompetitorScoreWeights
 * @typedef {import("../../types/domain.js").NormalizedGig} NormalizedGig
 */

export const DEFAULT_COMPETITOR_SCORE_WEIGHTS = Object.freeze({
  reviewCount: 0.45,
  rating: 0.25,
  badgePresence: 0.15,
  sellerConcentration: 0.15,
});

export const COMPETITOR_SCORE_FORMULA =
  "competitorScore = weighted average of available components: reviewCount percentile within niche, rating / 5, badge text presence, and seller gig concentration within niche. Missing optional values are omitted from the denominator instead of scored as zero.";

/**
 * @param {NormalizedGig[]} gigs
 * @param {{
 *   minReviewsForTopRating?: number,
 *   maxResults?: number,
 *   scoreWeights?: Partial<CompetitorScoreWeights>
 * }} options
 * @returns {CompetitorAnalyticsResult}
 */
export function analyzeCompetitorComparison(gigs, options = {}) {
  const eligibleGigs = gigs.filter((gig) => gig.isValid && !gig.isDuplicate);
  const minReviewsForTopRating = options.minReviewsForTopRating ?? 10;
  const maxResults = options.maxResults ?? 25;
  const scoreWeights = normalizeWeights({ ...DEFAULT_COMPETITOR_SCORE_WEIGHTS, ...(options.scoreWeights ?? {}) });
  const sellerStats = buildSellerStats(eligibleGigs);

  return {
    topByReviewCount: buildTopByReviewCount(eligibleGigs).slice(0, maxResults),
    topByRating: buildTopByRating(eligibleGigs, minReviewsForTopRating).slice(0, maxResults),
    badgeDistribution: buildBadgeDistribution(eligibleGigs),
    priceReviewPositioning: buildPriceReviewPositioning(eligibleGigs),
    titlePatterns: buildTitlePatterns(eligibleGigs).slice(0, maxResults),
    sellerConcentration: buildSellerConcentration(sellerStats).slice(0, maxResults),
    competitorScores: buildCompetitorScores(eligibleGigs, sellerStats, scoreWeights).slice(0, maxResults),
    scoringFormula: {
      description: COMPETITOR_SCORE_FORMULA,
      weights: scoreWeights,
      missingValuePolicy: "Missing optional values are shown as unknown and omitted from the weighted score denominator.",
      rankingCaution: "Competitor score is a deterministic comparison inside the imported dataset and does not predict Fiverr ranking.",
    },
  };
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildTopByReviewCount(gigs) {
  return gigs
    .filter((gig) => typeof gig.review_count.value === "number")
    .map(toGigSummary)
    .sort((a, b) => compareNumberDesc(a.reviewCount, b.reviewCount) || compareNumberDesc(a.rating, b.rating) || compareText(a.sellerName, b.sellerName) || compareText(a.gigId, b.gigId));
}

/**
 * @param {NormalizedGig[]} gigs
 * @param {number} minReviews
 */
function buildTopByRating(gigs, minReviews) {
  return gigs
    .filter((gig) => typeof gig.rating.value === "number")
    .filter((gig) => (gig.review_count.value ?? 0) >= minReviews)
    .map(toGigSummary)
    .sort((a, b) => compareNumberDesc(a.rating, b.rating) || compareNumberDesc(a.reviewCount, b.reviewCount) || compareText(a.sellerName, b.sellerName) || compareText(a.gigId, b.gigId));
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildBadgeDistribution(gigs) {
  const nicheCounts = countBy(gigs, (gig) => gig.nicheId);
  const groups = new Map();

  for (const gig of gigs) {
    const label = gig.seller_badge_text ?? "unknown";
    const key = `${gig.nicheId}:${label}`;
    if (!groups.has(key)) {
      groups.set(key, {
        nicheId: gig.nicheId,
        badgeText: gig.seller_badge_text,
        label,
        matchingGigIds: [],
      });
    }
    groups.get(key).matchingGigIds.push(gig.id);
  }

  return [...groups.values()]
    .map((group) => ({
      id: `badge_distribution_${slug(group.nicheId)}_${slug(group.label)}`,
      nicheId: group.nicheId,
      badgeText: group.badgeText,
      label: group.label,
      count: group.matchingGigIds.length,
      shareOfNiche: percent(group.matchingGigIds.length, nicheCounts.get(group.nicheId) ?? 0),
      matchingGigIds: group.matchingGigIds,
      caution: group.badgeText === null ? ["Missing badge text is unknown and must not be interpreted as proof that a seller has no badge"] : [],
    }))
    .sort((a, b) => a.nicheId.localeCompare(b.nicheId) || b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildPriceReviewPositioning(gigs) {
  const byNicheCurrency = new Map();
  const reviewMedians = new Map();

  for (const [nicheId, nicheGigs] of groupBy(gigs.filter(hasReviewCount), (gig) => gig.nicheId)) {
    reviewMedians.set(nicheId, median(nicheGigs.map((gig) => gig.review_count.value)));
  }

  for (const gig of gigs.filter(hasPriceAndReview)) {
    const key = `${gig.nicheId}:${currencyKey(gig.starting_price.currencyText)}`;
    if (!byNicheCurrency.has(key)) byNicheCurrency.set(key, []);
    byNicheCurrency.get(key).push(gig);
  }

  const priceMedians = new Map([...byNicheCurrency.entries()].map(([key, group]) => [key, median(group.map((gig) => gig.starting_price.value))]));
  const positions = [];

  for (const [key, group] of byNicheCurrency) {
    const priceMedian = priceMedians.get(key);
    for (const gig of group) {
      const reviewMedian = reviewMedians.get(gig.nicheId);
      const price = gig.starting_price.value;
      const reviews = gig.review_count.value;
      const position = price > priceMedian
        ? reviews >= reviewMedian ? "premium_social_proof" : "premium_low_review"
        : reviews >= reviewMedian ? "value_social_proof" : "value_low_review";
      positions.push({
        id: `price_review_${slug(gig.id)}`,
        nicheId: gig.nicheId,
        gigId: gig.id,
        sellerName: gig.seller_name,
        gigTitle: gig.gig_title,
        currencyText: gig.starting_price.currencyText,
        startingPriceValue: price,
        startingPriceRaw: gig.starting_price.raw,
        reviewCount: reviews,
        nicheCurrencyMedianPrice: priceMedian,
        nicheMedianReviewCount: reviewMedian,
        position,
        evidence: [`${gig.id} price ${price} compared with niche/currency median ${priceMedian}; reviews ${reviews} compared with niche median ${reviewMedian}`],
      });
    }
  }

  return positions.sort((a, b) => a.nicheId.localeCompare(b.nicheId) || currencyDisplay(a.currencyText).localeCompare(currencyDisplay(b.currencyText)) || compareNumberDesc(a.reviewCount, b.reviewCount) || compareText(a.gigId, b.gigId));
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildTitlePatterns(gigs) {
  const groups = new Map();
  for (const gig of gigs) {
    const tokens = tokenizeAnalyticsText(gig.gig_title);
    if (tokens.length === 0) continue;
    const pattern = tokens.slice(0, 3).join(" ");
    const key = `${gig.nicheId}:${pattern}`;
    if (!groups.has(key)) {
      groups.set(key, {
        nicheId: gig.nicheId,
        pattern,
        matchingGigIds: [],
      });
    }
    groups.get(key).matchingGigIds.push(gig.id);
  }

  return [...groups.values()]
    .map((group) => ({
      id: `title_pattern_${slug(group.nicheId)}_${slug(group.pattern)}`,
      nicheId: group.nicheId,
      pattern: group.pattern,
      frequency: group.matchingGigIds.length,
      matchingGigIds: group.matchingGigIds,
      evidence: [`Pattern "${group.pattern}" appears in ${group.matchingGigIds.length} imported gig title(s)`],
    }))
    .sort((a, b) => a.nicheId.localeCompare(b.nicheId) || b.frequency - a.frequency || a.pattern.localeCompare(b.pattern));
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildSellerStats(gigs) {
  const groups = new Map();
  const nicheCounts = countBy(gigs, (gig) => gig.nicheId);

  for (const gig of gigs) {
    const key = `${gig.nicheId}:${normalizeSellerName(gig.seller_name)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        nicheId: gig.nicheId,
        sellerName: gig.seller_name,
        nicheGigCount: nicheCounts.get(gig.nicheId) ?? 0,
        gigs: [],
      });
    }
    groups.get(key).gigs.push(gig);
  }

  return groups;
}

/**
 * @param {Map<string, any>} sellerStats
 */
function buildSellerConcentration(sellerStats) {
  return [...sellerStats.values()]
    .map((group) => {
      const ratings = group.gigs.map((gig) => gig.rating.value).filter((value) => typeof value === "number");
      return {
        id: `seller_concentration_${slug(group.nicheId)}_${slug(group.sellerName)}`,
        nicheId: group.nicheId,
        sellerName: group.sellerName,
        gigCount: group.gigs.length,
        shareOfNiche: percent(group.gigs.length, group.nicheGigCount),
        totalReviewCount: group.gigs.reduce((sum, gig) => sum + (gig.review_count.value ?? 0), 0),
        averageRating: ratings.length > 0 ? round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length) : null,
        matchingGigIds: group.gigs.map((gig) => gig.id),
      };
    })
    .sort((a, b) => a.nicheId.localeCompare(b.nicheId) || b.gigCount - a.gigCount || b.totalReviewCount - a.totalReviewCount || compareText(a.sellerName, b.sellerName));
}

/**
 * @param {NormalizedGig[]} gigs
 * @param {Map<string, any>} sellerStats
 * @param {CompetitorScoreWeights} weights
 */
function buildCompetitorScores(gigs, sellerStats, weights) {
  const maxReviewsByNiche = new Map();
  const maxSellerGigsByNiche = new Map();

  for (const [nicheId, nicheGigs] of groupBy(gigs, (gig) => gig.nicheId)) {
    maxReviewsByNiche.set(nicheId, Math.max(0, ...nicheGigs.map((gig) => gig.review_count.value ?? 0)));
  }

  for (const sellerGroup of sellerStats.values()) {
    const current = maxSellerGigsByNiche.get(sellerGroup.nicheId) ?? 0;
    maxSellerGigsByNiche.set(sellerGroup.nicheId, Math.max(current, sellerGroup.gigs.length));
  }

  return gigs
    .map((gig) => {
      const sellerGroup = sellerStats.get(`${gig.nicheId}:${normalizeSellerName(gig.seller_name)}`);
      const components = buildScoreComponents(gig, sellerGroup, maxReviewsByNiche.get(gig.nicheId) ?? 0, maxSellerGigsByNiche.get(gig.nicheId) ?? 0, weights);
      const competitorScore = weightedAverage(components);
      return {
        ...toGigSummary(gig),
        competitorScore,
        components,
        formula: COMPETITOR_SCORE_FORMULA,
        evidence: components.map((component) => component.evidence),
        caution: ["Competitor score is a deterministic imported-dataset comparison and does not predict Fiverr ranking"],
      };
    })
    .sort((a, b) => compareNumberDesc(a.competitorScore, b.competitorScore) || compareNumberDesc(a.reviewCount, b.reviewCount) || compareNumberDesc(a.rating, b.rating) || compareText(a.sellerName, b.sellerName) || compareText(a.gigId, b.gigId));
}

/**
 * @param {NormalizedGig} gig
 * @param {{ gigs: NormalizedGig[] } | undefined} sellerGroup
 * @param {number} maxReviews
 * @param {number} maxSellerGigCount
 * @param {CompetitorScoreWeights} weights
 */
function buildScoreComponents(gig, sellerGroup, maxReviews, maxSellerGigCount, weights) {
  const components = [];

  if (typeof gig.review_count.value === "number" && maxReviews > 0 && weights.reviewCount > 0) {
    components.push({
      name: "reviewCount",
      weight: weights.reviewCount,
      value: round((gig.review_count.value / maxReviews) * 100),
      evidence: `review_count ${gig.review_count.value} divided by niche max ${maxReviews}`,
    });
  }

  if (typeof gig.rating.value === "number" && weights.rating > 0) {
    components.push({
      name: "rating",
      weight: weights.rating,
      value: round((gig.rating.value / 5) * 100),
      evidence: `rating ${gig.rating.value} divided by 5`,
    });
  }

  if (gig.seller_badge_text && weights.badgePresence > 0) {
    components.push({
      name: "badgePresence",
      weight: weights.badgePresence,
      value: 100,
      evidence: `seller_badge_text is present: ${gig.seller_badge_text}`,
    });
  }

  if (sellerGroup && maxSellerGigCount > 0 && weights.sellerConcentration > 0) {
    components.push({
      name: "sellerConcentration",
      weight: weights.sellerConcentration,
      value: round((sellerGroup.gigs.length / maxSellerGigCount) * 100),
      evidence: `${sellerGroup.gigs.length} gig(s) from seller divided by niche max seller gig count ${maxSellerGigCount}`,
    });
  }

  return components;
}

/**
 * @param {Array<{ weight: number, value: number }>} components
 */
function weightedAverage(components) {
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  if (totalWeight === 0) return 0;
  return round(components.reduce((sum, component) => sum + component.value * component.weight, 0) / totalWeight);
}

/**
 * @param {Partial<CompetitorScoreWeights>} weights
 * @returns {CompetitorScoreWeights}
 */
function normalizeWeights(weights) {
  return {
    reviewCount: nonNegativeWeight(weights.reviewCount),
    rating: nonNegativeWeight(weights.rating),
    badgePresence: nonNegativeWeight(weights.badgePresence),
    sellerConcentration: nonNegativeWeight(weights.sellerConcentration),
  };
}

/**
 * @param {unknown} value
 */
function nonNegativeWeight(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * @param {NormalizedGig} gig
 */
function toGigSummary(gig) {
  return {
    id: `competitor_gig_${slug(gig.id)}`,
    nicheId: gig.nicheId,
    gigId: gig.id,
    sellerName: gig.seller_name,
    gigTitle: gig.gig_title,
    reviewCount: gig.review_count.value,
    rating: gig.rating.value,
    startingPriceValue: gig.starting_price.value,
    startingPriceRaw: gig.starting_price.raw,
    currencyText: gig.starting_price.currencyText,
    sellerBadgeText: gig.seller_badge_text,
  };
}

/**
 * @param {NormalizedGig} gig
 */
function hasPriceAndReview(gig) {
  return typeof gig.starting_price.value === "number" && typeof gig.review_count.value === "number";
}

/**
 * @param {NormalizedGig} gig
 */
function hasReviewCount(gig) {
  return typeof gig.review_count.value === "number";
}

/**
 * @template T
 * @param {T[]} values
 * @param {(value: T) => string} getKey
 * @returns {Map<string, T[]>}
 */
function groupBy(values, getKey) {
  const groups = new Map();
  for (const value of values) {
    const key = getKey(value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  }
  return groups;
}

/**
 * @template T
 * @param {T[]} values
 * @param {(value: T) => string} getKey
 * @returns {Map<string, number>}
 */
function countBy(values, getKey) {
  const counts = new Map();
  for (const value of values) {
    const key = getKey(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * @param {number[]} values
 */
function median(values) {
  const sorted = values.filter((value) => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[midpoint] : round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
}

/**
 * @param {number} numerator
 * @param {number} denominator
 */
function percent(numerator, denominator) {
  if (denominator <= 0) return 0;
  return round((numerator / denominator) * 100);
}

/**
 * @param {number} value
 */
function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * @param {number | null} a
 * @param {number | null} b
 */
function compareNumberDesc(a, b) {
  return (b ?? Number.NEGATIVE_INFINITY) - (a ?? Number.NEGATIVE_INFINITY);
}

/**
 * @param {string | null} a
 * @param {string | null} b
 */
function compareText(a, b) {
  return displayText(a).localeCompare(displayText(b));
}

/**
 * @param {string | null} value
 */
function currencyKey(value) {
  return value ?? "unknown";
}

/**
 * @param {string | null} value
 */
function currencyDisplay(value) {
  return value ?? "unknown";
}

/**
 * @param {string | null} sellerName
 */
function normalizeSellerName(sellerName) {
  return displayText(sellerName).trim().toLowerCase() || "unknown seller";
}

/**
 * @param {string | null} value
 */
function displayText(value) {
  return value ?? "";
}

/**
 * @param {string} value
 */
function slug(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "value";
}

