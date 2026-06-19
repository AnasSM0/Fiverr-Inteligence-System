import { parseExtraFeatures } from "../cleaning/cleaning-engine.js";
import { tokenizeAnalyticsText } from "../analytics/keyword-analytics.js";

export const UNCATEGORIZED_NICHE_NAME = "Uncategorized Market";

const DETECTION_STOPWORDS = new Set([
  "best",
  "business",
  "custom",
  "expert",
  "fiverr",
  "gig",
  "help",
  "market",
  "professional",
  "provide",
  "seller",
  "service",
  "services",
  "setup",
  "task",
  "tasks",
  "work",
]);

const CATEGORY_DEFINITIONS = Object.freeze([
  {
    name: "n8n Automation",
    phrases: ["n8n automation", "n8n workflow", "n8n workflows", "n8n integration", "n8n integrations", "n8n ai", "n8n chatbot"],
    keywords: ["n8n", "webhook", "webhooks"],
  },
  {
    name: "AI Automation",
    phrases: ["ai automation", "workflow automation", "automate workflow", "automate workflows", "zapier automation", "make automation", "ai workflow", "ai workflows", "business automation"],
    keywords: ["automation", "automate", "zapier", "make", "webhook", "workflows", "workflow"],
    requiredAny: ["ai", "automation", "automate", "zapier", "make", "n8n"],
  },
  {
    name: "AI Agents",
    phrases: ["ai agent", "ai agents", "openai agent", "openai agents", "autonomous agent", "autonomous agents", "langgraph agent", "crewai agent"],
    keywords: ["agent", "agents", "openai", "langgraph", "crewai", "claude", "gemini"],
    requiredAny: ["ai", "agent", "agents", "openai", "langgraph", "crewai"],
  },
  {
    name: "WordPress",
    phrases: ["wordpress website", "wordpress development", "wordpress developer", "wordpress site", "woocommerce store", "elementor website"],
    keywords: ["wordpress", "woocommerce", "elementor", "wp"],
  },
  {
    name: "Shopify",
    phrases: ["shopify store", "shopify website", "shopify development", "shopify developer", "shopify dropshipping"],
    keywords: ["shopify", "dropshipping"],
  },
  {
    name: "React Development",
    phrases: ["react development", "react developer", "react website", "react app", "next js", "nextjs app", "frontend development"],
    keywords: ["react", "nextjs", "frontend", "javascript", "typescript"],
  },
  {
    name: "Python Development",
    phrases: ["python development", "python developer", "python script", "python automation", "fastapi app", "django app"],
    keywords: ["python", "django", "fastapi", "flask"],
  },
  {
    name: "SaaS Development",
    phrases: ["saas development", "saas app", "saas platform", "mvp development", "web app", "dashboard app"],
    keywords: ["saas", "mvp", "dashboard", "subscription"],
  },
  {
    name: "Graphic Design",
    phrases: ["graphic design", "logo design", "brand identity", "social media design", "flyer design", "poster design"],
    keywords: ["logo", "branding", "flyer", "poster", "photoshop", "illustrator"],
  },
  {
    name: "Video Editing",
    phrases: ["video editing", "youtube video", "short form video", "reels editing", "tiktok video", "after effects"],
    keywords: ["video", "editing", "reels", "youtube", "tiktok", "premiere"],
  },
  {
    name: "Chatbots",
    phrases: ["ai chatbot", "chatbot development", "chatbot automation", "whatsapp bot", "telegram bot", "customer support bot"],
    keywords: ["chatbot", "chatbots", "bot", "bots", "whatsapp", "telegram"],
  },
]);

/**
 * @typedef {import("../../types/domain.js").NormalizedGig} NormalizedGig
 */

/**
 * @param {NormalizedGig[]} normalizedGigs
 * @returns {{ suggestedName: string, confidence: "high" | "medium" | "low", score: number, evidenceKeywords: string[], evidencePhrases: string[], alternatives: Array<{ name: string, score: number, evidenceKeywords: string[], evidencePhrases: string[] }>, needsConfirmation: boolean }}
 */
export function detectNicheFromGigs(normalizedGigs) {
  const eligibleGigs = normalizedGigs.filter((gig) => gig.isValid && !gig.isDuplicate);
  const corpus = buildCorpus(eligibleGigs);
  const candidates = CATEGORY_DEFINITIONS
    .map((category) => scoreCategory(category, corpus, eligibleGigs.length))
    .sort((a, b) => b.score - a.score || b.evidencePhrases.length - a.evidencePhrases.length || a.name.localeCompare(b.name));
  const best = candidates[0] ?? emptyCandidate(UNCATEGORIZED_NICHE_NAME);
  const second = candidates[1] ?? emptyCandidate(UNCATEGORIZED_NICHE_NAME);
  const confidence = confidenceFor(best, second, eligibleGigs.length);

  if (confidence === "low") {
    return {
      suggestedName: UNCATEGORIZED_NICHE_NAME,
      confidence,
      score: best.score,
      evidenceKeywords: best.evidenceKeywords.slice(0, 8),
      evidencePhrases: best.evidencePhrases.slice(0, 6),
      alternatives: candidates.filter((candidate) => candidate.score > 0).slice(0, 3),
      needsConfirmation: true,
    };
  }

  return {
    suggestedName: best.name,
    confidence,
    score: best.score,
    evidenceKeywords: best.evidenceKeywords.slice(0, 8),
    evidencePhrases: best.evidencePhrases.slice(0, 6),
    alternatives: candidates.filter((candidate) => candidate.name !== best.name && candidate.score > 0).slice(0, 3),
    needsConfirmation: confidence !== "high",
  };
}

