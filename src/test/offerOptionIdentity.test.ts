import { describe, it, expect } from "vitest";
import type { AdminOfferOption, ProviderCandidate } from "@/services";
import {
  candidateToEditable, toEditable, toInput,
} from "@/components/admin/leads/leadWorkspaceModels";

/**
 * The offer PATCH is a replace-set. An existing option sent without its id is
 * read as a new one, so the old row is deleted — taking with it the link to the
 * provider quote that seeded it. The provider's next price correction then
 * matches nothing and lands as a SECOND option: the same company, twice, at two
 * prices, on the page the customer reads. Everything here exists to prove the
 * workspace actually sends the id back; a backend that accepts one nobody sends
 * fixes nothing.
 */
const serverOption: AdminOfferOption = {
  id: "3f2a1c44-9d0e-4a11-8b3c-0f5e6d7a8b9c",
  supplierId: "aa11bb22-cc33-dd44-ee55-ff6677889900",
  supplierName: "Big Movers OÜ",
  supplierLocationId: null,
  title: "Big Movers OÜ — Tallinn",
  priceAmount: 250,
  priceUnit: "onetime",
  notes: "2 movers",
  sortOrder: 0,
  fromProviderQuote: true,
};

const candidate: ProviderCandidate = {
  supplierId: "bb22cc33-dd44-ee55-ff66-778899001122",
  supplierName: "Kiirkolimine OÜ",
  contactEmail: "info@kiir.ee",
  contactPhone: null,
  serviceTypes: [],
  locationId: null,
  locationName: null,
  city: null,
  address: null,
  lat: null,
  lng: null,
  distanceKm: null,
  isExactCity: false,
  listingId: null,
  listingTitle: null,
  price: null,
  priceUnit: null,
  alreadyContacted: false,
  lastOutreachAt: null,
  contactEmailUnusable: false,
  contactEmailBouncedAt: null,
  otherLocations: [],
};

describe("offer option identity across an admin edit", () => {
  it("sends the server id back for an option the offer already has", () => {
    const edited = { ...toEditable(serverOption), price: "199" };
    expect(toInput(edited, 0).id).toBe(serverOption.id);
  });

  it("sends no id for an option the admin just added", () => {
    expect(toInput(candidateToEditable(candidate), 1).id).toBeUndefined();
  });

  it("keeps the id through a round trip, so repeated saves stay one option", () => {
    const first = toInput(toEditable(serverOption), 0);
    // What the server echoes back after that save is the same row…
    const echoed = toEditable({ ...serverOption, priceAmount: 199 });
    expect(toInput(echoed, 0).id).toBe(first.id);
  });

  it("carries the badge without ever sending it — provenance is the server's", () => {
    const editable = toEditable(serverOption);
    expect(editable.fromProviderQuote).toBe(true);
    expect(toInput(editable, 0)).not.toHaveProperty("fromProviderQuote");
  });
});
