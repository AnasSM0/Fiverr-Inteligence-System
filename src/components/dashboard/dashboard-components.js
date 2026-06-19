const EMPTY_DASHBOARD_MODEL = Object.freeze({
  niche: null,
  importSummary: null,
  cleaningReport: null,
  nicheDetection: null,
  importSuccess: null,
  executiveBrief: null,
  marketSnapshot: null,
  marketHealth: null,
  keywords: [],
  keywordIntelligence: null,
  keywordOpportunities: [],
  pricing: null,
  competitors: [],
  opportunities: [],
  opportunityHighlights: [],
  positioningSuggestions: [],
  profileInsights: [],
  insights: [],
  warnings: [],
  uploadStatus: null,
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
      ${createExecutiveBrief(data)}
      ${createOpportunityHighlights(data)}
      ${createMarketHealth(data)}
      ${createKeywordIntelligence(data)}
      ${createPricingIntelligence(data)}
      ${createCompetitorIntelligence(data)}
      ${createOpportunityMatrix(data)}
      ${createStrategySections(data)}
      ${createCleaningReport(data)}
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
        <h1 id="dashboard-title">Fiverr Market Intelligence</h1>
        <p class="hero-copy">
          Upload exported gig data to read market crowding, keyword saturation, competitor signals, and positioning opportunities from deterministic analytics.
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
        ${createSectionHeader("Import Dataset", "Upload a user-provided CSV or XLSX. The app can suggest a niche automatically, and the field remains editable.", "import-overview-title")}
        <label class="field-label" for="niche-input">Niche override</label>
        <input id="niche-input" class="text-input" name="niche" type="text" placeholder="Optional: AI Agents, Shopify, WordPress..." value="${escapeAttribute(data.niche?.name ?? "")}" />
        <label class="upload-dropzone" for="file-input">
          <input id="file-input" name="file" type="file" accept=".csv,.xlsx" />
          <span class="upload-kicker">CSV/XLSX import</span>
          <strong>Choose a supported Fiverr dataset</strong>
          <span id="selected-file-label">No file selected</span>
        </label>
        ${data.uploadStatus ? createCallout(data.uploadStatus.tone, data.uploadStatus.message) : ""}
        ${createNicheDetectionPanel(data.nicheDetection)}
      </div>
      <div class="panel summary-panel">
        ${createSectionHeader("Import Summary", summary ? "Latest deterministic import health." : "Waiting for an imported dataset.", "import-summary-title")}
        <div class="metric-grid compact">
          ${createMetricCard("Total gigs", summary?.totalRows, "Rows in source file")}
          ${createMetricCard("Valid rows", summary?.validRows, "Available for analytics")}
          ${createMetricCard("Invalid rows", summary?.invalidRows, "Needs review")}
          ${createMetricCard("Duplicates", summary?.duplicateRows, "Excluded from aggregates")}
          ${createMetricCard("Warnings", summary?.warnings, "Data quality notices")}
          ${createMetricCard("Mapped columns", summary?.columnMapping?.mappings?.length, "Auto-detected headers")}
        </div>
        <div class="summary-footer">
          <span>${summary?.fileName ? escapeHtml(summary.fileName) : "Last import"}</span>
          <strong>${summary?.lastImportedAt ? escapeHtml(summary.lastImportedAt) : "No import yet"}</strong>
        </div>
        ${summary?.importId ? `<div class="summary-footer compact-footer"><span>Import ID</span><strong>${escapeHtml(summary.importId)}</strong></div>` : ""}
      </div>
    </section>
    ${createImportSuccess(data.importSuccess)}
  `;
}

function createNicheDetectionPanel(detection) {
  if (!detection) {
    return `
      <div class="niche-detection-panel empty">
        <div>
          <span class="status-badge">Niche detection</span>
          <strong>Upload first, niche optional</strong>
          <p>The app will suggest a niche from cleaned gig titles and extra features.</p>
        </div>
      </div>
    `;
  }

  const evidence = [...(detection.evidencePhrases ?? []), ...(detection.evidenceKeywords ?? [])].slice(0, 8);
  const showAccept = detection.manualOverride && detection.suggestedName !== detection.selectedName;
  return `
    <div class="niche-detection-panel ${escapeAttribute(detection.confidence)}">
      <div class="niche-detection-header">
        <div>
          <span class="status-badge accent">Suggested niche</span>
          <strong>${escapeHtml(detection.suggestedName)}</strong>
        </div>
        ${createDetectionConfidenceBadge(detection.confidence)}
      </div>
      <div class="niche-detection-grid">
        <div>
          <span>Selected niche</span>
          <strong>${escapeHtml(detection.selectedName ?? detection.suggestedName)}</strong>
        </div>
        <div>
          <span>Confidence level</span>
          <strong>${escapeHtml(detection.confidence)}</strong>
        </div>
      </div>
      ${evidence.length > 0 ? `<div class="evidence-list">${evidence.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : `<p>No strong evidence keywords were found.</p>`}
      ${detection.needsConfirmation ? createCallout("warning", "Low or medium confidence: confirm the suggested niche or edit the niche override field.") : ""}
      ${showAccept ? `<button id="accept-suggested-niche" class="secondary-button" type="button" data-niche="${escapeAttribute(detection.suggestedName)}">Accept suggested niche</button>` : ""}
    </div>
  `;
}
function createImportSuccess(success) {
  if (!success) return "";
  return `
    <section class="dashboard-section" aria-labelledby="import-success-title">
      <div class="success-strip">
        <div>
          <p class="eyebrow">Import success</p>
          <h2 id="import-success-title">${formatMetric(success.gigsAnalyzed)} gigs analyzed from the uploaded file</h2>
          <p>${escapeHtml(success.marketSummary)}</p>
        </div>
        <div class="success-stats">
          ${createMiniStat("Opportunities", success.opportunitiesFound)}
          ${createMiniStat("Strongest", success.strongestOpportunity ?? "unknown")}
          ${createMiniStat("Top competitor", success.topCompetitor ?? "unknown")}
          ${createMiniStat("Median", success.medianPrice, "currency")}
        </div>
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createExecutiveBrief(data) {
  const brief = data.executiveBrief;
  return `
    <section class="dashboard-section" aria-labelledby="executive-brief-title">
      ${createSectionHeader("Executive Market Brief", "A 30-second read on niche crowding, price, keyword pressure, and first positioning move.", "executive-brief-title")}
      ${brief ? `
        <div class="brief-grid">
          ${createSignalCard("Niche", brief.nicheName, "Imported market")}
          ${createSignalCard("Gigs analyzed", brief.totalGigs, "Valid deduplicated rows")}
          ${createSignalCard("Competition", brief.competitionLevel, "Directional dataset read")}
          ${createSignalCard("Median price", brief.medianPrice, "Parsed starting price", "currency")}
          ${createSignalCard("Average reviews", brief.averageReviews, "Imported review counts")}
          ${createSignalCard("Top keyword", brief.topKeyword ?? "unknown", "Most frequent term")}
          ${createSignalCard("Best opportunity", brief.highestOpportunityKeyword ?? "unknown", "Highest matrix score")}
          ${createSignalCard("Dominant seller type", brief.dominantSellerType ?? "unknown", "Badge distribution")}
        </div>
        <div class="brief-recommendation">
          <span class="status-badge accent">Positioning recommendation</span>
          <strong>${escapeHtml(brief.positioningRecommendation)}</strong>
        </div>
      ` : createEmptyState("No executive brief yet", "Upload a valid CSV or XLSX file to generate the market brief from real imported rows.")}
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createOpportunityHighlights(data) {
  return `
    <section class="dashboard-section" aria-labelledby="opportunity-highlights-title">
      ${createSectionHeader("Opportunity Highlights", "Top directional opportunities with score components, confidence, evidence, and cautions.", "opportunity-highlights-title")}
      ${data.opportunityHighlights.length > 0 ? `
        <div class="opportunity-highlight-grid">
          ${data.opportunityHighlights.map(createOpportunityHighlightCard).join("")}
        </div>
      ` : createEmptyState("No opportunity highlights yet", "After import, the highest scoring keywords become the primary decision surface for positioning.")}
    </section>
  `;
}

function createOpportunityHighlightCard(opportunity) {
  return `
    <article class="opportunity-card ${scoreTone(opportunity.opportunityScore)}">
      <div class="opportunity-card-top">
        <div>
          <span class="status-badge priority">${escapeHtml(opportunity.priority)}</span>
          <h3>${escapeHtml(opportunity.keyword)}</h3>
        </div>
        ${createScoreDial(opportunity.opportunityScore)}
      </div>
      <p>${escapeHtml(opportunity.explanation)}</p>
      <div class="score-breakdown">
        ${createScoreMini("Competition", opportunity.competitionScore)}
        ${createScoreMini("Monetization", opportunity.monetizationScore)}
        ${createScoreMini("Differentiation", opportunity.differentiationScore)}
      </div>
      <div class="opportunity-card-footer">
        ${createConfidenceBadge(opportunity.confidence)}
        <span>${formatMetric(opportunity.frequency)} matching gig(s)</span>
      </div>
      ${opportunity.caution ? `<small class="caution-line">${escapeHtml(opportunity.caution)}</small>` : ""}
    </article>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createMarketHealth(data) {
  const health = data.marketHealth;
  return `
    <section class="dashboard-section" aria-labelledby="market-health-title">
      ${createSectionHeader("Market Health", "Visual summaries for price, reviews, badges, ratings, keyword saturation, and dataset quality.", "market-health-title")}
      ${health ? `
        <div class="health-grid">
          ${createHealthPanel("Pricing", [
            ["Average", formatMetric(health.averagePrice, "currency")],
            ["Median", formatMetric(health.medianPrice, "currency")],
            ["Priced rows", `${formatMetric(health.pricedGigShare)}%`],
          ])}
          <div class="panel visual-panel">
            <h3>Badge Distribution</h3>
            ${createDistributionBars(health.badgeDistribution.map((item) => ({ label: item.label ?? "unknown", count: item.count, share: item.shareOfNiche })))}
          </div>
          <div class="panel visual-panel">
            <h3>Rating Distribution</h3>
            ${createDistributionBars(health.ratingDistribution)}
          </div>
          <div class="panel visual-panel">
            <h3>Keyword Saturation</h3>
            ${createDistributionBars(health.keywordSaturation.map((item) => ({ label: item.keyword, count: item.frequency, share: item.share })))}
          </div>
          <div class="panel visual-panel dataset-quality-panel">
            <h3>Dataset Quality</h3>
            <strong>${escapeHtml(health.datasetQuality.label)}</strong>
            <p>${escapeHtml(health.datasetQuality.evidence)}</p>
            ${createScoreBar(health.datasetQuality.validShare)}
          </div>
          ${createHealthPanel("Review Load", [
            ["Average reviews", formatMetric(health.averageReviews)],
            ["Keyword concentration", `${formatMetric(health.keywordConcentrationScore)}%`],
            ["Warnings", formatMetric(health.datasetQuality.warningCount)],
          ])}
        </div>
      ` : createEmptyState("No market health yet", "Import valid rows to see market health summaries derived from the uploaded dataset.")}
    </section>
  `;
}

function createHealthPanel(title, rows) {
  return `
    <div class="panel visual-panel">
      <h3>${escapeHtml(title)}</h3>
      <div class="health-stat-list">
        ${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
    </div>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createKeywordIntelligence(data) {
  const intelligence = data.keywordIntelligence;
  return `
    <section class="dashboard-section" aria-labelledby="keyword-intelligence-title">
      ${createSectionHeader("Keyword Intelligence", "Dominant keywords, emerging opportunities, underrepresented technologies, and concentration signals.", "keyword-intelligence-title")}
      ${intelligence ? `
        <div class="keyword-intelligence-grid">
          <div class="panel keyword-panel wide">
            <h3>Dominant Keywords</h3>
            <div class="keyword-strip">${createKeywordChips(intelligence.dominantKeywords)}</div>
            <div class="responsive-table compact-table">
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
          </div>
          <div class="panel keyword-panel">
            <h3>Emerging Opportunities</h3>
            ${createOpportunityChipList(intelligence.emergingOpportunities)}
          </div>
          <div class="panel keyword-panel">
            <h3>Underrepresented Technologies</h3>
            ${createTechnologyList(intelligence.underrepresentedTechnologies)}
          </div>
          <div class="panel keyword-panel">
            <h3>Least Saturated Valuable Terms</h3>
            ${createOpportunityChipList(intelligence.leastSaturatedValuableKeywords)}
          </div>
        </div>
      ` : createEmptyState("No keyword report yet", "Import a valid dataset to see deterministic keyword frequency and opportunity indicators.")}
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
      ${createSectionHeader("Competitor Intelligence", "Compare sellers by proof, ratings, badges, price posture, and deterministic stand-out reasons.", "competitor-intelligence-title")}
      <div class="competitor-list">
        ${data.competitors.length > 0 ? data.competitors.slice(0, 8).map(createCompetitorCard).join("") : createEmptyState("No competitor comparison yet", "Valid deduplicated gigs will appear here after import and analytics processing.")}
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
        ${createSectionHeader("Opportunity Matrix", "Sortable score table for directional, deterministic opportunity scoring.", "opportunity-matrix-title")}
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
                  <th>Priority</th>
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
function createStrategySections(data) {
  return `
    <section class="dashboard-section strategy-grid" aria-labelledby="strategy-title">
      ${createSectionHeader("Positioning Strategy", "Deterministic next actions from visible keyword, pricing, competitor, and opportunity signals.", "strategy-title")}
      <div class="panel recommendation-panel">
        <h3>Fiverr Positioning Suggestions</h3>
        ${createRecommendationList(data.positioningSuggestions, "No positioning suggestions yet", "Import data to reveal deterministic positioning suggestions.")}
      </div>
      <div class="panel recommendation-panel">
        <h3>Profile Optimization Insights</h3>
        ${createRecommendationList(data.profileInsights, "No profile insights yet", "Profile recommendations appear after keyword and competitor signals exist.")}
      </div>
    </section>
  `;
}

/**
 * @param {typeof EMPTY_DASHBOARD_MODEL} data
 */
function createCleaningReport(data) {
  const report = data.cleaningReport;
  return `
    <section class="dashboard-section" aria-labelledby="cleaning-report-title">
      ${createSectionHeader("Cleaning Report", "Row-level validation, duplicate detection, and normalized import status.", "cleaning-report-title")}
      <div class="panel">
        ${report ? `
          ${createColumnMappingReport(report.columnMapping)}
          ${report.issues.length > 0 ? `<div class="issue-list">${report.issues.slice(0, 12).map(createIssueItem).join("")}</div>` : createCallout("success", "No row-level errors or warnings were produced for this import.")}
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Seller</th>
                  <th>Gig title</th>
                  <th>Starting price</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                ${report.rows.map(createCleaningRow).join("")}
              </tbody>
            </table>
          </div>
        ` : createEmptyState("No cleaning report yet", "Upload a CSV or XLSX file to inspect normalized values, invalid rows, warnings, and duplicates.")}
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
      ${createSectionHeader("Deterministic Notes", "Short explainable notes from imported data only. No AI narration is used in this MVP.", "insights-panel-title")}
      <div class="panel insights-panel">
        ${data.insights.length > 0 ? data.insights.map((insight) => `<div class="insight-item">${escapeHtml(insight)}</div>`).join("") : createEmptyState("No deterministic notes yet", "Notes will summarize visible keyword, pricing, competitor, and opportunity outputs after analysis.")}
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

function createSignalCard(label, value, helper, mode = "number") {
  return `
    <article class="signal-card">
      <span>${escapeHtml(label)}</span>
      <strong>${formatMetric(value, mode)}</strong>
      <small>${escapeHtml(helper)}</small>
    </article>
  `;
}

function createMiniStat(label, value, mode = "number") {
  return `
    <div class="mini-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${formatMetric(value, mode)}</strong>
    </div>
  `;
}

function createColumnMappingReport(columnMapping) {
  if (!columnMapping?.applied) return "";
  return `
    <div class="mapping-report" aria-label="Column Mapping Applied">
      <div class="mapping-report-header">
        <strong>Column Mapping Applied</strong>
        <span>${formatMetric(columnMapping.mappings.length)} mapped column(s)</span>
      </div>
      <div class="mapping-grid">
        ${columnMapping.mappings.map((mapping) => `
          <div class="mapping-row">
            <code>${escapeHtml(mapping.sourceColumn)}</code>
            <span>mapped to</span>
            <strong>${escapeHtml(mapping.targetField)}</strong>
          </div>
        `).join("")}
      </div>
      ${columnMapping.ignoredSourceFieldNames.length > 0 ? `<p>Ignored source columns: ${escapeHtml(columnMapping.ignoredSourceFieldNames.join(", "))}</p>` : ""}
    </div>
  `;
}

function createIssueItem(issue) {
  return `
    <div class="issue-item ${escapeAttribute(issue.severity)}">
      <span class="status-badge">${escapeHtml(issue.severity)}</span>
      <strong>${escapeHtml(issue.rowNumber === null ? "Header" : `Row ${issue.rowNumber}`)}</strong>
      <span>${escapeHtml(issue.fieldName ?? "file")}</span>
      <p>${escapeHtml(issue.message)}</p>
    </div>
  `;
}

function createCleaningRow(row) {
  return `
    <tr>
      <td>${formatMetric(row.rowNumber)}</td>
      <td><span class="status-badge ${escapeAttribute(row.status)}">${escapeHtml(row.status)}</span></td>
      <td>${escapeHtml(row.sellerName ?? "unknown")}</td>
      <td>${escapeHtml(row.gigTitle ?? "unknown")}</td>
      <td>${formatMetric(row.startingPrice, typeof row.startingPrice === "number" ? "currency" : "number")}</td>
      <td>${escapeHtml(row.issueSummary)}</td>
    </tr>
  `;
}

function createCallout(tone, message) {
  return `<div class="callout ${escapeAttribute(tone)}">${escapeHtml(message)}</div>`;
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

function createOpportunityChipList(opportunities) {
  if (!opportunities || opportunities.length === 0) return createEmptyState("No matching terms", "This signal needs more matching imported rows.");
  return `<div class="opportunity-chip-list">${opportunities.map((item) => `
    <div class="opportunity-chip">
      <span>${escapeHtml(item.keyword)}</span>
      ${createScorePill(item.opportunity_score ?? item.opportunityScore ?? null)}
    </div>
  `).join("")}</div>`;
}

function createTechnologyList(items) {
  if (!items || items.length === 0) return createEmptyState("No underrepresented technologies", "Technology keywords appear when they exist in gig titles or extra features.");
  return `<div class="opportunity-chip-list">${items.map((item) => `
    <div class="opportunity-chip">
      <span>${escapeHtml(item.dictionaryTerm ?? item.keyword)}</span>
      <strong>${formatMetric(item.frequency)}</strong>
    </div>
  `).join("")}</div>`;
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
      <div class="competitor-main">
        <span class="status-badge">${escapeHtml(competitor.sellerBadgeText ?? "badge unknown")}</span>
        <h3>${escapeHtml(competitor.sellerName ?? "Unknown seller")}</h3>
        <p>${escapeHtml(competitor.gigTitle ?? "Untitled gig")}</p>
        <small>${escapeHtml(competitor.positioningSummary ?? "Positioning summary unavailable")}</small>
      </div>
      <div class="competitor-metrics">
        <span><strong>${formatMetric(competitor.reviewCount)}</strong> reviews</span>
        <span><strong>${formatMetric(competitor.rating)}</strong> rating</span>
        <span><strong>${formatMetric(competitor.price, "currency")}</strong> price</span>
        <span>${createScorePill(competitor.competitorScore ?? null)}</span>
      </div>
      <div class="competitor-why">
        <span>Why they stand out</span>
        <strong>${escapeHtml(competitor.standOutReason ?? firstText(competitor.evidence))}</strong>
      </div>
    </article>
  `;
}

function createOpportunityRow(opportunity, index) {
  const priority = index === 0 ? "Top" : opportunity.opportunity_score >= 60 ? "High" : opportunity.opportunity_score >= 35 ? "Medium" : "Watch";
  return `
    <tr class="matrix-row ${scoreTone(opportunity.opportunity_score)}" data-keyword="${escapeAttribute(opportunity.keyword)}" data-opportunity_score="${numberAttribute(opportunity.opportunity_score)}" data-competition_score="${numberAttribute(opportunity.competition_score)}" data-price_score="${numberAttribute(opportunity.price_score)}" data-differentiation_score="${numberAttribute(opportunity.differentiation_score)}">
      <td><span class="priority-badge">${escapeHtml(priority)}</span></td>
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

function createScoreDial(value) {
  const score = clampPercent(typeof value === "number" ? value : 0);
  return `
    <div class="score-dial" style="--score: ${score}%">
      <strong>${formatMetric(value)}</strong>
      <span>score</span>
    </div>
  `;
}

function createScoreMini(label, value) {
  return `
    <div class="score-mini">
      <span>${escapeHtml(label)}</span>
      ${createScoreBar(value)}
    </div>
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

function createDetectionConfidenceBadge(confidence) {
  const label = confidence === "high" ? "High confidence" : confidence === "medium" ? "Medium confidence" : "Low confidence";
  return `<span class="confidence-badge ${escapeAttribute(confidence)}">${escapeHtml(label)}</span>`;
}
function createConfidenceBadge(confidence) {
  const label = confidence === "higher" ? "Higher confidence" : confidence === "medium" ? "Medium confidence" : "Limited sample";
  return `<span class="confidence-badge ${escapeAttribute(confidence)}">${escapeHtml(label)}</span>`;
}

function createDistributionBars(items) {
  if (!items || items.length === 0) return createEmptyState("No data", "This summary needs imported values.");
  return `<div class="distribution-list">${items.map((item) => `
    <div class="distribution-row">
      <div>
        <span>${escapeHtml(item.label ?? "unknown")}</span>
        <strong>${formatMetric(item.count)}</strong>
      </div>
      <div class="band-track"><span style="width: ${clampPercent(item.share ?? 0)}%"></span></div>
    </div>
  `).join("")}</div>`;
}

function createRecommendationList(items, emptyTitle, emptyDetail) {
  if (!items || items.length === 0) return createEmptyState(emptyTitle, emptyDetail);
  return `<div class="recommendation-list">${items.map((item) => `
    <article class="recommendation-item">
      <span class="status-badge accent">Action</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `).join("")}</div>`;
}

function createEmptyState(title, detail) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
    </div>
  `;
}

function scoreTone(value) {
  if (typeof value !== "number") return "score-muted";
  if (value >= 70) return "score-strong";
  if (value >= 45) return "score-medium";
  return "score-soft";
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


