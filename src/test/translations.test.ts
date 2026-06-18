import { describe, it, expect } from "vitest";
import translations from "@/i18n/translations";

describe("translation completeness", () => {
  const etKeys = Object.keys(translations.et);
  const enKeys = Object.keys(translations.en);
  const ruKeys = Object.keys(translations.ru);
  const lvKeys = Object.keys(translations.lv);
  const ltKeys = Object.keys(translations.lt);

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

  it("Latvian has all Estonian keys", () => {
    const missing = etKeys.filter(k => !lvKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Latvian has no extra keys beyond Estonian", () => {
    const extra = lvKeys.filter(k => !etKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it("Lithuanian has all Estonian keys", () => {
    const missing = etKeys.filter(k => !ltKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Lithuanian has no extra keys beyond Estonian", () => {
    const extra = ltKeys.filter(k => !etKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it("all five language blocks have equal key counts", () => {
    expect(enKeys.length).toBe(etKeys.length);
    expect(ruKeys.length).toBe(etKeys.length);
    expect(lvKeys.length).toBe(etKeys.length);
    expect(ltKeys.length).toBe(etKeys.length);
  });
});
