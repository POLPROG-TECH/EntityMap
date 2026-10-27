import { NODE_CONFIG } from "../shared/constants.js";
import { haTargetFor, navigateTo, openMoreInfo } from "../shared/ha-links.js";
import { escapeHtml, haIcon } from "../shared/html.js";
import { calloutMarkup, fragilityLabel, nodeRefMarkup, severityClass, severityLabel, typeClass } from "../shared/labels.js";

export const DetailView = (Base) =>
  class extends Base {
    _renderDetailPanel() {
      const panel = this.shadowRoot.getElementById("detail-panel");

      if (!panel || !this._selectedNode) {
        return;
      }

      panel.classList.toggle("open", this._viewMode === "graph");

      const node = this._nodesById.get(this._selectedNode);
      panel.innerHTML = `${this._detailHeaderMarkup(node)}${this._detailBodyMarkup()}`;
      this._wireDetailEvents(panel, node);
    }

    _detailHeaderMarkup(node) {
      return `
        <div class="detail-header">
          <button class="close-btn" id="close-detail" aria-label="${this._t("close_details")}"
                  title="${this._t("close_details")}">${haIcon("mdi:close")}</button>
          ${this._detailTitleMarkup(node)}
          ${this._detailStatusBadgesMarkup(node)}
          <div class="detail-actions">${this._detailActionsMarkup(node)}</div>
        </div>`;
    }

    _detailTitleMarkup(node) {
      const cfg = NODE_CONFIG[node?.node_type] || NODE_CONFIG.unknown;

      return `
        <div class="detail-title">
          <span class="node-badge ${typeClass(node?.node_type)}">
            ${haIcon(cfg.icon)} ${this._typeLabel(node?.node_type)}
          </span>
          <h2>${escapeHtml(node?.title || this._selectedNode)}</h2>
          <code class="node-id">${escapeHtml(this._selectedNode)}</code>
        </div>`;
    }

    _detailStatusBadgesMarkup(node) {
      const missing = node && !node.available
        ? `<div class="warning-badge">${haIcon("mdi:alert")} ${this._t("missing")}</div>`
        : "";
      const disabled = node?.disabled
        ? `<div class="warning-badge muted">${haIcon("mdi:cancel")} ${this._t("disabled")}</div>`
        : "";

      return `${missing}${disabled}`;
    }

    _detailActionsMarkup(node) {
      const target = haTargetFor(node, this._hass?.states);
      const button = (id, icon, label) => `<button class="btn btn-sm" id="${id}">${haIcon(icon)} ${label}</button>`;
      const actions = [
        target ? button("open-in-ha", "mdi:open-in-new", this._t(target.labelKey)) : "",
        button("focus-node", "mdi:target", this._t("focus_node")),
        this._animationsActive() && this._detailState === "ready" ? button("replay-wave", "mdi:waves", this._t("replay_wave")) : "",
        this._deviceFoldButtonMarkup(node, button),
      ];

      return actions.join("");
    }

    _deviceFoldButtonMarkup(node, button) {
      const count = this._deviceEntityCount(node);

      if (!this._collapseEntities || !count) {
        return "";
      }

      return this._expandedDevices.has(node.node_id)
        ? button("toggle-device-entities", "mdi:arrow-collapse-vertical", this._t("collapse_device"))
        : button("toggle-device-entities", "mdi:arrow-expand-vertical", this._t("expand_device", { count }));
    }

    _deviceEntityCount(node) {
      if (node?.node_type !== "device") {
        return 0;
      }

      return (this._graph?.nodes || []).filter(other => other.node_type === "entity" && other.device_id === node.device_id).length;
    }

    _detailBodyMarkup() {
      if (this._detailState === "loading") {
        return `<div class="loading-state detail-status"><div class="spinner"></div><p>${this._t("loading_details")}</p></div>`;
      }

      if (this._detailState === "error") {
        return `
          <div class="error-state detail-status" role="alert">
            ${haIcon("mdi:alert-circle-outline")}
            <p>${this._t("details_failed")}</p>
            <button class="btn btn-sm" id="retry-detail">${this._t("retry")}</button>
          </div>`;
      }

      return `${this._impactMarkup()}${this._nodeFindingsMarkup()}${this._migrationMarkup()}`;
    }

    _impactMarkup() {
      const impact = this._selectedImpact;

      if (!impact) {
        return "";
      }

      const chips = this._affectedChipsMarkup(impact.affected_by_type);

      return `
        <section class="detail-section">
          <h3>${haIcon("mdi:chart-bar")} ${this._t("impact_title")}</h3>
          ${this._riskMarkup(impact)}
          <p class="impact-text">${escapeHtml(impact.summary)}</p>
          ${chips ? `<div class="affected-chips">${chips}</div>` : ""}
        </section>`;
    }

    _riskMarkup(impact) {
      const score = Number(impact.risk_score);
      const severity = severityClass(impact.severity);
      const label = this._t("risk", { score: score.toFixed(0) });

      return `
        <div class="impact-summary">
          <div class="risk-meter" role="meter" aria-valuemin="0" aria-valuemax="100"
               aria-valuenow="${score.toFixed(0)}" aria-label="${label}">
            <div class="risk-bar ${severity}" style="width:${score}%"></div>
          </div>
          <div class="risk-row">
            <span class="severity-chip ${severity}">${severityLabel(this._translateMarkup, impact.severity)}</span>
            <span class="risk-label">${label}</span>
          </div>
        </div>`;
    }

    _affectedChipsMarkup(affectedByType) {
      return Object.entries(affectedByType).map(([type, count]) => {
        const icon = (NODE_CONFIG[type] || NODE_CONFIG.unknown).icon;

        return `<span class="chip ${typeClass(type)}">
          ${haIcon(icon)} ${this._typeLabel(type)} <strong>${Number(count)}</strong>
        </span>`;
      }).join("");
    }

    _nodeFindingsMarkup() {
      const findings = this._selectedImpact?.fragility_findings || [];

      if (findings.length === 0) {
        return "";
      }

      return this._detailSectionMarkup("mdi:alert-outline", "fragility_title", findings.length, `
        <ul class="detail-cards">${findings.map(finding => this._issueCardMarkup(finding)).join("")}</ul>`);
    }

    _issueCardMarkup(finding) {
      const severity = severityClass(finding.severity);

      return `
        <li class="detail-card ${severity}">
          <div class="detail-card-head">
            <span class="severity-chip ${severity}">${severityLabel(this._translateMarkup, finding.severity)}</span>
            <strong>${fragilityLabel(this._translateMarkup, finding.fragility_type)}</strong>
          </div>
          <p class="detail-card-text">${escapeHtml(finding.rationale)}</p>
          ${calloutMarkup("mdi:lightbulb-on-outline", finding.remediation)}
        </li>`;
    }

    _migrationMarkup() {
      const suggestions = this._selectedMigration?.suggestions || [];

      if (suggestions.length === 0) {
        return "";
      }

      return this._detailSectionMarkup("mdi:swap-horizontal", "migration_title", suggestions.length, `
        <ul class="detail-cards">${suggestions.map(suggestion => this._suggestionCardMarkup(suggestion)).join("")}</ul>`);
    }

    _suggestionCardMarkup(suggestion) {
      return `
        <li class="detail-card">
          <p class="detail-card-text">${escapeHtml(suggestion.description)}</p>
          ${suggestion.recommendation ? calloutMarkup("mdi:clipboard-check-outline", suggestion.recommendation, "callout-primary") : ""}
          ${this._affectedItemsMarkup(suggestion.affected_items || [])}
        </li>`;
    }

    _detailSectionMarkup(icon, titleKey, count, body) {
      return `
        <section class="detail-section">
          <h3>${haIcon(icon)} <span>${this._t(titleKey)}</span> <span class="section-count">${count}</span></h3>
          ${body}
        </section>`;
    }

    _affectedItemsMarkup(affectedItems) {
      if (affectedItems.length === 0) {
        return "";
      }

      const refs = affectedItems.map(id => `<li>${nodeRefMarkup(this._translateMarkup, id, this._nodesById.has(id))}</li>`);

      return `
        <details class="affected">
          <summary>
            ${haIcon("mdi:chevron-right", "affected-chevron")}
            <span>${this._t("affected_items")}</span>
            <span class="section-count">${affectedItems.length}</span>
          </summary>
          <ul class="affected-list">${refs.join("")}</ul>
        </details>`;
    }

    _wireDetailEvents(panel, node) {
      panel.querySelector("#close-detail")?.addEventListener("click", () => this._closeDetail());
      panel.querySelector("#retry-detail")?.addEventListener("click", () => this._selectNode(this._selectedNode));
      panel.querySelector("#focus-node")?.addEventListener("click", () => this._enterFocus(this._selectedNode));
      panel.querySelector("#replay-wave")?.addEventListener("click", () =>
        this._playImpactWave(this._selectedNode, this._selectedImpact?.severity)
      );
      panel.querySelector("#toggle-device-entities")?.addEventListener("click", () => this._toggleDeviceExpansion(node.node_id));
      panel.querySelector("#open-in-ha")?.addEventListener("click", () => this._openInHomeAssistant(node));
      this._wireNodeRefs(panel);
    }

    _openInHomeAssistant(node) {
      const target = haTargetFor(node, this._hass?.states);

      if (!target) {
        return;
      }

      if (target.kind === "navigate") {
        navigateTo(target.path);

        return;
      }

      openMoreInfo(this, target.entityId);
    }

    _closeDetail({ updateRoute = true } = {}) {
      this._selectedNode = null;
      this._detailState = "idle";
      const panel = this.shadowRoot.getElementById("detail-panel");

      if (panel) {
        panel.classList.remove("open");
        panel.innerHTML = `<div class="empty-state">${this._t("detail_empty")}</div>`;
      }

      this._resetHighlight();

      if (updateRoute) {
        this._syncRoute(true);
      }
    }
  };
