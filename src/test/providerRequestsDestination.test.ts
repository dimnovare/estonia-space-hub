import { describe, it, expect } from "vitest";
import { requestsTabFor } from "@/components/provider/ProviderOverview";
import { MARKETPLACE_ONLY_TABS } from "@/pages/ProviderDashboardPage";

/**
 * The overview's "View all requests" button used to point every provider at the
 * orders tab. For a claimed directory provider that tab is filtered out of the
 * nav and the routable-tab guard rewrites the URL straight back to overview, so
 * the button visibly did nothing — on the one dashboard every provider who
 * answers the introduction campaign lands on.
 */
describe("overview requests destination", () => {
  it("never sends a directory provider to a tab their dashboard removes", () => {
    expect(MARKETPLACE_ONLY_TABS.has(requestsTabFor(true))).toBe(false);
  });

  it("sends a directory provider to their concierge leads", () => {
    expect(requestsTabFor(true)).toBe("leads");
  });

  // The marketplace side is unchanged: a real partner still lands on orders,
  // and orders remains a tab the directory dashboard strips.
  it("leaves a marketplace partner on orders", () => {
    expect(requestsTabFor(false)).toBe("orders");
    expect(MARKETPLACE_ONLY_TABS.has("orders")).toBe(true);
  });
});
