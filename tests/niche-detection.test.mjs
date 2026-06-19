import test from "node:test";
import assert from "node:assert/strict";

import { createDashboardView } from "../src/components/dashboard/dashboard-components.js";
import { createDashboardModelFromImport } from "../src/lib/dashboard/dashboard-model.js";
import { importGigFile } from "../src/lib/import/import-service.js";

const uploadedAt = "2026-06-18T09:01:00.000Z";

const aiAutomationCsv = `gig_url,gig_title,starting_price,extra_features
https://www.fiverr.com/a/n8n-ai-automation,I will build n8n automation and AI workflow,$120,"n8n automation, AI automation, workflow automation"
https://www.fiverr.com/b/zapier-ai-automation,I will create AI automation with Zapier workflows,$80,"Zapier automation, AI workflows"
https://www.fiverr.com/c/make-automation,I will setup Make automation for AI workflow,$90,"Make automation, business automation"
`;

test("detects high-confidence automation niche when no manual niche is provided", () => {
  const result = importGigFile({
    fileName: "ai-automation.csv",
    content: aiAutomationCsv,
    uploadedAt,
    importRunId: "import_auto_niche_high",
  });

  assert.equal(result.nicheDetection.applied, true);
  assert.equal(result.nicheDetection.manualOverride, false);
  assert.equal(result.nicheDetection.confidence, "high");
  assert.match(result.niche.name, /Automation/);
  assert.ok(["AI Automation", "n8n Automation"].includes(result.nicheDetection.suggestedName));
  assert.ok(result.nicheDetection.evidenceKeywords.length > 0);
  assert.ok(result.nicheDetection.evidencePhrases.length > 0);
  assert.ok(result.normalizedGigs.every((gig) => gig.nicheId === result.niche.id));
});

test("falls back to Uncategorized Market with low confidence", () => {
  const result = importGigFile({
    fileName: "unclear.csv",
    content: `gig_url,gig_title,starting_price,extra_features
https://www.fiverr.com/a/anything,I will help with simple tasks,$20,"general support, admin help"
https://www.fiverr.com/b/basic,I will provide professional service,$30,"general work, flexible task"
`,
    uploadedAt,
    importRunId: "import_auto_niche_low",
  });

  assert.equal(result.niche.name, "Uncategorized Market");
  assert.equal(result.nicheDetection.suggestedName, "Uncategorized Market");
  assert.equal(result.nicheDetection.confidence, "low");
  assert.equal(result.nicheDetection.needsConfirmation, true);
});

test("keeps manual niche as override while preserving deterministic suggestion", () => {
  const result = importGigFile({
    fileName: "manual-override.csv",
    content: aiAutomationCsv,
    niche: {
      id: "custom_market",
      name: "Custom Research Market",
      createdAt: uploadedAt,
    },
    uploadedAt,
    importRunId: "import_auto_niche_manual",
  });

  assert.equal(result.niche.name, "Custom Research Market");
  assert.equal(result.importRun.nicheId, "custom_market");
  assert.equal(result.nicheDetection.applied, false);
  assert.equal(result.nicheDetection.manualOverride, true);
  assert.match(result.nicheDetection.suggestedName, /Automation/);
  assert.equal(result.nicheDetection.selectedName, "Custom Research Market");
});

test("dashboard renders suggested niche confidence and evidence", () => {
  const result = importGigFile({
    fileName: "ai-automation.csv",
    content: aiAutomationCsv,
    uploadedAt,
    importRunId: "import_auto_niche_dashboard",
  });
  const model = createDashboardModelFromImport(result);
  const html = createDashboardView(model);

  assert.match(html, /Suggested niche/);
  assert.match(html, /Confidence level/);
  assert.match(html, /High confidence|Medium confidence|Low confidence/);
  assert.match(html, /automation|workflow|n8n/i);
});
