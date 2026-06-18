/**
 * Deterministic cleaning helpers for imported Fiverr gig rows.
 * Every helper preserves the original value and returns warnings/errors.
 */

const DEFAULT_TITLE_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "i",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "will",
  "your",
]);

/**
 * @typedef {{ severity: "warning" | "error", code: string, message: string }} CleaningIssue
 * @typedef {{ original: unknown, cleaned: string | null, warnings: CleaningIssue[], errors: CleaningIssue[] }} TextCleaningResult
 * @typedef {{ original: unknown, cleaned: string | null, tokens: string[], warnings: CleaningIssue[], errors: CleaningIssue[] }} TitleCleaningResult
 * @typedef {{ original: unknown, cleaned: string | null, warnings: CleaningIssue[], errors: CleaningIssue[] }} UrlCleaningResult
 * @typedef {{ original: unknown, cleaned: number | null, warnings: CleaningIssue[], errors: CleaningIssue[] }} NumberCleaningResult
 * @typedef {{ original: unknown, cleaned: { raw: string | null, currencyText: string | null, value: number | null }, warnings: CleaningIssue[], errors: CleaningIssue[] }} PriceCleaningResult
 * @typedef {{ original: unknown, cleaned: string[], warnings: CleaningIssue[], errors: CleaningIssue[] }} TagsCleaningResult
 */

/**
 * @param {unknown} value
 */
export function cleanText(value) {
  const original = value;
  const cleaned = collapseWhitespace(value);
  return {
    original,
    cleaned: cleaned.length > 0 ? cleaned : null,
    warnings: [],
    errors: [],
  };
}

/**
 * @param {unknown} value
 * @returns {UrlCleaningResult}
 */
export function canonicalizeGigUrl(value) {
  return canonicalizeHttpUrl(value, "gig_url");
}

/**
 * @param {unknown} value
 * @returns {UrlCleaningResult}
 */
export function canonicalizeSellerProfileUrl(value) {
  return canonicalizeHttpUrl(value, "seller_profile_url");
}

/**
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {UrlCleaningResult}
 */
export function canonicalizeOptionalUrl(value, fieldName = "url") {
  const original = value;
  const raw = collapseWhitespace(value);
  if (!raw) return { original, cleaned: null, warnings: [], errors: [] };
  return canonicalizeHttpUrl(raw, fieldName);
}

/**
 * @param {unknown} value
 * @returns {TitleCleaningResult}
 */
export function cleanGigTitle(value) {
  const original = value;
  const cleaned = collapseWhitespace(value);
  const tokens = tokenizeTitleKeywords(cleaned);
  return {
    original,
    cleaned: cleaned.length > 0 ? cleaned : null,
    tokens,
    warnings: [],
    errors: cleaned.length > 0 ? [] : [issue("error", "missing_gig_title", "gig_title is required")],
  };
}

/**
 * @param {unknown} value
 * @returns {NumberCleaningResult}
 */
export function parseRating(value) {
  const original = value;
  const raw = collapseWhitespace(value);
  if (!raw) return { original, cleaned: null, warnings: [], errors: [] };

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) {
    return {
      original,
      cleaned: null,
      warnings: [issue("warning", "invalid_rating", "rating must be a number from 0 to 5")],
      errors: [],
    };
  }

  return { original, cleaned: parsed, warnings: [], errors: [] };
}

/**
 * @param {unknown} value
 * @returns {NumberCleaningResult}
 */
export function parseReviewCount(value) {
  const original = value;
  const raw = collapseWhitespace(value);
  if (!raw || raw === "()") return { original, cleaned: null, warnings: [], errors: [] };

  const lower = raw.toLowerCase().replace(/,/g, "");
  const multiplier = lower.endsWith("k") ? 1000 : lower.endsWith("m") ? 1000000 : 1;
  const numericText = multiplier === 1 ? lower : lower.slice(0, -1);

  if (!/^\d+(?:\.\d+)?$/.test(numericText)) {
    return {
      original,
      cleaned: null,
      warnings: [issue("warning", "invalid_review_count", "review_count must be a non-negative count")],
      errors: [],
    };
  }

  const parsed = Number(numericText) * multiplier;
  return { original, cleaned: Math.round(parsed), warnings: [], errors: [] };
}

