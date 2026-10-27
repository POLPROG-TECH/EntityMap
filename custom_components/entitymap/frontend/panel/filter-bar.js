import { GRAPH_LAYOUTS, NODE_CONFIG } from "../shared/constants.js";
import { countByType } from "../shared/graph-model.js";
import { haIcon } from "../shared/html.js";
import { typeClass } from "../shared/labels.js";
import { activeFilterCount } from "./filter-options.js";
import { savePreferences } from "./panel-state.js";

export const FilterBarView = (Base) =>
  class extends Base {
    _filterBarMarkup() {
      if (this._viewMode === "hierarchy") {
        return "";
      }

      const graphMode = this._viewMode === "graph";

      return `
        <div class="filters-backdrop" id="filters-backdrop"></div>
        <section class="filter-bar" id="filter-bar" aria-label="${this._t("filters_title")}">
          <div class="sheet-header">
            <h2>${this._t("filters_title")}</h2>
            <button class="btn icon-btn" id="close-filters" aria-label="${this._t("close")}">${haIcon("mdi:close")}</button>
          </div>
          <div class="filter-group filter-group-types">
            <span class="filter-label" id="filter-label-show">${this._t("section_show")}</span>
            <div class="type-chips" role="group" aria-labelledby="filter-label-show">${this._typeChipsMarkup()}</div>
          </div>
          ${graphMode ? this._graphFilterGroupsMarkup() : ""}
          ${this._filterSummaryMarkup()}
        </section>`;
    }

    _filtersButtonMarkup() {
      if (this._viewMode === "hierarchy") {
        return "";
      }

      const count = this._activeFilterCount();
      const badge = count ? `<span class="filter-badge">${count}</span>` : "";
      const label = count ? this._t("filters_active", { count }) : this._t("filters_title");

      return `<button class="btn filters-btn" id="open-filters" aria-controls="filter-bar"
                      aria-expanded="${this._filtersOpen}" aria-label="${label}">
                ${haIcon("mdi:filter-variant")} ${this._t("filters_title")} ${badge}
              </button>`;
    }

    _typeChipsMarkup() {
      const counts = countByType(this._graph?.nodes);

      return Object.entries(NODE_CONFIG)
        .filter(([type]) => counts.get(type) || this._filterTypes.has(type))
        .map(([type, cfg]) => this._typeChipMarkup(type, cfg, counts.get(type) || 0))
        .join("");
    }

    _typeChipMarkup(type, cfg, count) {
      const shown = !this._filterTypes.has(type);

      return `<button class="type-chip ${shown ? "" : "off"}" data-type="${type}" aria-pressed="${shown}">
          <span class="type-swatch swatch-${cfg.shape} ${typeClass(type)}" aria-hidden="true"></span>
          <span class="type-name">${this._typeLabel(type)}</span>
          <span class="chip-count">${count}</span>
        </button>`;
    }

    _graphFilterGroupsMarkup() {
      return `
        <div class="filter-group">
          <span class="filter-label">${this._t("section_scope")}</span>
          ${this._scopePickerMarkup()}
        </div>
        <div class="filter-group">
          <span class="filter-label">${this._t("section_layout")}</span>
          ${this._layoutControlsMarkup()}
        </div>
        <div class="filter-group">
          <span class="filter-label">${this._t("section_tools")}</span>
          ${this._dimensionToggleMarkup()}
          <button class="btn btn-sm tool-btn ${this._pathMode ? "toggle-active" : ""}" id="path-toggle"
                  title="${this._t("path_title")}" aria-pressed="${this._pathMode}">
            ${haIcon("mdi:vector-polyline")} ${this._t("path_button")}
          </button>
        </div>`;
    }

    _dimensionToggleMarkup() {
      const option = (dimension, labelKey) => {
        const active = this._graphDimension === dimension;

        return `<button class="segment ${active ? "active" : ""}" data-dimension="${dimension}" aria-pressed="${active}"
                        title="${this._t(labelKey)}">${dimension.toUpperCase()}</button>`;
      };

      return `<div class="segmented" role="group" aria-label="${this._t("dimension_label")}">
          ${option("2d", "view_2d")}${option("3d", "view_3d")}
        </div>`;
    }

    _layoutControlsMarkup() {
      const options = GRAPH_LAYOUTS.map(layout =>
        `<option value="${layout}" ${layout === this._graphLayout ? "selected" : ""}>${this._t(`layout_${layout}`)}</option>`
      ).join("");

      return `
        <select class="scope-select" id="graph-layout" aria-label="${this._t("layout_label")}">${options}</select>
        <button class="btn btn-sm tool-btn ${this._collapseEntities ? "toggle-active" : ""}" id="collapse-toggle"
                aria-pressed="${this._collapseEntities}">
          ${haIcon("mdi:arrow-collapse-vertical")} ${this._t("collapse_entities")}
        </button>`;
    }

    _filterSummaryMarkup() {
      const count = this._activeFilterCount();

      if (!count) {
        return "";
      }

      const hidden = this._hiddenNodeCount();
      const hiddenText = hidden ? `<span class="hidden-count">${this._t("hidden_nodes", { count: hidden })}</span>` : "";

      return `
        <div class="filter-summary">
          ${hiddenText}
          <button class="btn btn-sm clear-filters" id="clear-filters">
            ${haIcon("mdi:filter-remove-outline")} ${this._t("clear_filters", { count })}
          </button>
        </div>`;
    }

    _activeFilterCount() {
      return activeFilterCount({ hiddenTypes: this._filterTypes, scope: this._scopeFilter });
    }

    _hiddenNodeCount() {
      if (this._viewMode !== "graph" || !this._graph) {
        return 0;
      }

      return this._graph.nodes.filter(node => !this._nodePassesFilters(node)).length;
    }

    _wireFilterBar(root) {
      root.querySelectorAll(".type-chip").forEach(chip =>
        chip.addEventListener("click", () => this._toggleType(chip.dataset.type))
      );
      root.getElementById("clear-filters")?.addEventListener("click", () => this._clearFilters());
      root.getElementById("path-toggle")?.addEventListener("click", () => this._togglePathMode());
      root.getElementById("graph-layout")?.addEventListener("change", (e) => this._setGraphLayout(e.target.value));
      root.getElementById("collapse-toggle")?.addEventListener("click", () => this._toggleCollapse());
      root.querySelectorAll("[data-dimension]").forEach(button =>
        button.addEventListener("click", () => this._setGraphDimension(button.dataset.dimension))
      );
      root.getElementById("open-filters")?.addEventListener("click", () => this._setFiltersOpen(true));
      root.getElementById("close-filters")?.addEventListener("click", () => this._setFiltersOpen(false));
      root.getElementById("filters-backdrop")?.addEventListener("click", () => this._setFiltersOpen(false));
      this._wireScopePicker(root);
    }

    _toggleType(type) {
      if (this._filterTypes.has(type)) {
        this._filterTypes.delete(type);
      } else {
        this._filterTypes.add(type);
      }

      this._refreshAfterFilterChange(`.type-chip[data-type="${type}"]`);
    }

    _clearFilters() {
      this._filterTypes.clear();
      this._scopeFilter = null;
      this._resetViewport();
      this._refreshAfterFilterChange(".type-chip");
    }

    _setGraphDimension(dimension) {
      if (dimension === this._graphDimension) {
        return;
      }

      this._graphDimension = dimension;
      savePreferences(this);
      this._refreshAfterFilterChange(`[data-dimension="${dimension}"]`);
    }

    _setGraphLayout(layout) {
      if (!GRAPH_LAYOUTS.includes(layout) || layout === this._graphLayout) {
        return;
      }

      this._graphLayout = layout;
      savePreferences(this);
      this._resetViewport();
      this._refreshAfterFilterChange("#graph-layout");
    }

    _toggleCollapse() {
      this._collapseEntities = !this._collapseEntities;
      savePreferences(this);
      this._refreshAfterFilterChange("#collapse-toggle");
    }

    _togglePathMode() {
      this._pathMode = !this._pathMode;
      this._pathEndpoints = [];
      this._pathNodes = null;
      this._refreshAfterFilterChange("#path-toggle");
    }

    _refreshAfterFilterChange(focusSelector) {
      this._render();
      this._renderCurrentView();
      this.shadowRoot.querySelector(focusSelector)?.focus();
    }

    _setFiltersOpen(open) {
      this._filtersOpen = open;
      const container = this.shadowRoot.querySelector(".entitymap-container");
      container?.classList.toggle("filters-open", open);
      this.shadowRoot.getElementById("open-filters")?.setAttribute("aria-expanded", String(open));

      const target = open ? ".type-chip" : "#open-filters";
      this.shadowRoot.querySelector(target)?.focus();
    }
  };
