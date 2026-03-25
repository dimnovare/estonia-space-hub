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

export function trackPageView(path: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "page_view", { page_path: path });
  }
}
