export type ImportFileType = "csv" | "xlsx";

export type SupportedGigField =
  | "gig_url"
  | "gig_image_url"
  | "seller_profile_image_url"
  | "seller_profile_url"
  | "seller_name"
  | "seller_badge_icon_url"
  | "seller_badge_text"
  | "gig_title"
  | "rating"
  | "review_count"
  | "starting_price"
  | "extra_features";

export type MetricSourceField = "gig_title" | "extra_features";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface Niche {
  id: string;
  name: string;
  createdAt: string;
}

export interface NicheDetectionResult {
  suggestedName: string;
  selectedName: string;
  confidence: "high" | "medium" | "low";
  score: number;
  evidenceKeywords: string[];
  evidencePhrases: string[];
  alternatives: Array<{
    name: string;
    score: number;
    evidenceKeywords: string[];
    evidencePhrases: string[];
  }>;
  needsConfirmation: boolean;
  applied: boolean;
  manualOverride: boolean;
}

export interface ImportRun {
  id: string;
  nicheId: string;
  sourceFileName: string;
  fileType: ImportFileType;
  uploadedAt: string;
  rowCount: number;
  supportedFieldNames: SupportedGigField[];
  ignoredFieldNames: string[];
  originalFieldNames: string[];
  columnMapping: ColumnMappingReport;
}

export type RawGigData = Partial<Record<SupportedGigField, string | null>> &
  Record<string, unknown>;

export interface ColumnMappingEntry {
  sourceColumn: string;
  targetField: SupportedGigField;
}

export interface ColumnMappingReport {
  applied: boolean;
  mappings: ColumnMappingEntry[];
  originalFieldNames: string[];
  ignoredSourceFieldNames: string[];
}

export interface RawGigRow {
  id: string;
  importRunId: string;
  rowNumber: number;
  rawData: RawGigData;
  sourceData?: Record<string, string>;
}

export interface ParsedNumberField {
  raw: string | null;
  value: number | null;
}

export interface ParsedPriceField extends ParsedNumberField {
  currencyText: string | null;
}

export interface NormalizedGig {
  id: string;
  importRunId: string;
  rawRowId: string;
  nicheId: string;
  isValid: boolean;
  isDuplicate: boolean;
  gig_url: string;
  gig_image_url: string | null;
  seller_profile_image_url: string | null;
  seller_profile_url: string | null;
  seller_name: string | null;
  seller_badge_icon_url: string | null;
  seller_badge_text: string | null;
  gig_title: string;
  rating: ParsedNumberField;
  review_count: ParsedNumberField;
  starting_price: ParsedPriceField;
  extra_features: string | null;
  normalizedAt: string;
}

export interface KeywordMetric {
  id: string;
  importRunId: string;
  nicheId: string;
  keyword: string;
  frequency: number;
  sourceFields: MetricSourceField[];
  matchingGigIds: string[];
  evidence: string[];
}

export interface PricingMetric {
  id: string;
  importRunId: string;
  nicheId: string;
  sampleSize: number;
  currencyText: string | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  q1: number | null;
  q3: number | null;
  priceBand: "low" | "mid" | "high" | "unknown";
}

export type PriceBandName = "low" | "mid" | "high";

export interface PriceBandMetric {
  band: PriceBandName;
  count: number;
  min: number | null;
  max: number | null;
  matchingGigIds: string[];
}

export interface PriceDistributionMetric {
  id: string;
  nicheId: string;
  currencyText: string | null;
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
  priceBands: PriceBandMetric[];
  matchingGigIds: string[];
}

export interface BadgePricingComparison {
  id: string;
  nicheId: string;
  currencyText: string | null;
  badgeText: string;
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  matchingGigIds: string[];
}

export interface HighReviewPricingComparison {
  id: string;
  nicheId: string;
  currencyText: string | null;
  highReviewMinimum: number;
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  matchingGigIds: string[];
}

export interface KeywordPriceCorrelationMetric {
  id: string;
  nicheId: string;
  currencyText: string | null;
  keyword: string;
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  matchingGigIds: string[];
  evidence: string[];
  caution: string[];
}

export interface PricingAnalyticsResult {
  overall: PriceDistributionMetric[];
  byKeyword: KeywordPriceCorrelationMetric[];
  byBadge: BadgePricingComparison[];
  highReview: HighReviewPricingComparison[];
}

export interface CompetitorMetric {
  id: string;
  importRunId: string;
  nicheId: string;
  keyword: string;
  priceBand: "low" | "mid" | "high" | "unknown";
  competitorGigIds: string[];
  evidence: string[];
  caution: string[];
}

export interface CompetitorGigSummary {
  id: string;
  nicheId: string;
  gigId: string;
  sellerName: string | null;
  gigTitle: string;
  reviewCount: number | null;
  rating: number | null;
  startingPriceValue: number | null;
  startingPriceRaw: string | null;
  currencyText: string | null;
  sellerBadgeText: string | null;
}

