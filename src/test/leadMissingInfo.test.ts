import { describe, expect, it } from "vitest";
import { leadMissingInfo } from "@/components/admin/AdminLeads";
import type { AdminLead } from "@/services";

/**
 * Which requests an operator is shown FIRST. Getting this wrong in either
 * direction costs real money: a false negative hides a request nobody can quote,
 * a false positive buries the queue in noise until the filter stops being used.
 */
const lead = (over: Partial<AdminLead> = {}): AdminLead => ({
  id: "1",
  email: "c@x.ee",
  city: "Tallinn",
  category: "moving",
  language: "et",
  createdAt: new Date().toISOString(),
  status: "new",
  phone: "+372 5000 0000",
  needDate: "2026-09-20T00:00:00Z",
  ...over,
} as AdminLead);

describe("leadMissingInfo", () => {
  it("passes a complete request", () => {
    expect(leadMissingInfo(lead())).toBe(false);
  });

  it("flags a date-driven service with no date", () => {
    // A mover, van, trailer or cleaner prices a specific day.
    for (const category of ["moving", "trailer", "vanrental", "cleaning"]) {
      expect(leadMissingInfo(lead({ category, needDate: null })), category).toBe(true);
    }
  });

  it("does NOT flag storage without a date", () => {
    // A unit is available continuously, so "no date yet" is a real answer —
    // flagging it would push a perfectly workable request into the queue.
    expect(leadMissingInfo(lead({ category: "warehouse", needDate: null }))).toBe(false);
  });

  it("flags a request with no phone", () => {
    expect(leadMissingInfo(lead({ phone: null }))).toBe(true);
    expect(leadMissingInfo(lead({ phone: "   " }))).toBe(true);
  });

  it("flags a lead the automation gate held", () => {
    // Nobody was contacted at all — the most urgent case in the list.
    expect(leadMissingInfo(lead({
      adminNotes: "[auto] Held from automatic outreach — hidden field was filled in.",
    }))).toBe(true);
  });

  it("does not flag an ordinary operator note", () => {
    expect(leadMissingInfo(lead({ adminNotes: "Called, will confirm tomorrow" }))).toBe(false);
  });

  it("is case-insensitive about the category", () => {
    expect(leadMissingInfo(lead({ category: "MOVING", needDate: null }))).toBe(true);
  });

  it("tolerates a missing category", () => {
    // Older/routed leads may carry no category; absence of a date is then not
    // evidence of anything.
    expect(leadMissingInfo(lead({ category: undefined, needDate: null }))).toBe(false);
  });
});
