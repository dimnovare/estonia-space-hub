import { describe, it, expect } from "vitest";
import translations from "@/i18n/translations";

describe("translation completeness", () => {
  const etKeys = Object.keys(translations.et);
  const enKeys = Object.keys(translations.en);
  const ruKeys = Object.keys(translations.ru);

  it("English has all Estonian keys", () => {
    const missing = etKeys.filter(k => !enKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Russian has all Estonian keys", () => {
    const missing = etKeys.filter(k => !ruKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Estonian has all English keys", () => {
    const missing = enKeys.filter(k => !etKeys.includes(k));
    expect(missing).toEqual([]);
  });
});
