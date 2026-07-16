import { describe, it, expect } from "vitest";
import { parseMoney } from "@/lib/parseMoney";
import { parsePrice } from "@/components/admin/leads/leadWorkspaceModels";

/**
 * Regression: parseFloat prefix-parses, so Estonian-formatted prices
 * ("1 200,50" — space group separator, comma decimal) silently truncated to 1
 * and passed every isFinite/>=0 guard. The provider saw a success screen, €1
 * was stored, auto-seeded into the draft offer, and forwarded to the customer.
 * Nothing may parse to a number it does not actually say.
 */

describe("parseMoney", () => {
  it("reads plain amounts", () => {
    expect(parseMoney("1200")).toBe(1200);
    expect(parseMoney("0")).toBe(0);
    expect(parseMoney("89")).toBe(89);
  });

  it("reads both decimal marks", () => {
    expect(parseMoney("1200.50")).toBe(1200.5);
    expect(parseMoney("1200,50")).toBe(1200.5);
    expect(parseMoney("1200,5")).toBe(1200.5);
  });

  it("reads space-grouped Estonian input instead of truncating it", () => {
    // Each of these used to parse to a single digit.
    expect(parseMoney("1 200")).toBe(1200);
    expect(parseMoney("1 200,50")).toBe(1200.5);
    expect(parseMoney("2 500")).toBe(2500);
    expect(parseMoney("12 500,99")).toBe(12500.99);
  });

  it("reads non-breaking and narrow-non-breaking spaces", () => {
    expect(parseMoney("1 200,50")).toBe(1200.5); // nbsp — what et-EE emits
    expect(parseMoney("1 200,50")).toBe(1200.5); // narrow nbsp
    expect(parseMoney("1 200")).toBe(1200);      // thin space
  });

  it("resolves grouped input where the separators are unambiguous", () => {
    expect(parseMoney("1.200,50")).toBe(1200.5); // EU: last mark is the decimal
    expect(parseMoney("1,200.50")).toBe(1200.5); // US: last mark is the decimal
    expect(parseMoney("12.345,67")).toBe(12345.67);
  });

  it("tolerates a currency symbol", () => {
    expect(parseMoney("€1 200,50")).toBe(1200.5);
    expect(parseMoney("1 200,50 €")).toBe(1200.5);
  });

  it("rejects ambiguous single-separator-three-digit input rather than guessing", () => {
    // "1,200" is 1200 to a US reader and 1.200 to an EU one. Refuse to pick.
    expect(parseMoney("1,200")).toBeNull();
    expect(parseMoney("1.200")).toBeNull();
  });

  it("rejects junk instead of prefix-parsing it", () => {
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("   ")).toBeNull();
    expect(parseMoney("12abc")).toBeNull();   // parseFloat would have said 12
    expect(parseMoney("1.2.3")).toBeNull();
    expect(parseMoney("1,2,3")).toBeNull();   // the first-comma-only replace bug
    expect(parseMoney("-5")).toBeNull();
    expect(parseMoney("1200,505")).toBeNull(); // more precision than money has
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
  });

  it("never returns a number the input does not say", () => {
    // The exact silent-corruption table from the report.
    for (const input of ["1 200", "1 200,50", "2 500", "1.200,50", "1,200.50"]) {
      const parsed = parseMoney(input);
      expect(parsed === null || parsed >= 1000).toBe(true);
    }
  });
});

describe("parsePrice (admin offer options) shares the strict parser", () => {
  it("reads grouped input instead of truncating it", () => {
    expect(parsePrice("1 200,50")).toBe(1200.5);
    expect(parsePrice("2 500")).toBe(2500);
    expect(parsePrice("1 200")).toBe(1200);
  });

  it("still reads the ordinary forms", () => {
    expect(parsePrice("89")).toBe(89);
    expect(parsePrice("89,50")).toBe(89.5);
    expect(parsePrice("89.50")).toBe(89.5);
  });

  it("returns null for junk rather than a prefix-parsed number", () => {
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("12abc")).toBeNull();
    expect(parsePrice("")).toBeNull();
  });
});
