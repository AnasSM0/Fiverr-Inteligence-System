// Runtime validation for the MVP data model. Keep this dependency-free so tests
// can run before the app framework and database layer exist.

/** @typedef {import("../../types/domain.js").ValidationResult} ValidationResult */

export const SUPPORTED_IMPORT_FILE_TYPES = ["csv", "xlsx"];

export const SUPPORTED_GIG_FIELDS = [
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

export const REQUIRED_GIG_FIELDS = ["gig_url", "gig_title", "starting_price"];

export const OPPORTUNITY_METRIC_COLUMNS = [
  "keyword",
  "frequency",
  "competition_score",
  "price_score",
  "differentiation_score",
  "opportunity_score",
  "evidence",
  "caution",
];

const METRIC_SOURCE_FIELDS = ["gig_title", "extra_features"];
const PRICE_BANDS = ["low", "mid", "high", "unknown"];

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * @param {unknown} value
 */
function isStringOrNull(value) {
  return typeof value === "string" || value === null;
}

/**
 * @param {unknown} value
 */
function isIsoDateString(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

/**
 * @param {unknown} value
 */
function isNonNegativeInteger(value) {
  return Number.isInteger(value) && Number(value) >= 0;
}

/**
 * @param {unknown} value
 */
function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * @param {unknown} value
 */
function isScore(value) {
  return isNonNegativeNumber(value) && Number(value) <= 100;
}

/**
 * @param {unknown} value
 */
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * @param {string[]} errors
 * @returns {ValidationResult}
 */
function result(errors) {
  return { valid: errors.length === 0, errors };
}

/**
 * @param {unknown} value
 * @param {string} fieldName
 * @param {string[]} errors
 */
function requireRecord(value, fieldName, errors) {
  if (!isRecord(value)) {
    errors.push(`${fieldName} must be an object`);
    return false;
  }
  return true;
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} fieldName
 * @param {string[]} errors
 */
function requireNonEmptyStringField(value, fieldName, errors) {
  if (!isNonEmptyString(value[fieldName])) {
    errors.push(`${fieldName} must be a non-empty string`);
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} fieldName
 * @param {string[]} errors
 */
function requireIsoDateField(value, fieldName, errors) {
  if (!isIsoDateString(value[fieldName])) {
    errors.push(`${fieldName} must be an ISO-compatible timestamp`);
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} fieldName
 * @param {readonly string[]} allowedValues
 * @param {string[]} errors
 */
function requireAllowedValue(value, fieldName, allowedValues, errors) {
  if (typeof value[fieldName] !== "string" || !allowedValues.includes(value[fieldName])) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(", ")}`);
  }
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateNiche(value) {
  const errors = [];
  if (!requireRecord(value, "niche", errors)) return result(errors);
  requireNonEmptyStringField(value, "id", errors);
  requireNonEmptyStringField(value, "name", errors);
  requireIsoDateField(value, "createdAt", errors);
  return result(errors);
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateImportRun(value) {
  const errors = [];
  if (!requireRecord(value, "importRun", errors)) return result(errors);

  requireNonEmptyStringField(value, "id", errors);
  requireNonEmptyStringField(value, "nicheId", errors);
  requireNonEmptyStringField(value, "sourceFileName", errors);
  requireAllowedValue(value, "fileType", SUPPORTED_IMPORT_FILE_TYPES, errors);
  requireIsoDateField(value, "uploadedAt", errors);

  if (!isNonNegativeInteger(value.rowCount)) {
    errors.push("rowCount must be a non-negative integer");
  }

  if (!Array.isArray(value.supportedFieldNames)) {
    errors.push("supportedFieldNames must be an array");
  } else {
    for (const field of value.supportedFieldNames) {
      if (!SUPPORTED_GIG_FIELDS.includes(field)) {
        errors.push(`supportedFieldNames includes unsupported field: ${String(field)}`);
      }
    }
    for (const field of REQUIRED_GIG_FIELDS) {
      if (!value.supportedFieldNames.includes(field)) {
        errors.push(`supportedFieldNames must include required field: ${field}`);
      }
    }
  }

  if (!isStringArray(value.ignoredFieldNames)) {
    errors.push("ignoredFieldNames must be an array of strings");
  }

  return result(errors);
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateRawGigRow(value) {
  const errors = [];
  if (!requireRecord(value, "rawGigRow", errors)) return result(errors);

  requireNonEmptyStringField(value, "id", errors);
  requireNonEmptyStringField(value, "importRunId", errors);

  if (!Number.isInteger(value.rowNumber) || Number(value.rowNumber) < 1) {
    errors.push("rowNumber must be an integer greater than or equal to 1");
  }

  if (!isRecord(value.rawData)) {
    errors.push("rawData must be an object");
  } else {
    for (const field of REQUIRED_GIG_FIELDS) {
      if (!isNonEmptyString(value.rawData[field])) {
        errors.push(`rawData.${field} must be a non-empty string`);
      }
    }
  }

  return result(errors);
}

/**
 * @param {unknown} value
 * @param {string} fieldName
 * @param {string[]} errors
 * @param {{ min?: number, max?: number, requiredValue?: boolean }} options
 */
function validateParsedNumberField(value, fieldName, errors, options = {}) {
  if (!isRecord(value)) {
    errors.push(`${fieldName} must be an object`);
    return;
  }
  if (!isStringOrNull(value.raw)) {
    errors.push(`${fieldName}.raw must be a string or null`);
  }
  if (value.value !== null && !isNonNegativeNumber(value.value)) {
    errors.push(`${fieldName}.value must be a non-negative number or null`);
  }
  if (options.requiredValue && value.value === null) {
    errors.push(`${fieldName}.value is required`);
  }
  if (typeof options.min === "number" && typeof value.value === "number" && value.value < options.min) {
    errors.push(`${fieldName}.value must be greater than or equal to ${options.min}`);
  }
  if (typeof options.max === "number" && typeof value.value === "number" && value.value > options.max) {
    errors.push(`${fieldName}.value must be less than or equal to ${options.max}`);
  }
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateNormalizedGig(value) {
  const errors = [];
  if (!requireRecord(value, "normalizedGig", errors)) return result(errors);

  for (const field of ["id", "importRunId", "rawRowId", "nicheId", "gig_url", "gig_title"]) {
    requireNonEmptyStringField(value, field, errors);
  }

  for (const field of [
    "gig_image_url",
    "seller_profile_image_url",
    "seller_profile_url",
    "seller_name",
    "seller_badge_icon_url",
    "seller_badge_text",
    "extra_features",
  ]) {
    if (!isStringOrNull(value[field])) {
      errors.push(`${field} must be a string or null`);
    }
  }

  if (typeof value.isValid !== "boolean") {
    errors.push("isValid must be a boolean");
  }
  if (typeof value.isDuplicate !== "boolean") {
    errors.push("isDuplicate must be a boolean");
  }

  validateParsedNumberField(value.rating, "rating", errors, { min: 0, max: 5 });
  validateParsedNumberField(value.review_count, "review_count", errors);
  validateParsedNumberField(value.starting_price, "starting_price", errors, { requiredValue: true });

  if (isRecord(value.starting_price) && !isStringOrNull(value.starting_price.currencyText)) {
    errors.push("starting_price.currencyText must be a string or null");
  }

  requireIsoDateField(value, "normalizedAt", errors);
  return result(errors);
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateKeywordMetric(value) {
  const errors = [];
  if (!requireRecord(value, "keywordMetric", errors)) return result(errors);
  for (const field of ["id", "importRunId", "nicheId", "keyword"]) {
    requireNonEmptyStringField(value, field, errors);
  }
  if (!isNonNegativeInteger(value.frequency)) {
    errors.push("frequency must be a non-negative integer");
  }
  if (!Array.isArray(value.sourceFields) || !value.sourceFields.every((field) => METRIC_SOURCE_FIELDS.includes(field))) {
    errors.push(`sourceFields must contain only: ${METRIC_SOURCE_FIELDS.join(", ")}`);
  }
  if (!isStringArray(value.matchingGigIds)) {
    errors.push("matchingGigIds must be an array of strings");
  }
  if (!isStringArray(value.evidence)) {
    errors.push("evidence must be an array of strings");
  }
  return result(errors);
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validatePricingMetric(value) {
  const errors = [];
  if (!requireRecord(value, "pricingMetric", errors)) return result(errors);
  for (const field of ["id", "importRunId", "nicheId"]) {
    requireNonEmptyStringField(value, field, errors);
  }
  if (!isNonNegativeInteger(value.sampleSize)) {
    errors.push("sampleSize must be a non-negative integer");
  }
  for (const field of ["min", "max", "mean", "median", "q1", "q3"]) {
    if (value[field] !== null && !isNonNegativeNumber(value[field])) {
      errors.push(`${field} must be a non-negative number or null`);
    }
  }
  if (!isStringOrNull(value.currencyText)) {
    errors.push("currencyText must be a string or null");
  }
  requireAllowedValue(value, "priceBand", PRICE_BANDS, errors);
  return result(errors);
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateCompetitorMetric(value) {
  const errors = [];
  if (!requireRecord(value, "competitorMetric", errors)) return result(errors);
  for (const field of ["id", "importRunId", "nicheId", "keyword"]) {
    requireNonEmptyStringField(value, field, errors);
  }
  requireAllowedValue(value, "priceBand", PRICE_BANDS, errors);
  if (!isStringArray(value.competitorGigIds)) {
    errors.push("competitorGigIds must be an array of strings");
  }
  if (!isStringArray(value.evidence)) {
    errors.push("evidence must be an array of strings");
  }
  if (!isStringArray(value.caution)) {
    errors.push("caution must be an array of strings");
  }
  return result(errors);
}

/**
 * @param {unknown} value
 * @returns {ValidationResult}
 */
export function validateOpportunityMetric(value) {
  const errors = [];
  if (!requireRecord(value, "opportunityMetric", errors)) return result(errors);
  for (const field of ["id", "importRunId", "nicheId", "keyword"]) {
    requireNonEmptyStringField(value, field, errors);
  }
  if (!isNonNegativeInteger(value.frequency)) {
    errors.push("frequency must be a non-negative integer");
  }
  for (const field of ["competition_score", "price_score", "differentiation_score", "opportunity_score"]) {
    if (!isScore(value[field])) {
      errors.push(`${field} must be a number from 0 to 100`);
    }
  }
  if (!isStringArray(value.evidence)) {
    errors.push("evidence must be an array of strings");
  }
  if (!isStringArray(value.caution)) {
    errors.push("caution must be an array of strings");
  }
  return result(errors);
}