/**
 * @param {NormalizedGig[]} gigs
 */
function buildCorpus(gigs) {
  const keywordCounts = new Map();
  const phraseCounts = new Map();

  for (const gig of gigs) {
    const tokens = tokenizeGig(gig);
    const uniqueTokens = new Set(tokens.filter((token) => !DETECTION_STOPWORDS.has(token)));
    for (const token of uniqueTokens) increment(keywordCounts, token);
    for (const phrase of buildPhrases([...uniqueTokens], 2)) increment(phraseCounts, phrase);
    for (const phrase of buildPhrases([...uniqueTokens], 3)) increment(phraseCounts, phrase);

    const normalizedText = normalizeSearchText(`${gig.gig_title} ${gig.extra_features ?? ""}`);
    for (const phrase of textPhrases(normalizedText, 2)) increment(phraseCounts, phrase);
    for (const phrase of textPhrases(normalizedText, 3)) increment(phraseCounts, phrase);
  }

  return { keywordCounts, phraseCounts };
}

/**
 * @param {NormalizedGig} gig
 */
function tokenizeGig(gig) {
  const titleTokens = tokenizeAnalyticsText(gig.gig_title);
  const featureTokens = parseExtraFeatures(gig.extra_features).cleaned.flatMap((feature) => tokenizeAnalyticsText(feature));
  return [...titleTokens, ...featureTokens].map(normalizeToken).filter(Boolean);
}

/**
 * @param {{ name: string, phrases: string[], keywords: string[], requiredAny?: string[] }} category
 * @param {{ keywordCounts: Map<string, number>, phraseCounts: Map<string, number> }} corpus
 * @param {number} rowCount
 */
function scoreCategory(category, corpus, rowCount) {
  const evidenceKeywords = [];
  const evidencePhrases = [];
  let score = 0;

  for (const phrase of category.phrases) {
    const normalizedPhrase = normalizeSearchText(phrase);
    const count = corpus.phraseCounts.get(normalizedPhrase) ?? 0;
    if (count > 0) {
      evidencePhrases.push(normalizedPhrase);
      score += count * (normalizedPhrase.split(" ").length >= 3 ? 7 : 5);
    }
  }

  for (const keyword of category.keywords) {
    const normalizedKeyword = normalizeToken(keyword);
    const count = corpus.keywordCounts.get(normalizedKeyword) ?? 0;
    if (count > 0) {
      evidenceKeywords.push(normalizedKeyword);
      score += count * 2;
    }
  }

  if (category.requiredAny?.length && !category.requiredAny.some((keyword) => corpus.keywordCounts.has(normalizeToken(keyword)))) {
    score = Math.floor(score * 0.45);
  }

  if (rowCount <= 1 && evidencePhrases.length === 0) score = Math.floor(score * 0.7);

  return {
    name: category.name,
    score,
    evidenceKeywords: [...new Set(evidenceKeywords)],
    evidencePhrases: [...new Set(evidencePhrases)],
  };
}

/**
 * @param {{ score: number, evidencePhrases: string[] }} best
 * @param {{ score: number }} second
 * @param {number} rowCount
 * @returns {"high" | "medium" | "low"}
 */
function confidenceFor(best, second, rowCount) {
  if (rowCount === 0 || best.score < 5) return "low";
  const margin = best.score - second.score;
  if (best.score >= 14 && margin >= 4 && best.evidencePhrases.length > 0) return "high";
  if (best.score >= 8 && margin >= 2) return "medium";
  return "low";
}

/**
 * @param {string[]} tokens
 * @param {2 | 3} size
 */
function buildPhrases(tokens, size) {
  const phrases = [];
  for (let index = 0; index <= tokens.length - size; index += 1) {
    phrases.push(tokens.slice(index, index + size).join(" "));
  }
  return phrases;
}

/**
 * @param {string} text
 * @param {2 | 3} size
 */
function textPhrases(text, size) {
  const tokens = text.split(" ").filter((token) => token && !DETECTION_STOPWORDS.has(token));
  return buildPhrases(tokens, size);
}

/**
 * @param {Map<string, number>} counts
 * @param {string} key
 */
function increment(counts, key) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/**
 * @param {string} name
 */
function emptyCandidate(name) {
  return { name, score: 0, evidenceKeywords: [], evidencePhrases: [] };
}

/**
 * @param {unknown} value
 */
function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .match(/[a-z0-9]+(?:[.+#-][a-z0-9]+)*/g)?.map(normalizeToken).filter(Boolean).join(" ") ?? "";
}

/**
 * @param {unknown} value
 */
function normalizeToken(value) {
  const token = String(value ?? "").trim().toLowerCase();
  if (token === "next.js" || token === "next-js") return "nextjs";
  if (token === "node.js" || token === "node-js") return "nodejs";
  return token;
}
