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
type OutreachSkipReason = "no_email" | "not_found" | "already_contacted";

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

/** GET /locations item (SupplierLocation) incl. the provider-directory fields
 *  (isDirectory / supplierSlug / serviceTypes) added by the directory feature. */
export function apiLocation(over: Json = {}): Json {
  return {
    id: "loc-001",
    supplierId: "sup-1",
    supplierName: "Acme Storage",
    name: "Acme Tallinn",
    address: "Tartu mnt 1",
    city: "Tallinn",
    lat: 59.43,
    lng: 24.75,
    images: [],
    description: "",
    isActive: true,
    unitCount: 3,
    availableUnits: 3,
    fullyBooked: false,
    priceFrom: 49,
    units: [],
    isDirectory: false,
    supplierSlug: null,
    serviceTypes: [],
    supplierLogoUrl: null,
    ...over,
  };
}

/** Directory supplier location — free unclaimed profile: map pin + partner page,
 *  NO listings/units/pricing/booking. */
export function directoryLocation(over: Json = {}): Json {
  return apiLocation({
    id: "dir-001",
    supplierId: "sup-dir",
    supplierName: "Kolimisfirma OÜ",
    name: "Kolimisfirma OÜ",
    address: "Pärnu mnt 10",
    unitCount: 0,
    availableUnits: 0,
    priceFrom: null,
    isDirectory: true,
    supplierSlug: "kolimisfirma",
    serviceTypes: ["moving", "cleaning"],
    ...over,
  });
}

/** GET /suppliers/by-slug/{slug} profile (PartnerProfile), directory variant by default. */
export function partnerProfile(over: Json = {}): Json {
  return {
    id: "sup-dir",
    slug: "kolimisfirma",
    name: "Kolimisfirma OÜ",
    country: "EE",
    tagline: null,
    longDescription: null,
    logoUrl: null,
    heroImageUrl: null,
    websiteUrl: "https://kolimisfirma.ee",
    foundedYear: null,
    rating: 0,
    reviewCount: 0,
    tier: "starter",
    isVerified: false,
    foundingPartner: false,
    locationCount: 1,
    listingCount: 0,
    locations: [],
    hasGoogleReviews: false,
    isDirectory: true,
    serviceTypes: ["moving", "cleaning"],
    ...over,
  };
}

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
    // Concierge pivot flags — the real API returns these as STRINGS
    // ("true"/"false"), unlike the older pre-parsed boolean flags.
    conciergeFirst: "true",
    conciergeCities: "Tallinn, Harjumaa",
    ...(opts.settings ?? {}),
  };
  // Leaflet basemap tiles (InteractiveMap → basemaps.cartocdn.com). An e2e run
  // must never depend on a third-party CDN being reachable. Blocked centrally
  // rather than per spec because several surfaces mount the map: SearchPage at
  // lg+ (no showMap gate), HomePage when showMap is on, and the admin Locations
  // tab unconditionally. Leaflet just leaves unfetched tiles blank.
  await page.route(/basemaps\.cartocdn\.com|tile\.openstreetmap\.org/, (r) => r.abort());
  await page.route(/\/settings\/public/, (r) => json(r, settings));
  await page.route(/\/settings\/pricing/, (r) => json(r, pricingConfig()));
  await page.route(/\/features(\b|\/|\?|$)/, (r) => json(r, {}));
  await page.route(/\/locations\/cities/, (r) => json(r, [{ city: "Tallinn", country: "EE" }]));
  await page.route(/\/locations(\b|\/|\?|$)/, (r) => json(r, []));
  await page.route(/\/reviews(\b|\/|\?|$)/, (r) => json(r, { data: [], total: 0 }));
  await page.route(/\/notifications/, (r) => json(r, []));
  await page.route(/\/suppliers(\b|\/|\?|$)/, (r) => json(r, []));
}

/**
 * Override the GET /locations list with concrete items (stubCommon returns []).
 * Register AFTER stubCommon — Playwright routes match in reverse registration
 * order, so this handler wins for /locations* (and keeps /locations/cities working).
 */
