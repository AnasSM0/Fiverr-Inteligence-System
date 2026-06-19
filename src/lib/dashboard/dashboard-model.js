import { runAnalyticsPipeline } from "../analytics/analytics-pipeline.js";

/**
 * @typedef {import("../../types/domain.js").ImportResult} ImportResult
 * @typedef {import("../../types/domain.js").NormalizedGig} NormalizedGig
 */

/**
 * @param {ImportResult} importResult
 */
export function createDashboardModelFromImport(importResult) {
  const analytics = runAnalyticsPipeline(importResult.normalizedGigs);
  const eligibleGigs = importResult.normalizedGigs.filter((gig) => gig.isValid && !gig.isDuplicate);
  const overallPricing = analytics.pricingAnalytics.overall[0] ?? null;
  const marketSnapshot = buildMarketSnapshot(eligibleGigs, analytics, overallPricing);
  const opportunities = analytics.opportunities;
  const keywords = analytics.keywordAnalytics.keywordMetrics.map((keyword) => ({
    ...keyword,
    opportunityScore: opportunities.find((opportunity) => opportunity.keyword === keyword.keyword)?.opportunity_score ?? null,
  }));
  const competitors = analytics.competitorAnalytics.competitorScores.map((competitor, index) => buildCompetitorView(competitor, overallPricing, index));
  const keywordIntelligence = buildKeywordIntelligence(analytics, keywords, marketSnapshot.keywordConcentrationScore);
  const opportunityHighlights = opportunities.slice(0, 5).map((opportunity, index) => buildOpportunityHighlight(opportunity, index));

  return {
    niche: importResult.niche,
    importSummary: {
      fileName: importResult.importRun.sourceFileName,
      importId: importResult.importRun.id,
      totalRows: importResult.summary.total_rows,
      validRows: importResult.summary.imported_rows,
      invalidRows: importResult.summary.invalid_rows,
      duplicateRows: importResult.summary.duplicate_rows,
      warnings: importResult.summary.warnings,
      ignoredColumns: importResult.importRun.columnMapping.ignoredSourceFieldNames,
      columnMapping: importResult.importRun.columnMapping,
      lastImportedAt: importResult.importRun.uploadedAt,
    },
    cleaningReport: {
      issues: importResult.issues,
      columnMapping: importResult.importRun.columnMapping,
      rows: buildCleaningRows(importResult),
    },
    nicheDetection: importResult.nicheDetection,
    importSuccess: buildImportSuccess(importResult, marketSnapshot, opportunities, competitors),
    executiveBrief: buildExecutiveBrief(importResult, marketSnapshot, keywords, opportunities, analytics),
    marketSnapshot,
    marketHealth: buildMarketHealth(importResult, marketSnapshot, eligibleGigs),
    keywords,
    keywordIntelligence,
    pricing: overallPricing
      ? {
          medianPrice: overallPricing.median,
          lowBand: overallPricing.priceBands.find((band) => band.band === "low")?.max ?? null,
          midBand: overallPricing.median,
          highBand: overallPricing.priceBands.find((band) => band.band === "high")?.min ?? null,
          bandShares: buildBandShares(overallPricing.priceBands, overallPricing.count),
        }
      : null,
    competitors,
    opportunities,
    opportunityHighlights,
    positioningSuggestions: buildPositioningSuggestions(importResult, marketSnapshot, keywordIntelligence, opportunities),
    profileInsights: buildProfileInsights(importResult, marketSnapshot, keywordIntelligence, analytics),
    insights: buildInsights(importResult, analytics, eligibleGigs),
    warnings: importResult.issues.filter((issue) => issue.severity === "warning").map(formatIssue),
  };
}

/**
 * @param {NormalizedGig[]} eligibleGigs
 * @param {ReturnType<typeof runAnalyticsPipeline>} analytics
 * @param {ReturnType<typeof runAnalyticsPipeline>["pricingAnalytics"]["overall"][number] | null} overallPricing
 */
