import { describe, expect, it } from "vitest";
import { parseRouteSlug } from "@/pages/MovingRoutePage";
import { getPopularRoutesFrom } from "@/lib/cities";

describe("parseRouteSlug", () => {
  it("parses a from→to route slug", () => {
    expect(parseRouteSlug("tallinn-to-tartu")).toEqual({
      fromSlug: "tallinn",
      toSlug: "tartu",
    });
  });

  it("does NOT treat a plain city slug as a route", () => {
    expect(parseRouteSlug("tartu")).toBeNull();
    expect(parseRouteSlug("tallinn")).toBeNull();
    // A city whose name merely contains the letters "to" is not a route.
    expect(parseRouteSlug("toronto")).toBeNull();
  });

  it("requires a non-empty origin and destination", () => {
    expect(parseRouteSlug("-to-tartu")).toBeNull();
    expect(parseRouteSlug("tallinn-to-")).toBeNull();
    expect(parseRouteSlug("-to-")).toBeNull();
  });

  it("handles undefined/empty slugs", () => {
    expect(parseRouteSlug(undefined)).toBeNull();
    expect(parseRouteSlug("")).toBeNull();
  });

  it("splits on the first delimiter so multi-segment destinations survive", () => {
    expect(parseRouteSlug("tallinn-to-tartu-to-parnu")).toEqual({
      fromSlug: "tallinn",
      toSlug: "tartu-to-parnu",
    });
  });
});

describe("getPopularRoutesFrom", () => {
  it("returns curated destinations excluding the origin", () => {
    const routes = getPopularRoutesFrom("tallinn", 3);
    expect(routes.length).toBe(3);
    expect(routes.map((c) => c.slug)).not.toContain("tallinn");
  });

  it("returns an empty list for an uncurated origin", () => {
    expect(getPopularRoutesFrom("rakvere")).toEqual([]);
    expect(getPopularRoutesFrom(undefined)).toEqual([]);
  });
});
