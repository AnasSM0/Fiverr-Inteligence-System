import { parseExtraFeatures, tokenizeKeywordsFromTitle } from "../cleaning/cleaning-engine.js";

export const DEFAULT_ANALYTICS_STOPWORDS = [
  "a",
  "an",
  "and",
  "build",
  "create",
  "for",
  "i",
  "in",
  "make",
  "of",
  "on",
  "or",
  "the",
  "to",
  "will",
  "with",
  "your",
];

export const DEFAULT_TECHNOLOGY_KEYWORDS = [
  "OpenAI",
  "Claude",
  "Gemini",
  "MCP",
  "LangGraph",
  "CrewAI",
  "n8n",
  "Zapier",
  "Make",
  "FastAPI",
];

/**
 * @typedef {import("../../types/domain.js").NormalizedGig} NormalizedGig
 * @typedef {import("../../types/domain.js").KeywordAnalyticsResult} KeywordAnalyticsResult
 * @typedef {import("../../types/domain.js").MetricSourceField} MetricSourceField
 */

/**
 * @param {NormalizedGig[]} gigs
 * @param {{
 *   stopwords?: string[],
 *   technologyDictionary?: string[],
 *   highReviewMinimum?: number,
 *   lowCompetitionMaxGigCount?: number,
 *   lowCompetitionMaxAverageReviews?: number,
 *   maxResults?: number
 * }} options
 * @returns {KeywordAnalyticsResult}
 */
export function analyzeKeywordAnalytics(gigs, options = {}) {
  const stopwords = new Set((options.stopwords ?? DEFAULT_ANALYTICS_STOPWORDS).map(normalizeToken).filter(Boolean));
  const technologyDictionary = (options.technologyDictionary ?? DEFAULT_TECHNOLOGY_KEYWORDS)
    .map((term) => ({ term, keyword: normalizeDictionaryTerm(term) }))
    .filter((entry) => entry.keyword.length > 0);
  const eligibleGigs = gigs.filter((gig) => gig.isValid && !gig.isDuplicate);
  const highReviewMinimum = options.highReviewMinimum ?? 100;
  const lowCompetitionMaxGigCount = options.lowCompetitionMaxGigCount ?? 2;
  const lowCompetitionMaxAverageReviews = options.lowCompetitionMaxAverageReviews ?? 100;
  const maxResults = options.maxResults ?? 25;

  const keywordIndex = new Map();
  const phraseIndex = new Map();
  const technologyIndex = new Map();
  const badgeIndex = new Map();
  const highReviewKeywordIndex = new Map();

  for (const gig of eligibleGigs) {
    const titleTokens = tokenizeAnalyticsText(gig.gig_title, stopwords);
    const extraTokens = tokenizeExtraFeatures(gig.extra_features, stopwords);
    const titleTokenSet = new Set(titleTokens);
    const extraTokenSet = new Set(extraTokens);
    const allKeywords = new Set([...titleTokenSet, ...extraTokenSet]);

    for (const keyword of allKeywords) {
      /** @type {MetricSourceField[]} */
      const sourceFields = [];
      if (titleTokenSet.has(keyword)) sourceFields.push("gig_title");
      if (extraTokenSet.has(keyword)) sourceFields.push("extra_features");
      addKeywordMetric(keywordIndex, gig, keyword, sourceFields);
      if ((gig.review_count.value ?? 0) >= highReviewMinimum) {
        addKeywordMetric(highReviewKeywordIndex, gig, keyword, sourceFields);
      }
    }

    for (const phrase of buildPhrases(titleTokens, 2)) addPhraseMetric(phraseIndex, gig, phrase, 2);
    for (const phrase of buildPhrases(titleTokens, 3)) addPhraseMetric(phraseIndex, gig, phrase, 3);

    for (const entry of technologyDictionary) {
      const sources = detectTechnologySources(gig, entry.keyword);
      if (sources.length > 0) addTechnologyMetric(technologyIndex, gig, entry.term, entry.keyword, sources);
    }

    for (const badgeKeyword of tokenizeAnalyticsText(gig.seller_badge_text ?? "", stopwords)) {
      addBadgeMetric(badgeIndex, gig, badgeKeyword);
    }
  }

  const keywordMetrics = sortMetrics([...keywordIndex.values()]).slice(0, maxResults);
  const phraseMetrics = sortMetrics([...phraseIndex.values()]).slice(0, maxResults);
  const technologyKeywordMetrics = sortMetrics([...technologyIndex.values()]).slice(0, maxResults);
  const sellerBadgeKeywordMetrics = sortMetrics([...badgeIndex.values()]).slice(0, maxResults);
  const topHighReviewKeywords = sortMetrics([...highReviewKeywordIndex.values()]).slice(0, maxResults);
  const lowCompetitionKeywordCandidates = buildLowCompetitionCandidates(
    [...keywordIndex.values()],
    eligibleGigs,
    lowCompetitionMaxGigCount,
    lowCompetitionMaxAverageReviews,
  ).slice(0, maxResults);

  return {
    keywordMetrics,
    phraseMetrics,
    technologyKeywordMetrics,
    sellerBadgeKeywordMetrics,
    topHighReviewKeywords,
    lowCompetitionKeywordCandidates,
  };
}