function buildMarketSnapshot(eligibleGigs, analytics, overallPricing) {
  const keywordMetrics = analytics.keywordAnalytics.keywordMetrics;
  const totalKeywordFrequency = keywordMetrics.reduce((sum, metric) => sum + metric.frequency, 0);
  const topKeywordFrequency = keywordMetrics[0]?.frequency ?? 0;
  return {
    totalGigs: eligibleGigs.length,
    averagePrice: overallPricing?.average ?? null,
    medianPrice: overallPricing?.median ?? null,
    averageReviews: average(eligibleGigs.map((gig) => gig.review_count.value).filter(isNumber)),
    badgeDistribution: analytics.competitorAnalytics.badgeDistribution.slice(0, 5),
    ratingDistribution: buildRatingDistribution(eligibleGigs),
    keywordSaturation: keywordMetrics.slice(0, 8).map((metric) => ({
      keyword: metric.keyword,
      frequency: metric.frequency,
      share: eligibleGigs.length > 0 ? round((metric.frequency / eligibleGigs.length) * 100) : 0,
    })),
    keywordConcentrationScore: totalKeywordFrequency > 0 ? round((topKeywordFrequency / totalKeywordFrequency) * 100) : null,
  };
}

/**
 * @param {ImportResult} importResult
 * @param {ReturnType<typeof buildMarketSnapshot>} marketSnapshot
 * @param {Array<any>} keywords
 * @param {Array<any>} opportunities
 * @param {ReturnType<typeof runAnalyticsPipeline>} analytics
 */
function buildExecutiveBrief(importResult, marketSnapshot, keywords, opportunities, analytics) {
  const topKeyword = keywords[0] ?? null;
  const topOpportunity = opportunities[0] ?? null;
  const dominantBadge = analytics.competitorAnalytics.badgeDistribution[0];
  return {
    nicheName: importResult.niche.name,
    totalGigs: marketSnapshot.totalGigs,
    competitionLevel: competitionLevel(marketSnapshot.totalGigs, marketSnapshot.averageReviews),
    medianPrice: marketSnapshot.medianPrice,
    averageReviews: marketSnapshot.averageReviews,
    topKeyword: topKeyword?.keyword ?? null,
    highestOpportunityKeyword: topOpportunity?.keyword ?? null,
    dominantSellerType: dominantBadge?.label ?? "unknown",
    positioningRecommendation: buildPositioningRecommendation(importResult.niche.name, topKeyword?.keyword ?? null, topOpportunity?.keyword ?? null, marketSnapshot.medianPrice),
  };
}

/**
 * @param {ImportResult} importResult
 * @param {ReturnType<typeof buildMarketSnapshot>} marketSnapshot
 * @param {Array<any>} opportunities
 * @param {Array<any>} competitors
 */
function buildImportSuccess(importResult, marketSnapshot, opportunities, competitors) {
  if (importResult.summary.imported_rows === 0) return null;
  const strongestOpportunity = opportunities[0]?.keyword ?? null;
  const topCompetitor = competitors[0]?.sellerName ?? null;
  return {
    gigsAnalyzed: marketSnapshot.totalGigs,
    opportunitiesFound: opportunities.length,
    strongestOpportunity,
    topCompetitor,
    medianPrice: marketSnapshot.medianPrice,
    marketSummary: strongestOpportunity
      ? `${importResult.niche.name} shows its strongest directional opportunity around ${strongestOpportunity}.`
      : `${importResult.niche.name} is ready for review, but no keyword opportunity scored high enough to summarize yet.`,
  };
}

/**
 * @param {ImportResult} importResult
 * @param {ReturnType<typeof buildMarketSnapshot>} marketSnapshot
 * @param {NormalizedGig[]} eligibleGigs
 */
