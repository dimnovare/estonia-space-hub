import { describe, it, expect } from "vitest";
import { pluralCategory, selectPlural, formatCount } from "@/i18n/plural";

describe("pluralCategory", () => {
  it("Russian: one / few / many per CLDR", () => {
    // one: n%10==1 && n%100!=11
    expect(pluralCategory("ru", 1)).toBe("one");
    expect(pluralCategory("ru", 21)).toBe("one");
    expect(pluralCategory("ru", 101)).toBe("one");
    expect(pluralCategory("ru", 11)).toBe("many"); // 11 is NOT one
    // few: n%10 in 2..4 && n%100 not in 12..14
    expect(pluralCategory("ru", 2)).toBe("few");
    expect(pluralCategory("ru", 3)).toBe("few");
    expect(pluralCategory("ru", 23)).toBe("few");
    expect(pluralCategory("ru", 163)).toBe("few"); // the headline case
    expect(pluralCategory("ru", 12)).toBe("many"); // 12..14 are many
    expect(pluralCategory("ru", 14)).toBe("many");
    // many: 0, 5..9, 11..14, and 10/20/… endings
    expect(pluralCategory("ru", 0)).toBe("many");
    expect(pluralCategory("ru", 5)).toBe("many");
    expect(pluralCategory("ru", 100)).toBe("many");
  });

  it("Lithuanian: one / few / other per CLDR", () => {
    expect(pluralCategory("lt", 1)).toBe("one");
    expect(pluralCategory("lt", 21)).toBe("one");
    expect(pluralCategory("lt", 11)).toBe("other"); // 11..19 are other
    expect(pluralCategory("lt", 2)).toBe("few");
    expect(pluralCategory("lt", 9)).toBe("few");
    expect(pluralCategory("lt", 22)).toBe("few");
    expect(pluralCategory("lt", 19)).toBe("other");
    expect(pluralCategory("lt", 10)).toBe("other");
    expect(pluralCategory("lt", 0)).toBe("other");
    expect(pluralCategory("lt", 100)).toBe("other");
  });

  it("English / Estonian / Latvian: one vs other", () => {
    for (const lang of ["en", "et", "lv"] as const) {
      expect(pluralCategory(lang, 1)).toBe("one");
      expect(pluralCategory(lang, 0)).toBe("other");
      expect(pluralCategory(lang, 2)).toBe("other");
      expect(pluralCategory(lang, 21)).toBe("other");
    }
  });
});

describe("selectPlural", () => {
  const ru = "{count} поставщик|{count} поставщика|{count} поставщиков";

  it("RU 163 → genitive singular form (поставщика)", () => {
    expect(selectPlural("ru", 163, ru)).toBe("{count} поставщика");
  });

  it("RU picks one / few / many correctly", () => {
    expect(selectPlural("ru", 1, ru)).toBe("{count} поставщик");
    expect(selectPlural("ru", 2, ru)).toBe("{count} поставщика");
    expect(selectPlural("ru", 5, ru)).toBe("{count} поставщиков");
    expect(selectPlural("ru", 11, ru)).toBe("{count} поставщиков");
  });

  it("LT picks one / few / other correctly", () => {
    const lt = "{count} miestas|{count} miestai|{count} miestų";
    expect(selectPlural("lt", 1, lt)).toBe("{count} miestas");
    expect(selectPlural("lt", 3, lt)).toBe("{count} miestai");
    expect(selectPlural("lt", 10, lt)).toBe("{count} miestų");
    expect(selectPlural("lt", 11, lt)).toBe("{count} miestų");
  });

  it("2-form (en/et/lv) values resolve one vs other", () => {
    const en = "{count} provider|{count} providers";
    expect(selectPlural("en", 1, en)).toBe("{count} provider");
    expect(selectPlural("en", 4, en)).toBe("{count} providers");
  });

  it("a value with no | passes through unchanged", () => {
    expect(selectPlural("ru", 5, "just one form")).toBe("just one form");
  });

  it("falls back to the last form when a slot is missing", () => {
    // 2-form value read for RU (which expects 3): 'many' index (2) is missing → last form.
    const twoForms = "{count} X|{count} Y";
    expect(selectPlural("ru", 5, twoForms)).toBe("{count} Y");
  });
});

describe("formatCount", () => {
  it("selects the form and substitutes {count}", () => {
    const ru = "{count} поставщик|{count} поставщика|{count} поставщиков";
    expect(formatCount("ru", 163, ru)).toBe("163 поставщика");
    expect(formatCount("ru", 1, ru)).toBe("1 поставщик");
    expect(formatCount("en", 3, "{count} provider|{count} providers")).toBe("3 providers");
  });
});
