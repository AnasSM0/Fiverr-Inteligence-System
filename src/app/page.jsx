"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createDashboardView } from "../components/dashboard/dashboard-components.js";
import { createDashboardModelFromImport } from "../lib/dashboard/dashboard-model.js";
import { importGigFile } from "../lib/import/import-service.js";

export default function DashboardPage() {
  const rootRef = useRef(null);
  const [nicheName, setNicheName] = useState("");
  const [model, setModel] = useState({});

  const html = useMemo(
    () =>
      createDashboardView({
        ...model,
        niche: model.niche ?? (nicheName.trim() ? { id: slug(nicheName), name: nicheName.trim() } : null),
      }),
    [model, nicheName],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const nicheInput = root.querySelector("#niche-input");
    const fileInput = root.querySelector("#file-input");
    const acceptSuggestedButton = root.querySelector("#accept-suggested-niche");
    const filterInput = root.querySelector("#opportunity-filter");
    const sortSelect = root.querySelector("#opportunity-sort");
    const table = root.querySelector("#opportunity-table");

    if (nicheInput) {
      nicheInput.value = nicheName;
      nicheInput.addEventListener("input", handleNicheInput);
    }
    fileInput?.addEventListener("change", handleFileChange);
    acceptSuggestedButton?.addEventListener("click", handleAcceptSuggestedNiche);
    filterInput?.addEventListener("input", handleFilterInput);
    sortSelect?.addEventListener("change", handleSortChange);

    function handleNicheInput(event) {
      const nextName = event.target.value;
      setNicheName(nextName);
      setModel((previousModel) => applyNicheSelection(previousModel, nextName, "manual"));
    }

    function handleAcceptSuggestedNiche(event) {
      const suggestedName = event.currentTarget.getAttribute("data-niche") ?? "";
      if (!suggestedName.trim()) return;
      setNicheName(suggestedName);
      setModel((previousModel) => applyNicheSelection(previousModel, suggestedName, "suggestion"));
    }

    async function handleFileChange(event) {
      const selectedFile = event.target.files?.[0];
      if (!selectedFile) return;

      const activeNiche = nicheInput?.value?.trim() ?? nicheName.trim();
      setModel((previousModel) => ({
        ...previousModel,
        uploadStatus: { tone: "warning", message: `${selectedFile.name} selected. Processing import...` },
      }));

      try {
        const uploadedAt = new Date().toISOString();
        const importResult = importGigFile({
          fileName: selectedFile.name,
          content: await selectedFile.arrayBuffer(),
          niche: activeNiche
            ? {
                id: slug(activeNiche),
                name: activeNiche,
                createdAt: uploadedAt,
              }
            : undefined,
          uploadedAt,
        });

        setNicheName(importResult.niche.name);
        setModel({
          ...createDashboardModelFromImport(importResult),
          uploadStatus: buildUploadStatus(importResult),
        });
      } catch (error) {
        setModel((previousModel) => ({
          ...previousModel,
          uploadStatus: {
            tone: "error",
            message: error instanceof Error ? error.message : "The selected file could not be imported.",
          },
        }));
      }
    }

    function handleFilterInput(event) {
      filterOpportunityRows(table, event.target.value);
    }

    function handleSortChange(event) {
      sortOpportunityRows(table, event.target.value);
    }

    return () => {
      nicheInput?.removeEventListener("input", handleNicheInput);
      fileInput?.removeEventListener("change", handleFileChange);
      acceptSuggestedButton?.removeEventListener("click", handleAcceptSuggestedNiche);
      filterInput?.removeEventListener("input", handleFilterInput);
      sortSelect?.removeEventListener("change", handleSortChange);
    };
  }, [html, nicheName]);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: html }} />;
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
  return (
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "niche"
  );
}
