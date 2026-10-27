import { SEVERITY_COLORS } from "../shared/constants.js";

export const HEADER_STYLES = `
      .entitymap-header {
        display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px;
        padding: 12px 24px; background: var(--em-bg);
        border-bottom: 1px solid var(--em-border); box-shadow: var(--em-shadow-sm); z-index: 2;
      }
      .header-left { display: flex; align-items: center; gap: 8px; min-width: 0; margin-right: 8px; }
      .header-left ha-menu-button { display: flex; align-items: center; }

      .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .brand-mark {
        display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        width: 40px; height: 40px; border-radius: 12px; color: #fff;
        background: linear-gradient(135deg, color-mix(in srgb, var(--em-primary) 78%, #fff), var(--em-primary));
        box-shadow: 0 2px 8px var(--em-primary-glow), inset 0 1px 0 rgba(255, 255, 255, 0.25);
      }
      .brand-mark ha-icon { --mdc-icon-size: 22px; }
      .brand-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .brand-text h1 { font-size: 18px; font-weight: 650; line-height: 1.2; letter-spacing: -0.015em; }
      .subtitle {
        display: flex; flex-wrap: wrap; align-items: center; row-gap: 2px;
        font-size: 12px; line-height: 1.4; color: var(--em-text-secondary);
      }
      .subtitle-item { display: inline-flex; align-items: center; white-space: nowrap; }
      .subtitle-item + .subtitle-item::before {
        content: ""; width: 3px; height: 3px; margin: 0 8px; border-radius: 50%;
        background: currentColor; opacity: 0.5;
      }
      .scan-age { gap: 6px; }
      .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--em-text-secondary); }
      .scan-ok .status-dot { background: var(--em-success-text); box-shadow: 0 0 0 3px color-mix(in srgb, var(--em-success-text) 18%, transparent); }
      .scan-warn { color: var(--em-warning-text); font-weight: 500; }
      .scan-warn .status-dot { background: var(--em-warning-text); }
      .header-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

      .view-tabs { display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--em-surface); }
      .tab {
        display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
        border: none; border-radius: 8px; background: transparent; cursor: pointer;
        color: var(--em-text-secondary); font: inherit; font-size: 13px; font-weight: 500;
        transition: background var(--em-transition), color var(--em-transition);
      }
      .tab:hover:not(.active) { background: var(--em-border); color: var(--em-text); }
      .tab.active { background: var(--em-bg); color: var(--em-text); box-shadow: var(--em-shadow-sm); }
      .tab.active ha-icon { color: var(--em-primary); }
      .tab:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 2px; }
      .tab-badge {
        min-width: 18px; padding: 0 5px; border-radius: 9px; line-height: 18px; text-align: center;
        font-size: 11px; font-weight: 700; color: #fff; background: var(--em-text-secondary);
      }
      .tab-badge.severity-critical { background: ${SEVERITY_COLORS.critical}; }
      .tab-badge.severity-high { background: ${SEVERITY_COLORS.high}; }
      .tab-badge.severity-medium { background: ${SEVERITY_COLORS.medium}; color: #000; }
      .tab-badge.severity-low { background: ${SEVERITY_COLORS.low}; color: #000; }
      .tab-badge.severity-info { background: ${SEVERITY_COLORS.info}; }

      .search-box { position: relative; flex: 1 1 220px; max-width: 420px; min-width: 180px; }
      .search-icon {
        position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
        color: var(--em-text-secondary); pointer-events: none;
      }
      .search-input {
        width: 100%; padding: 7px 96px 7px 32px; border-radius: 10px;
        border: 1px solid var(--em-border); background: var(--em-surface); color: var(--em-text);
        font-size: 13px; outline: none; transition: border-color var(--em-transition), box-shadow var(--em-transition);
      }
      .search-input::-webkit-search-cancel-button { display: none; }
      .search-input::placeholder { color: var(--em-text-secondary); opacity: 0.8; }
      .search-input:focus { border-color: var(--em-primary); box-shadow: 0 0 0 3px var(--em-primary-glow); }
      .search-count, .search-kbd, .search-clear { position: absolute; top: 50%; transform: translateY(-50%); }
      .search-count {
        right: 36px; font-size: 11px; color: var(--em-text-secondary); pointer-events: none;
        font-variant-numeric: tabular-nums; white-space: nowrap;
      }
      .search-kbd {
        right: 10px; padding: 0 6px; border: 1px solid var(--em-border); border-radius: 4px;
        font-family: inherit; font-size: 11px; line-height: 18px; color: var(--em-text-secondary); pointer-events: none;
      }
      .search-input:focus ~ .search-kbd, .search-box.has-query .search-kbd { display: none; }
      .search-clear {
        right: 6px; display: flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; padding: 0; border: none; border-radius: 6px;
        background: transparent; color: var(--em-text-secondary); cursor: pointer;
      }
      .search-clear:hover { background: var(--em-border); color: var(--em-text); }
      .search-clear:focus-visible { outline: 2px solid var(--em-primary); }
      .search-box:not(.has-query) .search-clear { display: none; }

      .view-menu-trigger, .scan-btn { display: inline-flex; align-items: center; gap: 6px; }
      .menu-chevron { --mdc-icon-size: 14px; color: var(--em-text-secondary); }
      .scan-btn[disabled] { opacity: 0.7; cursor: progress; }
      .scan-btn[aria-busy="true"] .scan-icon { animation: spin 1s linear infinite; }

      @media (max-width: 1100px) {
        .header-left { width: 100%; margin-right: 0; }
      }

      @media (max-width: 700px) {
        .entitymap-header { padding: 8px 12px; gap: 8px; }
        .view-tabs { width: 100%; }
        .view-tabs .tab { flex: 1; justify-content: center; padding: 6px 8px; }
        .search-box { flex: 1 1 100%; max-width: none; }
        .search-kbd { display: none; }
        .header-actions { width: 100%; flex-wrap: wrap; }
        .scan-btn { margin-left: auto; }
      }

      @media (max-width: 380px) {
        .menu-chevron { display: none; }
      }
`;
