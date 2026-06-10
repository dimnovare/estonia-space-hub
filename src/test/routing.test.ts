import { describe, expect, it } from "vitest";
import { getLangGuardRedirect } from "@/i18n/routing";

describe("getLangGuardRedirect", () => {
  it("preserves an unprefixed single-segment route and its query string", () => {
    expect(getLangGuardRedirect("/verify", "?token=abc", "", "et"))
      .toBe("/et/verify?token=abc");
  });

  it("replaces an unsupported language prefix on nested routes", () => {
    expect(getLangGuardRedirect("/de/search", "?type=warehouse", "", "en"))
      .toBe("/en/search?type=warehouse");
  });
});
