export function isSupplierContextRequired(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  return (
    e.code === "supplier_context_required" ||
    (e.body as Record<string, unknown> | undefined)?.error
      === "supplier_context_required"
  );
}