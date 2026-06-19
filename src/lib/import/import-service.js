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
import { detectNicheFromGigs, UNCATEGORIZED_NICHE_NAME } from "../niche/niche-detector.js";
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

export const INSTANT_DATA_SCRAPER_COLUMN_MAP = Object.freeze({
  "media href": "gig_url",
  "box-image-ratio src": "gig_image_url",
  "_172854 src": "seller_profile_image_url",
  "text-bold href": "seller_profile_url",
  t6d0qrk: "seller_name",
  "_1uflkdh1j src": "seller_badge_icon_url",
  fn33512: "seller_badge_text",
  _30fcb2: "gig_title",
  "rating-score": "rating",
  "rating-count-number": "review_count",
  "text-bold 2": "starting_price",
  "t6d0qrk 3": "extra_features",
});

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
 *   content: string | ArrayBuffer | Uint8Array,
 *   niche?: { id: string, name: string, createdAt?: string },
 *   uploadedAt?: string,
 *   importRunId?: string
 * }} input
 * @returns {ImportResult}
 */
export function importGigFile(input) {
  const uploadedAt = input.uploadedAt ?? new Date().toISOString();
  const fileType = inferFileType(input.fileName);
  const contentBytes = toBytes(input.content);
  const initialNiche = input.niche?.name?.trim()
    ? {
        id: input.niche.id || slug(input.niche.name),
        name: input.niche.name.trim(),
        createdAt: input.niche.createdAt ?? uploadedAt,
      }
    : {
        id: slug(UNCATEGORIZED_NICHE_NAME),
        name: UNCATEGORIZED_NICHE_NAME,
        createdAt: uploadedAt,
      };
  const importRunId =
    input.importRunId ?? `import_${stableHash(`${input.fileName}:${initialNiche.id}:${stableHash(contentBytes)}`).slice(0, 16)}`;
  let niche = initialNiche;

  const parsedRows = fileType === "csv" ? parseCsv(decodeUtf8(contentBytes)) : parseXlsx(contentBytes);
  const mappedImport = applyColumnMapping(parsedRows.headers, parsedRows.rows);
  const { headers, rows } = mappedImport;
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
    sourceData: mappedImport.originalRows[index] ?? {},
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
  const detectedNiche = detectNicheFromGigs(normalizedGigs);
  const hasManualNiche = Boolean(input.niche?.name?.trim());
  if (!hasManualNiche) {
    niche = {
      id: slug(detectedNiche.suggestedName),
      name: detectedNiche.suggestedName,
      createdAt: uploadedAt,
    };
    for (const gig of normalizedGigs) gig.nicheId = niche.id;
  }
  const nicheDetection = {
    ...detectedNiche,
    selectedName: niche.name,
    applied: !hasManualNiche,
    manualOverride: hasManualNiche,
  };

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
      originalFieldNames: mappedImport.originalHeaders,
      columnMapping: mappedImport.columnMapping,
    },
    nicheDetection,
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
 * @param {string | ArrayBuffer | Uint8Array} content
 */
function toBytes(content) {
  if (typeof content === "string") return new TextEncoder().encode(content);
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return new Uint8Array(content);
}

/**
 * @param {Uint8Array} bytes
 */
function decodeUtf8(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
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
 * @param {Uint8Array} bytes
 */
function parseXlsx(bytes) {
  const workbook = read(bytes, { type: "array", cellDates: false });
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
 * @param {Record<string, string>[]} rows
 */
function applyColumnMapping(headers, rows) {
  const seenCanonicalHeaders = new Set();
  const sourceToCanonical = new Map();
  const canonicalHeaders = [];
  const mappings = [];
  const ignoredSourceFieldNames = [];

  for (const sourceHeader of headers) {
    const directCanonical = SUPPORTED_GIG_FIELDS.includes(sourceHeader) ? sourceHeader : null;
    const mappedCanonical = directCanonical ?? INSTANT_DATA_SCRAPER_COLUMN_MAP[sourceHeader] ?? null;

    if (!mappedCanonical || seenCanonicalHeaders.has(mappedCanonical)) {
      ignoredSourceFieldNames.push(sourceHeader);
      continue;
    }

    seenCanonicalHeaders.add(mappedCanonical);
    sourceToCanonical.set(sourceHeader, mappedCanonical);
    canonicalHeaders.push(mappedCanonical);

    if (sourceHeader !== mappedCanonical) {
      mappings.push({ sourceColumn: sourceHeader, targetField: mappedCanonical });
    }
  }

  const mappedRows = rows.map((row) => {
    const mappedRow = {};
    for (const [sourceHeader, canonicalHeader] of sourceToCanonical) {
      mappedRow[canonicalHeader] = row[sourceHeader] ?? "";
    }
    return mappedRow;
  });

  return {
    headers: canonicalHeaders,
    rows: mappedRows,
    originalHeaders: headers,
    originalRows: rows,
    columnMapping: {
      applied: mappings.length > 0,
      mappings,
      originalFieldNames: headers,
      ignoredSourceFieldNames,
    },
  };
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
 * @param {string | Uint8Array} value
 */
function stableHash(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;

  for (const byte of bytes) {
    h1 = Math.imul(h1 ^ byte, 0x01000193);
    h2 = Math.imul(h2 ^ byte, 0x85ebca6b);
    h3 = Math.imul(h3 ^ byte, 0xc2b2ae35);
    h4 = Math.imul(h4 ^ byte, 0x27d4eb2f);
  }

  return [h1, h2, h3, h4].map((hash) => (hash >>> 0).toString(16).padStart(8, "0")).join("");
}

/**
 * @param {string} value
 */
function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "uncategorized_market";
}

