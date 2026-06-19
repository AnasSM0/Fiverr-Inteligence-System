import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { utils, write } from "xlsx";

import { importGigFile, parseCsv } from "../src/lib/import/import-service.js";

const niche = {
  id: "niche_ai_agents",
  name: "AI Agents",
  createdAt: "2026-06-18T09:00:00.000Z",
};

const uploadedAt = "2026-06-18T09:01:00.000Z";

test("parseCsv handles quoted commas", () => {
  const parsed = parseCsv("gig_url,review_count\nhttps://example.com,\"1,200\"\n");
  assert.deepEqual(parsed.rows, [{ gig_url: "https://example.com", review_count: "1,200" }]);
});

test("imports CSV fixture into raw rows, deduplicated normalized gigs, and summary", async () => {
  const csv = await readFile(new URL("./fixtures/import/sample-gigs.csv", import.meta.url), "utf8");
  const result = importGigFile({
    fileName: "sample-gigs.csv",
    content: csv,
    niche,
    uploadedAt,
    importRunId: "import_csv_fixture",
  });

  assert.equal(result.importRun.fileType, "csv");
  assert.equal(result.importRun.sourceFileName, "sample-gigs.csv");
  assert.equal(result.importRun.nicheId, niche.id);
  assert.equal(result.importRun.columnMapping.applied, false);
  assert.ok(result.importRun.originalFieldNames.includes("gig_url"));
  assert.equal(result.rawRows.length, 4);
  assert.equal(result.normalizedGigs.length, 2);
  assert.deepEqual(result.summary, {
    total_rows: 4,
    imported_rows: 2,
    duplicate_rows: 1,
    invalid_rows: 1,
    warnings: 1,
  });

  assert.equal(result.rawRows[0].rawData.starting_price, "USD 150");
  assert.deepEqual(result.normalizedGigs[0].starting_price, {
    raw: "USD 150",
    currencyText: "USD",
    value: 150,
  });
  assert.equal(result.normalizedGigs[0].review_count.value, 1200);
  assert.equal(result.normalizedGigs[0].rating.value, 4.9);
  assert.equal(result.normalizedGigs[1].gig_image_url, null);
  assert.equal(result.normalizedGigs[1].seller_badge_text, null);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_gig_url"));
  assert.ok(result.issues.some((issue) => issue.code === "missing_required_value" && issue.fieldName === "gig_url"));
});

test("imports XLSX fixture buffer with the same import behavior", () => {
  const rows = [
    [
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
    ],
    [
      "https://www.fiverr.com/xlsx-seller/build-openai-agent",
      "",
      "",
      "https://www.fiverr.com/xlsx-seller",
      "XLSX Seller",
      "",
      "",
      "I will build OpenAI agents with LangGraph",
      "5",
      "42",
      "$200",
      "OpenAI, LangGraph",
    ],
  ];
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), "gigs");
  const xlsxBuffer = write(workbook, { type: "buffer", bookType: "xlsx" });

  const result = importGigFile({
    fileName: "sample-gigs.xlsx",
    content: xlsxBuffer,
    niche,
    uploadedAt,
    importRunId: "import_xlsx_fixture",
  });

  assert.equal(result.importRun.fileType, "xlsx");
  assert.equal(result.rawRows.length, 1);
  assert.equal(result.normalizedGigs.length, 1);
  assert.deepEqual(result.summary, {
    total_rows: 1,
    imported_rows: 1,
    duplicate_rows: 0,
    invalid_rows: 0,
    warnings: 0,
  });
  assert.equal(result.normalizedGigs[0].starting_price.currencyText, "$");
  assert.equal(result.normalizedGigs[0].starting_price.value, 200);
});

test("maps Instant Data Scraper headers before validation and analytics", async () => {
  const csv = await readFile(new URL("./fixtures/import/instant-data-scraper-gigs.csv", import.meta.url), "utf8");
  const result = importGigFile({
    fileName: "instant-data-scraper-gigs.csv",
    content: csv,
    niche,
    uploadedAt,
    importRunId: "import_ids_fixture",
  });

  assert.equal(result.importRun.columnMapping.applied, true);
  assert.deepEqual(result.headerValidation.missingRequiredColumns, []);
  assert.equal(result.summary.imported_rows, 2);
  assert.equal(result.summary.invalid_rows, 0);
  assert.ok(result.importRun.columnMapping.mappings.some((mapping) => mapping.sourceColumn === "media href" && mapping.targetField === "gig_url"));
  assert.ok(result.importRun.columnMapping.mappings.some((mapping) => mapping.sourceColumn === "text-bold 2" && mapping.targetField === "starting_price"));
  assert.ok(result.importRun.columnMapping.ignoredSourceFieldNames.includes("unused class"));
  assert.ok(result.rawRows[0].sourceData["media href"].includes("ids-seller"));
  assert.equal(result.normalizedGigs[0].gig_title, "I will build OpenAI agents with n8n");
  assert.equal(result.normalizedGigs[0].starting_price.value, 120);
});

test("reports missing required fields after Instant Data Scraper mapping", () => {
  const result = importGigFile({
    fileName: "missing-ids-price.csv",
    content: "media href,_30fcb2\nhttps://www.fiverr.com/a/b,Title\n",
    niche,
    uploadedAt,
    importRunId: "import_ids_missing_required",
  });

  assert.equal(result.importRun.columnMapping.applied, true);
  assert.deepEqual(result.headerValidation.missingRequiredColumns, ["starting_price"]);
  assert.equal(result.summary.imported_rows, 0);
  assert.equal(result.summary.invalid_rows, 1);
  assert.ok(result.issues.some((issue) => issue.code === "missing_required_column" && issue.fieldName === "starting_price"));
});

test("keeps unknown Instant Data Scraper source columns ignored without inventing fields", () => {
  const result = importGigFile({
    fileName: "ids-unknown.csv",
    content: "media href,_30fcb2,text-bold 2,not-a-supported-column\nhttps://www.fiverr.com/a/b,Title,$25,ignored\n",
    niche,
    uploadedAt,
    importRunId: "import_ids_unknown",
  });

  assert.equal(result.summary.imported_rows, 1);
  assert.deepEqual(result.importRun.columnMapping.ignoredSourceFieldNames, ["not-a-supported-column"]);
  assert.equal(result.normalizedGigs[0].extra_features, null);
});

test("requires gig_url, gig_title, and starting_price headers while seller_name stays optional", () => {
  const result = importGigFile({
    fileName: "missing-seller.csv",
    content: "gig_url,gig_title,starting_price\nhttps://www.fiverr.com/a/b,Title,$20\n",
    niche,
    uploadedAt,
    importRunId: "import_missing_seller",
  });

  assert.deepEqual(result.headerValidation.missingRequiredColumns, []);
  assert.equal(result.summary.imported_rows, 1);
  assert.equal(result.summary.invalid_rows, 0);
  assert.equal(result.normalizedGigs[0].seller_name, null);
  assert.ok(result.issues.some((issue) => issue.code === "missing_optional_column" && issue.fieldName === "seller_name"));
});
