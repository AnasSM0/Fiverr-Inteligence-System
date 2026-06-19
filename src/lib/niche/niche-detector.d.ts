import type { NormalizedGig } from "../../types/domain.js";

export const UNCATEGORIZED_NICHE_NAME: "Uncategorized Market";

export interface NicheDetectionResult {
  suggestedName: string;
  confidence: "high" | "medium" | "low";
  score: number;
  evidenceKeywords: string[];
  evidencePhrases: string[];
  alternatives: Array<{
    name: string;
    score: number;
    evidenceKeywords: string[];
    evidencePhrases: string[];
  }>;
  needsConfirmation: boolean;
}

export function detectNicheFromGigs(normalizedGigs: NormalizedGig[]): NicheDetectionResult;
