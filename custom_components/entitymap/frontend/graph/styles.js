export const GRAPH_STYLES = `
      /* Tokens. Integrations can override the --entitymap-* variables from a theme. */
      :host {
        --em-edge-trigger: var(--entitymap-edge-trigger, #F97316);
        --em-edge-condition: var(--entitymap-edge-condition, #8B5CF6);
        --em-edge-action: var(--entitymap-edge-action, #0EA5E9);
        --em-edge-reference: var(--entitymap-edge-reference, #14B8A6);
        --em-edge-structure: var(--entitymap-edge-structure, #94A3B8);
        --em-search: var(--entitymap-search-color, #CA8A04);
        --em-path: var(--entitymap-path-color, #E91E63);
        --em-missing: var(--error-color, #db4437);
        --em-node-outline: var(--card-background-color, #ffffff);
        --em-motion: 180ms ease;
      }
      /* Okabe-Ito hues, matching the colorblind node palette */
      .entitymap-container.colorblind {
        --em-edge-trigger: #E69F00;
        --em-edge-condition: #CC79A7;
        --em-edge-action: #0072B2;
        --em-edge-reference: #009E73;
        --em-edge-structure: #999999;
      }

      /* The label size follows the zoom level, see graph-decor.js */
      .node-label {
        font-size: var(--em-label-size, 10px);
        font-weight: 500;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
        fill: var(--em-text);
        stroke: var(--em-bg);
        stroke-width: calc(var(--em-label-size, 10px) * 0.3);
        pointer-events: none;
      }
      .hide-minor-labels .node-label.minor { display: none; }

      /* Node and edge states; transitions keep context while focus moves */
      .graph-svg .node-group { cursor: pointer; transition: opacity var(--em-motion); }
      .missing-badge { fill: var(--em-missing); stroke: var(--em-node-outline); stroke-width: 1.5px; }
      .missing-badge-mark {
        fill: #fff; font-size: 10px; font-weight: 700; pointer-events: none;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }
      .graph-svg .links path { transition: opacity var(--em-motion), stroke-width var(--em-motion); }
      .node-group.dimmed { opacity: 0.3; }
      .links path.dimmed { opacity: 0.12; }
      .links path.emphasized { opacity: 1; stroke-width: 2.5px; }
      .links path.on-path { stroke: var(--em-path); stroke-width: 3px; opacity: 1; }
      .node-group.selected .node-shape { stroke: var(--em-primary); stroke-width: 3px; }
      .graph-svg.hovering .node-group { opacity: 0.35; }
      .graph-svg.hovering .node-group.hover-near { opacity: 1; }
      .graph-svg.hovering .links path { opacity: 0.08; }
      .graph-svg.hovering .links path.hover-link { opacity: 1; stroke-width: 2.5px; }
      .node-group.hover-self .node-shape { stroke: var(--em-primary); stroke-width: 2.5px; }

      .layout-frame { fill: var(--em-surface); fill-opacity: 0.55; stroke: var(--em-line); stroke-width: 1px; }
      .layout-label, .layout-ring-label, .layout-side-label {
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
        fill: var(--em-text-secondary); pointer-events: none;
      }
      /* Scaled from the node label size, so layout labels stay readable at any zoom like node labels do */
      .layout-label { font-size: calc(var(--em-label-size, 10px) * 1.3); font-weight: 600; }
      .node-group.layout-outside { opacity: 0.4; }
      .links path.layout-outside { opacity: 0.12; }
      .layout-ring { fill: none; stroke: var(--em-line); stroke-width: 1px; stroke-dasharray: 4 6; }
      .layout-ring-label { font-size: calc(var(--em-label-size, 10px) * 1.1); font-weight: 500; }
      .layout-side-label { font-size: calc(var(--em-label-size, 10px) * 1.2); font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }

      .collapsed-badge { cursor: pointer; }
      .collapsed-badge rect { fill: var(--em-primary); stroke: var(--em-node-outline); stroke-width: 1.5px; }
      .collapsed-badge text {
        fill: #fff; font-size: 10px; font-weight: 700; pointer-events: none;
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }

      .flow-path {
        fill: none; stroke-width: 3.5px; stroke-linecap: round; stroke-dasharray: 0 11;
        pointer-events: none; animation: em-flow 0.8s linear infinite;
      }
      .flow-path.reverse { animation-direction: reverse; }
      @keyframes em-flow { to { stroke-dashoffset: -11; } }

      .wave-ring {
        fill: none; stroke: var(--sev-color, #f57c00); stroke-width: 3px; opacity: 0;
        transform-box: fill-box; transform-origin: center; pointer-events: none;
        animation: em-wave 900ms ease-out var(--wave-delay, 0ms) 1 both;
      }
      @keyframes em-wave {
        0% { opacity: 0.9; transform: scale(1); }
        100% { opacity: 0; transform: scale(2.4); }
      }
      .links path.wave-edge { animation: em-edge-pulse 700ms ease-out var(--wave-delay, 0ms) 1 both; }
      @keyframes em-edge-pulse { 40% { stroke: var(--sev-color, #f57c00); stroke-width: 4px; opacity: 1; } }

      /* Out of the flow, so the canvas follows its container's size and never sets it */
      .scene3d-canvas { position: absolute; inset: 0; display: block; cursor: grab; touch-action: none; }
      .scene3d-canvas.over-floor { cursor: default; }
      .scene3d-canvas.over-node { cursor: pointer; }
      .scene3d-canvas:active { cursor: grabbing; }
      .scene3d-canvas:focus-visible { outline: 2px solid var(--em-primary); outline-offset: -2px; }
      .scene3d-hint {
        position: absolute; left: 12px; bottom: 12px; z-index: 3; max-width: calc(100% - 80px);
        padding: 4px 10px; border-radius: 8px; pointer-events: none;
        background: color-mix(in srgb, var(--em-bg) 88%, transparent); border: 1px solid var(--em-border);
        font-size: 11px; color: var(--em-text-secondary);
      }

      .scene3d-toolbar {
        position: absolute; top: 12px; left: 12px; right: 96px; z-index: 3;
        display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
        pointer-events: none;
      }
      .scene3d-toolbar > * { pointer-events: auto; }
      .scene3d-group {
        display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 3px; border-radius: 10px;
        background: color-mix(in srgb, var(--em-bg) 90%, transparent); border: 1px solid var(--em-border);
      }
      .scene3d-group .btn-sm { border: none; }
      .scene3d-spread {
        display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 10px;
        background: color-mix(in srgb, var(--em-bg) 90%, transparent); border: 1px solid var(--em-border);
        font-size: 11px; color: var(--em-text-secondary);
      }
      .scene3d-spread input { width: 110px; accent-color: var(--em-primary); }
      @media (max-width: 700px) {
        .scene3d-toolbar { right: 12px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
        .scene3d-toolbar > * { flex-shrink: 0; }
        .scene3d-group .btn-sm span, #copy-view-link span { display: none; }
      }

      .graph-tooltip {
        position: absolute; z-index: 5; max-width: 260px; pointer-events: none;
        padding: 8px 10px; border-radius: 8px;
        background: var(--em-bg); color: var(--em-text);
        border: 1px solid var(--em-border); box-shadow: var(--em-shadow-md);
        font-size: 12px; line-height: 1.4;
      }
      .graph-tooltip[hidden] { display: none; }
      .tooltip-type { font-size: 11px; color: var(--em-text-secondary); }
      .tooltip-title { font-weight: 600; margin: 2px 0; overflow-wrap: anywhere; }
      .tooltip-id { display: inline-block; margin-bottom: 4px; }
      .tooltip-stats { display: flex; gap: 10px; color: var(--em-text-secondary); font-size: 11px; }
      .tooltip-status { margin-top: 4px; color: var(--em-missing); font-weight: 600; font-size: 11px; }

      .graph-zoom-controls {
        position: absolute; bottom: 16px; right: 16px; z-index: 3;
        display: flex; flex-direction: column; overflow: hidden;
        background: var(--em-bg); border: 1px solid var(--em-border); border-radius: 10px;
        box-shadow: var(--em-shadow-sm);
      }
      .graph-zoom-controls[hidden] { display: none; }
      .zoom-btn {
        width: 36px; height: 34px; border: none; background: transparent;
        color: var(--em-text); cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background var(--em-transition);
      }
      .zoom-btn:hover { background: var(--em-surface); }
      .zoom-btn:focus-visible { outline: 2px solid var(--em-primary); outline-offset: -2px; }
      .zoom-level {
        padding: 2px 0; font-size: 10px; font-weight: 600; text-align: center;
        color: var(--em-text-secondary); font-variant-numeric: tabular-nums;
      }
      .zoom-sep { height: 1px; background: var(--em-border); }

      .minimap {
        position: absolute; top: 12px; right: 12px;
        width: 160px; height: 110px; z-index: 3; overflow: hidden;
        background: color-mix(in srgb, var(--em-bg) 88%, transparent);
        border: 1px solid var(--em-border); border-radius: 8px;
        box-shadow: var(--em-shadow-sm);
      }
      .minimap[hidden] { display: none; }
      .minimap-viewport { fill: var(--em-primary-tint); stroke: var(--em-primary); stroke-width: 1; }

      .graph-banner {
        position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
        z-index: 4; max-width: 80%;
        display: flex; align-items: center; gap: 10px;
        padding: 6px 14px; border-radius: 20px;
        background: color-mix(in srgb, var(--em-bg) 92%, transparent);
        border: 1px solid var(--em-border); box-shadow: var(--em-shadow-md);
        font-size: 12px; color: var(--em-text);
      }
      .graph-banner[hidden] { display: none; }
      .graph-banner code { font-size: 11px; }
      .banner-clear {
        display: inline-flex; align-items: center; gap: 4px;
        border: none; background: var(--em-surface); color: var(--em-text);
        border-radius: 8px; padding: 2px 8px; font: inherit; font-size: 11px; cursor: pointer;
      }
      .banner-clear:hover { background: var(--em-border); }
      .node-group:focus { outline: none; }
      .node-group:focus-visible rect,
      .node-group:focus-visible circle,
      .node-group:focus-visible polygon {
        stroke: var(--em-primary, #1A73E8); stroke-width: 3;
      }

      .legend-edge { flex-shrink: 0; }

      @media (max-width: 700px) {
        .minimap { display: none; }
        .graph-zoom-controls { bottom: 12px; right: 12px; }
        .graph-banner { max-width: calc(100% - 24px); }
      }

      @media (prefers-reduced-motion: reduce) {
        .graph-svg .node-group, .graph-svg .links path { transition: none; }
        .flow-path, .wave-ring, .links path.wave-edge { animation: none; }
      }
`;
