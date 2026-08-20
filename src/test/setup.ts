import "@testing-library/jest-dom";
import { registerLocale } from "@/i18n/localeRegistry";
import en from "@/i18n/locales/en";
import ru from "@/i18n/locales/ru";
import lv from "@/i18n/locales/lv";
import lt from "@/i18n/locales/lt";

// Register every language up front.
//
// The app lazy-loads four of the five dictionaries through `import()` so a
// visitor downloads only the one they read. `t()` stays synchronous and falls
// back to Estonian while a chunk is in flight — correct in a browser, where the
// chunk lands and React re-renders, but fatal in a test: a synchronous
// assertion about Latvian copy never yields to the microtask that would resolve
// the import, so it would read Estonian and fail for a reason that has nothing
// to do with what it is testing.
//
// Registering all five here makes the test environment behave the way the
// browser does a few milliseconds after load, which is the state every test
// actually means to assert against.
registerLocale("en", en);
registerLocale("ru", ru);
registerLocale("lv", lv);
registerLocale("lt", lt);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
