import { createDashboardView } from "../components/dashboard/dashboard-components.js";
import { createDashboardModelFromImport } from "../lib/dashboard/dashboard-model.js";
import { importGigFile } from "../lib/import/import-service.js";

const root = document.querySelector("#app");
let currentModel = {};

if (root) {
  renderDashboard(root, currentModel);
}

function renderDashboard(rootElement, model) {
  rootElement.innerHTML = createDashboardView(model);
  bindDashboardInteractions(rootElement);
}

function bindDashboardInteractions(rootElement) {
  const fileInput = rootElement.querySelector("#file-input");
  const nicheInput = rootElement.querySelector("#niche-input");
  const selectedFileLabel = rootElement.querySelector("#selected-file-label");
  const acceptSuggestedButton = rootElement.querySelector("#accept-suggested-niche");
  const filterInput = rootElement.querySelector("#opportunity-filter");
  const sortSelect = rootElement.querySelector("#opportunity-sort");
  const table = rootElement.querySelector("#opportunity-table");

  nicheInput?.addEventListener("input", () => {
    currentModel = applyNicheSelection(currentModel, nicheInput.value, "manual");
  });

  acceptSuggestedButton?.addEventListener("click", () => {
    const suggestedName = acceptSuggestedButton.getAttribute("data-niche") ?? "";
    if (!suggestedName.trim()) return;
    currentModel = applyNicheSelection(currentModel, suggestedName, "suggestion");
    renderDashboard(rootElement, currentModel);
  });

  fileInput?.addEventListener("change", async () => {
    const selectedFile = fileInput.files?.[0];
    if (!selectedFile) {
      if (selectedFileLabel) selectedFileLabel.textContent = "No file selected";
      return;
    }

    const nicheName = nicheInput?.value.trim() ?? "";
    if (selectedFileLabel) selectedFileLabel.textContent = `${selectedFile.name} selected. Processing import...`;

    try {
      const uploadedAt = new Date().toISOString();
      const importResult = importGigFile({
        fileName: selectedFile.name,
        content: await selectedFile.arrayBuffer(),
        niche: nicheName
          ? {
              id: slug(nicheName),
              name: nicheName,
              createdAt: uploadedAt,
            }
          : undefined,
        uploadedAt,
      });

      currentModel = {
        ...createDashboardModelFromImport(importResult),
        uploadStatus: buildUploadStatus(importResult),
      };
      renderDashboard(rootElement, currentModel);
    } catch (error) {
      currentModel = {
        ...currentModel,
        uploadStatus: {
          tone: "error",
          message: error instanceof Error ? error.message : "The selected file could not be imported.",
        },
      };
      renderDashboard(rootElement, currentModel);
    }
  });

  filterInput?.addEventListener("input", () => {
    filterOpportunityRows(table, filterInput.value);
  });

  sortSelect?.addEventListener("change", () => {
    sortOpportunityRows(table, sortSelect.value);
  });
}

function buildUploadStatus(importResult) {
  if (importResult.normalizedGigs.length === 0) {
    return {
      tone: "error",
      message: "Import finished with no valid deduplicated rows available for analytics. Review the cleaning report.",
    };
  }
  if (importResult.nicheDetection.confidence === "low" && !importResult.nicheDetection.manualOverride) {
    return {
      tone: "warning",
      message: "Import completed, but niche detection has low confidence. Confirm or edit the suggested niche before relying on positioning summaries.",
    };
  }
  if (importResult.issues.some((issue) => issue.severity === "error")) {
    return {
      tone: "warning",
      message: "Import completed with valid rows plus row-level errors. Analytics use only valid deduplicated rows.",
    };
  }
  return {
    tone: "success",
    message: "Import completed. Dashboard analytics now reflect the uploaded dataset and selected niche.",
  };
}

function applyNicheSelection(model, nicheName, source) {
  const trimmed = nicheName.trim();
  const nextNiche = trimmed ? { id: slug(trimmed), name: trimmed } : null;
  const suggestedName = model.nicheDetection?.suggestedName ?? trimmed;
  const nicheDetection = model.nicheDetection
    ? {
        ...model.nicheDetection,
        selectedName: trimmed || model.nicheDetection.suggestedName,
        applied: source === "suggestion" || trimmed === model.nicheDetection.suggestedName,
        manualOverride: source === "manual" && trimmed !== model.nicheDetection.suggestedName,
        needsConfirmation: source === "manual" ? false : model.nicheDetection.needsConfirmation,
      }
    : null;

  return {
    ...model,
    niche: nextNiche,
    nicheDetection,
    executiveBrief: model.executiveBrief
      ? {
          ...model.executiveBrief,
          nicheName: trimmed || suggestedName,
        }
      : model.executiveBrief,
  };
}

function filterOpportunityRows(table, query) {
  if (!table) return;
  const normalizedQuery = query.trim().toLowerCase();
  for (const row of table.querySelectorAll("tbody tr")) {
    const keyword = row.getAttribute("data-keyword") ?? "";
    row.hidden = normalizedQuery.length > 0 && !keyword.toLowerCase().includes(normalizedQuery);
  }
}

function sortOpportunityRows(table, sortKey) {
  const body = table?.querySelector("tbody");
  if (!body) return;
  const rows = [...body.querySelectorAll("tr")];
  rows
    .sort((a, b) => Number(b.getAttribute(`data-${sortKey}`) ?? 0) - Number(a.getAttribute(`data-${sortKey}`) ?? 0))
    .forEach((row) => body.append(row));
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "niche";
}
