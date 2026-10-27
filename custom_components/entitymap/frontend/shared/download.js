export function downloadBlob(blob, filename) {
  if (!blob) {
    return;
  }

  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}
