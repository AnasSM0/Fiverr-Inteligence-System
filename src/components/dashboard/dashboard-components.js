const EMPTY_DASHBOARD_MODEL = Object.freeze({
  niche: null,
  importSummary: null,
  marketSnapshot: null,
  keywords: [],
  keywordOpportunities: [],
  pricing: null,
  competitors: [],
  opportunities: [],
  insights: [],
  warnings: [],
});

/**
 * @param {Partial<typeof EMPTY_DASHBOARD_MODEL>} model
 */
export function createDashboardView(model = {}) {
  const data = { ...EMPTY_DASHBOARD_MODEL, ...model };
  return `
    <main class="dashboard-shell">
      ${createHero(data)}
      ${createImportOverview(data)}
      ${createMarketSnapshot(data)}
      ${createKeywordIntelligence(data)}
      ${createPricingIntelligence(data)}
      ${createCompetitorIntelligence(data)}
      ${createOpportunityMatrix(data)}
      ${createInsightsPanel(data)}
    </main>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createHero(data) {
  const nicheName = data.niche?.name ?? "No niche assigned";
  const nicheLabel = data.niche ? "Active niche" : "Ready for import";
  return `
    <section class="hero-panel" aria-labelledby="dashboard-title">
      <div>
        <p class="eyebrow">${escapeHtml(nicheLabel)}</p>
        <h1 id="dashboard-title">Fiverr Positioning Intelligence</h1>
        <p class="hero-copy">
          Analyze imported gig data, inspect competitor positioning, and surface deterministic opportunities without live Fiverr access.
        </p>
      </div>
      <div class="niche-pill" aria-label="Selected niche">
        <span class="pulse-dot"></span>
        <span>${escapeHtml(nicheName)}</span>
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createImportOverview(data) {
  const summary = data.importSummary;
  return `
    <section class="dashboard-section section-grid import-grid" aria-labelledby="import-overview-title">
      <div class="panel upload-panel">
        ${createSectionHeader("Import Overview", "Upload a user-provided CSV or XLSX and assign the niche before analytics run.", "import-overview-title")}
        <label class="field-label" for="niche-input">Niche</label>
        <input id="niche-input" class="text-input" name="niche" type="text" placeholder="AI Agents, Shopify, WordPress..." value="${escapeAttribute(data.niche?.name ?? "")}" />
        <label class="upload-dropzone" for="file-input">
          <input id="file-input" name="file" type="file" accept=".csv,.xlsx" />
          <span class="upload-kicker">CSV/XLSX import</span>
          <strong>Choose a supported Fiverr dataset</strong>
          <span id="selected-file-label">No file selected</span>
        </label>
      </div>
      <div class="panel summary-panel">
        ${createSectionHeader("Import Summary", summary ? "Latest deterministic import health." : "Waiting for an imported dataset.", "import-summary-title")}
        <div class="metric-grid compact">
          ${createMetricCard("Total gigs", summary?.totalRows, "Rows in source file")}
          ${createMetricCard("Valid rows", summary?.validRows, "Available for analytics")}
          ${createMetricCard("Invalid rows", summary?.invalidRows, "Needs review")}
          ${createMetricCard("Duplicates", summary?.duplicateRows, "Excluded from aggregates")}
        </div>
        <div class="summary-footer">
          <span>Last import</span>
          <strong>${summary?.lastImportedAt ? escapeHtml(summary.lastImportedAt) : "No import yet"}</strong>
        </div>
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createMarketSnapshot(data) {
  const snapshot = data.marketSnapshot;
  return `
    <section class="dashboard-section" aria-labelledby="market-snapshot-title">
      ${createSectionHeader("Market Snapshot", "Fast read on the imported niche dataset.", "market-snapshot-title")}
      <div class="metric-grid">
        ${createMetricCard("Gigs analyzed", snapshot?.totalGigs, "Valid deduplicated rows")}
        ${createMetricCard("Average price", snapshot?.averagePrice, "Parsed starting price", "currency")}
        ${createMetricCard("Median price", snapshot?.medianPrice, "Dataset midpoint", "currency")}
        ${createMetricCard("Average reviews", snapshot?.averageReviews, "Imported review counts")}
      </div>
      <div class="two-column">
        <div class="panel">
          <h3>Top seller badge distribution</h3>
          ${createBadgeList(snapshot?.badgeDistribution ?? [])}
        </div>
        <div class="panel">
          <h3>Top keywords</h3>
          ${createKeywordChips(data.keywords.slice(0, 8))}
        </div>
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createKeywordIntelligence(data) {
  return `
    <section class="dashboard-section" aria-labelledby="keyword-intelligence-title">
      ${createSectionHeader("Keyword Intelligence", "Frequency and opportunity signals from gig titles and extra features.", "keyword-intelligence-title")}
      <div class="panel">
        ${data.keywords.length > 0 ? `
          <div class="keyword-strip">${createKeywordChips(data.keywords.slice(0, 12))}</div>
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Frequency</th>
                  <th>Opportunity</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                ${data.keywords.map(createKeywordRow).join("")}
              </tbody>
            </table>
          </div>
        ` : createEmptyState("No keyword report yet", "Import a valid dataset to see deterministic keyword frequency and opportunity indicators.")}
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createPricingIntelligence(data) {
  const pricing = data.pricing;
  return `
    <section class="dashboard-section" aria-labelledby="pricing-intelligence-title">
      ${createSectionHeader("Pricing Intelligence", "Parsed starting prices summarized without currency conversion.", "pricing-intelligence-title")}
      <div class="panel pricing-panel">
        ${pricing ? `
          <div class="metric-grid compact">
            ${createMetricCard("Median price", pricing.medianPrice, "Niche midpoint", "currency")}
            ${createMetricCard("Low band", pricing.lowBand, "At or below p25", "currency")}
            ${createMetricCard("Mid band", pricing.midBand, "Between p25 and p75", "currency")}
            ${createMetricCard("High band", pricing.highBand, "Above p75", "currency")}
          </div>
          <div class="band-stack" aria-label="Price band distribution">
            ${createBand("Low", pricing.bandShares?.low ?? 0)}
            ${createBand("Mid", pricing.bandShares?.mid ?? 0)}
            ${createBand("High", pricing.bandShares?.high ?? 0)}
          </div>
        ` : createEmptyState("No pricing report yet", "Pricing summaries appear after parsed numeric starting prices are available.")}
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createCompetitorIntelligence(data) {
  return `
    <section class="dashboard-section" aria-labelledby="competitor-intelligence-title">
      ${createSectionHeader("Competitor Intelligence", "Compare imported gigs by reviews, ratings, badges, price, and positioning.", "competitor-intelligence-title")}
      <div class="competitor-list">
        ${data.competitors.length > 0 ? data.competitors.map(createCompetitorCard).join("") : createEmptyState("No competitor comparison yet", "Valid deduplicated gigs will appear here after import and analytics processing.")}
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createOpportunityMatrix(data) {
  return `
    <section class="dashboard-section opportunity-section" aria-labelledby="opportunity-matrix-title">
      <div class="matrix-header">
        ${createSectionHeader("Opportunity Matrix", "Primary decision surface for directional, deterministic opportunity scoring.", "opportunity-matrix-title")}
        <div class="matrix-controls" aria-label="Opportunity matrix controls">
          <input id="opportunity-filter" class="text-input compact-input" type="search" placeholder="Filter keyword" />
          <select id="opportunity-sort" class="select-input">
            <option value="opportunity_score">Sort by opportunity</option>
            <option value="competition_score">Sort by competition</option>
            <option value="price_score">Sort by monetization</option>
            <option value="differentiation_score">Sort by differentiation</option>
          </select>
        </div>
      </div>
      <div class="panel matrix-panel">
        ${data.opportunities.length > 0 ? `
          <div class="responsive-table">
            <table class="matrix-table" id="opportunity-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Frequency</th>
                  <th>Opportunity</th>
                  <th>Competition</th>
                  <th>Monetization</th>
                  <th>Differentiation</th>
                  <th>Evidence</th>
                  <th>Caution</th>
                </tr>
              </thead>
              <tbody>
                ${data.opportunities.map(createOpportunityRow).join("")}
              </tbody>
            </table>
          </div>
        ` : createEmptyState("No opportunity matrix yet", "Import and analyze a niche dataset to reveal directional opportunities with evidence and cautions.")}
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createInsightsPanel(data) {
  return `
    <section class="dashboard-section" aria-labelledby="insights-panel-title">
      ${createSectionHeader("Insights Panel", "Reserved for future OpenRouter narration. MVP shows deterministic insights only.", "insights-panel-title")}
      <div class="panel insights-panel">
        ${data.insights.length > 0 ? data.insights.map((insight) => `<div class="insight-item">${escapeHtml(insight)}</div>`).join("") : createEmptyState("No deterministic insights yet", "Insights will summarize visible keyword, pricing, competitor, and opportunity outputs after analysis.")}
      </div>
    </section>
  `;
}

function createSectionHeader(title, description, id) {
  return `
    <div class="section-header">
      <div>
        <p class="eyebrow">Dashboard report</p>
        <h2 id="${escapeAttribute(id)}">${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </div>
    </div>
  `;
}

function createMetricCard(label, value, helper, mode = "number") {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${formatMetric(value, mode)}</strong>
      <small>${escapeHtml(helper)}</small>
    </article>
  `;
}

function createBadgeList(items) {
  if (items.length === 0) return createEmptyState("No badge data", "Missing badge fields remain unknown until imported.");
  return `<div class="badge-list">${items.map((item) => `
    <div class="badge-row">
      <span class="status-badge">${escapeHtml(item.label ?? "unknown")}</span>
      <strong>${formatMetric(item.count)}</strong>
    </div>
  `).join("")}</div>`;
}

function createKeywordChips(keywords) {
  if (keywords.length === 0) return createEmptyState("No keywords yet", "Keyword chips appear after deterministic title and feature analysis.");
  return keywords.map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword.keyword)} <strong>${formatMetric(keyword.frequency)}</strong></span>`).join("");
}

function createKeywordRow(keyword) {
  return `
    <tr>
      <td><span class="keyword-cell">${escapeHtml(keyword.keyword)}</span></td>
      <td>${formatMetric(keyword.frequency)}</td>
      <td>${createScorePill(keyword.opportunityScore ?? null)}</td>
      <td>${escapeHtml(firstText(keyword.evidence))}</td>
    </tr>
  `;
}

function createBand(label, share) {
  return `
    <div class="band-row">
      <span>${escapeHtml(label)}</span>
      <div class="band-track"><span style="width: ${clampPercent(share)}%"></span></div>
      <strong>${formatMetric(share)}%</strong>
    </div>
  `;
}

function createCompetitorCard(competitor) {
  return `
    <article class="competitor-card">
      <div>
        <span class="status-badge">${escapeHtml(competitor.sellerBadgeText ?? "badge unknown")}</span>
        <h3>${escapeHtml(competitor.sellerName ?? "Unknown seller")}</h3>
        <p>${escapeHtml(competitor.gigTitle ?? "Untitled gig")}</p>
      </div>
      <div class="competitor-metrics">
        <span><strong>${formatMetric(competitor.reviewCount)}</strong> reviews</span>
        <span><strong>${formatMetric(competitor.rating)}</strong> rating</span>
        <span><strong>${formatMetric(competitor.price, "currency")}</strong> price</span>
        <span>${createScorePill(competitor.competitorScore ?? null)}</span>
      </div>
    </article>
  `;
}

function createOpportunityRow(opportunity) {
  return `
    <tr data-keyword="${escapeAttribute(opportunity.keyword)}" data-opportunity_score="${numberAttribute(opportunity.opportunity_score)}" data-competition_score="${numberAttribute(opportunity.competition_score)}" data-price_score="${numberAttribute(opportunity.price_score)}" data-differentiation_score="${numberAttribute(opportunity.differentiation_score)}">
      <td><span class="keyword-cell">${escapeHtml(opportunity.keyword)}</span></td>
      <td>${formatMetric(opportunity.frequency)}</td>
      <td>${createScoreBar(opportunity.opportunity_score)}</td>
      <td>${createScorePill(opportunity.competition_score)}</td>
      <td>${createScorePill(opportunity.price_score)}</td>
      <td>${createScorePill(opportunity.differentiation_score)}</td>
      <td>${escapeHtml(firstText(opportunity.evidence))}</td>
      <td>${escapeHtml(firstText(opportunity.caution))}</td>
    </tr>
  `;
}

function createScoreBar(value) {
  const score = typeof value === "number" ? value : 0;
  return `
    <div class="score-bar">
      <strong>${formatMetric(value)}</strong>
      <span><i style="width: ${clampPercent(score)}%"></i></span>
    </div>
  `;
}

function createScorePill(value) {
  if (typeof value !== "number") return `<span class="score-pill muted">unknown</span>`;
  const tone = value >= 75 ? "strong" : value >= 45 ? "medium" : "soft";
  return `<span class="score-pill ${tone}">${formatMetric(value)}</span>`;
}

function createEmptyState(title, detail) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
    </div>
  `;
}

function formatMetric(value, mode = "number") {
  if (value === null || value === undefined || value === "") return "unknown";
  if (mode === "currency" && typeof value === "number") return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return escapeHtml(String(value));
}

function firstText(values) {
  if (Array.isArray(values) && values.length > 0) return values[0];
  if (typeof values === "string" && values.length > 0) return values;
  return "No evidence available yet";
}

function clampPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function numberAttribute(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "0";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
