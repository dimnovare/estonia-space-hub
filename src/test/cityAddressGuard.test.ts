import { describe, expect, it } from "vitest";
import { leadDateIsFlexible, leadMissingInfo } from "@/components/admin/AdminLeads";
import type { AdminLead } from "@/services";

/**
 * A digit in the city field is what broke a real Haapsalu request on
 * 2026-08-17: the customer typed "Haapsalu Lihula mnt 10", CityMatcher could
 * derive no geographic anchor, and the fan-out reached none of the 34 movers in
 * range. This mirrors `looksLikeStreetAddress` in pages/RequestPage.tsx — kept
 * here as an executable statement of the rule, including the cases that must
 * NOT be rejected.
 */
function looksLikeStreetAddress(city: string): boolean {
  return /\d/.test(city);
}

describe("looksLikeStreetAddress", () => {
  it("rejects the string that actually broke a lead", () => {
    expect(looksLikeStreetAddress("Haapsalu Lihula mnt 10")).toBe(true);
  });

  it("rejects any house number", () => {
    for (const s of ["Tallinn, Narva mnt 7", "Kuuse 1", "Riga, Brivibas 42"]) {
      expect(looksLikeStreetAddress(s), s).toBe(true);
    }
  });

  it("accepts every legitimate multi-word place name", () => {
    // The reason word count is NOT used to block: these are all real answers a
    // customer may reasonably give, and CityMatcher resolves them.
    for (const s of [
      "Haapsalu", "Tallinn", "Pärnu", "Rīga", "Vilnius",
      "Haapsalu linn", "Harju maakond", "Klaipėdos rajonas",
      "Таллинн", "Lasnamäe", "Põhja-Tallinn",
    ]) {
      expect(looksLikeStreetAddress(s), s).toBe(false);
    }
  });
});

const lead = (over: Partial<AdminLead> = {}): AdminLead => ({
  id: "1", email: "c@x.ee", city: "Haapsalu", category: "moving",
  language: "et", createdAt: new Date().toISOString(), status: "new",
  phone: "+372 5000 0000", needDate: null,
  ...over,
} as AdminLead);

describe("leadDateIsFlexible", () => {
  it("reads the marker the intake writes", () => {
    expect(leadDateIsFlexible(lead({ query: "concierge: moving +date-flexible | Haapsalu" }))).toBe(true);
  });

  it("ignores raw customer text and anything past the first segment", () => {
    // Matches the backend's strictness: a visitor must not be able to type the
    // marker into a free-text field.
    expect(leadDateIsFlexible(lead({ query: "call me, +date-flexible" }))).toBe(false);
    expect(leadDateIsFlexible(lead({ query: "concierge: moving | Haapsalu +date-flexible" }))).toBe(false);
    expect(leadDateIsFlexible(lead({ query: "concierge: moving | Haapsalu" }))).toBe(false);
    expect(leadDateIsFlexible(lead({ query: undefined }))).toBe(false);
  });
});

describe("leadMissingInfo + flexible dates", () => {
  it("stops flagging a flexible-date lead as missing information", () => {
    // It IS an answer. Flagging it buried already-workable requests in the queue
    // an operator is meant to work first.
    expect(leadMissingInfo(lead({ query: "concierge: moving +date-flexible | Haapsalu" }))).toBe(false);
  });

  it("still flags a date-driven request with no answer at all", () => {
    expect(leadMissingInfo(lead({ query: "concierge: moving | Haapsalu" }))).toBe(true);
  });

  it("still flags a missing phone even when the date is flexible", () => {
    expect(leadMissingInfo(lead({
      query: "concierge: moving +date-flexible | Haapsalu", phone: null,
    }))).toBe(true);
  });
});
