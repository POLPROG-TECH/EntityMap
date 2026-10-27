export const THEME_PREFERENCES = ["auto", "light", "dark"];

const prefersDarkScheme = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

/**
 * "auto" follows Home Assistant's `hass.themes.darkMode`, or the system
 * preference without it. "light" and "dark" override it for this panel only
 * (`override`). The key changes whenever the drawn theme does.
 */
export function themeState(hass, prefersDark, preference = "auto") {
  const override = preference === "light" || preference === "dark" ? preference : null;
  const dark = override ? override === "dark" : hass?.themes?.darkMode ?? prefersDark;
  const name = hass?.themes?.theme ?? "";

  return { dark, override, key: `${dark ? "dark" : "light"}:${name}:${override ?? "auto"}` };
}

export const ThemeSyncView = (Base) =>
  class extends Base {
    /**
     * `color-scheme` makes native controls (selects, sliders, scrollbars)
     * match; the 3D canvas resolves colors once, so it is redrawn on change.
     */
    _syncTheme() {
      const theme = themeState(this._hass, prefersDarkScheme(), this._themePreference);

      if (theme.key === this._themeKey) {
        return;
      }

      const changed = this._themeKey !== null;

      this._themeKey = theme.key;
      this.toggleAttribute("dark-theme", theme.dark);
      this._applyThemeOverride(theme.override);

      if (changed && this._viewMode === "graph" && this._is3d()) {
        this._renderGraph();
      }
    }

    _applyThemeOverride(override) {
      if (override) {
        this.setAttribute("theme-override", override);

        return;
      }

      this.removeAttribute("theme-override");
    }

    _setThemePreference(preference) {
      this._themePreference = THEME_PREFERENCES.includes(preference) ? preference : "auto";
      this._syncTheme();
    }
  };
