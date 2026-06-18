export interface CleaningIssue {
  severity: "warning" | "error";
  code: string;
  message: string;
}

export interface CleaningResult<T> {
  original: unknown;
  cleaned: T;
  warnings: CleaningIssue[];
  errors: CleaningIssue[];
}

export interface TitleCleaningResult extends CleaningResult<string | null> {
  tokens: string[];
}

export interface ParsedPrice {
  raw: string | null;
  currencyText: string | null;
  value: number | null;
}

export function cleanText(value: unknown): CleaningResult<string | null>;
export function canonicalizeGigUrl(value: unknown): CleaningResult<string | null>;
export function canonicalizeSellerProfileUrl(value: unknown): CleaningResult<string | null>;
export function canonicalizeOptionalUrl(value: unknown, fieldName?: string): CleaningResult<string | null>;
export function cleanGigTitle(value: unknown): TitleCleaningResult;
export function parseRating(value: unknown): CleaningResult<number | null>;
export function parseReviewCount(value: unknown): CleaningResult<number | null>;
export function parseStartingPrice(value: unknown): CleaningResult<ParsedPrice>;
export function normalizeBadgeText(value: unknown): CleaningResult<string | null>;
export function parseExtraFeatures(value: unknown): CleaningResult<string[]>;
export function tokenizeKeywordsFromTitle(value: unknown): string[];
