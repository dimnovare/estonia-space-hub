import { describe, it, expect } from "vitest";
import translations from "@/i18n/translations";
import { MANUAL_OUTREACH_STATUSES, type OutreachStatus } from "@/services";
import { OUTREACH_STATUS_STYLE } from "@/components/admin/leads/leadStatusStyles";

/**
 * Bounced/complained arrive from the Resend webhook, not from a human, and
 * needsinfo arrives from the provider's own quote page. The workspace still has
 * to render all three: a status with no label renders a blank <select> and a
 * status with no style crashes the badge.
 */
const ALL_STATUSES: OutreachStatus[] =
  ["sent", "replied", "declined", "noanswer", "bounced", "complained", "needsinfo"];

const LANGUAGES = ["et", "en", "ru", "lv", "lt"] as const;

describe("provider outreach statuses", () => {
  it("every status has a style", () => {
    const missing = ALL_STATUSES.filter((s) => !OUTREACH_STATUS_STYLE[s]);
    expect(missing).toEqual([]);
  });

  it("every status has a label in all five languages", () => {
    const missing: string[] = [];
    for (const language of LANGUAGES) {
      for (const status of ALL_STATUSES) {
        const key = `admin.leads.outreachStatus.${status}`;
        if (!(key in translations[language])) missing.push(`${language}:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("delivery outcomes are never offered as manual choices", () => {
    expect([...MANUAL_OUTREACH_STATUSES]).toEqual(["sent", "replied", "declined", "noanswer"]);
    expect(MANUAL_OUTREACH_STATUSES).not.toContain("bounced");
    expect(MANUAL_OUTREACH_STATUSES).not.toContain("complained");
    // needsinfo is the provider's own statement, set from their quote page and
    // cleared by resolving the question. Offering it in the dropdown would let an
    // admin claim a provider is blocked with no ProviderInfoRequest behind it —
    // a blocked row the workspace could show no question for, and nothing to
    // resolve. The select still LISTS it when it is the current value.
    expect(MANUAL_OUTREACH_STATUSES).not.toContain("needsinfo");
  });

  it("the unreachable badges are translated everywhere", () => {
    const keys = [
      "admin.leads.emailBounced",
      "admin.leads.phoneOnly",
      "admin.leads.addContactEmail",
      "admin.leads.fixContactEmail",
      "admin.leads.contactEmailPlaceholder",
      "admin.leads.contactEmailSaved",
      "admin.leads.emailBouncedHint",
      "admin.leads.phoneOnlyHint",
      "admin.leads.timeline.outreachBounced",
    ];
    const missing = LANGUAGES.flatMap((language) =>
      keys.filter((key) => !(key in translations[language])).map((key) => `${language}:${key}`));
    expect(missing).toEqual([]);
  });
});
