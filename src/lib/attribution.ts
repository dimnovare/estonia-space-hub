/**
 * First-touch marketing attribution for the concierge funnel.
 *
 * WHY THIS EXISTS
 * The lead's `source` column already says which FORM produced a request
 * ("concierge" vs "routed"). It cannot say which ad, post or search brought the
 * person to that form — so "cost per qualified request", a north-star metric,
 * was not computable and paid tests could not be judged. This captures the
 * missing half and ships it with the lead itself, so the answer survives in the
 * database rather than only inside an analytics vendor.
 *
 * FIRST touch, not last: someone who arrives from a Facebook ad, reads the FAQ,
 * leaves, and comes back the next day by typing the address deserves to be
 * counted against the ad. Stored in `sessionStorage` and never overwritten
 * within a session.
 *
 * PRIVACY: this is an ALLOW-LIST, not a copy of the query string. Only known
 * marketing parameters are read, so a page reached with `?email=` or any other
 * personal value in the URL cannot smuggle it into the database. The external
 * referrer is reduced to its hostname — never a full URL, which can itself
 * carry someone's search terms or an internal path from another site.
 */

const STORAGE_KEY = "ruumly-attribution";

/** Marketing parameters worth keeping. Anything not named here is ignored. */
const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
] as const;

/** Matches the backend column (`DemandLead.Attribution`, MaxLength 300). */
const MAX_LENGTH = 300;

/** Strip separators so one field can never fake another when the string is read back. */
function clean(value: string): string {
  return value.replace(/[|=]/g, " ").trim().slice(0, 80);
}

/** The referrer's host, or null for direct traffic and same-site navigation. */
function externalReferrerHost(referrer: string, currentHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname;
    return host && host !== currentHost ? host : null;
  } catch {
    return null;
  }
}

/**
 * Build the attribution string for a given entry point. Exported for tests;
 * production code calls `captureAttribution` / `getAttribution`.
 */
export function buildAttribution(
  search: string,
  referrer: string,
  currentHost: string,
  landingPath: string,
): string | null {
  const params = new URLSearchParams(search);
  const parts: string[] = [];

  for (const key of TRACKED_PARAMS) {
    const value = params.get(key);
    if (value) parts.push(`${key}=${clean(value)}`);
  }

  const referrerHost = externalReferrerHost(referrer, currentHost);
  if (referrerHost) parts.push(`ref=${clean(referrerHost)}`);

  // Direct traffic with no referrer is a real answer, but only worth recording
  // alongside something else — a lone landing path tells us nothing we don't
  // already know from the lead's own source column.
  if (parts.length === 0) return null;

  parts.push(`lp=${clean(landingPath)}`);
  return parts.join("|").slice(0, MAX_LENGTH);
}

/**
 * Record attribution once per session. Safe to call on every navigation: a
 * later page view never overwrites the first touch, and a navigation carrying
 * no marketing signal never clears one that was captured earlier.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const value = buildAttribution(
      window.location.search,
      document.referrer,
      window.location.hostname,
      window.location.pathname,
    );
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode / storage disabled. Attribution is a nice-to-have; losing it
    // must never break a page, let alone a request submission.
  }
}

/** The captured attribution, or undefined for direct traffic. */
export function getAttribution(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