/**
 * @param {unknown} value
 * @param {Set<string>} stopwords
 */
export function tokenizeAnalyticsText(value, stopwords = new Set(DEFAULT_ANALYTICS_STOPWORDS)) {
  return tokenizeKeywordsFromTitle(value)
    .map(normalizeToken)
    .filter(Boolean)
    .filter((token) => !stopwords.has(token));
}

/**
 * @param {string | null} value
 * @param {Set<string>} stopwords
 */
function tokenizeExtraFeatures(value, stopwords) {
  const tags = parseExtraFeatures(value).cleaned;
  return tags.flatMap((tag) => tokenizeAnalyticsText(tag, stopwords));
}

/**
 * @param {Map<string, any>} index
 * @param {NormalizedGig} gig
 * @param {string} keyword
 * @param {MetricSourceField[]} sourceFields
 */
function addKeywordMetric(index, gig, keyword, sourceFields) {
  const key = `${gig.nicheId}:${keyword}`;
  if (!index.has(key)) {
    index.set(key, {
      id: `keyword_${slug(gig.nicheId)}_${slug(keyword)}`,
      importRunId: gig.importRunId,
      nicheId: gig.nicheId,
      keyword,
      frequency: 0,
      sourceFields: [],
      matchingGigIds: [],
      evidence: [],
    });
  }
  const metric = index.get(key);
  if (metric.matchingGigIds.includes(gig.id)) return;
  metric.frequency += 1;
  metric.matchingGigIds.push(gig.id);
  for (const field of sourceFields) {
    if (!metric.sourceFields.includes(field)) metric.sourceFields.push(field);
    metric.evidence.push(`${field} contains ${keyword} in ${gig.id}`);
  }
}

/**
 * @param {Map<string, any>} index
 * @param {NormalizedGig} gig
 * @param {string} phrase
 * @param {2 | 3} phraseSize
 */
function addPhraseMetric(index, gig, phrase, phraseSize) {
  const key = `${gig.nicheId}:${phraseSize}:${phrase}`;
  if (!index.has(key)) {
    index.set(key, {
      id: `phrase_${phraseSize}_${slug(gig.nicheId)}_${slug(phrase)}`,
      nicheId: gig.nicheId,
      phrase,
      phraseSize,
      frequency: 0,
      matchingGigIds: [],
      evidence: [],
    });
  }
  const metric = index.get(key);
  if (metric.matchingGigIds.includes(gig.id)) return;
  metric.frequency += 1;
  metric.matchingGigIds.push(gig.id);
  metric.evidence.push(`gig_title contains "${phrase}" in ${gig.id}`);
}

/**
 * @param {Map<string, any>} index
 * @param {NormalizedGig} gig
 * @param {string} dictionaryTerm
 * @param {string} keyword
 * @param {MetricSourceField[]} sourceFields
 */
function addTechnologyMetric(index, gig, dictionaryTerm, keyword, sourceFields) {
  const key = `${gig.nicheId}:${keyword}`;
  if (!index.has(key)) {
    index.set(key, {
      id: `technology_${slug(gig.nicheId)}_${slug(keyword)}`,
      nicheId: gig.nicheId,
      keyword,
      dictionaryTerm,
      frequency: 0,
      sourceFields: [],
      matchingGigIds: [],
      evidence: [],
    });
  }
  const metric = index.get(key);
  if (metric.matchingGigIds.includes(gig.id)) return;
  metric.frequency += 1;
  metric.matchingGigIds.push(gig.id);
  for (const field of sourceFields) {
    if (!metric.sourceFields.includes(field)) metric.sourceFields.push(field);
    metric.evidence.push(`${field} contains technology keyword ${dictionaryTerm} in ${gig.id}`);
  }
}

