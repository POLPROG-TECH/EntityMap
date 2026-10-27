import { PANEL_ICON } from "../shared/constants.js";
import { nodeMatchesQuery } from "../shared/graph-model.js";
import { escapeHtml, haIcon } from "../shared/html.js";
import { isEditableTarget } from "../shared/keyboard.js";
import { relativeTime, worstSeverity } from "./header-data.js";

const VIEW_TABS = [
  { mode: "graph", labelKey: "tab_graph", icon: "mdi:graph-outline" },
  { mode: "findings", labelKey: "tab_issues", icon: "mdi:alert-outline" },
  { mode: "hierarchy", labelKey: "tab_hierarchy", icon: "mdi:file-tree" },
];

const SEARCH_PLACEHOLDERS = {
  graph: "search_placeholder",
  findings: "search_issues_placeholder",
  hierarchy: "search_hierarchy_placeholder",
};

/** Each keystroke would otherwise rebuild the whole graph SVG. */
const SEARCH_DEBOUNCE_MS = 150;
const SCAN_AGE_REFRESH_MS = 60_000;

export const HeaderView = (Base) =>
  class extends Base {
    _headerMarkup() {
      return `
        <header class="entitymap-header">
          <div class="header-left">
            <ha-menu-button></ha-menu-button>
            <div class="brand">
              <span class="brand-mark" aria-hidden="true">${haIcon(PANEL_ICON)}</span>
              <div class="brand-text">
                <h1>EntityMap</h1>
                <p class="subtitle">${this._subtitleMarkup()}</p>
              </div>
            </div>
          </div>
          <nav class="view-tabs" aria-label="${this._t("views_label")}">
            ${VIEW_TABS.map(tab => this._tabMarkup(tab)).join("")}
          </nav>
          ${this._searchMarkup()}
          <div class="header-actions">
            ${this._filtersButtonMarkup()}
            ${this._viewMenuMarkup()}
            <button class="btn scan-btn" title="${this._t("rescan_title")}" ${this._scanning ? 'disabled aria-busy="true"' : ""}>
              ${haIcon("mdi:refresh", "scan-icon")}
              <span class="btn-label">${this._t(this._scanning ? "scanning" : "rescan")}</span>
            </button>
          </div>
        </header>`;
    }

    _subtitleMarkup() {
      if (!this._graph) {
        return this._t("loading");
      }

      const item = (text) => `<span class="subtitle-item">${text}</span>`;

      return [
        item(this._t("nodes_count", { count: this._graph.node_count })),
        item(this._t("dependencies_count", { count: this._graph.edge_count })),
        this._scanAgeMarkup(),
      ].join("");
    }

    _scanAgeMarkup() {
      const absolute = this._graph.last_scan ? new Date(this._graph.last_scan).toLocaleString(this._lang) : "";
      const status = this._graph.scan_status === "errors" ? "warn" : this._graph.last_scan ? "ok" : "never";

      return `<span class="subtitle-item scan-age scan-${status}" title="${escapeHtml(absolute)}">
          <span class="status-dot" aria-hidden="true"></span><span id="scan-age">${escapeHtml(this._scanAgeText())}</span>
        </span>`;
    }

    _scanAgeText() {
      const time = this._graph?.last_scan ? relativeTime(this._graph.last_scan, Date.now(), this._lang) : null;

      if (!time) {
        return this._tText("scan_never");
      }

      return this._tText(this._graph.scan_status === "errors" ? "scan_age_errors" : "scan_age", { time });
    }

    _tabMarkup({ mode, labelKey, icon }) {
      const active = this._viewMode === mode;
      const findings = this._findings?.findings || [];
      const badge = mode === "findings" && findings.length
        ? `<span class="tab-badge severity-${worstSeverity(findings)}">${findings.length}</span>`
        : "";

      return `<button class="tab ${active ? "active" : ""}" data-mode="${mode}" ${active ? 'aria-current="page"' : ""}>
          ${haIcon(icon)} <span class="tab-label">${this._t(labelKey)}</span>${badge}
        </button>`;
    }

    _searchMarkup() {
      const placeholder = this._t(SEARCH_PLACEHOLDERS[this._viewMode]);

      return `
        <div class="search-box ${this._searchQuery ? "has-query" : ""}" role="search">
          ${haIcon("mdi:magnify", "search-icon")}
          <input type="search" class="search-input" id="search-input" placeholder="${placeholder}"
                 aria-label="${placeholder}" aria-describedby="search-count" aria-keyshortcuts="/"
                 value="${escapeHtml(this._searchQuery)}" autocomplete="off" />
          <span class="search-count" id="search-count" role="status"></span>
          <kbd class="search-kbd" aria-hidden="true">/</kbd>
          <button class="search-clear" id="search-clear" aria-label="${this._t("clear_search")}"
                  title="${this._t("clear_search")}">${haIcon("mdi:close")}</button>
        </div>`;
    }

    _wireHeader(root) {
      root.querySelector(".scan-btn")?.addEventListener("click", () => this._triggerScan());
      root.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => this._setViewMode(tab.dataset.mode));
      });

      const input = root.getElementById("search-input");
      input?.addEventListener("input", () => this._onSearchInput(input.value));
      input?.addEventListener("keydown", (e) => this._onSearchKeyDown(e));
      root.getElementById("search-clear")?.addEventListener("click", () => this._clearSearch());
    }

    _onSearchInput(value) {
      this._searchQuery = value.trim().toLowerCase();
      this.shadowRoot.querySelector(".search-box")?.classList.toggle("has-query", Boolean(this._searchQuery));
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => this._renderCurrentView(), SEARCH_DEBOUNCE_MS);
    }

    _onSearchKeyDown(e) {
      if (e.key === "Escape" && this._searchQuery) {
        e.preventDefault();
        e.stopPropagation();
        this._clearSearch();

        return;
      }

      if (e.key === "Enter" && this._viewMode === "graph") {
        const first = this._graph?.nodes.find(node => nodeMatchesQuery(node, this._searchQuery));

        if (this._searchQuery && first) {
          e.preventDefault();
          this._openNodeInGraph(first.node_id);
        }
      }
    }

    _clearSearch() {
      const input = this.shadowRoot.getElementById("search-input");

      if (input) {
        input.value = "";
        input.focus();
      }

      this._onSearchInput("");
    }

    _setSearchCount(count) {
      const status = this.shadowRoot.getElementById("search-count");

      if (status) {
        status.textContent = this._searchQuery && count !== null ? this._tText("search_results", { count }) : "";
      }
    }

    _handleSearchShortcut(event) {
      const modified = event.ctrlKey || event.metaKey || event.altKey;

      if (event.key !== "/" || modified || isEditableTarget(event)) {
        return false;
      }

      const input = this.shadowRoot.getElementById("search-input");
      input?.focus();
      input?.select();

      return Boolean(input);
    }

    _startScanAgeTicker() {
      this._scanAgeTimer = setInterval(() => this._refreshScanAge(), SCAN_AGE_REFRESH_MS);
    }

    _stopHeaderTimers() {
      clearInterval(this._scanAgeTimer);
      clearTimeout(this._searchTimer);
    }

    _refreshScanAge() {
      const age = this.shadowRoot.getElementById("scan-age");

      if (age) {
        age.textContent = this._scanAgeText();
      }
    }
  };
