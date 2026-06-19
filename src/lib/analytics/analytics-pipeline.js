import { analyzeCompetitorComparison } from "./competitor-comparison.js";
import { analyzeKeywordAnalytics } from "./keyword-analytics.js";
import { scoreOpportunityMatrix } from "./opportunity-scoring.js";
import { analyzePricingAnalytics } from "./pricing-analytics.js";

/**
 * @typedef {import("../../types/domain.js").NormalizedGig} NormalizedGig
 */

/**
 * @param {NormalizedGig[]} normalizedGigs
 */
export function runAnalyticsPipeline(normalizedGigs) {
  const keywordAnalytics = analyzeKeywordAnalytics(normalizedGigs);
  const pricingAnalytics = analyzePricingAnalytics(normalizedGigs);
  const competitorAnalytics = analyzeCompetitorComparison(normalizedGigs);
  const opportunities = scoreOpportunityMatrix(normalizedGigs, keywordAnalytics);

  return {
    keywordAnalytics,
    pricingAnalytics,
    competitorAnalytics,
    opportunities,
  };
}
