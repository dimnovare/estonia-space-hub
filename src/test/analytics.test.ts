import { describe, it, expect } from "vitest";
import { redactAnalyticsPath } from "@/lib/analytics";

describe("redactAnalyticsPath — offer-token leakage guard", () => {
  it("redacts the token on a language-prefixed offer path", () => {
    expect(redactAnalyticsPath("/et/offer/AbC123def456GhI789jkl")).toBe("/et/offer/redacted");
  });

  it("redacts on every supported language prefix", () => {
    for (const lang of ["et", "en", "ru", "lv", "lt"]) {
      expect(redactAnalyticsPath(`/${lang}/offer/secret-token-value`)).toBe(`/${lang}/offer/redacted`);
    }
  });

  it("redacts an unprefixed offer path too", () => {
    expect(redactAnalyticsPath("/offer/secret-token-value")).toBe("/offer/redacted");
  });

  it("stops at the next path segment and keeps a trailing subpath", () => {
    expect(redactAnalyticsPath("/et/offer/tok123/extra")).toBe("/et/offer/redacted/extra");
  });

  it("drops a query string / hash from the token segment", () => {
    expect(redactAnalyticsPath("/et/offer/tok123?utm=x")).toBe("/et/offer/redacted?utm=x");
    expect(redactAnalyticsPath("/et/offer/tok123#frag")).toBe("/et/offer/redacted#frag");
  });

  it("leaves non-offer paths untouched", () => {
    expect(redactAnalyticsPath("/et/search?type=warehouse")).toBe("/et/search?type=warehouse");
    expect(redactAnalyticsPath("/et")).toBe("/et");
    expect(redactAnalyticsPath("/et/request?category=moving")).toBe("/et/request?category=moving");
  });

  it("does not treat 'offers' or other lookalikes as the offer route", () => {
    expect(redactAnalyticsPath("/et/offers-info")).toBe("/et/offers-info");
  });
});
