import { describe, it, expect } from "vitest";
import { computeEndDate } from "@/lib/dateUtils";

describe("smoke test", () => {
  it("computeEndDate is a function", () => {
    expect(typeof computeEndDate).toBe("function");
  });
});
