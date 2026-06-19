import type {
  CompetitorAnalyticsResult,
  KeywordAnalyticsResult,
  NormalizedGig,
  OpportunityMetric,
  PricingAnalyticsResult,
} from "../../types/domain.js";

export function runAnalyticsPipeline(normalizedGigs: NormalizedGig[]): {
  keywordAnalytics: KeywordAnalyticsResult;
  pricingAnalytics: PricingAnalyticsResult;
  competitorAnalytics: CompetitorAnalyticsResult;
  opportunities: OpportunityMetric[];
};
