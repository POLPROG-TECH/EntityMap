import { COLOR_TOKEN_STYLES } from "./color-tokens.js";
import { HEADER_STYLES } from "./header-styles.js";
import { TOOLBAR_STYLES } from "./toolbar-styles.js";

export const PANEL_STYLES = `
      /*
       * Home Assistant mounts the panel in <ha-panel-custom>, which has no
       * height, so 100% alone collapses the panel to its content. The panel
       * takes the screen height and stays within a parent that does set one.
       */
      :host {
        display: block;
        height: 100vh;
        height: 100dvh;
        max-height: 100%;
        color-scheme: light;
        --em-bg: var(--card-background-color, #fff);
        --em-surface: var(--secondary-background-color, #f5f5f5);
        --em-text: var(--primary-text-color, #212121);
        --em-text-secondary: var(--secondary-text-color, #757575);
        --em-border: var(--divider-color, #e0e0e0);
        /* Drawn connections need more contrast than dividers, which are near-invisible in dark themes */
        --em-line: color-mix(in srgb, var(--em-text-secondary) 50%, transparent);
        --em-primary: var(--primary-color, #1A73E8);
        --em-radius: 12px;
        --em-shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
        --em-shadow-md: 0 2px 8px rgba(0,0,0,0.10);
        --em-transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        --em-primary-glow: color-mix(in srgb, var(--em-primary) 28%, transparent);
        --em-primary-tint: color-mix(in srgb, var(--em-primary) 6%, transparent);
        --em-warning-bg: color-mix(in srgb, var(--warning-color, #ffa726) 16%, transparent);
        --em-warning-text: var(--warning-color, #e65100);
        --em-success-text: var(--success-color, #2e7d32);
        --em-error-text: var(--error-color, #d32f2f);
      }
      :host([dark-theme]) { color-scheme: dark; }
      /*
       * Home Assistant's light secondary background (#e5e5e5) reads as heavy
       * gray behind tabs and fields; light themes blend it halfway to the card
       * color. Dark themes keep it, where it is the only contrast to the card.
       */
      :host(:not([dark-theme])) {
        --em-surface: color-mix(in srgb, var(--secondary-background-color, #f5f5f5) 45%, var(--em-bg));
      }
      /* A theme forced in View options: Home Assistant's default light and dark palettes */
      :host([theme-override="light"]) {
        --em-bg: #ffffff; --em-surface: #f5f5f5; --em-text: #212121; --em-text-secondary: #727272;
        --em-border: rgba(0, 0, 0, 0.12); --em-node-outline: #ffffff;
      }
      :host([theme-override="dark"]) {
        --em-bg: #1c1c1c; --em-surface: #282828; --em-text: #e1e1e1; --em-text-secondary: #9b9b9b;
        --em-border: rgba(225, 225, 225, 0.12); --em-node-outline: #1c1c1c;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }

      .entitymap-container {
        position: relative;
        display: flex; flex-direction: column; height: 100%;
        background: var(--em-surface); color: var(--em-text);
        font-family: var(--paper-font-body1_-_font-family, "Roboto", sans-serif);
      }

      .btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        padding: 7px 16px; border: 1px solid var(--em-border); border-radius: 10px;
        cursor: pointer; font: inherit; font-size: 13px; font-weight: 500; line-height: 1.2;
        transition: all var(--em-transition);
        background: var(--em-bg); color: var(--em-text);
      }
      .btn-sm {
        gap: 4px; padding: 4px 12px; font-size: 11px; border-radius: 8px;
        color: var(--em-text-secondary);
      }
      .btn-sm:hover { background: var(--em-surface); }
      .toggle-active, .toggle-active:hover {
        background: var(--em-primary); color: #fff; border-color: var(--em-primary);
      }
      .btn:hover { box-shadow: var(--em-shadow-sm); }
      .btn:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 2px; }
      .btn-primary {
        background: var(--em-primary); color: #fff; border-color: var(--em-primary);
      }
      .btn-primary:hover { opacity: 0.92; box-shadow: 0 2px 8px var(--em-primary-glow); }

      .filter-chip {
        padding: 5px 12px; border-radius: 20px; border: 1px solid var(--em-border);
        cursor: pointer; font-size: 12px; font-weight: 500;
        transition: all var(--em-transition);
        background: var(--em-surface); color: var(--em-text-secondary);
        user-select: none;
      }
      .filter-chip.active {
        background: var(--em-primary); color: #fff;
        border-color: var(--em-primary); opacity: 0.9;
      }
      .filter-chip:hover { transform: translateY(-1px); box-shadow: var(--em-shadow-sm); }
      .filter-chip:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 2px; }

      .entitymap-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
      /* Its own stacking context: the minimap, zoom buttons and detail drawer stay under the header's menus */
      .main-content { flex: 1; display: flex; overflow: hidden; position: relative; isolation: isolate; }
      .graph-area {
        flex: 1; min-height: 0; overflow: hidden; position: relative;
        background: var(--em-bg);
      }
      .graph-canvas { position: relative; width: 100%; height: 100%; }
      .graph-canvas svg { width: 100%; height: 100%; }
      .legend {
        display: flex; align-items: center; gap: 14px; padding: 10px 24px;
        border-top: 1px solid var(--em-border); background: var(--em-bg);
        font-size: 11px; color: var(--em-text-secondary); flex-wrap: wrap;
      }
      .legend-item { display: flex; align-items: center; gap: 5px; }
      .legend-sep { color: var(--em-border); }

      .entitymap-footer {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        padding: 6px 24px; font-size: 11px; color: var(--em-text-secondary);
        border-top: 1px solid var(--em-border); background: var(--em-bg);
        flex-shrink: 0;
      }
      .entitymap-footer a {
        color: var(--em-primary); text-decoration: none;
      }
      .entitymap-footer a:hover { text-decoration: underline; }
      .footer-sep { color: var(--em-border); }

      .empty-state {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; height: 100%;
        font-size: 15px; color: var(--em-text-secondary); padding: 40px;
        text-align: center; gap: 8px;
      }
      .empty-state.success { color: var(--em-success-text); }
      .empty-illustration { font-size: 48px; opacity: 0.55; line-height: 1; }
      .empty-state .btn-primary { margin-top: 6px; }
      .loading-state {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; height: 100%; gap: 16px;
      }
      .spinner {
        width: 36px; height: 36px; border: 3px solid var(--em-border);
        border-top-color: var(--em-primary); border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .loading-state p {
        font-size: 14px; color: var(--em-text-secondary); font-weight: 500;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .error-state {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; height: 100%;
        font-size: 14px; color: var(--em-error-text); padding: 40px;
        text-align: center; gap: 8px;
      }

      .icon-btn { padding: 7px 10px; font-size: 14px; line-height: 1; }

      .entitymap-container.compact .filter-bar { padding: 6px 16px; }
      .entitymap-container.compact .legend { padding: 6px 16px; }

      .scope-select {
        padding: 4px 10px; border-radius: 8px; border: 1px solid var(--em-border);
        background: var(--em-bg); color: var(--em-text); font-size: 12px; cursor: pointer;
        max-width: 200px;
      }
      .scope-select:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 2px; }
      .sr-only {
        position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
        overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
      }

      ha-icon {
        --mdc-icon-size: 16px;
        display: inline-flex; align-items: center; justify-content: center;
        flex-shrink: 0; vertical-align: middle; line-height: 0;
      }
      .icon-btn ha-icon, .zoom-btn ha-icon { --mdc-icon-size: 18px; }
      .empty-illustration { --mdc-icon-size: 48px; }
      .error-state > ha-icon { --mdc-icon-size: 32px; }
      .error-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 4px; }

      .callout {
        display: flex; align-items: flex-start; gap: 8px; margin-top: 10px; padding: 8px 10px;
        border-radius: 8px; background: var(--em-surface);
        font-size: 12px; line-height: 1.5; color: var(--em-text);
      }
      .callout-icon { color: var(--em-warning-text); height: 1.5em; }
      .callout-primary { background: var(--em-primary-tint); }
      .callout-primary .callout-icon { color: var(--em-primary); }
      .section-count {
        min-width: 18px; padding: 0 6px; border-radius: 9px; background: var(--em-surface);
        font-size: 11px; font-weight: 600; line-height: 18px; text-align: center; color: var(--em-text-secondary);
      }

      .node-ref {
        border: none; background: none; padding: 0; cursor: pointer; font: inherit;
        color: var(--em-primary);
      }
      .node-ref code { color: inherit; }
      .node-ref:hover code { text-decoration: underline; }
      .node-ref:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 2px; border-radius: 4px; }

      @media (max-width: 700px) {
        .legend { padding: 8px 12px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
        .legend-item, .legend-sep { flex-shrink: 0; white-space: nowrap; }
      }

      @media (prefers-reduced-motion: reduce) {
        .spinner, .scan-icon { animation: none; }
      }
${COLOR_TOKEN_STYLES}
${HEADER_STYLES}
${TOOLBAR_STYLES}
`;
