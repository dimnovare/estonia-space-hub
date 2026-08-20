import { createRoot } from "react-dom/client";
import { createHead, UnheadProvider } from "@unhead/react/client";
import App from "./App.tsx";
import "./index.css";
import { initGA } from "./lib/analytics";
import { safeStorage } from "./lib/safeStorage";
import { loadLocale } from "./i18n/localeRegistry";
import { DEFAULT_LANG, detectStoredOrBrowserLang, getLangFromPath } from "./i18n/routing";

// Keep <html lang="..."> in sync with the active language so SEO + a11y tools
// see the right locale per route, not the hardcoded "et" baked into index.html.
const updateHtmlLang = () => {
  const match = window.location.pathname.match(/^\/(et|en|ru|lv|lt)(\/|$)/);
  document.documentElement.setAttribute("lang", match?.[1] ?? "et");
};
updateHtmlLang();
window.addEventListener("popstate", updateHtmlLang);
// Patch pushState/replaceState so SPA navigations (react-router) also sync.
(["pushState", "replaceState"] as const).forEach((m) => {
  const original = history[m];
  history[m] = function (...args: any[]) {
    const ret = original.apply(this, args as any);
    updateHtmlLang();
    return ret;
  } as any;
});

// GA4 is initialized only after cookie consent — see CookieConsent.tsx
// If consent was already given in a previous session, init immediately
if (safeStorage.get("ruumly-cookie-consent") === "true") {
  const gaId = import.meta.env.VITE_GA_ID;
  if (gaId) initGA(gaId);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

// @unhead/react head manager. Replaces react-helmet-async (archived; silently
// failed to flush any tags to document.head in the Vite production build with
// React 18 createRoot — every per-page title/description/canonical/hreflang/
// JSON-LD was inert). @unhead writes to the DOM via a maintained client head
// instance and is SSR-ready for the future ruumly-next migration.
const head = createHead();

const tree = (
  <UnheadProvider head={head}>
    {/*
      GoogleOAuthProvider is intentionally NOT mounted at the root.
      It loads accounts.google.com/gsi/client (sets ~25 third-party cookies)
      on mount, which tanks Lighthouse Best Practices on the homepage.
      It is mounted lazily inside LoginPage and BookingInlineAuth via
      <GoogleAuthScope> only when the user reaches a sign-in surface.
    */}
    <App />
  </UnheadProvider>
);

// Wait for the ACTIVE language before the first paint.
//
// Only Estonian ships inside the entry bundle (it is both the default and the
// fallback); the other four load as their own chunks. `t()` is synchronous and
// falls back to Estonian while a chunk is in flight, and for anything inside a
// React render that self-corrects — the chunk lands, the store notifies, the
// tree re-renders. But translations are also read OUTSIDE render, where nothing
// re-runs: offerPricing.ts builds a price-unit lookup table, ui/dialog.tsx
// resolves its close label. Those would bake in Estonian for a Latvian visitor.
//
// So the language is resolved first. The prerendered HTML already carries a
// modulepreload for exactly this chunk (scripts/prerender-seo.mjs), so it is
// normally in the browser cache by the time this runs and the wait is ~0 ms.
// Failure is non-fatal: mount anyway and let the Estonian fallback stand rather
// than show a blank page.
const activeLang = getLangFromPath(window.location.pathname)
  ?? detectStoredOrBrowserLang()
  ?? DEFAULT_LANG;

loadLocale(activeLang)
  .catch(() => {})
  .finally(() => {
    createRoot(document.getElementById("root")!).render(tree);
  });
