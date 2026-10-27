export const TOOLBAR_STYLES = `
      .filter-bar {
        display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px;
        padding: 10px 24px; border-bottom: 1px solid var(--em-border); background: var(--em-bg);
      }
      .filter-group { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .filter-label {
        flex-shrink: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
        text-transform: uppercase; color: var(--em-text-secondary);
      }

      .type-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .type-chip {
        display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px 4px 10px;
        border-radius: 16px; border: 1px solid var(--em-border); background: var(--em-bg);
        color: var(--em-text); font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
        transition: background var(--em-transition), color var(--em-transition);
      }
      .type-chip:hover { background: var(--em-surface); }
      .type-chip:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 2px; }
      .type-chip.off { border-style: dashed; background: transparent; color: var(--em-text-secondary); }
      .type-chip.off .type-name { text-decoration: line-through; }
      .type-chip.off .type-swatch { background: transparent; box-shadow: inset 0 0 0 1.5px var(--type-color); }
      .chip-count {
        padding: 0 6px; border-radius: 8px; background: var(--em-surface);
        font-size: 11px; color: var(--em-text-secondary); font-variant-numeric: tabular-nums;
      }
      .type-swatch { display: inline-block; flex-shrink: 0; width: 10px; height: 10px; background: var(--type-color); }
      .swatch-circle { border-radius: 50%; }
      .swatch-rect { border-radius: 2px; }
      .swatch-diamond { border-radius: 1px; transform: rotate(45deg) scale(0.85); }


      .segmented { display: inline-flex; padding: 2px; border-radius: 8px; background: var(--em-surface); }
      .segment {
        padding: 3px 10px; border: none; border-radius: 6px; background: transparent; cursor: pointer;
        font: inherit; font-size: 11px; font-weight: 600; color: var(--em-text-secondary);
      }
      .segment.active { background: var(--em-bg); color: var(--em-text); box-shadow: var(--em-shadow-sm); }
      .segment:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 1px; }
      .filter-summary {
        display: flex; align-items: center; gap: 10px; margin-left: auto;
        font-size: 12px; color: var(--em-text-secondary);
      }

      .scope-picker, .view-menu { position: relative; }
      .popup {
        position: absolute; top: calc(100% + 6px); z-index: 10; padding: 6px;
        background: var(--em-bg); border: 1px solid var(--em-border); border-radius: 10px;
        box-shadow: var(--em-shadow-md);
      }
      .popup[hidden] { display: none; }

      .scope-trigger { max-width: 220px; color: var(--em-text); }
      .scope-current { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .scope-popup { left: 0; width: 280px; }
      .scope-search {
        width: 100%; margin-bottom: 6px; padding: 6px 10px; border-radius: 8px;
        border: 1px solid var(--em-border); background: var(--em-surface); color: var(--em-text); font-size: 13px;
      }
      .scope-search:focus { outline: none; border-color: var(--em-primary); }
      .scope-list { list-style: none; max-height: 280px; overflow-y: auto; }
      .scope-heading {
        padding: 8px 8px 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
        text-transform: uppercase; color: var(--em-text-secondary);
      }
      .scope-option {
        display: flex; justify-content: space-between; align-items: center; gap: 8px;
        padding: 6px 8px; border-radius: 6px; font-size: 13px; cursor: pointer;
      }
      .scope-option:hover, .scope-option.active { background: var(--em-primary-tint); }
      .scope-option.active { box-shadow: inset 0 0 0 1px var(--em-primary); }
      .scope-option[aria-selected="true"] { font-weight: 600; color: var(--em-primary); }
      .scope-empty { padding: 10px 8px; font-size: 13px; color: var(--em-text-secondary); }

      .menu-popup { right: 0; min-width: 240px; }
      .menu-item {
        display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
        border: none; border-radius: 6px; background: none; color: var(--em-text);
        font: inherit; font-size: 13px; text-align: left; cursor: pointer;
      }
      .menu-item:hover, .menu-item:focus-visible { background: var(--em-surface); outline: none; }
      .menu-item span { flex: 1; white-space: nowrap; }
      .menu-check { visibility: hidden; color: var(--em-primary); }
      .menu-label {
        padding: 6px 12px 2px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
        text-transform: uppercase; color: var(--em-text-secondary);
      }
      .menu-item[aria-checked="true"] .menu-check { visibility: visible; }
      .menu-separator { height: 1px; margin: 4px 0; background: var(--em-border); }

      .sheet-header, .filters-backdrop, .filters-btn { display: none; }
      .filter-badge {
        min-width: 18px; padding: 0 5px; border-radius: 9px; background: var(--em-primary);
        color: #fff; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center;
      }
      @media (max-width: 700px) {
        .filters-btn { display: inline-flex; align-items: center; gap: 6px; }
        .filter-bar { display: none; }
        .filters-open .filter-bar {
          display: flex; flex-direction: column; align-items: stretch; gap: 16px;
          position: absolute; left: 0; right: 0; bottom: 0; z-index: 8; max-height: 75%;
          overflow-y: auto; padding: 16px; border-top: 1px solid var(--em-border);
          border-radius: var(--em-radius) var(--em-radius) 0 0; box-shadow: var(--em-shadow-md);
        }
        .filters-open .filters-backdrop {
          display: block; position: absolute; inset: 0; z-index: 7;
          background: color-mix(in srgb, #000 35%, transparent);
        }
        .filters-open .sheet-header { display: flex; justify-content: space-between; align-items: center; }
        .sheet-header h2 { font-size: 16px; font-weight: 600; }
        .filter-group { flex-direction: column; align-items: flex-start; }
        .filter-summary { margin-left: 0; justify-content: space-between; }
        .scope-popup { width: min(280px, calc(100vw - 48px)); }
      }
`;
