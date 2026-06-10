import { describe, it, expect } from "vitest";
import { computeEndDate } from "@/lib/dateUtils";
import { calculateTotalSavings } from "@/lib/bookingSavings";

describe("computeEndDate", () => {
  it("adds 1 month for '1 kuu'", () => {
    expect(computeEndDate("2026-01-15", "1 kuu")).toBe("2026-02-15");
  });
  it("adds 3 months for '3 kuud'", () => {
    expect(computeEndDate("2026-01-15", "3 kuud")).toBe("2026-04-15");
  });
  it("adds 1 day for '1 päev'", () => {
    expect(computeEndDate("2026-03-30", "1 päev")).toBe("2026-03-31");
  });
  it("adds 1 week for '1 nädal'", () => {
    expect(computeEndDate("2026-03-01", "1 nädal")).toBe("2026-03-08");
  });
  it("handles English duration '1 month'", () => {
    expect(computeEndDate("2026-06-01", "1 month")).toBe("2026-07-01");
  });
  it("handles English duration '1 week'", () => {
    expect(computeEndDate("2026-06-01", "1 week")).toBe("2026-06-08");
  });
  it("adds 6 months for '6 kuud'", () => {
    expect(computeEndDate("2026-01-15", "6 kuud")).toBe("2026-07-15");
  });
  it("adds 12 months for '12 kuud'", () => {
    expect(computeEndDate("2026-01-15", "12 kuud")).toBe("2027-01-15");
  });
  it("returns undefined for empty start", () => {
    expect(computeEndDate("", "1 kuu")).toBeUndefined();
  });
  it("returns undefined for invalid date", () => {
    expect(computeEndDate("not-a-date", "1 kuu")).toBeUndefined();
  });
});

describe("calculateTotalSavings", () => {
  it("never reports negative savings from rounding differences", () => {
    expect(calculateTotalSavings([
      { basePrice: 0.99, platformPrice: 1.00 },
      { basePrice: 10.00, platformPrice: 9.50 },
    ])).toBe(0.50);
  });
});
