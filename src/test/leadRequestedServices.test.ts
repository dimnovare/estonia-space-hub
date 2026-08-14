import { describe, expect, it } from "vitest";
import { leadRequestedServices } from "@/lib/serviceTypes";

// A lead carries ONE category while the intake invites the visitor to pick
// several, so a multi-service request collapses to the wildcard "any" and the
// admin header read "Service" for exactly the requests that need the most
// thought. This is the frontend mirror of the backend's
// ServiceCategories.SelectedSlugs and must keep the same guarantees.
describe("leadRequestedServices", () => {
  it("recovers every service the visitor picked", () => {
    expect(leadRequestedServices("concierge: moving+warehouse | Tallinn→Tartu | 2026-09-01"))
      .toEqual(["moving", "warehouse"]);
  });

  it("handles a request with no route or date segment", () => {
    expect(leadRequestedServices("concierge: cleaning")).toEqual(["cleaning"]);
  });

  it("ignores a query that is raw customer text", () => {
    // Listing-routed quote leads store the visitor's own message in `query`.
    expect(leadRequestedServices("I need moving and warehouse help, call me")).toEqual([]);
  });

  it("reads ONLY the leading segment, so free text cannot inject services", () => {
    // Everything after the first " | " interpolates the customer's own city.
    // Without this restriction a visitor could type a service list into a form
    // field and have it read back as their selection.
    expect(leadRequestedServices("concierge: cleaning | Tallinn+moving+warehouse | 2026-09-01"))
      .toEqual(["cleaning"]);
  });

  it("drops retired slugs and the intake's own markers", () => {
    // packing / insurance are retained for data, not for sale — they must never
    // surface as a service we offer.
    expect(leadRequestedServices("concierge: moving +packing-addon | Tallinn | 2026-09-01"))
      .toEqual(["moving"]);
    expect(leadRequestedServices("concierge: any +insurance-asked | Tallinn")).toEqual([]);
  });

  it("dedupes and tolerates missing input", () => {
    expect(leadRequestedServices("concierge: moving+moving | Tallinn")).toEqual(["moving"]);
    expect(leadRequestedServices(null)).toEqual([]);
    expect(leadRequestedServices(undefined)).toEqual([]);
    expect(leadRequestedServices("")).toEqual([]);
  });
});