export async function stubLocations(page: Page, items: Json[]): Promise<void> {
  await page.route(/\/locations(\b|\/|\?|$)/, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/locations\/cities/.test(path)) return json(route, [{ city: "Tallinn", country: "EE" }]);
    const m = path.match(/\/locations\/([^/]+)$/);
    if (m && m[1] !== "cities") {
      const found = items.find((i) => (i as Json).id === m[1]);
      return found ? json(route, found) : json(route, { message: "not found" }, 404);
    }
    return json(route, items);
  });
}

/**
 * Stub GET /admin/suppliers with REAL server pagination semantics: an
 * { data, total, page, limit, hasMore } envelope whose `limit` is capped at 100
 * exactly like the backend. supplierService.getAll must page through it — a
 * single unpaged fetch used to truncate the directory to the first page.
 * Register AFTER stubCommon (later route wins).
 */
export async function stubAdminSuppliersPaged(page: Page, total: number): Promise<void> {
  await page.route(/\/admin\/suppliers(\b|\?|$)/, (route) => {
    const url = new URL(route.request().url());
    // Leave the single-supplier detail route (/admin/suppliers/{id}) alone.
    if (/\/admin\/suppliers\/[^/]+/.test(url.pathname)) return route.continue();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100); // server caps at 100
    const pageNo = Number(url.searchParams.get("page") ?? 1);
    const start = (pageNo - 1) * limit;
    const data = Array.from({ length: Math.max(0, Math.min(limit, total - start)) }, (_, i) => ({
      id: `sup-${start + i}`,
      name: `Partner ${start + i}`,
      isActive: true,
      slug: null,
      tier: "starter",
      listingCount: 0,
      ordersTotal: 0,
    }));
    return json(route, { data, total, page: pageNo, limit, hasMore: start + data.length < total });
  });
}

/** N locations spread across N distinct partners — the input that turned the
 *  old per-partner filter row into a wall of chips. */
export function locationsAcrossPartners(count: number): Json[] {
  return Array.from({ length: count }, (_, i) =>
    apiLocation({
      id: `loc-${i}`,
      supplierId: `sup-${i}`,
      supplierName: `Partner ${i}`,
      name: `Ladu ${i}`,
      city: "Tallinn",
      lat: 59.43 + i * 0.001,
      lng: 24.75 + i * 0.001,
    }),
  );
}

