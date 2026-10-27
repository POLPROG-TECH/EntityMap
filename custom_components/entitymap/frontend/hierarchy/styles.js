export const HIERARCHY_STYLES = `
      .hierarchy-view { padding: 24px; overflow: hidden; height: 100%; display: flex; flex-direction: column; }
      .hierarchy-header {
        display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
        flex-shrink: 0;
      }
      .hierarchy-header h2 { font-size: 18px; font-weight: 600; }
      .hierarchy-actions { display: flex; gap: 6px; margin-left: auto; align-items: center; }
      .hierarchy-content { flex: 1; min-height: 0; overflow-y: auto; }
      /* The tree pans and zooms inside a fixed viewport instead of scrolling a page-sized drawing */
      .hierarchy-content.tree-mode { position: relative; overflow: hidden; cursor: grab; }
      .hierarchy-content.tree-mode:active { cursor: grabbing; }
      .tree-mode .hierarchy-svg { position: absolute; inset: 0; }
      .view-toggle {
        display: flex; gap: 2px; background: var(--em-surface);
        border-radius: 8px; padding: 2px;
      }

      .hierarchy-svg { width: 100%; height: 100%; }
      .tree-node[tabindex] { cursor: pointer; }
      .tree-label { font-size: 12px; fill: var(--em-text); font-family: var(--paper-font-body1_-_font-family, sans-serif); }
      .tree-label.branch-label { font-weight: 600; }
      .tree-link { fill: none; stroke: var(--em-line); stroke-width: 1.5px; }
      .hierarchy-svg .tree-node, .hierarchy-svg .tree-link { transition: opacity 180ms ease; }
      .tree-node:focus { outline: none; }
      .tree-node:focus-visible .node-shape, .tree-node:hover .node-shape { stroke: var(--em-primary); stroke-width: 3px; }

      .tracing .tree-node:not(.branch) { opacity: 0.35; }
      .tracing .tree-link:not(.branch) { opacity: 0.25; }
      .tree-link.branch { stroke: var(--em-primary); stroke-opacity: 0.3; stroke-width: 2.5px; }
      .tree-flow-path {
        fill: none; stroke: var(--em-primary); stroke-width: 3.5px; stroke-linecap: round;
        stroke-dasharray: 0 11; pointer-events: none; animation: em-tree-flow 0.8s linear infinite;
      }
      @keyframes em-tree-flow { to { stroke-dashoffset: -11; } }

      /* Backwards fill: after the intro the animation lets go of opacity, so branch dimming still works. */
      .tree-intro .tree-link {
        stroke-dasharray: 1;
        animation: em-tree-grow 420ms ease-out backwards;
        animation-delay: calc(var(--depth) * 160ms + 80ms);
      }
      .tree-intro .tree-node {
        animation: em-tree-appear 260ms ease-out backwards;
        animation-delay: calc(var(--depth) * 160ms);
      }
      @keyframes em-tree-grow { from { stroke-dashoffset: 1; } }
      @keyframes em-tree-appear { from { opacity: 0; } }

      .hierarchy-tree { display: flex; flex-direction: column; gap: 8px; }

      .tree-area {
        background: var(--em-bg); border: 1px solid var(--em-border);
        border-radius: var(--em-radius); overflow: hidden;
      }
      .tree-area > summary { list-style: none; }
      .tree-area > summary::-webkit-details-marker { display: none; }

      .tree-branch {
        display: flex; align-items: center; gap: 8px; padding: 12px 16px;
        cursor: pointer; user-select: none;
        transition: background var(--em-transition);
      }
      .tree-branch:hover { background: var(--em-surface); }
      .area-branch {
        font-weight: 600; font-size: 14px;
        border-bottom: 1px solid var(--em-border);
      }
      .area-branch.unassigned { color: var(--em-text-secondary); }
      .area-title { flex: 1; }

      .tree-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 22px; color: var(--type-color); }
      .tree-title { font-size: 13px; }
      .tree-count {
        padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;
        background: var(--em-surface); color: var(--em-text-secondary);
        white-space: nowrap;
      }
      .tree-meta {
        font-size: 10px; color: var(--em-text-secondary); margin-left: auto;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
      }
      .tree-id {
        font-size: 10px; color: var(--em-text-secondary); margin-left: auto;
        flex-shrink: 0;
      }

      .tree-device {
        border-top: 1px solid var(--em-surface);
      }
      .tree-device > summary { list-style: none; padding-left: 32px; }
      .tree-device > summary::-webkit-details-marker { display: none; }
      .tree-device > .tree-children { padding-left: 32px; }

      .tree-leaf {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 16px 6px 64px; font-size: 13px;
        cursor: default;
        transition: background var(--em-transition);
        border-top: 1px solid var(--em-surface);
      }
      .tree-leaf:hover { background: var(--em-primary-tint); }

      .tree-badge {
        padding: 1px 6px; border-radius: 6px; font-size: 9px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.03em;
      }

      .tree-empty {
        padding: 10px 16px 10px 64px; font-size: 12px;
        color: var(--em-text-secondary); font-style: italic;
      }
      .tree-section-label {
        padding: 8px 16px 4px 48px; font-size: 11px; font-weight: 600;
        color: var(--em-text-secondary); text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .tree-children { padding-bottom: 4px; }

      .hierarchy-header h2 { display: flex; align-items: center; gap: 6px; }
      .tree-icon ha-icon { --mdc-icon-size: 18px; }
      .tree-badge.disabled { background: var(--em-surface); color: var(--em-text-secondary); }
      .tree-badge.unavailable {
        background: color-mix(in srgb, var(--em-error-text) 14%, transparent); color: var(--em-error-text);
      }

      .entitymap-container.compact .tree-branch { padding: 8px 14px; }
      .entitymap-container.compact .tree-leaf { padding: 4px 14px 4px 56px; }

      @media (max-width: 700px) {
        .hierarchy-view { padding: 16px; }
        .hierarchy-actions { margin-left: 0; width: 100%; }
        .tree-meta, .tree-id { display: none; }
      }

      @media (prefers-reduced-motion: reduce) {
        .tree-flow-path, .tree-intro .tree-link, .tree-intro .tree-node { animation: none; }
      }
`;
