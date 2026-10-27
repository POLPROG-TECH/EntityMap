import { NODE_CONFIG } from "../shared/constants.js";
import { escapeHtml, haIcon } from "../shared/html.js";
import { typeClass } from "../shared/labels.js";
import { filterHierarchy } from "./hierarchy-data.js";

export const HierarchyView = (Base) =>
  class extends Base {
    _renderHierarchy() {
      const container = this.shadowRoot.getElementById("graph-container");

      if (!container || !this._hierarchy) {
        return;
      }

      const { hierarchy, matches } = filterHierarchy(this._hierarchy, this._searchQuery);
      this._setSearchCount(matches);
      container.innerHTML = this._hierarchyViewMarkup(hierarchy);
      this._wireHierarchyToggles(container);
      this._renderHierarchyContent(container.querySelector("#hierarchy-content"), hierarchy, matches);
    }

    _renderHierarchyContent(content, hierarchy, matches) {
      if (matches === 0) {
        content.innerHTML = `<div class="empty-state">${this._t("no_match")}</div>`;

        return;
      }

      if (this._hierarchyMode === "list") {
        content.classList.remove("tree-mode");
        this._renderHierarchyList(content, hierarchy);

        return;
      }

      this._renderHierarchyTree(content, hierarchy);
    }

    _hierarchyViewMarkup(hierarchy) {
      const deviceCount = hierarchy.areas.reduce((sum, area) => sum + area.devices.length, 0)
        + hierarchy.unassigned_devices.length;

      return `
        <div class="hierarchy-view">
          <div class="hierarchy-header">
            <h2>${haIcon("mdi:file-tree")} ${this._t("hierarchy_title")}</h2>
            <span class="count-badge">${this._t("areas_count", { count: hierarchy.areas.length })} · ${this._t("devices_count", { count: deviceCount })}</span>
            <div class="hierarchy-actions">${this._hierarchyActionsMarkup()}</div>
          </div>
          <div class="hierarchy-content" id="hierarchy-content"></div>
        </div>`;
    }

    _hierarchyActionsMarkup() {
      const tree = this._hierarchyMode === "tree";
      const modes = `<div class="view-toggle">
          ${this._toggleMarkup("mode-list", !tree, "mdi:format-list-bulleted", "mode_list")}
          ${this._toggleMarkup("mode-tree", tree, "mdi:file-tree-outline", "mode_tree")}
        </div>`;

      if (tree) {
        const horizontal = this._treeOrientation === "horizontal";

        return `${modes}<div class="view-toggle">
            ${this._toggleMarkup("orient-h", horizontal, "mdi:arrow-left-right", "orient_horizontal")}
            ${this._toggleMarkup("orient-v", !horizontal, "mdi:arrow-up-down", "orient_vertical")}
          </div>`;
      }

      return `${modes}
        <button class="btn btn-sm" id="expand-all">${haIcon("mdi:unfold-more-horizontal")} ${this._t("expand_all")}</button>
        <button class="btn btn-sm" id="collapse-all">${haIcon("mdi:unfold-less-horizontal")} ${this._t("collapse_all")}</button>`;
    }

    _toggleMarkup(id, active, icon, labelKey) {
      return `<button class="btn btn-sm ${active ? "toggle-active" : ""}" id="${id}" aria-pressed="${active}">
          ${haIcon(icon)} ${this._t(labelKey)}
        </button>`;
    }

    _wireHierarchyToggles(container) {
      const choices = {
        "mode-list": () => { this._hierarchyMode = "list"; },
        "mode-tree": () => { this._hierarchyMode = "tree"; },
        "orient-h": () => { this._treeOrientation = "horizontal"; },
        "orient-v": () => { this._treeOrientation = "vertical"; },
      };

      Object.entries(choices).forEach(([id, choose]) => {
        container.querySelector(`#${id}`)?.addEventListener("click", () => {
          choose();
          this._renderHierarchy();
        });
      });
    }

    _renderHierarchyList(content, hierarchy) {
      const t = (key, vars) => this._t(key, vars);
      content.innerHTML = `
        <div class="hierarchy-tree" title="${t("open_in_graph_hint")}">
          ${hierarchy.areas.map(area => renderHierarchyAreaNode(area, t)).join("")}
          ${renderUnassignedDevices(hierarchy.unassigned_devices, t)}
          ${renderUnassignedEntities(hierarchy.unassigned_entities, t)}
        </div>`;
      this._wireHierarchyListEvents(content);

      if (this._searchQuery) {
        this._setAllBranchesOpen(content, true);
      }
    }

    _setAllBranchesOpen(content, open) {
      content.querySelectorAll("details").forEach(details => {
        details.open = open;
      });
    }

    _wireHierarchyListEvents(content) {
      const root = content.closest(".hierarchy-view");

      root.querySelector("#expand-all")?.addEventListener("click", () => this._setAllBranchesOpen(content, true));
      root.querySelector("#collapse-all")?.addEventListener("click", () => this._setAllBranchesOpen(content, false));
      content.querySelectorAll("[data-node]").forEach(el => {
        el.addEventListener("dblclick", (e) => {
          e.preventDefault();
          this._openNodeInGraph(el.dataset.node);
        });
      });
    }
  };