/** Stub GET /suppliers/by-slug/{slug}. Register AFTER stubCommon (later route wins). */
export async function stubPartner(page: Page, profile: Json): Promise<void> {
  await page.route(/\/suppliers\/by-slug\//, (r) => json(r, profile));
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

/** Stub POST /leads/request (concierge funnel). Pass a non-2xx status to test errors (e.g. 429). */
export async function stubConciergeLead(page: Page, status = 200): Promise<void> {
  await page.route(/\/leads\/request/, (route) =>
    route.request().method() === "POST"
      ? json(route, status === 200 ? { ok: true } : { message: "error" }, status)
      : route.continue(),
  );
}

/** Stub the admin match-queue endpoints: list, metrics and per-lead matches. */
export async function stubAdminLeads(
  page: Page,
  opts: { items?: Json[]; metrics?: Json; matches?: Json[]; candidates?: Json[]; candidateStatus?: number } = {},
): Promise<void> {
  const items = opts.items ?? [];
  const metrics = {
    requestsThisWeek: 4,
    requests30d: 12,
    contactRate30d: 0.75,
    quoteRate30d: 0.5,
    bookingRate30d: 0.25,
    matchRate30d: { matched: 9, total: 12, rate: 0.75 },
    medianFirstResponseMinutes: 42,
    ...(opts.metrics ?? {}),
  };
  await page.route(/\/admin\/leads(\b|\/|\?|$)/, (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (/\/admin\/leads\/metrics/.test(path)) return json(route, metrics);
    if (/\/admin\/leads\/[^/]+\/provider-candidates/.test(path)) {
      if (opts.candidateStatus && opts.candidateStatus >= 400) return json(route, { message: "candidate lookup failed" }, opts.candidateStatus);
      const q = url.searchParams.get("q")?.toLowerCase().trim();
      const candidates = (opts.candidates ?? []).filter((candidate) => {
        if (!q) return true;
        const fields = [candidate.supplierName, candidate.city, candidate.address, candidate.contactEmail, candidate.contactPhone]
          .filter((value): value is string => typeof value === "string");
        return fields.some((value) => value.toLowerCase().includes(q));
      });
      return json(route, {
        items: candidates,
        total: candidates.length,
        scope: url.searchParams.get("scope") ?? "nearby",
        radiusKm: Number(url.searchParams.get("radiusKm") ?? 25),
        anchor: { lat: 58.3776, lng: 26.729 },
      });
    }
    if (/\/admin\/leads\/[^/]+\/matches/.test(path)) return json(route, opts.matches ?? []);
    if (route.request().method() === "PATCH") return json(route, { ok: true });
    return json(route, { total: items.length, page: 1, limit: 50, items });
  });
}

/** Admin demand-lead row (GET /admin/leads item). */
export function adminLead(over: Json = {}): Json {
  return {
    id: "lead-1",
    name: "Mari Maasikas",
    email: "mari@example.com",
    phone: "+372 5555 5555",
    city: "Tallinn",
    toCity: null,
    needDate: "2026-08-01",
    details: "Vajan ladu u 20 m2, augusti algusest.",
    category: "warehouse",
    query: "",
    language: "et",
    createdAt: "2026-07-09T08:00:00Z",
    status: "new",
    adminNotes: null,
    supplierName: null,
    quotedPrice: null,
    ...over,
  };
}

/** Suggested partner match (GET /admin/leads/{id}/matches item). */
export function adminMatch(over: Json = {}): Json {
  return {
    supplierId: "sup-1",
    supplierName: "Acme Storage",
    contactEmail: "acme@example.com",
    contactPhone: "+372 5111 1111",
    listingId: "wh-001",
    listingTitle: "Miniladu 10 m²",
    listingCity: "Tallinn",
    price: 89,
    priceUnit: "€/kuu",
    serviceTypes: [],
    ...over,
  };
}

/** Seven varied providers around Tartu for discovery and outreach review tests. */
export function tartuProviderCandidates(): Json[] {
  return [
    { supplierId: "sup-rare", supplierName: "Rare Minilaod", contactEmail: "hello@rare.ee", contactPhone: "+372 5111 0001", serviceTypes: ["warehouse"], locationId: "loc-rare", locationName: "Kesklinna ladu", city: "Tartu", address: "Riia 1, Tartu", lat: 58.378, lng: 26.73, distanceKm: 0.6, isExactCity: true, listingId: "listing-rare", listingTitle: "Miniladu 5 m²", price: 49, priceUnit: "€/kuu", alreadyContacted: false, lastOutreachAt: null, otherLocations: [] },
    { supplierId: "sup-kapsel", supplierName: "Kapsel Minilaod", contactEmail: "info@kapsel.ee", contactPhone: "+372 5111 0002", serviceTypes: ["warehouse"], locationId: "loc-kapsel", locationName: "Annelinna ladu", city: "Tartu", address: "Kalda tee 4, Tartu", lat: 58.37, lng: 26.75, distanceKm: 1.8, isExactCity: true, listingId: "listing-kapsel", listingTitle: "Miniladu 8 m²", price: 69, priceUnit: "€/kuu", alreadyContacted: false, lastOutreachAt: null, otherLocations: [] },
    { supplierId: "sup-panicom", supplierName: "Panicom Miniladu", contactEmail: "sales@panicom.ee", contactPhone: "+372 5111 0003", serviceTypes: ["warehouse"], locationId: "loc-panicom", locationName: "Ropka ladu", city: "Tartu", address: "Tehase 12, Tartu", lat: 58.35, lng: 26.72, distanceKm: 3.2, isExactCity: true, listingId: "listing-panicom", listingTitle: "Miniladu 10 m²", price: 89, priceUnit: "€/kuu", alreadyContacted: false, lastOutreachAt: null, otherLocations: [{ locationId: "loc-panicom-2", locationName: "Tamme ladu", city: "Tartu", address: "Tamme pst 9, Tartu", lat: 58.36, lng: 26.7, distanceKm: 4.1 }] },
    { supplierId: "sup-north", supplierName: "North Storage", contactEmail: "hello@north.ee", contactPhone: null, serviceTypes: ["warehouse"], locationId: "loc-north", locationName: "Raadi ladu", city: "Tartu", address: "Narva mnt 99, Tartu", lat: 58.39, lng: 26.76, distanceKm: 4.7, isExactCity: true, listingId: null, listingTitle: null, price: null, priceUnit: null, alreadyContacted: false, lastOutreachAt: null, otherLocations: [] },
    { supplierId: "sup-noemail", supplierName: "Emajõe Laod", contactEmail: null, contactPhone: "+372 5111 0005", serviceTypes: ["warehouse"], locationId: "loc-noemail", locationName: "Ihaste ladu", city: "Tartu", address: "Kalda tee 28, Tartu", lat: 58.34, lng: 26.78, distanceKm: 5.6, isExactCity: true, listingId: null, listingTitle: null, price: null, priceUnit: null, alreadyContacted: false, lastOutreachAt: null, otherLocations: [] },
    { supplierId: "sup-contacted", supplierName: "Tartu Ladu", contactEmail: "contact@tartuladu.ee", contactPhone: "+372 5111 0006", serviceTypes: ["warehouse"], locationId: "loc-contacted", locationName: "Ravila ladu", city: "Tartu", address: "Ravila 53, Tartu", lat: 58.37, lng: 26.68, distanceKm: 6.9, isExactCity: true, listingId: "listing-contacted", listingTitle: "Laoboks 12 m²", price: 79, priceUnit: "€/kuu", alreadyContacted: true, lastOutreachAt: "2026-07-10T09:30:00Z", otherLocations: [] },
    { supplierId: "sup-far", supplierName: "Lõuna Laoruum", contactEmail: "info@lounaladu.ee", contactPhone: "+372 5111 0007", serviceTypes: ["warehouse"], locationId: "loc-far", locationName: "Tõrvandi ladu", city: "Tõrvandi", address: "Ringtee 8, Tõrvandi", lat: 58.31, lng: 26.7, distanceKm: 8.4, isExactCity: false, listingId: "listing-far", listingTitle: "Ladu 15 m²", price: 99, priceUnit: "€/kuu", alreadyContacted: false, lastOutreachAt: null, otherLocations: [] },
  ];
}

/**
 * Stateful stub for the admin offer loop (overhaul spec §5.1):
 * GET/POST /admin/leads/{id}/outreach, GET/POST /admin/leads/{id}/offers,
 * GET/PATCH /admin/offers/{id}, POST /admin/offers/{id}/send,
 * PATCH /admin/outreach/{id}. Register AFTER stubAdminLeads — the later
 * route wins for the overlapping /admin/leads/{id}/... paths.
 */
export async function stubOfferLoop(
  page: Page,
  opts: {
    offers?: Json[];
    outreach?: Json[];
    previewStatus?: number;
    outreachStatus?: number;
    previewDelayMs?: number;
    sendSkipReasons?: Record<string, OutreachSkipReason>;
    offerUpdateStatus?: number;
    offerDeleteStatus?: number;
    /** Delivery-preview (GET /admin/offers/{id}/delivery-preview) failure code. */
    deliveryPreviewStatus?: number;
    /** confirm-booking (POST /admin/offers/{id}/confirm-booking) failure code. */
    confirmStatus?: number;
    /** Lead rows shared with stubAdminLeads (same array ref) so confirm-booking
     *  can flip the mocked lead to Converted in place. */
    leadItems?: Json[];
  } = {},
): Promise<void> {
  const offers: Json[] = [...(opts.offers ?? [])];
  const outreach: Json[] = [...(opts.outreach ?? [])];
  const candidates = tartuProviderCandidates();
  const providerFor = (supplierId: string) => candidates.find((candidate) => candidate.supplierId === supplierId);
  let seq = 0;
  await page.route(
    /\/admin\/(leads\/[^/]+\/(outreach(?:\/preview)?|offers)|offers\/[^/]+(\/send|\/delivery-preview|\/confirm-booking)?|outreach\/[^/]+)(\?|$)/,
    async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const method = req.method();

      if (/\/admin\/leads\/[^/]+\/outreach/.test(path)) {
        if (/\/outreach\/preview$/.test(path) && method === "POST") {
          if (opts.previewStatus && opts.previewStatus >= 400) return json(route, { message: "preview failed" }, opts.previewStatus);
          const body = (req.postDataJSON() ?? {}) as { supplierIds?: string[] };
          if (opts.previewDelayMs) await new Promise((resolve) => setTimeout(resolve, opts.previewDelayMs));
          const recipients = (body.supplierIds ?? []).map((supplierId) => {
            const provider = providerFor(supplierId);
            if (!provider) {
              return { supplierId, supplierName: null, email: null, language: null, subject: null, textBody: null, skipReason: "not_found" };
            }
            const supplierName = String(provider.supplierName);
            const email = typeof provider.contactEmail === "string" ? provider.contactEmail : null;
            return {
              supplierId,
              supplierName,
              email,
              language: "en",
              subject: `Ruumly availability request for ${supplierName}`,
              textBody: `Exact reviewed outreach body for ${supplierName} in Tartu.`,
              skipReason: !email ? "no_email" : provider.alreadyContacted ? "already_contacted" : null,
            };
          });
          return json(route, { recipients });
        }
        if (method === "POST") {
          if (opts.outreachStatus && opts.outreachStatus >= 400) return json(route, { message: "send failed" }, opts.outreachStatus);
          const body = (req.postDataJSON() ?? {}) as { supplierIds?: string[]; resend?: boolean };
          const rows: Json[] = [];
          const skipped: Json[] = [];
          for (const supplierId of body.supplierIds ?? []) {
            const provider = providerFor(supplierId);
            const forcedReason = opts.sendSkipReasons?.[supplierId];
            const naturalReason: OutreachSkipReason | null = !provider
              ? "not_found"
              : !provider.contactEmail
                ? "no_email"
                : provider.alreadyContacted && !body.resend
                  ? "already_contacted"
                  : null;
            const reason = forcedReason ?? naturalReason;
            if (reason) {
              skipped.push({ supplierId, supplierName: provider?.supplierName ?? null, reason });
              continue;
            }
            rows.push({
              id: `or-${++seq}`, demandLeadId: "lead-1", supplierId,
              supplierName: provider!.supplierName, sentTo: provider!.contactEmail,
              sentAt: "2026-07-10T09:30:00Z", status: "sent", note: null,
            });
          }
          outreach.push(...rows);
          return json(route, { sent: rows, skipped });
        }
        return json(route, outreach);
      }

      if (/\/admin\/leads\/[^/]+\/offers/.test(path)) {
        if (method === "POST") {
          const existingDraft = offers.find((offer) => offer.status === "draft");
          if (existingDraft) return json(route, existingDraft);
          const body = (req.postDataJSON() ?? {}) as { options?: Json[]; customerNote?: string };
          const created: Json = {
            id: `offer-${++seq}`, demandLeadId: "lead-1", token: "tok-e2e",
            status: "draft", language: "et", customerNote: body.customerNote ?? null,
            createdAt: "2026-07-10T09:40:00Z", sentAt: null, viewedAt: null,
            chosenAt: null, chosenOptionId: null, createdBy: "admin@ruumly.eu",
            options: (body.options ?? []).map((o, i) => ({
              id: `oopt-${++seq}`,
              supplierId: (o as Json).supplierId ?? null,
              supplierName: null,
              supplierLocationId: (o as Json).supplierLocationId ?? null,
              title: (o as Json).title ?? "",
              priceAmount: (o as Json).priceAmount ?? null,
              priceUnit: (o as Json).priceUnit ?? null,
              notes: (o as Json).notes ?? null,
              sortOrder: (o as Json).sortOrder ?? i,
            })),
          };
          offers.push(created);
          return json(route, created);
        }
        return json(route, offers);
      }

      // Side-effect-free delivery preview (Task 3). NEVER mutates offer status
      // and NEVER marks the offer viewed — the operator can preview a draft
      // repeatedly before sending. `page` mirrors the sanitized public DTO.
      const previewMatch = path.match(/\/admin\/offers\/([^/]+)\/delivery-preview/);
      if (previewMatch && method === "GET") {
        if (opts.deliveryPreviewStatus && opts.deliveryPreviewStatus >= 400) {
          return json(route, { message: "preview failed" }, opts.deliveryPreviewStatus);
        }
        const o = offers.find((x) => x.id === previewMatch[1]) as Json | undefined;
        if (!o) return json(route, { message: "not found" }, 404);
        return json(route, {
          recipient: { name: "Mari Maasikas", email: "mari@example.com" },
          email: {
            subject: "Your Ruumly options",
            textBody: "Hi Mari,\n\nHere are the storage options we found for you.\nOpen your page to choose the one you like.\n\nRuumly",
          },
          page: {
            status: o.status,
            language: o.language,
            customerNote: o.customerNote,
            sentAt: o.sentAt,
            chosenOptionId: o.chosenOptionId,
            lead: { category: "warehouse", city: "Tallinn", toCity: null, needDate: "2026-08-01", details: null },
            options: (((o.options as Json[]) ?? [])).map((op) => ({
              id: (op as Json).id,
              title: (op as Json).title,
              priceAmount: (op as Json).priceAmount ?? null,
              priceUnit: (op as Json).priceUnit ?? null,
              notes: (op as Json).notes ?? null,
              supplierName: (op as Json).supplierName ?? null,
            })),
          },
        });
      }

      // Admin booking confirmation (Task 4): requires a Chosen offer; on success
      // converts the mocked lead in place. Idempotent success stays 200.
      const confirmMatch = path.match(/\/admin\/offers\/([^/]+)\/confirm-booking/);
      if (confirmMatch && method === "POST") {
        if (opts.confirmStatus && opts.confirmStatus >= 400) {
          return json(route, { message: opts.confirmStatus === 409 ? "The chosen option no longer exists." : "confirm failed" }, opts.confirmStatus);
        }
        const o = offers.find((x) => x.id === confirmMatch[1]) as Json | undefined;
        if (!o) return json(route, { message: "not found" }, 404);
        if (o.status !== "chosen") return json(route, { message: "Confirm the customer's chosen offer instead." }, 409);
        for (const lead of opts.leadItems ?? []) {
          if ((lead as Json).id === o.demandLeadId) (lead as Json).status = "converted";
        }
        return json(route, o);
      }

      const sendMatch = path.match(/\/admin\/offers\/([^/]+)\/send/);
      if (sendMatch && method === "POST") {
        const o = offers.find((x) => x.id === sendMatch[1]) as Json | undefined;
        if (!o) return json(route, { message: "not found" }, 404);
        o.status = "sent";
        o.sentAt = "2026-07-10T10:00:00Z";
        return json(route, o);
      }

      const offerMatch = path.match(/\/admin\/offers\/([^/]+)$/);
      if (offerMatch) {
        const o = offers.find((x) => x.id === offerMatch[1]) as Json | undefined;
        if (!o) return json(route, { message: "not found" }, 404);
        if (method === "DELETE") {
          if (opts.offerDeleteStatus && opts.offerDeleteStatus >= 400) {
            if (opts.offerDeleteStatus === 404) offers.splice(offers.indexOf(o), 1);
            return json(route, { message: opts.offerDeleteStatus === 409 ? "Offer is no longer a draft." : "not found" }, opts.offerDeleteStatus);
          }
          if (o.status !== "draft") return json(route, { message: "Offer is no longer a draft." }, 409);
          offers.splice(offers.indexOf(o), 1);
          return route.fulfill({ status: 204 });
        }
        if (method === "PATCH") {
          if (opts.offerUpdateStatus && opts.offerUpdateStatus >= 400) {
            return json(route, { message: opts.offerUpdateStatus === 409 ? "Offer is no longer a draft." : "update failed" }, opts.offerUpdateStatus);
          }
          const body = (req.postDataJSON() ?? {}) as Json;
          if (body.customerNote !== undefined) o.customerNote = body.customerNote;
          if (Array.isArray(body.options)) {
            o.options = (body.options as Json[]).map((op, i) => ({
              id: `oopt-${++seq}`,
              supplierId: op.supplierId ?? null,
              supplierName: null,
              supplierLocationId: op.supplierLocationId ?? null,
              title: op.title ?? "",
              priceAmount: op.priceAmount ?? null,
              priceUnit: op.priceUnit ?? null,
              notes: op.notes ?? null,
              sortOrder: op.sortOrder ?? i,
            }));
          }
        }
        return json(route, o);
      }

      const outreachMatch = path.match(/\/admin\/outreach\/([^/]+)$/);
      if (outreachMatch && method === "PATCH") {
        const r = outreach.find((x) => x.id === outreachMatch[1]) as Json | undefined;
        if (!r) return json(route, { message: "not found" }, 404);
        const body = (req.postDataJSON() ?? {}) as Json;
        if (body.status) r.status = body.status;
        if (body.note !== undefined) r.note = body.note;
        return json(route, r);
      }

      return route.continue();
    },
  );
}

/** Draft offer carrying one ready option — the input to delivery review (Task 8). */
export function draftOfferWithOption(over: Json = {}): Json {
  return {
    id: "offer-draft", demandLeadId: "lead-1", token: "tok-draft", status: "draft", language: "en",
    customerNote: "Both providers can host on your date.", createdAt: "2026-07-10T09:40:00Z",
    sentAt: null, viewedAt: null, chosenAt: null, chosenOptionId: null, createdBy: "admin@ruumly.eu",
    options: [
      { id: "oopt-draft-1", supplierId: "sup-panicom", supplierName: "Panicom Miniladu", supplierLocationId: "loc-panicom", title: "Miniladu 10 m² kesklinnas", priceAmount: 89, priceUnit: "€/kuu", notes: "24/7 access", sortOrder: 0 },
    ],
    ...over,
  };
}

/** Outreach row whose provider submitted a price via the tokenized quote page
 *  (Feature B): Status=Replied plus the stored quote fields. */
export function quotedOutreachRow(over: Json = {}): Json {
  return {
    id: "or-quoted", demandLeadId: "lead-1", supplierId: "sup-panicom",
    supplierName: "Panicom Miniladu", sentTo: "sales@panicom.ee",
    sentAt: "2026-07-10T09:30:00Z", status: "replied", note: null,
    quotedAmount: 89, quotedUnit: "€/kuu", quotedAvailability: "From Aug 1",
    quotedNote: "24/7 access", quotedAt: "2026-07-10T12:15:00Z",
    ...over,
  };
}

/** Draft offer whose option the backend auto-seeded from a provider quote
 *  (Feature B) — the admin surfaces it with a "from provider quote" badge. */
export function quoteSeededDraftOffer(over: Json = {}): Json {
  return draftOfferWithOption({
    options: [{
      id: "oopt-quote-1", supplierId: "sup-panicom", supplierName: "Panicom Miniladu",
      supplierLocationId: "loc-panicom", title: "Panicom Miniladu — Tallinn",
      priceAmount: 89, priceUnit: "€/kuu", notes: "24/7 access", sortOrder: 0,
      fromProviderQuote: true,
    }],
    ...over,
  });
}

/** Chosen offer — a pending customer preference awaiting provider confirmation (Task 8). */
export function chosenOffer(over: Json = {}): Json {
  return {
    id: "offer-chosen", demandLeadId: "lead-1", token: "tok-chosen", status: "chosen", language: "en",
    customerNote: null, createdAt: "2026-07-10T09:40:00Z", sentAt: "2026-07-10T10:00:00Z",
    viewedAt: "2026-07-10T11:00:00Z", chosenAt: "2026-07-11T08:00:00Z", chosenOptionId: "oopt-chosen-1",
    createdBy: "admin@ruumly.eu",
    options: [
      { id: "oopt-chosen-1", supplierId: "sup-panicom", supplierName: "Panicom Miniladu", supplierLocationId: "loc-panicom", title: "Miniladu 10 m² kesklinnas", priceAmount: 89, priceUnit: "€/kuu", notes: "24/7 access", sortOrder: 0 },
      { id: "oopt-chosen-2", supplierId: null, supplierName: null, supplierLocationId: null, title: "Laopind 20 m² Lasnamäel", priceAmount: 129, priceUnit: "€/kuu", notes: null, sortOrder: 1 },
    ],
    ...over,
  };
}

/** Public offer fixture (GET /offers/{token} shape per overhaul spec §5.1). */
export function publicOffer(over: Json = {}): Json {
  return {
    status: "sent",
    language: "et",
    customerNote: "Mõlemad partnerid saavad su soovitud ajal.",
    sentAt: "2026-07-10T09:00:00Z",
    chosenOptionId: null,
    lead: { category: "warehouse", city: "Tallinn", toCity: null, needDate: "2026-08-01", details: "u 20 m2" },
    options: [
      { id: "opt-1", title: "Miniladu 10 m² kesklinnas", priceAmount: 89, priceUnit: "€/kuu", notes: "24/7 ligipääs", supplierName: "Acme Storage" },
      { id: "opt-2", title: "Laopind 20 m² Lasnamäel", priceAmount: 129, priceUnit: "€/kuu", notes: null, supplierName: null },
    ],
    ...over,
  };
}

/**
 * Stub the public offer endpoints: GET /offers/{token} (pass a non-2xx
 * `getStatus` for invalid/expired tokens) and POST /offers/{token}/choose.
 */
export async function stubPublicOffer(
  page: Page,
  opts: { offer?: Json; getStatus?: number; chooseStatus?: number } = {},
): Promise<void> {
  const offer = opts.offer ?? publicOffer();
  await page.route(/\/offers\/[^/?]+(\/choose)?(\?|$)/, (route) => {
    const req = route.request();
    if (req.method() === "POST" && /\/choose/.test(req.url())) {
      const status = opts.chooseStatus ?? 200;
      if (status !== 200) return json(route, { message: "conflict" }, status);
      const body = req.postDataJSON() as { optionId?: string };
      return json(route, { ok: true, chosenOptionId: body?.optionId ?? "opt-1", chosenAt: "2026-07-10T10:00:00Z" });
    }
    const status = opts.getStatus ?? 200;
    return status === 200 ? json(route, offer) : json(route, { message: "not found" }, status);
  });
}

/** Public provider quote fixture (GET /quote/{token} shape per spec §B). NO PII. */
export function publicQuote(over: Json = {}): Json {
  return {
    provider: { name: "Panicom Miniladu" },
    lead: { category: "warehouse", city: "Tallinn", toCity: null, needDate: "2026-08-01", details: "u 20 m2, augusti algusest" },
    currency: "EUR",
    alreadySubmitted: false,
    existing: null,
    ...over,
  };
}

/**
 * Stateful stub for the public provider quote page (Feature B):
 * GET /quote/{token} (pass a non-2xx `getStatus` for invalid/expired tokens)
 * and POST /quote/{token}. A successful POST flips the GET to alreadySubmitted
 * with the submitted values (mirrors the real re-submit prefill).
 *
 * The matcher is a pathname predicate rather than a plain regex: the API path
 * ({VITE_API_URL}/quote/{token} → /api/quote/{token}) and the SPA page path
 * (/{lang}/quote/{token}) share the "/quote/" segment, so the lang-prefixed
 * page navigation is explicitly excluded and can never be answered with JSON.
 */
export async function stubQuote(
  page: Page,
  opts: { quote?: Json; getStatus?: number; submitStatus?: number } = {},
): Promise<void> {
  const state: Json = { ...(opts.quote ?? publicQuote()) };
  await page.route(
    (url) => /\/quote\/[^/]+$/.test(url.pathname) && !/^\/[a-z]{2}\/quote\//.test(url.pathname),
    (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        const status = opts.submitStatus ?? 200;
        if (status !== 200) return json(route, { message: "error" }, status);
        const body = (req.postDataJSON() ?? {}) as {
          priceAmount?: number; priceUnit?: string; availability?: string; note?: string;
        };
        state.alreadySubmitted = true;
        state.existing = {
          amount: body.priceAmount ?? null,
          unit: body.priceUnit ?? null,
          availability: body.availability ?? null,
          note: body.note ?? null,
        };
        return json(route, { ok: true });
      }
      const status = opts.getStatus ?? 200;
      return status === 200 ? json(route, state) : json(route, { message: "not found" }, status);
    },
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
