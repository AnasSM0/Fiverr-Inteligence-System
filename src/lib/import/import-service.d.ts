import type { ImportResult } from "../../types/domain.js";

export function importGigFile(input: {
  fileName: string;
  content: string | Uint8Array;
  niche: { id: string; name: string; createdAt?: string };
  uploadedAt?: string;
  importRunId?: string;
}): ImportResult;

export function parseCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
};