function renderUnassignedDevices(devices, t) {
  if (devices.length === 0) {
    return "";
  }

  return `
    <details class="tree-area" open>
      <summary class="tree-branch area-branch unassigned">
        ${haIcon("mdi:package-variant", "tree-icon")}
        <span class="tree-title area-title">${t("unassigned_devices")}</span>
        <span class="tree-count">${t("devices_count", { count: devices.length })}</span>
      </summary>
      <div class="tree-children">${devices.map(dev => renderHierarchyDeviceNode(dev, t)).join("")}</div>
    </details>`;
}

function renderUnassignedEntities(entities, t) {
  if (entities.length === 0) {
    return "";
  }

  return `
    <details class="tree-area">
      <summary class="tree-branch area-branch unassigned">
        ${haIcon("mdi:package-variant", "tree-icon")}
        <span class="tree-title area-title">${t("unassigned_entities")}</span>
        <span class="tree-count">${entities.length}</span>
      </summary>
      <div class="tree-children">${entities.map(ent => renderHierarchyEntityRow(ent, t)).join("")}</div>
    </details>`;
}

function renderHierarchyEntityRow(ent, t) {
  const type = ent.node_type in NODE_CONFIG ? ent.node_type : "entity";
  const cfg = NODE_CONFIG[type];
  const badges = [];

  if (ent.disabled) {
    badges.push(`<span class="tree-badge disabled">${t("badge_disabled")}</span>`);
  }

  if (!ent.available) {
    badges.push(`<span class="tree-badge unavailable">${t("badge_unavailable")}</span>`);
  }

  return `
    <div class="tree-leaf" data-node="${escapeHtml(ent.node_id)}">
      <span class="tree-icon ${typeClass(type)}">${haIcon(cfg.icon)}</span>
      <span class="tree-title">${escapeHtml(ent.title)}</span>
      <code class="tree-id">${escapeHtml(ent.node_id)}</code>
      ${badges.join("")}
    </div>`;
}

function renderHierarchyDeviceNode(dev, t) {
  const cfg = NODE_CONFIG.device;
  const { manufacturer, model } = dev.metadata || {};
  const meta = manufacturer
    ? `<span class="tree-meta">${escapeHtml(manufacturer)}${model ? " · " + escapeHtml(model) : ""}</span>`
    : "";
  const children = dev.entities.length > 0
    ? dev.entities.map(ent => renderHierarchyEntityRow(ent, t)).join("")
    : `<div class="tree-empty">${t("no_entities")}</div>`;

  return `
    <details class="tree-device">
      <summary class="tree-branch" data-node="${escapeHtml(dev.node_id)}">
        <span class="tree-icon type-device">${haIcon(cfg.icon)}</span>
        <span class="tree-title">${escapeHtml(dev.title)}</span>
        <span class="tree-count">${dev.entities.length}</span>
        ${meta}
      </summary>
      <div class="tree-children">
        ${children}
      </div>
    </details>`;
}

function renderHierarchyAreaNode(area, t) {
  const totalChildren = area.devices.length + area.entities.length;
  const directEntities = area.entities.length > 0
    ? `
        <div class="tree-direct-entities">
          <div class="tree-section-label">${t("direct_entities")}</div>
          ${area.entities.map(ent => renderHierarchyEntityRow(ent, t)).join("")}
        </div>
      `
    : "";
  const emptyNote = totalChildren === 0 ? `<div class="tree-empty">${t("empty_area")}</div>` : "";

  return `
    <details class="tree-area" open>
      <summary class="tree-branch area-branch" data-node="${escapeHtml(area.node_id)}">
        <span class="tree-icon type-area">${haIcon(NODE_CONFIG.area.icon)}</span>
        <span class="tree-title area-title">${escapeHtml(area.title)}</span>
        <span class="tree-count">${t("devices_count", { count: area.device_count })}</span>
        <span class="tree-count">${t("entities_total", { count: area.entity_count })}</span>
      </summary>
      <div class="tree-children">
        ${area.devices.map(dev => renderHierarchyDeviceNode(dev, t)).join("")}
        ${directEntities}
        ${emptyNote}
      </div>
    </details>`;
}
