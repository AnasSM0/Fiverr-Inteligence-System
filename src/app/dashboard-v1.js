import { createDashboardView } from "../components/dashboard/dashboard-components.js";

const root = document.querySelector("#app");
if (root) {
  root.innerHTML = createDashboardView();
  bindDashboardInteractions(root);
}

function bindDashboardInteractions(rootElement) {
  const fileInput = rootElement.querySelector("#file-input");
  const selectedFileLabel = rootElement.querySelector("#selected-file-label");
  const filterInput = rootElement.querySelector("#opportunity-filter");
  const sortSelect = rootElement.querySelector("#opportunity-sort");
  const table = rootElement.querySelector("#opportunity-table");

  fileInput?.addEventListener("change", () => {
    const selectedFile = fileInput.files?.[0];
    if (selectedFileLabel) {
      selectedFileLabel.textContent = selectedFile
        ? `${selectedFile.name} selected. Import processing connects through the MVP import pipeline.`
        : "No file selected";
    }
  });

  filterInput?.addEventListener("input", () => {
    filterOpportunityRows(table, filterInput.value);
  });

  sortSelect?.addEventListener("change", () => {
    sortOpportunityRows(table, sortSelect.value);
  });
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