/**
 * @param {unknown} value
 * @returns {PriceCleaningResult}
 */
export function parseStartingPrice(value) {
  const original = value;
  const raw = collapseWhitespace(value).replace(/\u00a0/g, " ");
  if (!raw) {
    return {
      original,
      cleaned: { raw: null, currencyText: null, value: null },
      warnings: [],
      errors: [issue("error", "missing_starting_price", "starting_price is required")],
    };
  }

  const match = raw.match(/^\s*([^\d.,-]+)?\s*(-?\d+(?:[,\s]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*$/);
  const currencyText = extractCurrencyText(raw);
  if (!match) {
    return {
      original,
      cleaned: { raw, currencyText, value: null },
      warnings: [],
      errors: [issue("error", "invalid_starting_price", "starting_price must contain a non-negative numeric value")],
    };
  }

  const parsed = Number(match[2].replace(/[,\s]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return {
      original,
      cleaned: { raw, currencyText, value: null },
      warnings: [],
      errors: [issue("error", "invalid_starting_price", "starting_price must contain a non-negative numeric value")],
    };
  }

  return {
    original,
    cleaned: { raw, currencyText, value: parsed },
    warnings: [],
    errors: [],
  };
}

/**
 * @param {unknown} value
 * @returns {TextCleaningResult}
 */
export function normalizeBadgeText(value) {
  const original = value;
  const cleaned = collapseWhitespace(value).toLowerCase();
  return {
    original,
    cleaned: cleaned.length > 0 ? cleaned : null,
    warnings: [],
    errors: [],
  };
}

/**
 * @param {unknown} value
 * @returns {TagsCleaningResult}
 */
export function parseExtraFeatures(value) {
  const original = value;
  const raw = String(value ?? "").replace(/\u00a0/g, " ").trim();
  const seen = new Set();
  const tags = raw
    .split(/[,;|\n\r]+|(?:\s+-\s+)/)
    .map((tag) => tag.trim().replace(/^[-*]\s*/, "").replace(/\s+/g, " ").toLowerCase())
    .filter(Boolean)
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
  return { original, cleaned: tags, warnings: [], errors: [] };
}

/**
 * @param {unknown} value
 */
export function tokenizeKeywordsFromTitle(value) {
  return tokenizeTitleKeywords(collapseWhitespace(value));
}

/**
 * @param {unknown} value
 */
function collapseWhitespace(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").trim().replace(/\s+/g, " ");
}

/**
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {UrlCleaningResult}
 */
function canonicalizeHttpUrl(value, fieldName) {
  const original = value;
  const raw = collapseWhitespace(value);
  if (!raw) {
    return {
      original,
      cleaned: null,
      warnings: [],
      errors: [issue("error", `missing_${fieldName}`, `${fieldName} is required`)],
    };
  }

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return invalidUrl(original, fieldName);
    }
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.hash = "";
    parsed.search = "";
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return { original, cleaned: parsed.toString(), warnings: [], errors: [] };
  } catch {
    return invalidUrl(original, fieldName);
  }
}

/**
 * @param {unknown} original
 * @param {string} fieldName
 * @returns {UrlCleaningResult}
 */
function invalidUrl(original, fieldName) {
  return {
    original,
    cleaned: null,
    warnings: [],
    errors: [issue("error", `invalid_${fieldName}`, `${fieldName} must be a valid http:// or https:// URL`)],
  };
}

/**
 * @param {string} title
 */
function tokenizeTitleKeywords(title) {
  const lowered = title.toLowerCase();
  const matches = lowered.match(/[a-z0-9]+(?:[.+#-][a-z0-9]+)*/g) ?? [];
  const seen = new Set();
  return matches
    .filter((token) => token.length > 1)
    .filter((token) => !DEFAULT_TITLE_STOP_WORDS.has(token))
    .filter((token) => {
      if (seen.has(token)) return false;
      seen.add(token);
      return true;
    });
}

/**
 * @param {string} raw
 */
function extractCurrencyText(raw) {
  const match = raw.match(/^\s*([^\d.,-]+)/);
  return match?.[1]?.trim() || null;
}

/**
 * @param {"warning" | "error"} severity
 * @param {string} code
 * @param {string} message
 * @returns {CleaningIssue}
 */
function issue(severity, code, message) {
  return { severity, code, message };
}
