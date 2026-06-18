import type { ValidationResult } from "../../types/domain.js";

export const SUPPORTED_IMPORT_FILE_TYPES: readonly ["csv", "xlsx"];

export const SUPPORTED_GIG_FIELDS: readonly [
  "gig_url",
  "gig_image_url",
  "seller_profile_image_url",
  "seller_profile_url",
  "seller_name",
  "seller_badge_icon_url",
  "seller_badge_text",
  "gig_title",
  "rating",
  "review_count",
  "starting_price",
  "extra_features",
];

export const REQUIRED_GIG_FIELDS: readonly ["gig_url", "seller_name", "gig_title", "starting_price"];

export const OPPORTUNITY_METRIC_COLUMNS: readonly [
  "keyword",
  "frequency",
  "competition_score",
  "price_score",
  "differentiation_score",
  "opportunity_score",
  "evidence",
  "caution",
];

export function validateNiche(value: unknown): ValidationResult;
export function validateImportRun(value: unknown): ValidationResult;
export function validateRawGigRow(value: unknown): ValidationResult;
export function validateNormalizedGig(value: unknown): ValidationResult;
export function validateKeywordMetric(value: unknown): ValidationResult;
export function validatePricingMetric(value: unknown): ValidationResult;
export function validateCompetitorMetric(value: unknown): ValidationResult;
export function validateOpportunityMetric(value: unknown): ValidationResult;
