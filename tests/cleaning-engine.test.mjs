import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalizeGigUrl,
  canonicalizeSellerProfileUrl,
  cleanGigTitle,
  normalizeBadgeText,
  parseExtraFeatures,
  parseRating,
  parseReviewCount,
  parseStartingPrice,
  tokenizeKeywordsFromTitle,
} from "../src/lib/cleaning/cleaning-engine.js";

test("canonicalizes gig URLs without fetching or preserving tracking noise", () => {
  const result = canonicalizeGigUrl(" HTTPS://WWW.FIVERR.COM/Seller/Gig-Name///?utm_source=x#reviews ");

  assert.equal(result.cleaned, "https://www.fiverr.com/Seller/Gig-Name");
  assert.equal(result.original, " HTTPS://WWW.FIVERR.COM/Seller/Gig-Name///?utm_source=x#reviews ");
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.errors, []);
});

test("canonicalizes seller profile URLs", () => {
  const result = canonicalizeSellerProfileUrl("https://www.fiverr.com/Sample-Seller/?source=gig_cards#top");

  assert.equal(result.cleaned, "https://www.fiverr.com/Sample-Seller");
  assert.deepEqual(result.errors, []);
});

test("rejects malformed URLs with original value and error", () => {
  const result = canonicalizeGigUrl("not a url");

  assert.equal(result.original, "not a url");
  assert.equal(result.cleaned, null);
  assert.equal(result.errors[0].code, "invalid_gig_url");
});

test("trims titles and produces lowercase keyword tokens", () => {
  const result = cleanGigTitle("  I will Build Custom n8n AI Agents with OpenAI + FastAPI  ");

  assert.equal(result.cleaned, "I will Build Custom n8n AI Agents with OpenAI + FastAPI");
  assert.deepEqual(result.tokens, ["build", "custom", "n8n", "ai", "agents", "openai", "fastapi"]);
});

test("tokenizes keywords from gig title deterministically", () => {
  assert.deepEqual(tokenizeKeywordsFromTitle("I will build Shopify, WordPress & AI agent automations"), [
    "build",
    "shopify",
    "wordpress",
    "ai",
    "agent",
    "automations",
  ]);
});

test("parses ratings and rejects out-of-range values", () => {
  assert.equal(parseRating("4.9").cleaned, 4.9);

  const invalid = parseRating("5.5");
  assert.equal(invalid.cleaned, null);
  assert.equal(invalid.warnings[0].code, "invalid_rating");
});

test("parses review counts including empty, parentheses, plain, and shorthand values", () => {
  assert.equal(parseReviewCount("").cleaned, null);
  assert.equal(parseReviewCount("()").cleaned, null);
  assert.equal(parseReviewCount("462").cleaned, 462);
  assert.equal(parseReviewCount("1.2k").cleaned, 1200);
  assert.equal(parseReviewCount("2M").cleaned, 2000000);

  const invalid = parseReviewCount("many");
  assert.equal(invalid.cleaned, null);
  assert.equal(invalid.warnings[0].code, "invalid_review_count");
});

test("parses starting prices with PKR, symbols, commas, and non-breaking spaces", () => {
  assert.deepEqual(parseStartingPrice("PKR\u00a05,000").cleaned, {
    raw: "PKR 5,000",
    currencyText: "PKR",
    value: 5000,
  });
  assert.deepEqual(parseStartingPrice("$1,250").cleaned, {
    raw: "$1,250",
    currencyText: "$",
    value: 1250,
  });
  assert.deepEqual(parseStartingPrice("USD 150").cleaned, {
    raw: "USD 150",
    currencyText: "USD",
    value: 150,
  });
});

test("does not invent conversion for unsupported or invalid prices", () => {
  const result = parseStartingPrice("about PKR");

  assert.equal(result.cleaned.currencyText, "about PKR");
  assert.equal(result.cleaned.value, null);
  assert.equal(result.errors[0].code, "invalid_starting_price");
});

test("normalizes badge text", () => {
  assert.equal(normalizeBadgeText("  Top   Rated Seller  ").cleaned, "top rated seller");
  assert.equal(normalizeBadgeText("").cleaned, null);
});

test("parses extra features into stable unique tags", () => {
  const result = parseExtraFeatures(" OpenAI integration; n8n automation | FastAPI backend\n- OpenAI integration ");

  assert.deepEqual(result.cleaned, ["openai integration", "n8n automation", "fastapi backend"]);
  assert.deepEqual(result.errors, []);
});
