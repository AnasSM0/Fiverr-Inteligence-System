import { createHash } from "node:crypto";
import { read, utils } from "xlsx";

import {
  canonicalizeGigUrl,
  canonicalizeOptionalUrl,
  cleanGigTitle,
  cleanText,
  normalizeBadgeText,
  parseRating,
  parseReviewCount,
  parseStartingPrice,
} from "../cleaning/cleaning-engine.js";
import {
  REQUIRED_GIG_FIELDS,
  SUPPORTED_GIG_FIELDS,
  SUPPORTED_IMPORT_FILE_TYPES,
} from "../schema/domain-schema.js";

const OPTIONAL_MEDIA_BADGE_FIELDS = [
  "gig_image_url",
  "seller_profile_image_url",
  "seller_badge_icon_url",
  "seller_badge_text",
];

/**
 * @typedef {import("../../types/domain.js").ImportResult} ImportResult
 * @typedef {import("../../types/domain.js").ImportIssue} ImportIssue
 * @typedef {import("../../types/domain.js").RawGigRow} RawGigRow
 * @typedef {import("../../types/domain.js").NormalizedGig} NormalizedGig
 * @typedef {import("../../types/domain.js").SupportedGigField} SupportedGigField
 */

/**
 * @param {{
 *   fileName: string,
 *   content: string | Buffer | Uint8Array,
 *   niche: { id: string, name: string, createdAt?: string },
 *   uploadedAt?: string,
 *   importRunId?: string
 * }} input
 * @returns {ImportResult}
 */
export function importGigFile(input) {
  const uploadedAt = input.uploadedAt ?? new Date().toISOString();
  const fileType = inferFileType(input.fileName);
  const contentBuffer = toBuffer(input.content);
  const importRunId =
    input.importRunId ?? `import_${stableHash(`${input.fileName}:${input.niche.id}:${contentBuffer.toString("base64")}`).slice(0, 16)}`;
  const niche = {
    id: input.niche.id,
    name: input.niche.name,
    createdAt: input.niche.createdAt ?? uploadedAt,
  };

  const parsedRows = fileType === "csv" ? parseCsv(contentBuffer.toString("utf8")) : parseXlsx(contentBuffer);
  const { headers, rows } = parsedRows;
  const headerValidation = validateHeaders(headers);
  /** @type {ImportIssue[]} */
  const issues = [];

  for (const field of headerValidation.missingRequiredColumns) {
    issues.push({
      rowNumber: null,
      fieldName: field,
      severity: "error",
      code: "missing_required_column",
      message: `Missing required column: ${field}`,
    });
  }

  for (const field of headerValidation.missingOptionalColumns) {
    issues.push({
      rowNumber: null,
      fieldName: field,
      severity: "warning",
      code: OPTIONAL_MEDIA_BADGE_FIELDS.includes(field) ? "missing_optional_media_or_badge_column" : "missing_optional_column",
      message: `Missing optional column: ${field}`,
    });
  }

  /** @type {RawGigRow[]} */
  const rawRows = rows.map((row, index) => ({
    id: `${importRunId}_raw_${index + 1}`,
    importRunId,
    rowNumber: index + 1,
    rawData: row,
  }));

  /** @type {NormalizedGig[]} */
  const normalizedGigs = [];
  const seenUrlHashes = new Set();
  let duplicateRows = 0;
  let invalidRows = 0;

  for (const rawRow of rawRows) {
    const rowIssues = validateRequiredRowValues(rawRow);
    for (const issue of rowIssues) issues.push(issue);

    const gigUrl = canonicalizeGigUrl(rawRow.rawData.gig_url);
    pushCleaningIssues(issues, rawRow.rowNumber, "gig_url", gigUrl);

    const parsedPrice = parseStartingPrice(rawRow.rawData.starting_price);
    pushCleaningIssues(issues, rawRow.rowNumber, "starting_price", parsedPrice);

    const parsedRating = parseRating(rawRow.rawData.rating);
    pushCleaningIssues(issues, rawRow.rowNumber, "rating", parsedRating);

    const parsedReviewCount = parseReviewCount(rawRow.rawData.review_count);
    pushCleaningIssues(issues, rawRow.rowNumber, "review_count", parsedReviewCount);

    const hasRowErrors = issues.some((issue) => issue.rowNumber === rawRow.rowNumber && issue.severity === "error");
    if (hasRowErrors || headerValidation.missingRequiredColumns.length > 0) {
      invalidRows += 1;
      continue;
    }

    const normalizedUrl = gigUrl.cleaned;
    const urlHash = stableHash(normalizedUrl);
    if (seenUrlHashes.has(urlHash)) {
      duplicateRows += 1;
      issues.push({
        rowNumber: rawRow.rowNumber,
        fieldName: "gig_url",
        severity: "warning",
        code: "duplicate_gig_url",
        message: "Duplicate gig_url excluded from normalized import output",
      });
      continue;
    }
    seenUrlHashes.add(urlHash);

    normalizedGigs.push({
      id: `gig_${urlHash.slice(0, 16)}`,
      importRunId,
      rawRowId: rawRow.id,
      nicheId: niche.id,
      isValid: true,
      isDuplicate: false,
      gig_url: normalizedUrl,
      gig_image_url: canonicalizeOptionalUrl(rawRow.rawData.gig_image_url, "gig_image_url").cleaned,
      seller_profile_image_url: canonicalizeOptionalUrl(rawRow.rawData.seller_profile_image_url, "seller_profile_image_url").cleaned,
      seller_profile_url: canonicalizeOptionalUrl(rawRow.rawData.seller_profile_url, "seller_profile_url").cleaned,
      seller_name: cleanText(rawRow.rawData.seller_name).cleaned,
      seller_badge_icon_url: canonicalizeOptionalUrl(rawRow.rawData.seller_badge_icon_url, "seller_badge_icon_url").cleaned,
      seller_badge_text: normalizeBadgeText(rawRow.rawData.seller_badge_text).cleaned,
      gig_title: cleanGigTitle(rawRow.rawData.gig_title).cleaned,
      rating: { raw: parsedRating.original === undefined || parsedRating.original === null ? null : String(parsedRating.original).trim() || null, value: parsedRating.cleaned },
      review_count: {
        raw: parsedReviewCount.original === undefined || parsedReviewCount.original === null ? null : String(parsedReviewCount.original).trim() || null,
        value: parsedReviewCount.cleaned,
      },
      starting_price: parsedPrice.cleaned,
      extra_features: cleanText(rawRow.rawData.extra_features).cleaned,
      normalizedAt: uploadedAt,
    });
  }

  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    niche,
    importRun: {
      id: importRunId,
      nicheId: niche.id,
      sourceFileName: input.fileName,
      fileType,
      uploadedAt,
      rowCount: rows.length,
      supportedFieldNames: headerValidation.recognizedColumns,
      ignoredFieldNames: headerValidation.ignoredColumns,
    },
    headerValidation,
    rawRows,
    normalizedGigs,
    issues,
    summary: {
      total_rows: rows.length,
      imported_rows: normalizedGigs.length,
      duplicate_rows: duplicateRows,
      invalid_rows: invalidRows,
      warnings: warningCount,
    },
  };
}

