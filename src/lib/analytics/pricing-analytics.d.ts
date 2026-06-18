import type { NormalizedGig, PricingAnalyticsResult } from "../../types/domain.js";

export function analyzePricingAnalytics(
  gigs: NormalizedGig[],
  options?: {
    highReviewMinimum?: number;
  },
): PricingAnalyticsResult;

export function computePriceStats(gigs: NormalizedGig[]): {
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
};
