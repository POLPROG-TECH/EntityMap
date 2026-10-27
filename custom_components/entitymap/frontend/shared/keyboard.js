const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Shortcuts must never fire while the user is typing; composedPath()[0] is
 * the real target even inside shadow roots.
 */
export function isEditableTarget(event) {
  const target = event.composedPath()[0];

  return target instanceof Element && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable);
}