/**
 * @param {string} fileName
 */
function inferFileType(fileName) {
  const extension = fileName.toLowerCase().split(".").pop();
  if (!SUPPORTED_IMPORT_FILE_TYPES.includes(extension)) {
    throw new Error(`Unsupported import file type: ${extension ?? "unknown"}`);
  }
  return extension;
}

/**
 * @param {string | Buffer | Uint8Array} content
 */
function toBuffer(content) {
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  return Buffer.from(content, "utf8");
}

/**
 * @param {string} text
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return tableToObjects(rows);
}

/**
 * @param {Buffer} buffer
 */
function parseXlsx(buffer) {
  const workbook = read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };
  const table = utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return tableToObjects(table);
}

/**
 * @param {unknown[][]} table
 */
function tableToObjects(table) {
  const [headerRow = [], ...dataRows] = table;
  const headers = headerRow.map((value) => String(value).trim()).filter(Boolean);
  const rows = dataRows
    .filter((row) => row.some((value) => String(value ?? "").trim().length > 0))
    .map((row) => {
      /** @type {Record<string, string>} */
      const record = {};
      headers.forEach((header, index) => {
        record[header] = String(row[index] ?? "").trim();
      });
      return record;
    });
  return { headers, rows };
}

/**
 * @param {string[]} headers
 */
function validateHeaders(headers) {
  const recognizedColumns = headers.filter((header) => SUPPORTED_GIG_FIELDS.includes(header));
  const ignoredColumns = headers.filter((header) => !SUPPORTED_GIG_FIELDS.includes(header));
  return {
    expectedColumns: [...SUPPORTED_GIG_FIELDS],
    recognizedColumns,
    missingRequiredColumns: REQUIRED_GIG_FIELDS.filter((field) => !recognizedColumns.includes(field)),
    missingOptionalColumns: SUPPORTED_GIG_FIELDS.filter(
      (field) => !REQUIRED_GIG_FIELDS.includes(field) && !recognizedColumns.includes(field),
    ),
    ignoredColumns,
  };
}

/**
 * @param {RawGigRow} rawRow
 * @returns {ImportIssue[]}
 */
function validateRequiredRowValues(rawRow) {
  return REQUIRED_GIG_FIELDS.flatMap((field) => {
    const value = rawRow.rawData[field];
    if (typeof value === "string" && value.trim().length > 0) return [];
    return [
      {
        rowNumber: rawRow.rowNumber,
        fieldName: field,
        severity: "error",
        code: "missing_required_value",
        message: `${field} is required`,
      },
    ];
  });
}

/**
 * @param {ImportIssue[]} issues
 * @param {number} rowNumber
 * @param {string} fieldName
 * @param {{ warnings: Array<{ severity: "warning" | "error", code: string, message: string }>, errors: Array<{ severity: "warning" | "error", code: string, message: string }> }} result
 */
function pushCleaningIssues(issues, rowNumber, fieldName, result) {
  for (const item of [...result.warnings, ...result.errors]) {
    issues.push({
      rowNumber,
      fieldName,
      severity: item.severity,
      code: item.code,
      message: item.message,
    });
  }
}

/**
 * @param {string} value
 */
function stableHash(value) {
  return createHash("sha256").update(value).digest("hex");
}
