const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Entity names, aliases and finding text come from user configuration, so
 * every value that reaches a template must pass through here.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function haIcon(icon, className = "") {
  const classAttr = className ? ` class="${escapeHtml(className)}"` : "";

  return `<ha-icon${classAttr} icon="${escapeHtml(icon)}" aria-hidden="true"></ha-icon>`;
}