/**
 * @param {Map<string, any>} index
 * @param {NormalizedGig} gig
 * @param {string} keyword
 */
function addBadgeMetric(index, gig, keyword) {
  const key = `${gig.nicheId}:${keyword}`;
  if (!index.has(key)) {
    index.set(key, {
      id: `badge_${slug(gig.nicheId)}_${slug(keyword)}`,
      nicheId: gig.nicheId,
      keyword,
      frequency: 0,
      matchingGigIds: [],
      evidence: [],
    });
  }
  const metric = index.get(key);
  if (metric.matchingGigIds.includes(gig.id)) return;
  metric.frequency += 1;
  metric.matchingGigIds.push(gig.id);
  metric.evidence.push(`seller_badge_text contains ${keyword} in ${gig.id}`);
}

/**
 * @param {string[]} tokens
 * @param {2 | 3} size
 */
function buildPhrases(tokens, size) {
  const phrases = [];
  const seen = new Set();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    const phrase = tokens.slice(index, index + size).join(" ");
    if (!seen.has(phrase)) {
      seen.add(phrase);
      phrases.push(phrase);
    }
  }
  return phrases;
}

/**
 * @param {NormalizedGig} gig
 * @param {string} technologyKeyword
 * @returns {MetricSourceField[]}
 */
function detectTechnologySources(gig, technologyKeyword) {
  /** @type {MetricSourceField[]} */
  const sources = [];
  if (containsTokenSequence(gig.gig_title, technologyKeyword)) sources.push("gig_title");
  if (containsTokenSequence(gig.extra_features ?? "", technologyKeyword)) sources.push("extra_features");
  return sources;
}

/**
 * @param {unknown} text
 * @param {string} tokenSequence
 */
function containsTokenSequence(text, tokenSequence) {
  const haystack = normalizeSearchText(text);
  const needle = normalizeSearchText(tokenSequence);
  return haystack.split(" ").join(" ").includes(needle);
}

/**
 * @param {Array<any>} keywordMetrics
 * @param {NormalizedGig[]} gigs
 * @param {number} maxGigCount
 * @param {number} maxAverageReviews
 */
function buildLowCompetitionCandidates(keywordMetrics, gigs, maxGigCount, maxAverageReviews) {
  const gigById = new Map(gigs.map((gig) => [gig.id, gig]));
  return keywordMetrics
    .map((metric) => {
      const matchingGigs = metric.matchingGigIds.map((id) => gigById.get(id)).filter(Boolean);
      const reviewCounts = matchingGigs.map((gig) => gig.review_count.value).filter((value) => typeof value === "number");
      const totalReviewCount = reviewCounts.reduce((sum, value) => sum + value, 0);
      const averageReviewCount = reviewCounts.length > 0 ? Math.round((totalReviewCount / reviewCounts.length) * 100) / 100 : null;
      return {
        id: `candidate_${slug(metric.nicheId)}_${slug(metric.keyword)}`,
        nicheId: metric.nicheId,
        keyword: metric.keyword,
        frequency: metric.frequency,
        competitionGigCount: metric.matchingGigIds.length,
        totalReviewCount,
        averageReviewCount,
        matchingGigIds: [...metric.matchingGigIds],
        evidence: [`${metric.keyword} appears in ${metric.matchingGigIds.length} imported gig(s)`],
        caution: ["Low-competition status is based only on the imported dataset, not live Fiverr demand or ranking data"],
      };
    })
    .filter((candidate) => candidate.competitionGigCount <= maxGigCount)
    .filter((candidate) => candidate.averageReviewCount === null || candidate.averageReviewCount <= maxAverageReviews)
    .sort((a, b) => a.competitionGigCount - b.competitionGigCount || a.totalReviewCount - b.totalReviewCount || a.keyword.localeCompare(b.keyword));
}

/**
 * @param {Array<any>} metrics
 */
function sortMetrics(metrics) {
  return metrics.sort((a, b) => b.frequency - a.frequency || a.keyword?.localeCompare(b.keyword ?? "") || a.phrase?.localeCompare(b.phrase ?? "") || 0);
}

/**
 * @param {unknown} value
 */
function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .match(/[a-z0-9]+(?:[.+#-][a-z0-9]+)*/g)?.join(" ") ?? "";
}

/**
 * @param {unknown} value
 */
function normalizeToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * @param {string} term
 */
function normalizeDictionaryTerm(term) {
  return normalizeSearchText(term);
}

/**
 * @param {string} value
 */
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "value";
}
