declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function initGA(measurementId: string) {
  if (!measurementId || typeof document === "undefined") return;

  // Load gtag.js script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
}

export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
}

/**
 * Redact secret path segments before anything reaches analytics.
 *
 * Two public pages are guarded by a token in the URL and nothing else:
 *  - /{lang}/offer/{token} — the customer's offer page (view details + choose,
 *    which alerts ops).
 *  - /{lang}/quote/{token} — the provider's quote form. The per-recipient token
 *    is what lets them submit a price AS that provider without an account, so
 *    it is every bit as much a bearer credential as the offer token.
 *
 * gtag auto-attaches the full page_location URL to manual events, so a raw
 * token would otherwise be harvestable from GA reports by anyone with report
 * access. Strip both.
 */
export function redactAnalyticsPath(path: string): string {
  return path.replace(/(\/(?:offer|quote)\/)[^/?#]+/i, "$1redacted");
}

export function trackPageView(path: string) {
  if (typeof window !== "undefined" && window.gtag) {
    const safePath = redactAnalyticsPath(path);
    // Override gtag's auto-populated page_location too (it defaults to the
    // real window.location.href, which still carries the token).
    const params: Record<string, string> = { page_path: safePath };
    if (typeof window.location !== "undefined") {
      params.page_location = `${window.location.origin}${redactAnalyticsPath(
        window.location.pathname,
      )}${window.location.search}${window.location.hash}`;
    }
    window.gtag("event", "page_view", params);
  }
}
