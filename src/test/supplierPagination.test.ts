import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * supplierService.getAll must page through the WHOLE partner directory.
 *
 * Regression: it fetched a single unpaged /admin/suppliers, and since the
 * endpoint paginates (and caps limit at 100), it returned only the first page.
 * The Partners page then rendered "50 / 50" against 163 real partners.
 */

const get = vi.fn();

vi.mock("@/services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  tokenStore: {
    getAccess: () => null, setAccess: () => {},
    getCsrf: () => null, setCsrf: () => {}, clear: () => {},
  },
  refreshAccessToken: async () => ({ ok: false, hardInvalid: false }),
}));

const { supplierService } = await import("@/services");

const suppliers = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `sup-${offset + i}`, name: `Partner ${offset + i}` }));

const envelope = (data: unknown[], total: number, hasMore: boolean, page = 1) =>
  ({ data, total, page, limit: 100, hasMore });

describe("supplierService.getAll pagination", () => {
  beforeEach(() => get.mockReset());

  it("returns every partner across pages, not just the first page", async () => {
    // 163 partners, server caps limit at 100 → exactly two pages.
    get.mockResolvedValueOnce(envelope(suppliers(100, 0), 163, true, 1));
    get.mockResolvedValueOnce(envelope(suppliers(63, 100), 163, false, 2));

    const all = await supplierService.getAll();

    expect(all).toHaveLength(163);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(1, "/admin/suppliers?page=1&limit=100");
    expect(get).toHaveBeenNthCalledWith(2, "/admin/suppliers?page=2&limit=100");
    // No duplicates — pages are concatenated, not re-fetched.
    expect(new Set(all.map((s) => s.id)).size).toBe(163);
  });

  it("issues a single request when the first page is already the whole set", async () => {
    get.mockResolvedValueOnce(envelope(suppliers(12), 12, false, 1));

    expect(await supplierService.getAll()).toHaveLength(12);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("accepts a bare array response, which carries no pagination metadata", async () => {
    get.mockResolvedValueOnce(suppliers(5));

    expect(await supplierService.getAll()).toHaveLength(5);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("stops at the reported total even if the server ignores `page`", async () => {
    // Pathological server: always replays a full first page with hasMore=true.
    get.mockResolvedValue(envelope(suppliers(100), 163, true, 1));

    await supplierService.getAll();

    // `total` bounds it after the second page rather than spinning to the guard.
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("is bounded by the runaway guard when the server never signals an end", async () => {
    // No total, hasMore always true, every page full — only the guard stops this.
    get.mockResolvedValue({ data: suppliers(100), page: 1, limit: 100, hasMore: true });

    const all = await supplierService.getAll();

    expect(get).toHaveBeenCalledTimes(20);
    expect(all).toHaveLength(2000);
  });
});
