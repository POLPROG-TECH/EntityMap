import { SEVERITY_ORDER } from "../shared/constants.js";
import { FINDING_SORTS, countBySeverity, findingsToCsv, selectFindings } from "./findings-data.js";
import { downloadBlob } from "../shared/download.js";
import { escapeHtml, haIcon } from "../shared/html.js";
import { calloutMarkup, fragilityLabel, nodeRefMarkup, severityClass, severityLabel } from "../shared/labels.js";

export const FindingsView = (Base) =>
  class extends Base {
    _renderFindingsList() {
      const container = this.shadowRoot.getElementById("graph-container");

      if (!container || !this._findings) {
        return;
      }

      const all = this._findings.findings || [];
      const findings = this._visibleFindings(all);
      this._setSearchCount(this._searchQuery ? findings.length : null);
      container.innerHTML = `
        <div class="findings-view">
          ${this._findingsHeaderMarkup(findings.length)}
          ${all.length ? this._severityFilterMarkup(all) : ""}
          ${this._findingsEmptyMarkup(all.length, findings.length)}
          <div class="findings-grid">${findings.map(f => this._findingCardMarkup(f)).join("")}</div>
        </div>`;
      this._wireFindingsEvents(container, findings);
    }

    _findingsHeaderMarkup(count) {
      const exportButton = (format, labelKey) =>
        `<button class="btn btn-sm" data-export="${format}" title="${this._t("export_findings_title")}"
                 ${count ? "" : "disabled"}>${haIcon("mdi:download")} ${this._t(labelKey)}</button>`;

      return `
        <div class="findings-header">
          <h2>${haIcon("mdi:alert-outline")} ${this._t("findings_title")}</h2>
          <span class="count-badge">${this._t("issues_count", { count })}</span>
          <div class="findings-actions">
            ${this._findingsSortMarkup()}
            ${exportButton("csv", "export_csv")}
            ${exportButton("json", "export_json")}
          </div>
        </div>`;
    }

    _visibleFindings(all) {
      const nodeTypeById = new Map([...this._nodesById].map(([id, node]) => [id, node.node_type]));

      return selectFindings(all, {
        severity: this._findingsSeverity,
        query: this._searchQuery,
        hiddenTypes: this._filterTypes,
        nodeTypeById,
        sort: this._findingsSort,
      });
    }

    _findingsSortMarkup() {
      const options = FINDING_SORTS.map(sort =>
        `<option value="${sort}"${sort === this._findingsSort ? " selected" : ""}>${this._t(`sort_${sort}`)}</option>`
      ).join("");

      return `
        <label class="inline-field">
          <span>${this._t("sort_label")}</span>
          <select class="scope-select" id="findings-sort">${options}</select>
        </label>`;
    }

    _severityFilterMarkup(all) {
      const counts = countBySeverity(all);
      const chip = (value, label, count) => {
        const active = this._findingsSeverity === value;
        const dot = value ? `<span class="severity-dot ${severityClass(value)}" aria-hidden="true"></span>` : "";

        return `<button class="filter-chip severity-filter ${active ? 'active' : ''}" data-severity="${value}"
                        aria-pressed="${active}">${dot} ${label} <strong>${count}</strong></button>`;
      };
      const levels = SEVERITY_ORDER
        .filter(severity => counts[severity] > 0)
        .map(severity => chip(severity, this._t(`severity_${severity}`), counts[severity]));

      return `
        <div class="severity-filters" role="group" aria-label="${this._t("severity_filter")}">
          ${chip("", this._t("severity_all"), all.length)}${levels.join("")}
        </div>`;
    }

    _findingsEmptyMarkup(total, shown) {
      if (total === 0) {
        return `<div class="empty-state success">${haIcon("mdi:check-circle-outline")} ${this._t("no_issues")}</div>`;
      }

      return shown === 0 ? `<div class="empty-state">${this._t("no_issue_match")}</div>` : "";
    }

    _findingCardMarkup(f) {
      const related = (f.related_node_ids || [])
        .map(id => `${haIcon("mdi:arrow-right", "meta-arrow")} ${nodeRefMarkup(this._translateMarkup, id, this._nodesById.has(id))}`)
        .join(" ");

      return `
        <article class="finding-card severity-${escapeHtml(f.severity)}">
          <div class="finding-card-header">
            <span class="severity-badge ${severityClass(f.severity)}">${severityLabel(this._translateMarkup, f.severity)}</span>
            <h3 class="finding-type">${fragilityLabel(this._translateMarkup, f.fragility_type)}</h3>
          </div>
          <p class="finding-rationale">${escapeHtml(f.rationale)}</p>
          ${calloutMarkup("mdi:lightbulb-on-outline", f.remediation)}
          <div class="finding-meta">${nodeRefMarkup(this._translateMarkup, f.node_id, this._nodesById.has(f.node_id))} ${related}</div>
          ${this._nodesById.has(f.node_id) ? `
            <div class="finding-actions">
              <button class="btn btn-sm" data-goto="${escapeHtml(f.node_id)}">${haIcon("mdi:graph-outline")} ${this._t("show_in_graph")}</button>
            </div>` : ""}
        </article>`;
    }

    _wireFindingsEvents(container, findings) {
      container.querySelectorAll("[data-severity]").forEach(chip => {
        chip.addEventListener("click", () => {
          this._findingsSeverity = chip.dataset.severity;
          this._renderFindingsList();
        });
      });

      container.querySelector("#findings-sort")?.addEventListener("change", (e) => {
        this._findingsSort = e.target.value;
        this._renderFindingsList();
      });

      container.querySelectorAll("[data-export]").forEach(button => {
        button.addEventListener("click", () => this._exportFindings(button.dataset.export, findings));
      });

      this._wireNodeRefs(container);
    }

    _exportFindings(format, findings) {
      if (format === "csv") {
        downloadBlob(new Blob([findingsToCsv(findings)], { type: "text/csv" }), "entitymap-issues.csv");

        return;
      }

      const json = JSON.stringify(findings, null, 2);
      downloadBlob(new Blob([json], { type: "application/json" }), "entitymap-issues.json");
    }
  };
