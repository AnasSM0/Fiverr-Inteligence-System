import type { KeywordAnalyticsResult, NormalizedGig, OpportunityMetric } from "../../types/domain.js";

export function scoreOpportunityMatrix(
  gigs: NormalizedGig[],
  keywordAnalytics: KeywordAnalyticsResult,
  options?: { maxResults?: number },
): OpportunityMetric[];
