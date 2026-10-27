import {
  CONFIDENCE_LEVELS,
  CONFIDENCE_STROKE,
  EDGE_FAMILIES,
  EDGE_FAMILY_COLORS,
  NODE_CONFIG,
} from "../shared/constants.js";
import { haIcon } from "../shared/html.js";
import { typeClass } from "../shared/labels.js";

export const LayoutView = (Base) =>
  class extends Base {
    _shellMarkup() {
      return `
      <div class="entitymap-container ${this._containerClasses()}">
        ${this._headerMarkup()}
        <div class="entitymap-body">
          ${this._filterBarMarkup()}
          <div class="main-content">
            ${this._graphAreaMarkup()}
            <aside class="detail-panel ${this._selectedNode && this._viewMode === "graph" ? "open" : ""}" id="detail-panel"
                   aria-live="polite">
              <div class="empty-state">${this._t("detail_empty")}</div>
            </aside>
          </div>
        </div>
        ${this._legendMarkup()}
        ${this._footerMarkup()}
        <div id="em-live" class="sr-only" aria-live="polite"></div>
      </div>`;
    }

    _graphAreaMarkup() {
      const hiddenOutsideGraph = this._viewMode === "graph" ? "" : "hidden";

      return `
        <div class="graph-area">
          <div class="graph-canvas" id="graph-container">
            ${this._graph ? "" : `<div class="empty-state">${this._t("loading_graph")}</div>`}
          </div>
          <div class="graph-banner" id="graph-banner" role="status" hidden></div>
          <div class="graph-tooltip" id="graph-tooltip" role="tooltip" hidden></div>
          <div class="graph-zoom-controls" id="graph-zoom-controls" role="toolbar" aria-orientation="vertical"
               aria-label="${this._t("zoom_controls")}" ${hiddenOutsideGraph}>${this._zoomControlsMarkup()}</div>
          <svg class="minimap" id="graph-minimap" ${hiddenOutsideGraph} aria-hidden="true"></svg>
        </div>`;
    }

    _zoomControlsMarkup() {
      return `
        ${this._zoomButton("in", "mdi:plus", "zoom_in", "+")}
        <output class="zoom-level" id="zoom-level" aria-label="${this._t("zoom_level")}">100%</output>
        ${this._zoomButton("out", "mdi:minus", "zoom_out", "-")}
        <span class="zoom-sep" aria-hidden="true"></span>
        ${this._zoomButton("fit", "mdi:fit-to-screen-outline", "zoom_fit", "F")}
        ${this._zoomButton("reset", "mdi:restore", "zoom_reset", "0")}`;
    }

    _footerMarkup() {
      const separator = `<span class="footer-sep" aria-hidden="true">·</span>`;

      return `
        <footer class="entitymap-footer">
          <span>EntityMap</span>${separator}
          <span>${this._t("footer_by")} <a href="https://polprog.pl/" target="_blank" rel="noopener">POLPROG</a></span>${separator}
          <a href="https://github.com/polprog-tech/EntityMap" target="_blank" rel="noopener">${this._t("footer_docs")}</a>${separator}
          <a href="https://github.com/polprog-tech/EntityMap/issues" target="_blank" rel="noopener">${this._t("footer_report")}</a>
        </footer>`;
    }

    _containerClasses() {
      return [
        this._density === "compact" ? "compact" : "",
        this._colorblind ? "colorblind" : "",
        this._filtersOpen ? "filters-open" : "",
      ].filter(Boolean).join(" ");
    }

    _zoomButton(action, icon, labelKey, shortcut) {
      const label = this._t(labelKey);

      return `<button class="zoom-btn" data-zoom="${action}" title="${label} (${shortcut})" aria-label="${label}"
                      aria-keyshortcuts="${shortcut === "+" ? "Shift+Equal" : shortcut}">${haIcon(icon)}</button>`;
    }

    _edgeLegendMarkup() {
      const sample = (color, dash) =>
        `<svg class="legend-edge" width="24" height="6" aria-hidden="true"><line x1="0" y1="3" x2="24" y2="3"
          stroke="${color}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ""}/></svg>`;
      const families = EDGE_FAMILIES.map(family =>
        `<span class="legend-item">${sample(EDGE_FAMILY_COLORS[family], null)} ${this._t(`edge_${family}`)}</span>`
      ).join("");
      const confidence = CONFIDENCE_LEVELS.map(level =>
        `<span class="legend-item">${sample("var(--em-text-secondary)", CONFIDENCE_STROKE[level].dash)} ${this._t(`confidence_${level}`)}</span>`
      ).join("");

      return `${families}<span class="legend-sep" aria-hidden="true">|</span>${confidence}`;
    }

    _legendMarkup() {
      if (this._viewMode === "graph") {
        return `<div class="legend">${this._edgeLegendMarkup()}</div>`;
      }

      if (this._viewMode !== "hierarchy") {
        return "";
      }

      const items = Object.entries(NODE_CONFIG).map(([type, cfg]) =>
        `<span class="legend-item"><span class="type-swatch swatch-${cfg.shape} ${typeClass(type)}"
           aria-hidden="true"></span> ${this._typeLabel(type)}</span>`
      ).join("");

      return `<div class="legend">${items}</div>`;
    }
  };
