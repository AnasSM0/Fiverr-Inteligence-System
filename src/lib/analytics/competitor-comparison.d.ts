import type { CompetitorAnalyticsResult, CompetitorScoreWeights, NormalizedGig } from "../../types/domain.js";

export const DEFAULT_COMPETITOR_SCORE_WEIGHTS: Readonly<CompetitorScoreWeights>;
export const COMPETITOR_SCORE_FORMULA: string;

export function analyzeCompetitorComparison(
  gigs: NormalizedGig[],
  options?: {
    minReviewsForTopRating?: number;
    maxResults?: number;
    scoreWeights?: Partial<CompetitorScoreWeights>;
  },
): CompetitorAnalyticsResult;
