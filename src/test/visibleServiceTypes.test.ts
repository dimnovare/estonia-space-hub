import { describe, expect, it } from "vitest";
import { getVisibleServiceTypes } from "@/lib/visibleServiceTypes";

describe("getVisibleServiceTypes", () => {
  it("hides disabled service types while always keeping warehouse", () => {
    expect(getVisibleServiceTypes(false, false)).toEqual(["warehouse"]);
    expect(getVisibleServiceTypes(true, false)).toEqual(["warehouse", "moving"]);
    expect(getVisibleServiceTypes(false, true)).toEqual(["warehouse", "trailer"]);
    expect(getVisibleServiceTypes(true, true)).toEqual(["warehouse", "moving", "trailer"]);
  });
});
