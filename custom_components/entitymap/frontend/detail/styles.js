export const DETAIL_STYLES = `
      .detail-panel {
        position: absolute; top: 0; right: 0; bottom: 0;
        width: min(400px, 100%); overflow-y: auto;
        background: var(--em-bg); border-left: 1px solid var(--em-border);
        box-shadow: -2px 0 12px rgba(0,0,0,0.10);
        transform: translateX(100%); will-change: transform;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 4;
      }
      .detail-panel.open { transform: translateX(0); }
      .detail-header {
        padding: 20px; border-bottom: 1px solid var(--em-border);
        position: relative; background: var(--em-bg);
      }
      .close-btn {
        position: absolute; top: 14px; right: 14px; background: var(--em-surface);
        border: 1px solid var(--em-border); border-radius: 8px;
        cursor: pointer; font-size: 16px; color: var(--em-text-secondary);
        width: 32px; height: 32px; display: flex; align-items: center;
        justify-content: center; transition: all var(--em-transition);
      }
      .close-btn:hover { background: var(--em-border); }
      .close-btn:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 2px; }
      .detail-title h2 { font-size: 16px; margin: 10px 0 4px; font-weight: 600; }
      .node-id { font-size: 11px; color: var(--em-text-secondary); word-break: break-all; }
      .node-badge {
        display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 12px;
        font-size: 11px; font-weight: 600; color: #000; background: var(--type-color);
      }
      .warning-badge {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 6px 12px; border-radius: 8px; font-size: 12px;
        background: var(--em-warning-bg); color: var(--em-warning-text);
        margin-top: 10px; font-weight: 500;
      }
      .warning-badge.muted { background: var(--em-surface); color: var(--em-text-secondary); }

      .detail-section { padding: 20px; border-bottom: 1px solid var(--em-border); }
      .detail-section h3 {
        font-size: 14px; font-weight: 600; margin-bottom: 12px;
        letter-spacing: -0.01em;
      }
      .impact-summary { margin-bottom: 12px; }
      .risk-meter {
        height: 8px; background: var(--em-surface); border-radius: 4px;
        overflow: hidden; margin-bottom: 6px;
      }
      .risk-bar {
        height: 100%; border-radius: 4px; background: var(--sev-color);
        transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .risk-label {
        font-size: 12px; color: var(--em-text-secondary);
        text-transform: uppercase; font-weight: 500; letter-spacing: 0.04em;
      }
      .impact-text { font-size: 13px; line-height: 1.6; margin: 10px 0; }
      .affected-chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip {
        display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 16px;
        font-size: 11px; border: 1px solid var(--type-color); white-space: nowrap; font-weight: 500;
        background: color-mix(in srgb, var(--type-color) 12%, transparent);
      }

      .detail-cards { list-style: none; display: flex; flex-direction: column; gap: 10px; }
      .detail-card {
        padding: 12px; border: 1px solid var(--em-border); border-left: 3px solid var(--sev-color, var(--em-border));
        border-radius: 10px; background: var(--em-bg); font-size: 13px; line-height: 1.55;
      }
      .detail-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .detail-card-head strong { font-size: 13px; }
      .detail-card-text { color: var(--em-text); overflow-wrap: anywhere; }
      .affected { margin-top: 10px; font-size: 12px; }
      .affected summary {
        display: flex; align-items: center; gap: 6px; list-style: none; cursor: pointer;
        color: var(--em-primary); font-weight: 500; border-radius: 6px;
      }
      .affected summary::-webkit-details-marker { display: none; }
      .affected summary:focus-visible { outline: 2px solid var(--em-primary); outline-offset: 2px; }
      .affected-chevron { transition: transform var(--em-transition); }
      .affected[open] .affected-chevron { transform: rotate(90deg); }
      .affected-list { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      code {
        font-size: 11px; background: var(--em-surface); padding: 2px 6px;
        border-radius: 4px; word-break: break-all;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
      }
      .risk-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
      .severity-chip {
        display: inline-flex; align-items: center; flex-shrink: 0;
        padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.04em; color: #fff; background: var(--sev-color);
      }
      .detail-header { position: sticky; top: 0; z-index: 1; }
      .detail-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
      .detail-section h3 { display: flex; align-items: center; gap: 6px; }
      .detail-status { height: auto; padding: 40px 20px; }
      .entitymap-container.compact .detail-section { padding: 12px 16px; }
      .entitymap-container.compact .detail-header { padding: 12px 16px; }

      @media (max-width: 700px) {
        .detail-panel {
          top: auto; left: 0; width: 100%; max-height: 70%;
          border-left: none; border-top: 1px solid var(--em-border);
          border-radius: var(--em-radius) var(--em-radius) 0 0;
          transform: translateY(100%);
        }
        .detail-panel.open { transform: translateY(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .detail-panel, .risk-bar { transition: none; }
      }
`;