function buildMarketHealth(importResult, marketSnapshot, eligibleGigs) {
  const validShare = importResult.summary.total_rows > 0 ? round((importResult.summary.imported_rows / importResult.summary.total_rows) * 100) : null;
  return {
    averagePrice: marketSnapshot.averagePrice,
    medianPrice: marketSnapshot.medianPrice,
    averageReviews: marketSnapshot.averageReviews,
    badgeDistribution: marketSnapshot.badgeDistribution,
    ratingDistribution: marketSnapshot.ratingDistribution,
    keywordSaturation: marketSnapshot.keywordSaturation,
    keywordConcentrationScore: marketSnapshot.keywordConcentrationScore,
    datasetQuality: {
      validShare,
      duplicateRows: importResult.summary.duplicate_rows,
      invalidRows: importResult.summary.invalid_rows,
      warningCount: importResult.summary.warnings,
      label: datasetQualityLabel(validShare, importResult.summary.invalid_rows, importResult.summary.duplicate_rows),
      evidence: `${importResult.summary.imported_rows} valid row(s), ${importResult.summary.invalid_rows} invalid row(s), and ${importResult.summary.duplicate_rows} duplicate row(s) from ${importResult.summary.total_rows} source row(s).`,
    },
    pricedGigShare: eligibleGigs.length > 0
      ? round((eligibleGigs.filter((gig) => isNumber(gig.starting_price.value)).length / eligibleGigs.length) * 100)
      : null,
  };
}

/**
 * @param {ReturnType<typeof runAnalyticsPipeline>} analytics
 * @param {Array<any>} keywords
 * @param {number | null} keywordConcentrationScore
 */
function buildKeywordIntelligence(analytics, keywords, keywordConcentrationScore) {
  const opportunitiesByKeyword = new Map(analytics.opportunities.map((opportunity) => [opportunity.keyword, opportunity]));
  const dominantKeywords = keywords.slice(0, 8);
  const emergingOpportunities = analytics.opportunities
    .filter((opportunity) => opportunity.frequency <= 2 || opportunity.competition_score >= 60)
    .slice(0, 6);
  const underrepresentedTechnologies = analytics.keywordAnalytics.technologyKeywordMetrics
    .filter((metric) => metric.frequency <= 2)
    .slice(0, 6)
    .map((metric) => ({
      ...metric,
      opportunityScore: opportunitiesByKeyword.get(metric.keyword)?.opportunity_score ?? null,
    }));
  const leastSaturatedValuableKeywords = analytics.opportunities
    .filter((opportunity) => opportunity.frequency <= 2)
    .sort((a, b) => b.opportunity_score - a.opportunity_score || a.keyword.localeCompare(b.keyword))
    .slice(0, 6);

  return {
    dominantKeywords,
    emergingOpportunities,
    underrepresentedTechnologies,
    leastSaturatedValuableKeywords,
    keywordConcentrationScore,
  };
}

/**
 * @param {any} opportunity
 * @param {number} index
 */
function buildOpportunityHighlight(opportunity, index) {
  return {
    keyword: opportunity.keyword,
    opportunityScore: opportunity.opportunity_score,
    competitionScore: opportunity.competition_score,
    monetizationScore: opportunity.price_score,
    differentiationScore: opportunity.differentiation_score,
    frequency: opportunity.frequency,
    explanation: firstAvailable(opportunity.evidence) ?? `${opportunity.keyword} is ranked by the deterministic opportunity matrix.`,
    caution: firstAvailable(opportunity.caution),
    confidence: opportunity.frequency >= 3 ? "higher" : opportunity.frequency === 2 ? "medium" : "limited",
    priority: index === 0 ? "Top priority" : opportunity.opportunity_score >= 60 ? "High potential" : "Watchlist",
  };
}

/**
 * @param {any} competitor
 * @param {ReturnType<typeof runAnalyticsPipeline>["pricingAnalytics"]["overall"][number] | null} overallPricing
 * @param {number} index
 */
