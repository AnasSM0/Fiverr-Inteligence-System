import type { KeywordAnalyticsResult, NormalizedGig } from "../../types/domain.js";

export const DEFAULT_ANALYTICS_STOPWORDS: readonly string[];
export const DEFAULT_TECHNOLOGY_KEYWORDS: readonly string[];

export function analyzeKeywordAnalytics(
  gigs: NormalizedGig[],
  options?: {
    stopwords?: string[];
    technologyDictionary?: string[];
    highReviewMinimum?: number;
    lowCompetitionMaxGigCount?: number;
    lowCompetitionMaxAverageReviews?: number;
    maxResults?: number;
  },
): KeywordAnalyticsResult;

export function tokenizeAnalyticsText(value: unknown, stopwords?: Set<string>): string[];
