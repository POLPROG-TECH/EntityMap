import { haIcon } from "../shared/html.js";
import { savePreferences } from "./panel-state.js";
import { THEME_PREFERENCES } from "./theme-sync.js";

const NAVIGATION_STEPS = { ArrowDown: 1, ArrowUp: -1 };
const THEME_ICONS = { auto: "mdi:theme-light-dark", light: "mdi:white-balance-sunny", dark: "mdi:weather-night" };

/**
 * ARIA menu button pattern: the trigger opens the menu, focus moves to the
 * first item, arrows cycle, Escape and Tab close it.
 */
export const ViewMenuView = (Base) =>
  class extends Base {
    _viewMenuMarkup() {
      const exportItem = this._viewMode === "graph"
        ? `<div class="menu-separator" role="separator"></div>
           <button class="menu-item" role="menuitem" data-menu="export" tabindex="-1">
             ${haIcon("mdi:download")} <span>${this._t("menu_export_png")}</span>
           </button>`
        : "";

      return `
        <div class="view-menu" data-popup-root>
          <button class="btn view-menu-trigger" id="view-menu-trigger" aria-haspopup="menu" aria-expanded="false"
                  aria-controls="view-menu" title="${this._t("view_menu")}" aria-label="${this._t("view_menu")}">
            ${haIcon("mdi:tune-variant")} <span class="btn-label">${this._t("view_menu_short")}</span>
            ${haIcon("mdi:chevron-down", "menu-chevron")}
          </button>
          <div class="menu-popup popup" id="view-menu" role="menu" aria-label="${this._t("view_menu")}" hidden>
            ${this._themeMenuMarkup()}
            <div class="menu-separator" role="separator"></div>
            ${this._menuCheckboxMarkup("density", this._density === "compact", "mdi:arrow-collapse-vertical", "menu_compact")}
            ${this._menuCheckboxMarkup("colorblind", this._colorblind, "mdi:invert-colors", "menu_colorblind")}
            ${this._menuCheckboxMarkup("animations", this._animations, "mdi:animation-play-outline", "menu_animations")}
            ${exportItem}
          </div>
        </div>`;
    }

    _themeMenuMarkup() {
      const options = THEME_PREFERENCES.map(preference => `
        <button class="menu-item" role="menuitemradio" aria-checked="${preference === this._themePreference}"
                data-menu="theme-${preference}" tabindex="-1">
          ${haIcon(THEME_ICONS[preference])} <span>${this._t(`theme_${preference}`)}</span>
          ${haIcon("mdi:check", "menu-check")}
        </button>`).join("");

      return `<div role="group" aria-labelledby="menu-theme-label">
          <div class="menu-label" id="menu-theme-label">${this._t("menu_theme")}</div>
          ${options}
        </div>`;
    }

    _menuCheckboxMarkup(action, checked, icon, labelKey) {
      return `<button class="menu-item" role="menuitemcheckbox" aria-checked="${checked}" data-menu="${action}" tabindex="-1">
          ${haIcon(icon)} <span>${this._t(labelKey)}</span>
          ${haIcon("mdi:check", "menu-check")}
        </button>`;
    }

    _wireViewMenu(root) {
      root.getElementById("view-menu-trigger")?.addEventListener("click", () => this._toggleViewMenu());

      const menu = root.getElementById("view-menu");
      menu?.addEventListener("keydown", (e) => this._onViewMenuKeyDown(e));
      menu?.querySelectorAll("[data-menu]").forEach(item =>
        item.addEventListener("click", () => this._runViewMenuAction(item.dataset.menu))
      );
    }

    _toggleViewMenu() {
      if (this._openPopup === "view-menu") {
        this._closeViewMenu({ focusTrigger: true });

        return;
      }

      this._closePopups();
      this._openPopup = "view-menu";
      this.shadowRoot.getElementById("view-menu").hidden = false;
      this.shadowRoot.getElementById("view-menu-trigger").setAttribute("aria-expanded", "true");
      this._viewMenuItems()[0]?.focus();
    }

    _closeViewMenu({ focusTrigger = false } = {}) {
      const menu = this.shadowRoot.getElementById("view-menu");

      if (this._openPopup === "view-menu") {
        this._openPopup = null;
      }

      if (!menu) {
        return;
      }

      menu.hidden = true;
      const trigger = this.shadowRoot.getElementById("view-menu-trigger");
      trigger.setAttribute("aria-expanded", "false");

      if (focusTrigger) {
        trigger.focus();
      }
    }

    _viewMenuItems() {
      return [...this.shadowRoot.querySelectorAll("#view-menu [data-menu]")];
    }

    _onViewMenuKeyDown(e) {
      const items = this._viewMenuItems();
      const current = items.indexOf(this.shadowRoot.activeElement);

      if (e.key in NAVIGATION_STEPS) {
        e.preventDefault();
        items[(current + NAVIGATION_STEPS[e.key] + items.length) % items.length]?.focus();

        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this._closeViewMenu({ focusTrigger: true });

        return;
      }

      if (e.key === "Tab") {
        this._closeViewMenu();
      }
    }

    _togglePreference(action) {
      if (action.startsWith("theme-")) {
        this._setThemePreference(action.slice("theme-".length));

        return;
      }

      if (action === "density") {
        this._density = this._density === "compact" ? "comfortable" : "compact";
        this._resetLayout();

        return;
      }

      if (action === "animations") {
        this._animations = !this._animations;

        return;
      }

      this._colorblind = !this._colorblind;
    }

    _runViewMenuAction(action) {
      this._closeViewMenu({ focusTrigger: true });

      if (action === "export") {
        this._exportGraphImage();

        return;
      }

      this._togglePreference(action);
      savePreferences(this);
      this._refreshAfterFilterChange("#view-menu-trigger");
    }
  };
