/**
 * Safely unwrap responses that may be either:
 *   - A plain array T[]
 *   - A paginated wrapper { data: T[], total, page, limit, hasMore }
 * Returns the array. Returns [] for any unexpected shape.
 */
export function unwrapPaginated<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (
    res &&
    typeof res === "object" &&
    "data" in res &&
    Array.isArray((res as { data: unknown }).data)
  ) {
    return (res as { data: T[] }).data;
  }
  return [];
}
