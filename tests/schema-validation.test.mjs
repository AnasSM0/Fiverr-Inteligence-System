import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  OPPORTUNITY_METRIC_COLUMNS,
  REQUIRED_GIG_FIELDS,
  SUPPORTED_GIG_FIELDS,
  SUPPORTED_IMPORT_FILE_TYPES,
  validateCompetitorMetric,
  validateImportRun,
  validateKeywordMetric,
  validateNiche,
  validateNormalizedGig,
  validateOpportunityMetric,
  validatePricingMetric,
  validateRawGigRow,
} from "../src/lib/schema/domain-schema.js";

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/sample-fiverr-import.json", import.meta.url), "utf8"),
);

test("schema constants support MVP import boundaries", () => {
  assert.deepEqual(SUPPORTED_IMPORT_FILE_TYPES, ["csv", "xlsx"]);
  assert.deepEqual(REQUIRED_GIG_FIELDS, ["gig_url", "gig_title", "starting_price"]);
  assert.deepEqual(SUPPORTED_GIG_FIELDS, [
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
  ]);
});

test("fixture keeps import metadata and manually assigned niche valid", () => {
  assert.deepEqual(validateNiche(fixture.niche), { valid: true, errors: [] });
  assert.deepEqual(validateImportRun(fixture.importRun), { valid: true, errors: [] });
  assert.equal(fixture.importRun.nicheId, fixture.niche.id);
  assert.equal(fixture.importRun.sourceFileName, "ai_agents_sample.csv");
});

test("fixture stores raw imported row separately from normalized gig", () => {
  assert.deepEqual(validateRawGigRow(fixture.rawGigRow), { valid: true, errors: [] });
  assert.deepEqual(validateNormalizedGig(fixture.normalizedGig), { valid: true, errors: [] });
  assert.equal(fixture.rawGigRow.id, fixture.normalizedGig.rawRowId);
  assert.equal(fixture.rawGigRow.rawData.starting_price, "USD 150");
  assert.deepEqual(fixture.normalizedGig.starting_price, {
    raw: "USD 150",
    currencyText: "USD",
    value: 150,
  });
});

test("fixture normalizes numeric rating, review count, and starting price", () => {
  assert.equal(fixture.normalizedGig.rating.raw, "4.9");
  assert.equal(fixture.normalizedGig.rating.value, 4.9);
  assert.equal(fixture.normalizedGig.review_count.raw, "1,200");
  assert.equal(fixture.normalizedGig.review_count.value, 1200);
  assert.equal(fixture.normalizedGig.starting_price.raw, "USD 150");
  assert.equal(fixture.normalizedGig.starting_price.value, 150);
});

test("metric fixtures validate and expose opportunity matrix output schema", () => {
  assert.deepEqual(validateKeywordMetric(fixture.keywordMetric), { valid: true, errors: [] });
  assert.deepEqual(validatePricingMetric(fixture.pricingMetric), { valid: true, errors: [] });
  assert.deepEqual(validateCompetitorMetric(fixture.competitorMetric), { valid: true, errors: [] });
  assert.deepEqual(validateOpportunityMetric(fixture.opportunityMetric), { valid: true, errors: [] });
  assert.deepEqual(Object.keys(fixture.opportunityMetric).filter((key) => OPPORTUNITY_METRIC_COLUMNS.includes(key)), OPPORTUNITY_METRIC_COLUMNS);
});

test("validators reject invalid normalized rating and missing parsed price", () => {
  const invalid = structuredClone(fixture.normalizedGig);
  invalid.rating.value = 5.5;
  invalid.starting_price.value = null;

  const validation = validateNormalizedGig(invalid);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /rating\.value must be less than or equal to 5/);
  assert.match(validation.errors.join("\n"), /starting_price\.value is required/);
});

test("validators reject unsupported import file type and missing required headers", () => {
  const invalid = structuredClone(fixture.importRun);
  invalid.fileType = "pdf";
  invalid.supportedFieldNames = ["gig_url", "seller_name", "gig_title"];

  const validation = validateImportRun(invalid);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /fileType must be one of: csv, xlsx/);
  assert.match(validation.errors.join("\n"), /supportedFieldNames must include required field: starting_price/);
});
