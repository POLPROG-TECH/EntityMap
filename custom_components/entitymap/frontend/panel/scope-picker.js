import { escapeHtml, haIcon } from "../shared/html.js";
import { buildScopeOptions, filterScopeOptions, parseScopeKey, scopeKey } from "./filter-options.js";

/**
 * ARIA combobox pattern: focus stays in the search field while the arrow
 * keys move a highlighted option (aria-activedescendant).
 */
export const ScopePickerView = (Base) =>
  class extends Base {
    _scopePickerMarkup() {
      return `
        <div class="scope-picker" data-popup-root>
          <button class="btn btn-sm scope-trigger" id="scope-trigger" aria-haspopup="listbox"
                  aria-expanded="false" aria-controls="scope-popup" title="${this._t("scope_label")}">
            <span class="scope-current">${escapeHtml(this._currentScopeLabel())}</span>
            ${haIcon("mdi:chevron-down")}
          </button>
          <div class="scope-popup popup" id="scope-popup" hidden>
            <input type="search" class="scope-search" id="scope-search" role="combobox" aria-expanded="true"
                   aria-controls="scope-list" aria-autocomplete="list" aria-label="${this._t("scope_label")}"
                   placeholder="${this._t("scope_search")}" />
            <ul class="scope-list" id="scope-list" role="listbox" aria-label="${this._t("scope_label")}"></ul>
          </div>
        </div>`;
    }

    _currentScopeLabel() {
      if (!this._scopeFilter) {
        return this._tText("scope_all");
      }

      const { kind, value } = this._scopeFilter;

      return kind === "area" ? this._areaNames.get(value) || value : value;
    }

    _wireScopePicker(root) {
      root.getElementById("scope-trigger")?.addEventListener("click", () => this._toggleScopePicker());

      const search = root.getElementById("scope-search");
      search?.addEventListener("input", () => this._renderScopeList(search.value));
      search?.addEventListener("keydown", (e) => this._onScopeKeyDown(e));
      root.getElementById("scope-list")?.addEventListener("click", (e) => this._onScopeListClick(e));
    }

    _toggleScopePicker() {
      if (this._openPopup === "scope") {
        this._closeScopePicker();

        return;
      }

      this._closePopups();
      this._openPopup = "scope";
      this._scopeOptions = buildScopeOptions(this._graph?.nodes, this._areaNames);
      this.shadowRoot.getElementById("scope-popup").hidden = false;
      this.shadowRoot.getElementById("scope-trigger").setAttribute("aria-expanded", "true");

      const search = this.shadowRoot.getElementById("scope-search");
      search.value = "";
      this._renderScopeList("");
      search.focus();
    }

    _closeScopePicker({ focusTrigger = false } = {}) {
      const popup = this.shadowRoot.getElementById("scope-popup");

      if (this._openPopup === "scope") {
        this._openPopup = null;
      }

      if (!popup) {
        return;
      }

      popup.hidden = true;
      const trigger = this.shadowRoot.getElementById("scope-trigger");
      trigger.setAttribute("aria-expanded", "false");

      if (focusTrigger) {
        trigger.focus();
      }
    }

    _renderScopeList(query) {
      const list = this.shadowRoot.getElementById("scope-list");
      const options = filterScopeOptions(this._scopeOptions || [], query);
      const entries = [{ kind: "", value: "", label: this._tText("scope_all"), count: this._graph?.nodes.length || 0 }, ...options];

      this._scopeEntries = entries;
      this._scopeActive = Math.max(0, entries.findIndex(entry => scopeKey(entry.kind ? entry : null) === scopeKey(this._scopeFilter)));
      list.innerHTML = options.length || !query
        ? this._scopeListItems(entries)
        : `<li class="scope-empty" role="presentation">${this._t("scope_no_results")}</li>`;
      this._highlightScopeOption();
    }

    _scopeListItems(entries) {
      let lastKind = null;

      return entries.map((entry, index) => {
        const heading = entry.kind && entry.kind !== lastKind
          ? `<li class="scope-heading" role="presentation">${this._t(entry.kind === "area" ? "scope_areas" : "scope_domains")}</li>`
          : "";
        lastKind = entry.kind || lastKind;
        const key = entry.kind ? scopeKey(entry) : "";
        const selected = key === scopeKey(this._scopeFilter);

        return `${heading}<li class="scope-option" role="option" id="scope-option-${index}" data-index="${index}"
                    data-scope="${escapeHtml(key)}" aria-selected="${selected}">
                  <span>${escapeHtml(entry.label)}</span><span class="chip-count">${entry.count}</span>
                </li>`;
      }).join("");
    }

    _highlightScopeOption() {
      const options = this.shadowRoot.querySelectorAll(".scope-option");
      const search = this.shadowRoot.getElementById("scope-search");

      options.forEach(option => option.classList.toggle("active", Number(option.dataset.index) === this._scopeActive));

      const active = this.shadowRoot.getElementById(`scope-option-${this._scopeActive}`);
      search?.setAttribute("aria-activedescendant", active ? active.id : "");
      active?.scrollIntoView({ block: "nearest" });
    }

    _onScopeKeyDown(e) {
      const last = (this._scopeEntries?.length || 1) - 1;
      const moves = { ArrowDown: 1, ArrowUp: -1 };

      if (e.key in moves) {
        e.preventDefault();
        this._scopeActive = Math.min(last, Math.max(0, this._scopeActive + moves[e.key]));
        this._highlightScopeOption();

        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        this._chooseScope(this.shadowRoot.getElementById(`scope-option-${this._scopeActive}`)?.dataset.scope);

        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this._closeScopePicker({ focusTrigger: true });
      }
    }

    _onScopeListClick(e) {
      const option = e.target.closest(".scope-option");

      if (option) {
        this._chooseScope(option.dataset.scope);
      }
    }

    _chooseScope(key) {
      if (key === undefined) {
        return;
      }

      this._openPopup = null;
      this._scopeFilter = parseScopeKey(key);
      this._resetViewport();
      this._refreshAfterFilterChange("#scope-trigger");
    }
  };
