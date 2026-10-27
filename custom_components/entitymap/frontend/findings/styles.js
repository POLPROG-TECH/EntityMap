import { SEVERITY_COLORS } from "../shared/constants.js";

export const FINDINGS_STYLES = `
      .findings-view { padding: 24px; overflow-y: auto; height: 100%; }
      .findings-header {
        display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
      }
      .findings-header h2 { font-size: 18px; font-weight: 600; }
      .count-badge {
        padding: 3px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;
        background: var(--em-primary); color: #fff;
      }
      .findings-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px;
      }
      .finding-card {
        background: var(--em-bg); border: 1px solid var(--em-border);
        border-radius: var(--em-radius); padding: 16px;
        transition: all var(--em-transition); border-left: 4px solid transparent;
      }
      .finding-card:hover { box-shadow: var(--em-shadow-md); }
      .finding-card.severity-critical { border-left-color: ${SEVERITY_COLORS.critical}; }
      .finding-card.severity-high { border-left-color: ${SEVERITY_COLORS.high}; }
      .finding-card.severity-medium { border-left-color: ${SEVERITY_COLORS.medium}; }
      .finding-card.severity-low { border-left-color: ${SEVERITY_COLORS.low}; }
      .finding-card.severity-info { border-left-color: ${SEVERITY_COLORS.info}; }
      .finding-card-header {
        display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
      }
      .severity-dot { display: inline-block; flex-shrink: 0; width: 8px; height: 8px; border-radius: 50%; background: var(--sev-color); }
      .severity-badge {
        background: var(--sev-color);
        padding: 3px 10px; border-radius: 8px; font-size: 10px;
        text-transform: uppercase; color: #fff; font-weight: 700;
        letter-spacing: 0.04em;
      }
      .finding-type { font-size: 13px; font-weight: 600; }
      .finding-rationale { font-size: 13px; line-height: 1.6; margin-bottom: 8px; }
      .finding-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; font-size: 11px; color: var(--em-text-secondary); }
      .findings-header h2 { display: flex; align-items: center; gap: 6px; }
      .findings-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-wrap: wrap; }
      .btn-sm[disabled] { opacity: 0.5; cursor: not-allowed; }
      .inline-field { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--em-text-secondary); }
      .severity-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
      .severity-filter { display: inline-flex; align-items: center; gap: 6px; }
      .severity-filter .severity-dot { margin-top: 0; }
      .finding-actions { margin-top: 12px; }
      .meta-arrow { --mdc-icon-size: 12px; }
      .findings-view .empty-state { height: auto; }
      .entitymap-container.compact .finding-card { padding: 12px; }
      .entitymap-container.compact .findings-grid { gap: 8px; }

      @media (max-width: 700px) {
        .findings-grid { grid-template-columns: 1fr; }
        .findings-view { padding: 16px; }
        .findings-actions { margin-left: 0; width: 100%; }
      }
`;
