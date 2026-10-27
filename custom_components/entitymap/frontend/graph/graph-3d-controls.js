import { haIcon } from "../shared/html.js";
import { buildViewLink } from "./graph-3d-link.js";

const PRESETS = [
  { name: "top", labelKey: "preset_top", icon: "mdi:arrow-down-bold-box-outline" },
  { name: "side", labelKey: "preset_side", icon: "mdi:arrow-right-bold-box-outline" },
  { name: "iso", labelKey: "preset_iso", icon: "mdi:cube-outline" },
];
const FLOOR_GAP = { min: 100, max: 360, step: 10 };

export const Graph3dControlsView = (Base) =>
  class extends Base {
    _floorNameOf(node) {
      const math = this._scene3dModules.math;

      return math.FLOORS[math.floorOf(node.node_type)];
    }

    _appendScene3dControls(container, view) {
      const toolbar = document.createElement("div");
      toolbar.className = "scene3d-toolbar";
      toolbar.setAttribute("role", "toolbar");
      toolbar.setAttribute("aria-label", this._tText("scene3d_controls"));
      toolbar.innerHTML = this._scene3dControlsMarkup();
      container.appendChild(toolbar);
      this._wireScene3dControls(toolbar);
    }

    _scene3dControlsMarkup() {
      const presets = PRESETS.map(({ name, labelKey, icon }) =>
        `<button class="btn btn-sm" data-preset="${name}" title="${this._t(labelKey)}">${haIcon(icon)} <span>${this._t(labelKey)}</span></button>`
      ).join("");

      return `
        <div class="scene3d-group" role="group" aria-label="${this._t("camera_views")}">${presets}</div>
        <label class="scene3d-spread">
          <span>${this._t("floor_spacing")}</span>
          <input type="range" id="floor-gap" min="${FLOOR_GAP.min}" max="${FLOOR_GAP.max}" step="${FLOOR_GAP.step}"
                 value="${this._floorGap3d}" />
        </label>
        <button class="btn btn-sm" id="copy-view-link" title="${this._t("copy_view_link")}">
          ${haIcon("mdi:link-variant")} <span>${this._t("copy_view_link")}</span>
        </button>`;
    }

    _wireScene3dControls(toolbar) {
      toolbar.querySelectorAll("[data-preset]").forEach(button =>
        button.addEventListener("click", () => this._scene3d?.setPreset(button.dataset.preset))
      );
      toolbar.querySelector("#floor-gap")?.addEventListener("input", (e) => {
        this._floorGap3d = Number(e.target.value);
        this._scene3d?.setFloorGap(this._floorGap3d);
      });
      toolbar.querySelector("#copy-view-link")?.addEventListener("click", () => this._copyViewLink());
    }

    async _copyViewLink() {
      const camera = this._scene3d?.camera;

      if (!camera) {
        return;
      }

      try {
        await navigator.clipboard.writeText(buildViewLink(window.location, camera));
        this._announce(this._tText("link_copied"));
      } catch (e) {
        this._announce(this._tText("link_copy_failed"));
      }
    }
  };