function buildCompetitorView(competitor, overallPricing, index) {
  const pricePosition = isNumber(competitor.startingPriceValue) && isNumber(overallPricing?.median)
    ? competitor.startingPriceValue > overallPricing.median ? "above median price" : "at or below median price"
    : "price unknown";
  const proof = isNumber(competitor.reviewCount) && competitor.reviewCount >= 100 ? "strong review proof" : "available review proof";
  const badge = competitor.sellerBadgeText ? `${competitor.sellerBadgeText} badge` : "badge unknown";
  return {
    sellerName: competitor.sellerName,
    gigTitle: competitor.gigTitle,
    sellerBadgeText: competitor.sellerBadgeText,
    reviewCount: competitor.reviewCount,
    rating: competitor.rating,
    price: competitor.startingPriceValue,
    competitorScore: competitor.competitorScore,
    evidence: competitor.evidence,
    caution: competitor.caution,
    positioningSummary: `${pricePosition}; ${proof}; ${badge}.`,
    standOutReason: buildStandOutReason(competitor, index),
  };
}

/**
 * @param {ImportResult} importResult
 * @param {ReturnType<typeof buildMarketSnapshot>} marketSnapshot
 * @param {ReturnType<typeof buildKeywordIntelligence>} keywordIntelligence
 * @param {Array<any>} opportunities
 */
function buildPositioningSuggestions(importResult, marketSnapshot, keywordIntelligence, opportunities) {
  const topKeyword = keywordIntelligence.dominantKeywords[0]?.keyword ?? null;
  const topOpportunity = opportunities[0]?.keyword ?? null;
  const rareKeyword = keywordIntelligence.leastSaturatedValuableKeywords[0]?.keyword ?? null;
  const suggestions = [];

  if (topOpportunity) {
    suggestions.push({
      title: "Lead with the clearest opportunity",
      detail: `Position ${importResult.niche.name} around ${topOpportunity} where the uploaded dataset shows the strongest directional opportunity score.`,
    });
  }
  if (rareKeyword && rareKeyword !== topOpportunity) {
    suggestions.push({
      title: "Differentiate with a less saturated term",
      detail: `${rareKeyword} appears less frequently in the imported rows and can be used as a specialization signal if it matches the offer.`,
    });
  }
  if (topKeyword) {
    suggestions.push({
      title: "Avoid relying only on crowded wording",
      detail: `${topKeyword} is the most common keyword in this dataset, so pair it with a clearer specialization instead of using it alone.`,
    });
  }
  if (isNumber(marketSnapshot.medianPrice)) {
    suggestions.push({
      title: "Anchor pricing against the imported median",
      detail: `The parsed median starting price is $${marketSnapshot.medianPrice}; compare any offer tier against that midpoint before positioning as value or premium.`,
    });
  }
  if (keywordIntelligence.underrepresentedTechnologies[0]) {
    suggestions.push({
      title: "Use technology specificity where supported",
      detail: `${keywordIntelligence.underrepresentedTechnologies[0].dictionaryTerm} is underrepresented in this import and may support a more specific service angle.`,
    });
  }

  return suggestions;
}

/**
 * @param {ImportResult} importResult
 * @param {ReturnType<typeof buildMarketSnapshot>} marketSnapshot
 * @param {ReturnType<typeof buildKeywordIntelligence>} keywordIntelligence
 * @param {ReturnType<typeof runAnalyticsPipeline>} analytics
 */
