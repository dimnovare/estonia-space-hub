import { Page, Route } from "@playwright/test";

/**
 * Shared E2E fixtures + API stubs — built from the verified real API contract
 * (see the page components / src/services). Every spec should import from here
 * so stub shapes stay correct and consistent. DO NOT inline ad-hoc stubs that
 * contradict these shapes.
 *
 * Key facts baked in:
 *  - Single-listing GET /listings/{id} returns a BARE ApiListing object (no {data} envelope),
 *    with `type` ("Warehouse"|"Moving"|"Trailer") and a nested `features` object.
 *  - List GET /listings?... returns the ENVELOPE { data, total, page, limit, hasMore }.
 *  - GET /listings/featured returns a BARE array.
 *  - Listing DTOs include supplier commerce flags. E2E listing fixtures default
 *    to bookable so the booking-path specs exercise the /book CTA.
 *  - There is NO GET /auth/me. Session bootstrap is POST /auth/refresh, fired only
 *    when localStorage["ruumly-auth"] is present. Logged-out tests need no auth stub.
 *  - Routes are language-prefixed: use /et/...
 */

type Json = Record<string, unknown>;

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

// ─── Fixture builders ────────────────────────────────────────────────────────

export function apiListing(over: Json = {}): Json {
  return {
    id: "wh-001",
    type: "Warehouse", // case-insensitive; maps to warehouse|moving|trailer
    title: "Test Warehouse",
    description: "A clean, secure storage unit in central Tallinn.",
    supplierName: "Acme Storage",
    supplierId: "sup-1",
    supplierSlug: null,
    address: "Tartu mnt 1",
    city: "Tallinn",
    lat: 59.43,
    lng: 24.75,
    priceFrom: 49,
    priceUnit: "€/month",
    availableNow: true,
    bookingEnabled: true,
    contractSigningEnabled: true,
    directPaymentEnabled: true,
    ruumlyPaymentEnabled: true,
    rating: 0,
    reviewCount: 0,
    images: [],
    features: { sizeM2: 10, heated: true, security: true, access24_7: true },
    ...over,
  };
}

export const listEnvelope = (items: Json[]) => ({
  data: items,
  total: items.length,
  page: 1,
  limit: 200,
  hasMore: false,
});

/** PlatformPricingConfig — the detail/booking pages read config.tiers.starter.* etc. */
export const pricingConfig = (): Json => ({
  defaultPartnerDiscount: 0,
  extrasMarginRate: 0.2,
  defaultVatRate: 0.22,
  ruumlyMinMarginRate: 0.05,
  tiers: {
    starter: { customerDiscountRate: 5, monthlyFee: 0, commissionRate: 12, maxLocations: 1 },
    standard: { customerDiscountRate: 8, monthlyFee: 49, commissionRate: 8, maxLocations: 5 },
    premium: { customerDiscountRate: 10, monthlyFee: 99, commissionRate: 6, maxLocations: 20 },
  },
});

// ─── Stub helpers ────────────────────────────────────────────────────────────

export interface CommonOpts {
  settings?: Json;
}

/** Settings, pricing, features, locations, cities, reviews, notifications, suppliers. */
export async function stubCommon(page: Page, opts: CommonOpts = {}): Promise<void> {
  const settings = {
    maintenanceMode: false,
    showMovingService: false,
    showTrailerService: false,
    showFeaturedListings: true,
    showMap: false,
    ...(opts.settings ?? {}),
  };
  await page.route(/\/settings\/public/, (r) => json(r, settings));
  await page.route(/\/settings\/pricing/, (r) => json(r, pricingConfig()));
  await page.route(/\/features(\b|\/|\?|$)/, (r) => json(r, {}));
  await page.route(/\/locations\/cities/, (r) => json(r, [{ city: "Tallinn", country: "EE" }]));
  await page.route(/\/locations(\b|\/|\?|$)/, (r) => json(r, []));
  await page.route(/\/reviews(\b|\/|\?|$)/, (r) => json(r, { data: [], total: 0 }));
  await page.route(/\/notifications/, (r) => json(r, []));
  await page.route(/\/suppliers(\b|\/|\?|$)/, (r) => json(r, []));
}

export interface ListingsOpts {
  items?: Json[];
}

/**
 * One smart handler for every /listings* call, branching on the path so
 * sub-paths (availability/extras/featured) return their correct shapes and the
 * single-listing route returns a bare object while the list returns the envelope.
 */
export async function stubListings(page: Page, opts: ListingsOpts = {}): Promise<void> {
  const items = opts.items ?? [apiListing()];
  await page.route(/\/listings(\b|\/|\?|$)/, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/listings\/[^/]+\/availability/.test(path))
      return json(route, { totalUnits: 5, bookedCount: 0, available: 5, isAvailable: true });
    if (/\/listings\/[^/]+\/extras/.test(path)) return json(route, []);
    if (/\/listings\/featured/.test(path)) return json(route, items);
    // Non-id collection sub-resources that must return ARRAYS (e.g. the search
    // size-calculator calls /listings/size-buckets and does buckets.map(...)).
    if (/\/listings\/size-buckets/.test(path)) return json(route, []);
    const m = path.match(/\/listings\/([^/]+)$/);
    if (m && !["featured", "size-buckets"].includes(m[1])) {
      const found = items.find((i) => (i as Json).id === m[1]) ?? apiListing({ id: m[1] });
      return json(route, found);
    }
    return json(route, listEnvelope(items));
  });
}

export interface AuthUser extends Json {
  id: string;
  name: string;
  email: string;
  role: string; // "customer" | "provider" | "admin"
  status?: string;
  supplierId?: string;
}

/** Logged-out: no ruumly-auth seeded, so /auth/refresh isn't fired; guard anyway. */
export async function stubLoggedOut(page: Page): Promise<void> {
  await page.route(/\/auth\/refresh/, (r) => json(r, { message: "no session" }, 401));
}

/** Seed a logged-in session: localStorage profile + stubbed POST /auth/refresh. Call BEFORE goto. */
export async function seedAuth(page: Page, user: AuthUser): Promise<void> {
  await page.addInitScript((u) => {
    localStorage.setItem("ruumly-auth", JSON.stringify(u));
    localStorage.setItem("ruumly-lang", "et");
  }, user);
  await page.route(/\/auth\/refresh/, (r) =>
    json(r, { accessToken: "test-access", csrfToken: "test-csrf" }),
  );
}

/** Stub POST /auth/login to return a full AuthResponse for `user`. */
export async function stubLogin(page: Page, user: AuthUser): Promise<void> {
  await page.route(/\/auth\/login/, (r) =>
    json(r, { user, accessToken: "test-access", refreshToken: "test-refresh", csrfToken: "test-csrf" }),
  );
}

/** Stub POST /bookings to return a created booking. */
export async function stubBookingCreate(
  page: Page,
  booking: Json = { id: "booking-001", status: "pending" },
): Promise<void> {
  await page.route(/\/bookings(\b|\?|$)/, (route) =>
    route.request().method() === "POST" ? json(route, booking, 201) : route.continue(),
  );
}

export const adminUser: AuthUser = { id: "adm-1", name: "Admin User", email: "admin@ruumly.eu", role: "admin", status: "active" };
export const providerUser: AuthUser = { id: "prov-1", name: "Prov User", email: "prov@ruumly.eu", role: "provider", status: "active", supplierId: "sup-1" };
export const customerUser: AuthUser = { id: "cust-1", name: "Cust User", email: "cust@ruumly.eu", role: "customer", status: "active" };
