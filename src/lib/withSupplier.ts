/**
 * Append ?supplierId= (or &supplierId=) to an API path when impersonating.
 * Returns the path unchanged when supplierId is null/undefined.
 */
export function withSupplier(path: string, supplierId: string | null | undefined): string {
  if (!supplierId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}supplierId=${supplierId}`;
}