export interface BadgeDistributionMetric {
  id: string;
  nicheId: string;
  badgeText: string | null;
  label: string;
  count: number;
  shareOfNiche: number;
  matchingGigIds: string[];
  caution: string[];
}

export type PriceReviewPosition =
  | "premium_social_proof"
  | "value_social_proof"
  | "premium_low_review"
  | "value_low_review";

export interface PriceReviewPositioningMetric {
  id: string;
  nicheId: string;
  gigId: string;
  sellerName: string | null;
  gigTitle: string;
  currencyText: string | null;
  startingPriceValue: number;
  startingPriceRaw: string | null;
  reviewCount: number;
  nicheCurrencyMedianPrice: number;
  nicheMedianReviewCount: number;
  position: PriceReviewPosition;
  evidence: string[];
}

export interface TitlePatternMetric {
  id: string;
  nicheId: string;
  pattern: string;
  frequency: number;
  matchingGigIds: string[];
  evidence: string[];
}

export interface SellerConcentrationMetric {
  id: string;
  nicheId: string;
  sellerName: string | null;
  gigCount: number;
  shareOfNiche: number;
  totalReviewCount: number;
  averageRating: number | null;
  matchingGigIds: string[];
}

export interface CompetitorScoreWeights {
  reviewCount: number;
  rating: number;
  badgePresence: number;
  sellerConcentration: number;
}

export interface CompetitorScoreComponent {
  name: keyof CompetitorScoreWeights;
  weight: number;
  value: number;
  evidence: string;
}

export interface CompetitorScoreMetric extends CompetitorGigSummary {
  competitorScore: number;
  components: CompetitorScoreComponent[];
  formula: string;
  evidence: string[];
  caution: string[];
}

export interface CompetitorAnalyticsResult {
  topByReviewCount: CompetitorGigSummary[];
  topByRating: CompetitorGigSummary[];
  badgeDistribution: BadgeDistributionMetric[];
  priceReviewPositioning: PriceReviewPositioningMetric[];
  titlePatterns: TitlePatternMetric[];
  sellerConcentration: SellerConcentrationMetric[];
  competitorScores: CompetitorScoreMetric[];
  scoringFormula: {
    description: string;
    weights: CompetitorScoreWeights;
    missingValuePolicy: string;
    rankingCaution: string;
  };
}

export interface OpportunityMetric {
  id: string;
  importRunId: string;
  nicheId: string;
  keyword: string;
  frequency: number;
  competition_score: number;
  price_score: number;
  differentiation_score: number;
  opportunity_score: number;
  evidence: string[];
  caution: string[];
}

export interface ImportIssue {
  rowNumber: number | null;
  fieldName: string | null;
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface HeaderValidation {
  expectedColumns: SupportedGigField[];
  recognizedColumns: SupportedGigField[];
  missingRequiredColumns: string[];
  missingOptionalColumns: string[];
  ignoredColumns: string[];
}

export interface ImportSummary {
  total_rows: number;
  imported_rows: number;
  duplicate_rows: number;
  invalid_rows: number;
  warnings: number;
}

export interface ImportResult {
  niche: Niche;
  importRun: ImportRun;
  nicheDetection: NicheDetectionResult;
  headerValidation: HeaderValidation;
  rawRows: RawGigRow[];
  normalizedGigs: NormalizedGig[];
  issues: ImportIssue[];
  summary: ImportSummary;
}

export interface PhraseMetric {
  id: string;
  nicheId: string;
  phrase: string;
  phraseSize: 2 | 3;
  frequency: number;
  matchingGigIds: string[];
  evidence: string[];
}

export interface TechnologyKeywordMetric {
  id: string;
  nicheId: string;
  keyword: string;
  dictionaryTerm: string;
  frequency: number;
  sourceFields: MetricSourceField[];
  matchingGigIds: string[];
  evidence: string[];
}

export interface BadgeKeywordMetric {
  id: string;
  nicheId: string;
  keyword: string;
  frequency: number;
  matchingGigIds: string[];
  evidence: string[];
}

export interface OpportunityKeywordCandidate {
  id: string;
  nicheId: string;
  keyword: string;
  frequency: number;
  competitionGigCount: number;
  totalReviewCount: number;
  averageReviewCount: number | null;
  matchingGigIds: string[];
  evidence: string[];
  caution: string[];
}

export interface KeywordAnalyticsResult {
  keywordMetrics: KeywordMetric[];
  phraseMetrics: PhraseMetric[];
  technologyKeywordMetrics: TechnologyKeywordMetric[];
  sellerBadgeKeywordMetrics: BadgeKeywordMetric[];
  topHighReviewKeywords: KeywordMetric[];
  lowCompetitionKeywordCandidates: OpportunityKeywordCandidate[];
}

