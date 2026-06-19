import type { ImportResult, SupportedGigField } from "../../types/domain.js";

export function importGigFile(input: {
  fileName: string;
  content: string | ArrayBuffer | Uint8Array;
  niche?: { id: string; name: string; createdAt?: string };
  uploadedAt?: string;
  importRunId?: string;
}): ImportResult;

export const INSTANT_DATA_SCRAPER_COLUMN_MAP: Readonly<Record<string, SupportedGigField>>;

export function parseCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
};