function buildProfileInsights(importResult, marketSnapshot, keywordIntelligence, analytics) {
  const insights = [];
  const topOpportunity = keywordIntelligence.emergingOpportunities[0] ?? analytics.opportunities[0];
  const badgeSignal = marketSnapshot.badgeDistribution.find((entry) => entry.label !== "unknown") ?? null;

  if (topOpportunity) {
    insights.push({
      title: "Headline focus",
      detail: `Make the profile headline point toward ${topOpportunity.keyword} specialization instead of a broad ${importResult.niche.name} label.`,
    });
  }
  if (keywordIntelligence.leastSaturatedValuableKeywords.length > 0) {
    insights.push({
      title: "Keyword coverage gap",
      detail: `Consider covering ${keywordIntelligence.leastSaturatedValuableKeywords.map((item) => item.keyword).slice(0, 3).join(", ")} if those terms match the service capabilities.`,
    });
  }
  if (badgeSignal) {
    insights.push({
      title: "Badge positioning",
      detail: `${badgeSignal.label} appears in the import; compare how those sellers frame trust signals before choosing a profile emphasis.`,
    });
  } else {
    insights.push({
      title: "Badge data is unknown",
      detail: "The import does not show a clear badge pattern, so do not treat missing badge values as a seller weakness.",
    });
  }
  if (isNumber(marketSnapshot.keywordConcentrationScore)) {
    insights.push({
      title: "Specialization depth",
      detail: `Top-keyword concentration is ${marketSnapshot.keywordConcentrationScore}%, so profile positioning should make the differentiator visible quickly.`,
    });
  }

  return insights;
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildRatingDistribution(gigs) {
  const buckets = [
    { label: "4.8-5.0", min: 4.8, max: 5.01, count: 0 },
    { label: "4.5-4.79", min: 4.5, max: 4.8, count: 0 },
    { label: "under 4.5", min: Number.NEGATIVE_INFINITY, max: 4.5, count: 0 },
    { label: "unknown", min: null, max: null, count: 0 },
  ];

  for (const gig of gigs) {
    const rating = gig.rating.value;
    if (!isNumber(rating)) {
      buckets[3].count += 1;
    } else if (rating >= 4.8) {
      buckets[0].count += 1;
    } else if (rating >= 4.5) {
      buckets[1].count += 1;
    } else {
      buckets[2].count += 1;
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    share: gigs.length > 0 ? round((bucket.count / gigs.length) * 100) : 0,
  }));
}

/**
 * @param {ImportResult} importResult
 */
function buildCleaningRows(importResult) {
  const rowIssues = groupIssuesByRow(importResult.issues);
  const normalizedByRawRow = new Map(importResult.normalizedGigs.map((gig) => [gig.rawRowId, gig]));

  return importResult.rawRows.map((rawRow) => {
    const normalizedGig = normalizedByRawRow.get(rawRow.id);
    const issues = rowIssues.get(rawRow.rowNumber) ?? [];
    const hasDuplicate = issues.some((issue) => issue.code === "duplicate_gig_url");
    return {
      rowNumber: rawRow.rowNumber,
      status: normalizedGig ? "valid" : hasDuplicate ? "duplicate" : "invalid",
      gigTitle: normalizedGig?.gig_title ?? rawRow.rawData.gig_title ?? null,
      sellerName: normalizedGig?.seller_name ?? rawRow.rawData.seller_name ?? null,
      startingPrice: normalizedGig?.starting_price?.value ?? rawRow.rawData.starting_price ?? null,
      issueSummary: issues.length > 0 ? issues.map(formatIssue).join("; ") : "No row issues",
    };
  });
}

/**
 * @param {import("../../types/domain.js").ImportIssue[]} issues
 */
function groupIssuesByRow(issues) {
  const groups = new Map();
  for (const issue of issues) {
    if (issue.rowNumber === null) continue;
    if (!groups.has(issue.rowNumber)) groups.set(issue.rowNumber, []);
    groups.get(issue.rowNumber).push(issue);
  }
  return groups;
}

/**
 * @param {Array<{ band: string, count: number }>} priceBands
 * @param {number} total
 */
function buildBandShares(priceBands, total) {
  const shares = { low: 0, mid: 0, high: 0 };
  for (const band of priceBands) {
    if (band.band in shares) shares[band.band] = total > 0 ? round((band.count / total) * 100) : 0;
  }
  return shares;
}

/**
 * @param {ImportResult} importResult
 * @param {ReturnType<typeof runAnalyticsPipeline>} analytics
 * @param {NormalizedGig[]} eligibleGigs
 */
function buildInsights(importResult, analytics, eligibleGigs) {
  const topKeyword = analytics.keywordAnalytics.keywordMetrics[0];
  const topOpportunity = analytics.opportunities[0];
  const medianPrice = analytics.pricingAnalytics.overall[0]?.median ?? null;
  const insights = [
    `${importResult.summary.imported_rows} valid deduplicated gig(s) are available for ${importResult.niche.name}.`,
  ];
  if (topKeyword) insights.push(`${topKeyword.keyword} is the most frequent keyword in the imported dataset.`);
  if (typeof medianPrice === "number") insights.push(`Median parsed starting price is ${medianPrice}.`);
  if (topOpportunity) insights.push(`${topOpportunity.keyword} has the highest directional opportunity score with visible evidence and caution.`);
  if (eligibleGigs.length === 0) insights.push("No valid deduplicated rows are available for analytics yet.");
  return insights;
}

/**
 * @param {import("../../types/domain.js").ImportIssue} issue
 */
function formatIssue(issue) {
  const row = issue.rowNumber === null ? "header" : `row ${issue.rowNumber}`;
  return `${row} ${issue.severity}: ${issue.message}`;
}

/**
 * @param {number | null} totalGigs
 * @param {number | null} averageReviews
 */
function competitionLevel(totalGigs, averageReviews) {
  if (!totalGigs) return "unknown";
  if (totalGigs >= 50 || (averageReviews ?? 0) >= 250) return "high";
  if (totalGigs >= 15 || (averageReviews ?? 0) >= 75) return "moderate";
  return "light";
}

/**
 * @param {string} nicheName
 * @param {string | null} topKeyword
 * @param {string | null} topOpportunity
 * @param {number | null} medianPrice
 */
function buildPositioningRecommendation(nicheName, topKeyword, topOpportunity, medianPrice) {
  if (topOpportunity && topKeyword && topOpportunity !== topKeyword) {
    return `Use ${topKeyword} for relevance, but make ${topOpportunity} the sharper specialization angle.`;
  }
  if (topOpportunity) return `Lead with a focused ${topOpportunity} angle inside ${nicheName}.`;
  if (topKeyword) return `Use ${topKeyword} carefully and add a clearer differentiator from the imported evidence.`;
  if (isNumber(medianPrice)) return `Use the $${medianPrice} median as the first pricing benchmark for ${nicheName}.`;
  return `Import more complete ${nicheName} rows before choosing a positioning angle.`;
}

/**
 * @param {number | null} validShare
 * @param {number} invalidRows
 * @param {number} duplicateRows
 */
function datasetQualityLabel(validShare, invalidRows, duplicateRows) {
  if (validShare === null) return "unknown";
  if (validShare >= 90 && invalidRows === 0 && duplicateRows <= 1) return "clean";
  if (validShare >= 70) return "usable";
  return "needs review";
}

/**
 * @param {any} competitor
 * @param {number} index
 */
function buildStandOutReason(competitor, index) {
  if (index === 0 && isNumber(competitor.competitorScore)) return "Highest deterministic competitor score in the uploaded dataset.";
  if (isNumber(competitor.reviewCount) && competitor.reviewCount >= 100) return "High imported review count compared with most visible rows.";
  if (isNumber(competitor.rating) && competitor.rating >= 4.9) return "Strong available rating signal in the imported data.";
  if (competitor.sellerBadgeText) return "Visible seller badge gives a trust-positioning cue.";
  return "Included because the imported row has enough comparable signals.";
}

/**
 * @param {unknown[]} values
 */
function firstAvailable(values) {
  if (!Array.isArray(values)) return null;
  const value = values.find((entry) => typeof entry === "string" && entry.length > 0);
  return value ?? null;
}

/**
 * @param {number[]} values
 */
function average(values) {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
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
function round(value) {
  return Math.round(value * 100) / 100;
}

