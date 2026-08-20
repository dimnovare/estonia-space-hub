// ─── Frontend Service Layer — wired to real backend ───

import { apiClient } from "./apiClient";
import { withSupplier } from "@/lib/withSupplier";
import { unwrapPaginated } from "./unwrapPaginated";
import type {
  User, Supplier, Order, Booking, Notification, Invoice, Message,
  AuditLogEntry, OrderStatus, PartnerIntegrationSettings, OrderRoutingRule,
  Listing, ListingBase, ListingType, ListingFilters, PaginatedResponse, CreateBookingInput,
  SupplierLocation, PaymentResult, SupplierApplication,
  WarehouseListing, MovingListing, TrailerListing,
  LeadStatus, LeadSummary, RebateInvoice,
  ProviderPaidFeatures, PaidFeatureRequest,
} from "./types";

// ─── Listing helpers ───────────────────────────────────────────────────────────

interface ApiListing {
  id: string;
  type: string;
  title: string;
  supplierName: string;
  supplierSlug?: string | null;
  address: string;
  city: string;
  lat: number;
  lng: number;
  priceFrom: number;
  priceUnit: string;
  availableNow: boolean;
  badge?: string;
  rating: number;
  reviewCount: number;
  description: string;
  images: string[];
  features: Record<string, unknown>;
  supplierId?: string;
  locationId?: string | null;
  vatRate?: number | null;
  pricesIncludeVat?: boolean;
  depositAmount?: number | null;
  requiresLicenseCategory?: string | null;
  minBookingMonths?: number | null;
  bookingEnabled?: boolean;
  contractSigningEnabled?: boolean;
  directPaymentEnabled?: boolean;
  ruumlyPaymentEnabled?: boolean;
  isVerified?: boolean;
  foundingPartner?: boolean;
  isFeatured?: boolean;
}

function mapListing(api: ApiListing): Listing {
  const base: Omit<Listing, keyof (WarehouseListing | MovingListing | TrailerListing)> & Record<string, unknown> = {
    id: api.id,
    type: (api.type?.toLowerCase() || "warehouse") as ListingType,
    supplierId: api.supplierId || "",
    supplierSlug: api.supplierSlug ?? null,
    title: api.title || "",
    provider: api.supplierName || "",
    address: api.address || "",
    city: api.city || "",
    lat: api.lat ?? 0,
    lng: api.lng ?? 0,
    priceFrom: api.priceFrom ?? 0,
    priceUnit: api.priceUnit || "/month",
    image: api.images?.[0] || "",
    images: api.images || [],
    availableNow: api.availableNow ?? false,
    rating: api.rating ?? 0,
    reviewCount: api.reviewCount ?? 0,
    badge: api.badge as ListingBase["badge"],
    description: api.description || "",
    sizeM2: (api.features?.sizeM2 as number) ?? undefined,
    quantityTotal: (api.features?.quantityTotal as number) ?? undefined,
    locationId: api.locationId ?? undefined,
    isVerified: api.isVerified ?? false,
    isFoundingPartner: api.foundingPartner ?? false,
    isFeatured: api.isFeatured ?? false,
    bookingEnabled: api.bookingEnabled ?? false,
    contractSigningEnabled: api.contractSigningEnabled ?? false,
    directPaymentEnabled: api.directPaymentEnabled ?? false,
    ruumlyPaymentEnabled: api.ruumlyPaymentEnabled ?? false,
    // VAT: carry through so the booking review can show the correct VAT row.
    // Backend resolves vatRate to the effective country rate (never null), so a
    // VAT-exclusive listing no longer renders as 0% and under-states the charge.
    vatRate: api.vatRate ?? null,
    pricesIncludeVat: api.pricesIncludeVat ?? undefined,
    depositAmount: api.depositAmount ?? null,
    requiresLicenseCategory: api.requiresLicenseCategory ?? null,
    minBookingMonths: api.minBookingMonths ?? null,
  };

  const f = api.features ?? {};
  const t = base.type as ListingType;

  if (t === "warehouse") {
    return {
      ...base,
      type: "warehouse",
      size: (f.size as number) ?? (f.sizeM2 as number) ?? 0,
      sizeUnit: (f.sizeUnit as string) ?? "m²",
      heated: (f.heated as boolean) ?? false,
      indoor: (f.indoor as boolean) ?? false,
      access24_7: (f.access24_7 as boolean) ?? false,
      security: (f.security as boolean) ?? false,
      loadingDock: (f.loadingDock as boolean) ?? false,
      forklift: (f.forklift as boolean) ?? false,
      shortTerm: (f.shortTerm as boolean) ?? false,
      longTerm: (f.longTerm as boolean) ?? false,
      features: (f.features as Record<string, unknown>) ?? {},
    } as unknown as WarehouseListing;
  }

  if (t === "moving") {
    return {
      ...base,
      type: "moving",
      serviceArea: (f.serviceArea as string[]) ?? [],
      withVan: (f.withVan as boolean) ?? false,
      packingHelp: (f.packingHelp as boolean) ?? false,
      loadingHelp: (f.loadingHelp as boolean) ?? false,
      pricingModel: (f.pricingModel as "fixed" | "hourly") ?? "fixed",
      services: (f.services as string[]) ?? [],
      crewSize: (f.crewSize as string) || undefined,
      vanSize: (f.vanSize as string) || undefined,
    } as MovingListing;
  }

  // trailer
  return {
    ...base,
    type: "trailer",
    trailerType: (f.trailerType as string) ?? "",
    weightClass: (f.weightClass as string) ?? "",
    requirements: (f.requirements as string[]) ?? [],
  } as TrailerListing;
}

// ─── Status normalisation ──────────────────────────────────────────────────────

function lc<T extends string>(v: T): T {
  return (typeof v === "string" ? v.toLowerCase() : v) as T;
}

function normalizeBooking(b: Booking): Booking {
  return { ...b, status: lc(b.status) };
}

export function normalizeUser(u: User): User {
  return { ...u, role: lc(u.role), status: lc(u.status) as "active" | "blocked" };
}

// ─── User Service ───────────────────────────────────────────────────────────────
export const userService = {
  async getAll(limit = 200): Promise<User[]> {
    const res = await apiClient.get<any>(`/admin/users?limit=${limit}`);
    return unwrapPaginated<User>(res).map(normalizeUser);
  },
  async getById(id: string): Promise<User | undefined> {
    return normalizeUser(await apiClient.get<User>(`/admin/users/${id}`));
  },
  async updateStatus(id: string, status: "active" | "blocked"): Promise<User> {
    const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
    return normalizeUser(
      await apiClient.patch<User>(`/admin/users/${id}/status`, { status: capitalized })
    );
  },
};

// ─── Supplier Service ───────────────────────────────────────────────────────────

// GET /admin/suppliers is paginated server-side and caps `limit` at 100
// (limit=200 echoes 100). A single unpaged request therefore returned only the
// first page and silently truncated the directory — the Partners page read
// "50 / 50" against 163 real partners. Page through and return the whole set.
const SUPPLIERS_PAGE_LIMIT = 100;
// Runaway guard: 20 × 100 is far beyond any real partner count, and bounds the
// loop even if a server stopped honouring `page`.
const SUPPLIERS_MAX_PAGES = 20;

export const supplierService = {
  /**
   * Every partner, following server pagination to the end.
   *
   * Takes NO arguments on purpose: several call sites pass this as a bare
   * `queryFn: supplierService.getAll`, which TanStack Query invokes with a
   * QueryFunctionContext — any parameter added here would silently receive that
   * object instead of a caller's value.
   */
  async getAll(): Promise<Supplier[]> {
    const all: Supplier[] = [];
    for (let page = 1; page <= SUPPLIERS_MAX_PAGES; page++) {
      const res = await apiClient.get<any>(`/admin/suppliers?page=${page}&limit=${SUPPLIERS_PAGE_LIMIT}`);
      const batch = unwrapPaginated<Supplier>(res);
      all.push(...batch);
      // A bare array carries no pagination metadata — it is already the whole set.
      if (Array.isArray(res)) break;
      // Stop as soon as the server says there is no more, we have collected the
      // reported total, or the page came back short (which also covers empty).
      if (res?.hasMore === false) break;
      if (typeof res?.total === "number" && all.length >= res.total) break;
      if (batch.length < SUPPLIERS_PAGE_LIMIT) break;
    }
    return all;
  },
  async getById(id: string): Promise<Supplier | undefined> {
    return apiClient.get<Supplier>(`/admin/suppliers/${id}`);
  },
  async updateStatus(id: string, isActive: boolean): Promise<Supplier> {
    return apiClient.patch<Supplier>(`/admin/suppliers/${id}/status`, { isActive });
  },
  async testIntegration(id: string): Promise<{ success: boolean; latency: number }> {
    const res = await apiClient.post<{ success: boolean; latencyMs: number }>(
      `/admin/suppliers/${id}/test`, {}
    );
    return { success: res.success, latency: res.latencyMs };
  },
  async create(data: Record<string, unknown>): Promise<Supplier> {
    return apiClient.post<Supplier>("/admin/suppliers", data);
  },
  async update(id: string, data: Record<string, unknown>): Promise<Supplier> {
    return apiClient.patch<Supplier>(`/admin/suppliers/${id}`, data);
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/admin/suppliers/${id}`);
  },
  async syncNow(id: string): Promise<{ unitsRefreshed?: number; message?: string }> {
    return apiClient.post<{ unitsRefreshed?: number; message?: string }>(
      `/admin/suppliers/${id}/sync`, {}
    );
  },
  async getPollLog(id: string, limit = 10): Promise<Array<{
    timestamp: string;
    status: "ok" | "error" | "skipped";
    durationMs?: number;
    unitsRefreshed?: number;
    errorMessage?: string;
  }>> {
    const res = await apiClient.get<any>(`/admin/suppliers/${id}/poll-log?limit=${limit}`);
    return unwrapPaginated(res);
  },
};

// ─── Listing Service ────────────────────────────────────────────────────────────
export const listingService = {
  async search(filters?: ListingFilters): Promise<PaginatedResponse<Listing>> {
    const params = new URLSearchParams();
    if (filters?.type)     params.set("type",     filters.type);
    if (filters?.city)     params.set("city",     filters.city);
    if (filters?.priceMax) params.set("priceMax", String(filters.priceMax));
    if (filters?.sort)     params.set("sort",     filters.sort);
    if (filters?.query)    params.set("q",        filters.query);
    if (filters?.page)     params.set("page",     String(filters.page));
    if (filters?.limit)    params.set("limit",    String(filters.limit));
    if (filters?.availableNow) params.set("availableNow", "true");
    if (filters?.availableFrom) params.set("availableFrom", filters.availableFrom);
    if (filters?.availableTo)   params.set("availableTo",   filters.availableTo);
    if (filters?.minSize != null) params.set("minSize", String(filters.minSize));
    if (filters?.maxSize != null) params.set("maxSize", String(filters.maxSize));
    if (filters?.sizeCategory) params.set("sizeCategory", filters.sizeCategory);
    if (filters?.supplierId) params.set("supplierId", filters.supplierId);
    if (filters?.locationId) params.set("locationId", filters.locationId);
    if (filters?.includeGrouped) params.set("includeGrouped", "true");
    const raw = await apiClient.get<{ data: ApiListing[]; total: number; page: number; limit: number; hasMore: boolean }>(
      `/listings?${params.toString()}`
    );
    return { ...raw, data: raw.data.map(mapListing) };
  },
  async getById(id: string): Promise<Listing | undefined> {
    return mapListing(await apiClient.get<ApiListing>(`/listings/${id}`));
  },
  async getFeatured(): Promise<Listing[]> {
    const raw = await apiClient.get<ApiListing[]>("/listings/featured");
    return raw.map(mapListing);
  },
};

// ─── Order Service ──────────────────────────────────────────────────────────────
export const orderService = {
  async getAll(params?: { supplierId?: string; limit?: number }): Promise<Order[]> {
    const qs = new URLSearchParams({ limit: String(params?.limit ?? 200) });
    if (params?.supplierId) qs.set("supplierId", params.supplierId);
    return apiClient.get<Order[]>(`/orders?${qs}`);
  },
  // Server-side paginated + status-filtered fetch for the admin orders table.
  // Returns the raw {data,total,page,limit,hasMore} envelope.
  async getAllPaged(params: { supplierId?: string; status?: string; page?: number; limit?: number }): Promise<{ data: Order[]; total: number; page: number; limit: number; hasMore: boolean }> {
    const qs = new URLSearchParams({
      page:  String(params.page ?? 1),
      limit: String(params.limit ?? 50),
    });
    if (params.supplierId) qs.set("supplierId", params.supplierId);
    if (params.status && params.status !== "all") qs.set("status", params.status);
    return apiClient.get(`/orders?${qs}`);
  },
  // Order counts by status (+ "all" total), scoped server-side to the caller.
  async getStatusCounts(supplierId?: string): Promise<Record<string, number>> {
    const url = supplierId
      ? `/orders/status-counts?supplierId=${supplierId}`
      : "/orders/status-counts";
    return apiClient.get<Record<string, number>>(url);
  },
  async getById(id: string): Promise<Order | undefined> {
    try { return await apiClient.get<Order>(`/orders/${id}`); } catch { return undefined; }
  },
  async getByBookingId(bookingId: string): Promise<Order | undefined> {
    try { return await apiClient.get<Order>(`/orders/by-booking/${bookingId}`); } catch { return undefined; }
  },
  async approve(id: string): Promise<Order> {
    return apiClient.post<Order>(`/orders/${id}/approve`, {});
  },
  async reject(id: string, reason: string): Promise<Order> {
    return apiClient.post<Order>(`/orders/${id}/reject`, { reason });
  },
  async confirm(id: string): Promise<Order> {
    return apiClient.post<Order>(`/orders/${id}/confirm`, {});
  },
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return apiClient.patch<Order>(`/orders/${id}/status`, { status });
  },
  async getLeadSummary(supplierId?: string): Promise<LeadSummary> {
    const url = supplierId
      ? `/orders/lead-summary?supplierId=${supplierId}`
      : "/orders/lead-summary";
    return apiClient.get<LeadSummary>(url);
  },
  async updateLead(id: string, data: { status?: LeadStatus; providerNotes?: string; lastContactAt?: string }): Promise<Order> {
    return apiClient.patch<Order>(`/orders/${id}/lead`, data);
  },
};

// ─── Booking Service ────────────────────────────────────────────────────────────
export const bookingService = {
  async getAll(personal = false): Promise<Booking[]> {
    const qs = personal ? "?personal=true&limit=200" : "?limit=200";
    const res = await apiClient.get<any>(`/bookings${qs}`);
    return unwrapPaginated<Booking>(res).map(normalizeBooking);
  },
  async getById(id: string): Promise<Booking | undefined> {
    return normalizeBooking(await apiClient.get<Booking>(`/bookings/${id}`));
  },
  async create(input: CreateBookingInput): Promise<Booking> {
    return normalizeBooking(await apiClient.post<Booking>("/bookings", input));
  },
};

// ─── Notification Service ───────────────────────────────────────────────────────
export const notificationService = {
  async getAll(): Promise<Notification[]> {
    return apiClient.get<Notification[]>("/notifications");
  },
  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`, {});
  },
  async markAllRead(): Promise<void> {
    await apiClient.post("/notifications/read-all", {});
  },
};

// ─── Invoice Service ────────────────────────────────────────────────────────────
export const invoiceService = {
  async getAll(): Promise<Invoice[]> {
    const res = await apiClient.get<{ data: Invoice[] } | Invoice[]>("/invoices");
    return unwrapPaginated<Invoice>(res);
  },
  async getByBookingId(bookingId: string): Promise<Invoice | undefined> {
    return apiClient.get<Invoice>(`/invoices/by-booking/${bookingId}`);
  },
  // No backend GET /invoices/{id} exists; resolve from the current user's invoices.
  async getById(invoiceId: string): Promise<Invoice | undefined> {
    const all = await invoiceService.getAll();
    return all.find((inv) => inv.id === invoiceId);
  },
};

// ─── Message Service ────────────────────────────────────────────────────────────
export const messageService = {
  async getByBookingId(bookingId: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`/messages?bookingId=${bookingId}`);
  },
  async send(bookingId: string, text: string): Promise<Message> {
    return apiClient.post<Message>("/messages", { bookingId, text });
  },
};

// ─── Audit Service ──────────────────────────────────────────────────────────────
export interface AuditLogFilters {
  actor?: string;
  action?: string;
  target?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number;
  limit?: number;
}

export const auditService = {
  async getAll(filters: AuditLogFilters = {}): Promise<{ data: AuditLogEntry[]; total: number }> {
    const qs = new URLSearchParams();
    if (filters.actor?.trim())  qs.set("actor", filters.actor.trim());
    if (filters.action?.trim()) qs.set("action", filters.action.trim());
    if (filters.target?.trim()) qs.set("target", filters.target.trim());
    if (filters.from)           qs.set("from", filters.from);
    if (filters.to)             qs.set("to", filters.to);
    if (filters.page)           qs.set("page", String(filters.page));
    if (filters.limit)          qs.set("limit", String(filters.limit));
    const q = qs.toString();
    const res = await apiClient.get<{ data: AuditLogEntry[]; total: number }>(
      `/admin/audit-log${q ? `?${q}` : ""}`);
    return { data: res.data, total: res.total };
  },
};

// ─── Integration Settings Service ──────────────────────────────────────────────
export const integrationSettingsService = {
  async getAll(): Promise<PartnerIntegrationSettings[]> {
    return apiClient.get<PartnerIntegrationSettings[]>("/admin/integrations");
  },
  async update(id: string, updates: Partial<PartnerIntegrationSettings>): Promise<PartnerIntegrationSettings> {
    return apiClient.patch<PartnerIntegrationSettings>(`/admin/integrations/${id}`, updates);
  },
};

// ─── Routing Rule Service ───────────────────────────────────────────────────────
export const routingRuleService = {
  async getAll(): Promise<OrderRoutingRule[]> {
    return apiClient.get<OrderRoutingRule[]>("/admin/routing-rules");
  },
  async create(rule: OrderRoutingRule): Promise<OrderRoutingRule> {
    return apiClient.post<OrderRoutingRule>("/admin/routing-rules", rule);
  },
  async update(id: string, updates: Partial<OrderRoutingRule>): Promise<OrderRoutingRule> {
    return apiClient.patch<OrderRoutingRule>(`/admin/routing-rules/${id}`, updates);
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(`/admin/routing-rules/${id}`);
  },
};

// ─── Auth Service ───────────────────────────────────────────────────────────────
export const authService = {
  async forgotPassword(email: string, language?: string): Promise<void> {
    await apiClient.post("/auth/forgot-password", { email, language: language ?? "et" });
  },
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post("/auth/reset-password", { token, newPassword });
  },
  async updateLanguage(language: string): Promise<void> {
    await apiClient.patch("/auth/language", { language });
  },
  async verifyEmail(token: string): Promise<void> {
    await apiClient.post("/auth/verify-email", { token });
  },
  async resendVerificationEmail(): Promise<void> {
    await apiClient.post("/auth/resend-verification", {});
  },
};

// ─── Contact Service ──────────────────────────────────────────────────────────────
export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  language?: string;
  /** Set when the form was opened from a partner's profile page. The backend
   *  resolves it to a supplier and captures the message as a DemandLead routed
   *  to that partner, instead of dropping an untracked email into the ops inbox.
   *  Sent as a slug rather than stapled into `message` as prose, which is what
   *  the partner page used to do. */
  partnerSlug?: string;
}

export const contactService = {
  async send(input: ContactInput): Promise<void> {
    await apiClient.post("/contact", { ...input, language: input.language ?? "et" });
  },
};

// ─── Lead Service ───────────────────────────────────────────────────────────
// "Request a quote" from a listing (moving/trailer). Creates a DemandLead routed
// to the listing's partner; partners reply with a price from their dashboard.
export interface QuoteLeadInput {
  listingId: string;
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  message?: string;
  language?: string;
}

export type ProviderLeadStatus = "new" | "contacted" | "quoted" | "converted" | "dismissed";

export interface ProviderLead {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  city: string;
  category: string;
  query?: string | null;
  status: ProviderLeadStatus;
  quotedPrice?: number | null;
  quotedAt?: string | null;
  providerNotes?: string | null;
  listingId?: string | null;
  createdAt: string;
}

// Concierge demand funnel ("/request"): tell us what you need, we find you
// 2-3 offers. Creates a DemandLead worked by the admin match queue.
export type ConciergeCategory =
  | "warehouse"
  | "moving"
  | "trailer"
  | "cleaning"
  | "packing"
  | "vanrental"
  | "insurance";

export interface ConciergeRequestInput {
  /** Chip answers as submitted: questionId -> 1-based option, or an array of
   *  them for the two questions that are genuinely tick-all-that-apply. The
   *  backend renders the labels in the PROVIDER's language, so these travel as
   *  structure rather than as the customer's own sentence. */
  scope?: Record<string, number | number[]>;
  /** Street addresses. Optional, and deliberately kept out of the provider
   *  outreach email and the public quote DTO until the customer picks someone. */
  fromAddress?: string;
  toAddress?: string;
  name?: string;
  email: string;
  phone?: string;
  categories: ConciergeCategory[];
  city: string;
  toCity?: string;
  /** ISO date string (yyyy-MM-dd) */
  needDate?: string;
  details?: string;
  language?: string;
  /** Opaque first-touch marketing attribution — see `src/lib/attribution.ts`. */
  attribution?: string;
  /** Honeypot: always empty for a human. Any value marks the submit automated. */
  website?: string;
  /** Milliseconds between the funnel opening and this submit. */
  elapsedMs?: number;
  /** Private-bucket keys from POST /leads/photos, attached to this request. */
  photoKeys?: string[];
  /** Visitor explicitly answered "my date is flexible" instead of naming a day. */
  dateFlexible?: boolean;
}

export const leadService = {
  /**
   * Upload one request photo before the lead exists. Returns the opaque
   * private-bucket key, which is submitted with the request. Anonymous and
   * tightly rate-limited server-side — see LeadPhotoController.
   */
  async uploadPhoto(file: File): Promise<{ key: string }> {
    const form = new FormData();
    form.append("file", file);
    return apiClient.postForm<{ key: string }>("/leads/photos", form);
  },
  async requestQuote(input: QuoteLeadInput): Promise<void> {
    await apiClient.post("/leads/quote", { ...input, language: input.language ?? "et" });
  },
  async listForProvider(supplierId?: string | null, status?: string): Promise<ProviderLead[]> {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    const path = withSupplier(`/provider/leads${params.toString() ? `?${params}` : ""}`, supplierId ?? null);
    const res = await apiClient.get<{ items: ProviderLead[] }>(path);
    return res.items ?? [];
  },
  async respond(
    id: string,
    body: { status?: string; quotedPrice?: number; providerNotes?: string },
    supplierId?: string | null,
  ): Promise<void> {
    await apiClient.patch(withSupplier(`/provider/leads/${id}`, supplierId ?? null), body);
  },
};

// Submitting the concierge request (`POST /leads/request`) is NOT a method on
// `leadService`: it is the one lead call whose response body matters, and it
// keeps its own module. Re-exported here so callers can use the barrel; both
// import paths resolve to the same object, so a `vi.spyOn` through either one
// patches the same function. Do not add a second `leadService` method for this
// endpoint — one that discarded the body existed until 2026-08-19 and cost the
// funnel its status link.
export { conciergeRequestService, type ConciergeRequestResult } from "./conciergeRequest";

// ─── Admin Lead Service (concierge match queue) ──────────────────────────────
export type AdminLeadStatus =
  | "new" | "contacted" | "quoted" | "converted" | "dismissed" | "unmatched";

export interface AdminLead {
  id: string;
  /** How many photos the customer attached. The bytes are NOT public: fetch each
   *  from GET /admin/leads/{id}/photos/{index}, which resolves the index against
   *  this lead's own list. Optional so the UI tolerates a backend predating it. */
  photoCount?: number;
  name?: string | null;
  email: string;
  phone?: string | null;
  city: string;
  toCity?: string | null;
  needDate?: string | null;
  details?: string | null;
  category: string;
  query?: string;
  language: string;
  createdAt: string;
  status: AdminLeadStatus;
  adminNotes?: string | null;
  supplierName?: string | null;
  quotedPrice?: number | null;
}

export interface AdminLeadsResponse {
  total: number;
  page: number;
  limit: number;
  items: AdminLead[];
}

/** Ops funnel metrics for the concierge match queue (rates are 0-1 fractions). */
export interface AdminLeadMetrics {
  requestsThisWeek: number;
  requests30d: number;
  contactRate30d: number;
  quoteRate30d: number;
  bookingRate30d: number;
  /** Supplier match rate (30d): how many requests got at least one supplier
   *  match. Object shape — bind the % to `.rate` (0-1); `matched/total` is the
   *  subtitle. Optional so the UI tolerates a momentarily-absent field. */
  matchRate30d?: { matched: number; total: number; rate: number };
  medianFirstResponseMinutes: number | null;
}

/** Optional GET /admin/leads filters (all ignored server-side if unsupported). */
export interface AdminLeadListOpts {
  /** Lead channel: "concierge" (demand funnel), "routed", "notify-interest". */
  source?: string;
  /** ServiceCategories slug or "any". */
  category?: string;
  city?: string;
  /** SLA view: only Status==New && never contacted, oldest-first. */
  needsResponse?: boolean;
}

/** Partner/listing suggestion for a lead (GET /admin/leads/{id}/matches, ≤10).
 *  Directory suppliers (no listings) come back with listingId/listingTitle/
 *  price/priceUnit ALL null but supplier contact + city filled. */
export interface AdminLeadMatch {
  supplierId: string;
  supplierName: string;
  contactEmail: string;
  contactPhone: string;
  listingId: string | null;
  listingTitle: string | null;
  listingCity: string | null;
  price: number | null;
  priceUnit: string | null;
  /** Service slugs (directory suppliers) — optional, backend may omit. */
  serviceTypes?: string[];
}

export interface ProviderCandidateLocation {
  locationId: string;
  locationName: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
}

export interface ProviderCandidate {
  supplierId: string;
  supplierName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  serviceTypes: string[];
  locationId: string | null;
  locationName: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  isExactCity: boolean;
  listingId: string | null;
  listingTitle: string | null;
  price: number | null;
  priceUnit: string | null;
  alreadyContacted: boolean;
  lastOutreachAt: string | null;
  /** The address bounced hard (or drew a complaint) — auto fan-out skips this
   *  provider, so the workspace badges the row instead of hiding the gap. */
  contactEmailUnusable: boolean;
  contactEmailBouncedAt: string | null;
  otherLocations: ProviderCandidateLocation[];
}

export interface ProviderCandidateResponse {
  items: ProviderCandidate[];
  total: number;
  scope: "nearby" | "all";
  radiusKm: number;
  anchor: { lat: number; lng: number } | null;
}

export interface ProviderCandidateSearch {
  q?: string;
  scope: "nearby" | "all";
  category: "lead" | "any";
  radiusKm: number;
  limit: number;
}

/** One message an operator sent by hand about a lead. */
export interface LeadMessage {
  id: string;
  /** The provider it went to; null means it went to the customer. */
  supplierId?: string | null;
  /** The address actually used, snapshotted at send time. */
  sentTo: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface SendLeadMessageInput {
  subject: string;
  body: string;
  /** Omit for the customer. Must be a provider contacted for THIS lead. */
  supplierId?: string | null;
}

export const adminLeadService = {
  /** Send a message about this lead FROM Ruumly (info@, Reply-To the ops inbox)
   *  and record it against the lead.
   *
   *  There is deliberately no recipient-address parameter. Pass `supplierId` to
   *  reach a provider — accepted only if they were actually contacted for this
   *  lead — or omit it to reach the customer. The address is resolved
   *  server-side from the lead's own data, because an authenticated endpoint
   *  that mails any address on request is a spam cannon. */
  async sendMessage(leadId: string, body: SendLeadMessageInput): Promise<LeadMessage> {
    return apiClient.post<LeadMessage>(
      `/admin/leads/${encodeURIComponent(leadId)}/messages`, body);
  },
  /** Everything an operator sent by hand about this lead, newest first. */
  async messages(leadId: string): Promise<LeadMessage[]> {
    return apiClient.get<LeadMessage[]>(
      `/admin/leads/${encodeURIComponent(leadId)}/messages`);
  },
  /** Close a provider's open question. Idempotent — a second call does not
   *  re-stamp, and does not touch an outreach that has since moved on. */
  async resolveInfoRequest(id: string): Promise<ResolvedInfoRequest> {
    return apiClient.post<ResolvedInfoRequest>(
      `/admin/info-requests/${encodeURIComponent(id)}/resolve`, {});
  },
  async list(
    status: AdminLeadStatus | "all",
    page: number,
    limit = 50,
    opts: AdminLeadListOpts = {},
  ): Promise<AdminLeadsResponse> {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(limit));
    // Optional filters — backend added source/category/city/needsResponse.
    if (opts.source) params.set("source", opts.source);
    if (opts.category && opts.category !== "any") params.set("category", opts.category);
    if (opts.city?.trim()) params.set("city", opts.city.trim());
    if (opts.needsResponse) params.set("needsResponse", "true");
    return apiClient.get<AdminLeadsResponse>(`/admin/leads?${params}`);
  },
  async update(
    id: string,
    // Status/notes lifecycle OR request-field corrections (name/email/phone/
    // category/city/toCity/needDate/details). Partial: omit a field to leave it
    // unchanged; the backend UTC-normalizes needDate and validates email/category.
    body: {
      status?: AdminLeadStatus;
      adminNotes?: string;
      name?: string;
      email?: string;
      phone?: string;
      category?: string;
      city?: string;
      toCity?: string;
      needDate?: string;
      details?: string;
    },
  ): Promise<void> {
    await apiClient.patch(`/admin/leads/${id}`, body);
  },
  async metrics(): Promise<AdminLeadMetrics> {
    return apiClient.get<AdminLeadMetrics>("/admin/leads/metrics");
  },
  async matches(id: string): Promise<AdminLeadMatch[]> {
    const res = await apiClient.get<AdminLeadMatch[] | { items: AdminLeadMatch[] }>(`/admin/leads/${id}/matches`);
    return Array.isArray(res) ? res : res.items ?? [];
  },
  async candidates(id: string, opts: ProviderCandidateSearch): Promise<ProviderCandidateResponse> {
    const params = new URLSearchParams({
      scope: opts.scope,
      category: opts.category,
      radiusKm: String(opts.radiusKm),
      limit: String(opts.limit),
    });
    if (opts.q?.trim()) params.set("q", opts.q.trim());
    return apiClient.get<ProviderCandidateResponse>(`/admin/leads/${id}/provider-candidates?${params}`);
  },
};

// ─── Offer loop (overhaul spec §5, contract §5.1 as built) ───────────────────
// Admin builds an offer (draft → send) for a DemandLead; the customer opens
// /{lang}/offer/{token} and chooses an option. Statuses serialize lowercase.

export type OfferStatus = "draft" | "sent" | "viewed" | "chosen" | "expired";
/** "bounced" / "complained" are set only by the Resend webhook — the email never
 *  reached a human, which is a different fact from a provider staying silent. */
export type OutreachStatus =
  | "sent" | "replied" | "declined" | "noanswer" | "bounced" | "complained"
  // The provider opened the quote page and said they cannot price it as sent.
  // A distinct state on purpose: GetLeadMetrics counts "replied" as a supplier
  // MATCH, and a provider blocked on missing information is precisely not one —
  // reusing it would have inflated the north-star metric with blocked providers.
  // Deliberately absent from MANUAL_OUTREACH_STATUSES: an admin must not be able
  // to assert a block with no ProviderInfoRequest behind it and nothing to close.
  | "needsinfo";

/** What a blocked provider said was missing. Mirrors InfoRequestReasons. */
export type InfoRequestReason = "photos" | "address" | "access" | "date" | "items" | "other";

export interface OutreachInfoRequest {
  id: string;
  reasons: InfoRequestReason[];
  note: string | null;
  askedAt: string;
}

/** Echo from resolving one. `outreachStatus` is where the row landed — "sent",
 *  never "replied", because closing our own question is not the provider
 *  agreeing to quote. */
export interface ResolvedInfoRequest {
  id: string;
  providerOutreachId: string;
  resolvedAt: string;
  outreachStatus: OutreachStatus | null;
}
/** The statuses an admin may pick by hand; the two delivery outcomes are system-set. */
export const MANUAL_OUTREACH_STATUSES = ["sent", "replied", "declined", "noanswer"] as const;

export interface AdminOfferOption {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierLocationId: string | null;
  title: string;
  priceAmount: number | null;
  priceUnit: string | null;
  notes: string | null;
  sortOrder: number;
  /** True when the backend auto-seeded this option from a provider's tokenized
   *  quote submission (Feature B). Surfaced as a "from provider quote" badge. */
  fromProviderQuote?: boolean;
}

export interface AdminOffer {
  id: string;
  demandLeadId: string;
  token: string;
  status: OfferStatus;
  language: string;
  customerNote: string | null;
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  chosenAt: string | null;
  chosenOptionId: string | null;
  createdBy: string | null;
  options: AdminOfferOption[];
  /** Optimistic-concurrency token. PATCH is a replace-set, so a provider quote
   *  landing between our fetch and the admin's save would silently delete the
   *  auto-seeded option. Echo this back on every PATCH: a stale value 409s
   *  instead of clobbering. Backend treats it as optional, so the protection
   *  only exists because we send it. */
  version?: number;
}

/** Option payload for create/update (replace-set semantics on PATCH). */
export interface OfferOptionInput {
  title: string;
  supplierId?: string | null;
  supplierLocationId?: string | null;
  priceAmount?: number | null;
  priceUnit?: string | null;
  notes?: string | null;
  sortOrder?: number;
  /** Which option this IS — echo back `AdminOfferOption.id` for anything the
   *  server already knows about. PATCH rewrites the whole set, so an existing
   *  option sent without its id is read as a NEW one: the old row is deleted
   *  and the provenance stored on it goes too, which is what tells a provider's
   *  later price correction that it already has an option here. Without it the
   *  correction arrives as a second option and the customer sees one company
   *  twice, at two prices. Omit only for options the admin just typed. */
  id?: string;
}

export interface ProviderOutreachRow {
  id: string;
  demandLeadId: string;
  supplierId: string;
  supplierName: string | null;
  sentTo: string;
  sentAt: string;
  status: OutreachStatus;
  note: string | null;
  /** Delivery receipts from Resend, per outreach row.
   *
   *  NULL MEANS UNKNOWN, never "did not arrive". Rows sent before the webhook
   *  existed have both null -- and the webhook had never been configured at all
   *  until 2026-08-18, so that is most of them. Open tracking is deliberately OFF
   *  at the account level (it would put a pixel in every customer email), so
   *  `openedAt` stays null for everyone and must never be rendered as
   *  "nobody opened it". Only a bounced/complained STATUS may say mail failed. */
  deliveredAt?: string | null;
  openedAt?: string | null;
  /** The provider's UNRESOLVED "I cannot quote this yet". Carried on the
   *  outreach row rather than fetched per lead: the row's status already says
   *  `needsinfo`, and this is what that word means — splitting them across two
   *  independently-refetching payloads would guarantee windows where the UI
   *  shows "blocked" with no question under it. */
  infoRequest?: OutreachInfoRequest | null;
  /** Provider self-service quote (Feature B) — populated when the provider
   *  submitted a price via the tokenized /quote/{token} page. When present the
   *  outreach-history row shows "Quoted {amount} {unit}" with QuotedAt. */
  quotedAmount?: number | null;
  quotedUnit?: string | null;
  quotedAvailability?: string | null;
  quotedNote?: string | null;
  quotedAt?: string | null;
  /** The provider's recorded NO from the quote page. `declineReason` is a
   *  DeclineReasons slug (or null for a bare no — which is a complete answer).
   *  Two of the slugs say the DIRECTORY ROW is wrong rather than anything about
   *  this lead, which is why the workspace prints the reason and not just the
   *  status word. */
  declineReason?: string | null;
  declineNote?: string | null;
  declinedAt?: string | null;
}

/** Machine reasons the backend refused to email a selected provider.
 *  "email_bounced"   = the address is retired until an admin saves a new one.
 *  "opted_out"       = the provider asked to be left alone.
 *  "duplicate_email" = a branch of the same company already has this request;
 *                      the directory holds one row per branch, so several rows
 *                      can share one inbox. The freed slot goes to the next
 *                      distinct company rather than shrinking the fan-out. */
export type OutreachSkipReason =
  | "no_email" | "not_found" | "already_contacted" | "email_bounced"
  | "opted_out" | "duplicate_email";

export interface OutreachResult {
  sent: ProviderOutreachRow[];
  skipped: { supplierId: string; supplierName: string | null; reason: OutreachSkipReason }[];
}

export interface OutreachPreviewItem {
  supplierId: string;
  supplierName: string | null;
  email: string | null;
  language: string | null;
  subject: string | null;
  textBody: string | null;
  skipReason: OutreachSkipReason | null;
}

export interface OutreachPreviewResponse {
  recipients: OutreachPreviewItem[];
}

/** Exact admin delivery preview (GET /admin/offers/{id}/delivery-preview, Task 3).
 *  `page` is the SAME sanitized DTO the public offer page renders. Side-effect-free. */
export interface OfferDeliveryPreview {
  recipient: { name: string | null; email: string };
  email: { subject: string; textBody: string };
  page: PublicOffer;
}

export const adminOfferService = {
  async listForLead(leadId: string): Promise<AdminOffer[]> {
    const res = await apiClient.get<AdminOffer[] | { items: AdminOffer[] }>(`/admin/leads/${leadId}/offers`);
    return Array.isArray(res) ? res : res.items ?? [];
  },
  async create(
    leadId: string,
    body: { language?: string; customerNote?: string; options?: OfferOptionInput[] },
  ): Promise<AdminOffer> {
    return apiClient.post<AdminOffer>(`/admin/leads/${leadId}/offers`, body);
  },
  async get(id: string): Promise<AdminOffer> {
    return apiClient.get<AdminOffer>(`/admin/offers/${id}`);
  },
  /** Replace-set update. ALWAYS pass `version` (from the offer you fetched) —
   *  omitting it disables the concurrency check and re-opens the silent
   *  delete-a-provider-quote hole. A stale version returns 409. */
  async update(
    id: string,
    body: {
      customerNote?: string | null;
      language?: string;
      status?: OfferStatus;
      options?: OfferOptionInput[];
      version?: number;
    },
  ): Promise<AdminOffer> {
    return apiClient.patch<AdminOffer>(`/admin/offers/${id}`, body);
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/admin/offers/${id}`);
  },
  async send(id: string): Promise<AdminOffer> {
    return apiClient.post<AdminOffer>(`/admin/offers/${id}/send`, {});
  },
  /** Side-effect-free admin preview of the exact email + public page for an offer.
   *  Never marks the offer Viewed and never sends. */
  async deliveryPreview(id: string): Promise<OfferDeliveryPreview> {
    return apiClient.get<OfferDeliveryPreview>(`/admin/offers/${id}/delivery-preview`);
  },
  /** Confirm a customer's chosen option with the provider and convert the lead.
   *  Requires a Chosen offer with a still-existing chosen option; idempotent 200. */
  async confirmBooking(id: string): Promise<AdminOffer> {
    return apiClient.post<AdminOffer>(`/admin/offers/${id}/confirm-booking`, {});
  },
  async previewOutreach(leadId: string, supplierIds: readonly string[]): Promise<OutreachPreviewResponse> {
    return apiClient.post<OutreachPreviewResponse>(`/admin/leads/${leadId}/outreach/preview`, { supplierIds });
  },
  async outreach(leadId: string, supplierIds: readonly string[], resend = false): Promise<OutreachResult> {
    return apiClient.post<OutreachResult>(`/admin/leads/${leadId}/outreach`, { supplierIds, resend });
  },
  async listOutreach(leadId: string): Promise<ProviderOutreachRow[]> {
    const res = await apiClient.get<ProviderOutreachRow[] | { items: ProviderOutreachRow[] }>(`/admin/leads/${leadId}/outreach`);
    return Array.isArray(res) ? res : res.items ?? [];
  },
  async updateOutreach(id: string, body: { status?: OutreachStatus; note?: string }): Promise<ProviderOutreachRow> {
    return apiClient.patch<ProviderOutreachRow>(`/admin/outreach/${id}`, body);
  },
};

// Public offer page (anonymous, rate-limited; 404 for unknown/draft/expired).
export interface PublicOfferOption {
  id: string;
  title: string;
  priceAmount: number | null;
  priceUnit: string | null;
  notes: string | null;
  supplierName: string | null;
}

export interface PublicOffer {
  status: OfferStatus;
  language: string;
  customerNote: string | null;
  sentAt: string | null;
  chosenOptionId: string | null;
  lead: {
    category: string;
    city: string;
    toCity?: string | null;
    needDate?: string | null;
    details?: string | null;
  };
  options: PublicOfferOption[];
}

export const offerService = {
  async get(token: string): Promise<PublicOffer> {
    return apiClient.get<PublicOffer>(`/offers/${encodeURIComponent(token)}`);
  },
  async choose(token: string, optionId: string): Promise<{ ok: boolean; chosenOptionId: string; chosenAt: string }> {
    return apiClient.post(`/offers/${encodeURIComponent(token)}/choose`, { optionId });
  },
};

// ─── Provider quote page (Feature B — tokenized, anonymous, rate-limited) ──────
// A provider opens /{lang}/quote/{token} from the outreach email and submits a
// price. NO customer PII is exposed — only what they are quoting. Submitting
// marks the outreach Replied and auto-seeds the lead's draft offer server-side.
// 404 for unknown/expired tokens (mirrors the offer page dead-end).
export interface PublicQuoteExisting {
  amount: number | null;
  unit: string | null;
  availability: string | null;
  note: string | null;
}

export interface PublicQuote {
  provider: { name: string };
  lead: {
    category: string;
    city: string;
    toCity?: string | null;
    needDate?: string | null;
    details?: string | null;
    /** How many photos the customer attached. The bytes are NOT public: fetch
     *  each one from GET /quote/{token}/photos/{index}, which resolves the index
     *  against this lead's own list so a token can only ever reach its own
     *  request's photos. The backend has always sent this; the type omitted it,
     *  so the gallery the outreach email promises was never rendered. */
    photoCount?: number;
    /** The intake's chip answers as slugs + 1-based option numbers, in catalogue
     *  order. Deliberately NOT rendered strings: the page supplies its own
     *  localised wording, so a question added server-side degrades to being
     *  skipped rather than printing English at an Estonian mover. */
    scope?: PublicQuoteScope[];
  };
  currency: string; // "EUR"
  alreadySubmitted: boolean;
  existing?: PublicQuoteExisting | null;
  /** The lead is Converted / Dismissed / Unmatched — quoting is over. Show the
   *  closed state instead of the form so the provider learns it upfront rather
   *  than by failing a submit (POST would 409 with reason "lead_closed"). */
  closed?: boolean;
  /** An UNRESOLVED "I can't quote this yet" the provider already sent. The
   *  backend stops reporting it the moment ops marks it answered, so the page
   *  reverts on its own without needing a second signal. */
  infoRequested?: boolean;
  infoRequest?: PublicQuoteInfoRequest | null;
  /** This provider already said no through this page. The page shows the
   *  recorded decline instead of the price form — a second visit must not
   *  invite a second answer. */
  declined?: boolean;
}

/** One answered scoping question on a lead. */
export interface PublicQuoteScope {
  question: string;
  option: number;
}

/** What a blocked provider told us was missing. `reasons` are slugs — the page
 *  supplies its own localised labels, so a seventh reason added server-side
 *  degrades to being skipped rather than rendering an English string. */
export interface PublicQuoteInfoRequest {
  reasons: string[];
  note: string | null;
  createdAt: string;
}

/** `reason` discriminator on a 409 from POST /quote/{token}. */
export type QuoteConflictReason = "lead_closed";

export interface QuoteSubmitInput {
  priceAmount: number;
  priceUnit?: string | null;
  availability?: string | null;
  note?: string | null;
}

/** Thank-you DTO — the backend echoes the stored (trimmed/clamped) quote back.
 *  400 on a negative amount or `<`/`>` in any string; 404 unknown token; 429
 *  when the anonymous public-email rate limit (5 req / 10 min per IP) trips. */
export interface QuoteSubmitResult {
  ok: boolean;
  amount: number | null;
  unit: string | null;
  availability: string | null;
  note: string | null;
}

/** Either a recognised reason or a note is required — the server enforces it and
 *  the form mirrors it, so a blocked provider is never shown a bare 400. */
export interface QuoteNeedInfoInput {
  reasons?: string[] | null;
  note?: string | null;
}

export interface QuoteNeedInfoResult {
  ok: boolean;
  reasons: string[];
  note: string | null;
}

/** A bare decline is a complete answer — both fields optional. `reason` is a
 *  DeclineReasons slug; unknown ones collapse to null server-side, so the page
 *  supplies its own localised labels the same way need-info does. */
export interface QuoteDeclineInput {
  reason?: string | null;
  note?: string | null;
}

export interface QuoteDeclineResult {
  ok: boolean;
  reason: string | null;
  note: string | null;
}

/** `reason` discriminator on a 409 from POST /quote/{token}/decline. */
export type QuoteDeclineConflictReason = "lead_closed" | "already_quoted";

export const quoteService = {
  async get(token: string): Promise<PublicQuote> {
    return apiClient.get<PublicQuote>(`/quote/${encodeURIComponent(token)}`);
  },
  async submit(token: string, body: QuoteSubmitInput): Promise<QuoteSubmitResult> {
    return apiClient.post<QuoteSubmitResult>(`/quote/${encodeURIComponent(token)}`, body);
  },
  /** Record that this provider cannot price the request as sent. Submitting
   *  again UPDATES the one open ask rather than filing a second, so `reasons` in
   *  the result is the MERGED stored set — render that, not what was sent. */
  async needInfo(token: string, body: QuoteNeedInfoInput): Promise<QuoteNeedInfoResult> {
    return apiClient.post<QuoteNeedInfoResult>(
      `/quote/${encodeURIComponent(token)}/need-info`, body);
  },
  /** Record that this provider will not take the request. A bare call (no reason,
   *  no note) is a complete "no". 409 with reason `already_quoted` if a price was
   *  already submitted — that is a conversation, not a retraction. */
  async decline(token: string, body: QuoteDeclineInput): Promise<QuoteDeclineResult> {
    return apiClient.post<QuoteDeclineResult>(
      `/quote/${encodeURIComponent(token)}/decline`, body);
  },
};

// ─── Claim Service ───────────────────────────────────────────────────────────
// Public "claim your profile" flow for directory providers (/{lang}/claim/{slug}).
// A provider proves control of the contact email already on their researched
// row, then edits that row — no account, no password.

/** What an UNVERIFIED visitor may see. Deliberately no contact email or phone:
 *  the directory's scraped contact data must never be readable back out. */
export interface PublicClaimProfile {
  slug: string;
  name: string;
  city?: string | null;
  country: string;
  serviceTypes: string[];
  isClaimed: boolean;
}

/** The editable surface, only ever returned to a verified claimant. */
export interface ClaimEditableProfile {
  slug: string;
  name: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  address?: string | null;
  city?: string | null;
  country: string;
  serviceTypes: string[];
  description?: string | null;
  // The provider's own headline rate. Everything else on this form we could have
  // filled in from public sources; the price is the one thing only they have,
  // and it is what lets the concierge answer a customer instead of relaying a
  // question back to them.
  priceFrom?: number | null;
  priceUnit?: string | null;
  priceNote?: string | null;
  claimedAt?: string | null;
}

export interface ClaimSession {
  sessionToken: string;
  expiresAt: string;
  profile: ClaimEditableProfile;
}

export interface ClaimUpdateInput {
  name: string;
  contactPhone: string | null;
  contactEmail: string;
  websiteUrl: string | null;
  address: string | null;
  serviceTypes: string[];
  description: string | null;
  priceFrom: number | null;
  priceUnit: string | null;
  priceNote: string | null;
}

/** Header the backend reads the claim session from (ClaimController.SessionHeader). */
const CLAIM_SESSION_HEADER = "X-Claim-Session";

export const claimService = {
  async get(slug: string): Promise<PublicClaimProfile> {
    return apiClient.get<PublicClaimProfile>(`/claim/${encodeURIComponent(slug)}`);
  },
  /** Always resolves the same way whether or not the address is on file — the
   *  UI must not try to infer a match from the response. */
  async requestLink(slug: string, email: string, language: string): Promise<void> {
    await apiClient.post(`/claim/${encodeURIComponent(slug)}/request`, { email, language });
  },
  async verify(token: string): Promise<ClaimSession> {
    return apiClient.post<ClaimSession>("/claim/verify", { token });
  },
  async getProfile(slug: string, sessionToken: string): Promise<ClaimEditableProfile> {
    return apiClient.get<ClaimEditableProfile>(
      `/claim/${encodeURIComponent(slug)}/profile`,
      { [CLAIM_SESSION_HEADER]: sessionToken },
    );
  },
  async updateProfile(
    slug: string, sessionToken: string, body: ClaimUpdateInput,
  ): Promise<ClaimEditableProfile> {
    return apiClient.put<ClaimEditableProfile>(
      `/claim/${encodeURIComponent(slug)}/profile`, body,
      { [CLAIM_SESSION_HEADER]: sessionToken },
    );
  },

  /**
   * Turns the verified claim session into a real provider login.
   *
   * No email is sent: the server binds the account to the address the magic
   * link was delivered to, which the same session may have rewritten on the
   * profile moments earlier. The response carries that address back so the
   * caller can sign in with it.
   */
  async createAccount(
    slug: string, sessionToken: string, password: string,
  ): Promise<{ user: { email: string } }> {
    return apiClient.post<{ user: { email: string } }>(
      `/claim/${encodeURIComponent(slug)}/account`, { password },
      { [CLAIM_SESSION_HEADER]: sessionToken },
    );
  },
};

// ─── Dispute Service ─────────────────────────────────────────────────────────
// Trust-and-safety claims (damage / no-show / deposit) against a booking/order.
export type DisputeType = "damage" | "noshow" | "deposit" | "other";
export type DisputeStatus = "open" | "inreview" | "resolved" | "rejected";

export interface AdminDispute {
  id: string;
  bookingId?: string | null;
  orderId?: string | null;
  supplierId: string;
  supplierName?: string | null;
  listingTitle?: string | null;
  type: DisputeType;
  status: DisputeStatus;
  raisedByRole: string;
  subject: string;
  description?: string;
  contactEmail?: string;
  amountClaimed?: number | null;
  evidence?: string[];
  adminNotes?: string | null;
  resolution?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export const disputeService = {
  async raise(input: {
    bookingId?: string;
    orderId?: string;
    type: DisputeType;
    subject: string;
    description?: string;
    amountClaimed?: number;
    evidence?: string[];
  }): Promise<void> {
    await apiClient.post("/disputes", input);
  },
  async listMine(): Promise<AdminDispute[]> {
    const res = await apiClient.get<{ items: AdminDispute[] }>("/disputes/mine");
    return res.items ?? [];
  },
  async adminList(status?: string, page = 1, limit = 50): Promise<{ total: number; items: AdminDispute[] }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== "all") params.set("status", status);
    return apiClient.get<{ total: number; items: AdminDispute[] }>(`/admin/disputes?${params}`);
  },
  async adminUpdate(id: string, body: { status?: string; adminNotes?: string; resolution?: string; issueRefund?: boolean }): Promise<{ refundIssued?: boolean }> {
    return apiClient.patch<{ refundIssued?: boolean }>(`/admin/disputes/${id}`, body);
  },
};

// ─── Bank Service ───────────────────────────────────────────────────────────────
export interface BankDetails {
  iban?: string;
  bankAccountName?: string;
  bankName?: string;
}

export const bankService = {
  async getBankDetails(supplierId?: string | null): Promise<BankDetails> {
    return apiClient.get<BankDetails>(withSupplier("/provider/bank-details", supplierId ?? null));
  },
  async updateBankDetails(data: BankDetails, supplierId?: string | null): Promise<void> {
    await apiClient.patch(withSupplier("/provider/bank-details", supplierId ?? null), data);
  },
};

// ─── Security Service ──────────────────────────────────────────────────────────
export const securityService = {
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    await apiClient.post("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  },
};

// ─── Rebate Service ─────────────────────────────────────────────────────────
export const rebateService = {
  async getInvoices(period?: string): Promise<RebateInvoice[]> {
    const qs = period ? `?period=${period}` : "";
    return apiClient.get<RebateInvoice[]>(`/admin/rebate-invoices${qs}`);
  },
  async generate(period: string): Promise<{ count: number; totalAmount: number }> {
    return apiClient.post<{ count: number; totalAmount: number }>("/admin/rebate-invoices/generate", { period });
  },
  async markSent(id: string): Promise<void> {
    await apiClient.patch(`/admin/rebate-invoices/${id}/sent`, {});
  },
  async markPaid(id: string, reference: string): Promise<void> {
    await apiClient.patch(`/admin/rebate-invoices/${id}/paid`, { reference });
  },
  async getForSupplier(): Promise<RebateInvoice[]> {
    return apiClient.get<RebateInvoice[]>("/supplier/rebate-invoices");
  },
};

// ─── Public Settings Service ────────────────────────────────────────────────
export const publicSettingsService = {
  async getPublic(): Promise<Record<string, any>> {
    return apiClient.get("/settings/public");
  },
};

// ─── Location Service ────────────────────────────────────────────────────────
export const locationService = {
  async getAll(params?: { city?: string; type?: string; supplierId?: string }): Promise<SupplierLocation[]> {
    const qs = new URLSearchParams();
    if (params?.city) qs.set("city", params.city);
    if (params?.type) qs.set("type", params.type);
    if (params?.supplierId) qs.set("supplierId", params.supplierId);
    const query = qs.toString();
    return apiClient.get<SupplierLocation[]>(`/locations${query ? `?${query}` : ""}`);
  },
  async getById(id: string): Promise<SupplierLocation> {
    return apiClient.get<SupplierLocation>(`/locations/${id}`);
  },
  async create(data: {
    supplierId?: string;
    name: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    description?: string;
    openingHours?: string;
    images?: string[];
    notes?: string;
  }): Promise<SupplierLocation> {
    const payload = { ...data };
    if (!payload.supplierId) delete payload.supplierId;
    return apiClient.post<SupplierLocation>("/locations", payload);
  },
  async update(id: string, data: Partial<{
    name: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    description: string;
    openingHours: string;
    images: string[];
    notes: string;
    externalId: string | null;
  }>): Promise<SupplierLocation> {
    return apiClient.patch<SupplierLocation>(`/locations/${id}`, data);
  },
  async addUnit(locationId: string, unit: {
    title: string;
    type: "Warehouse" | "Moving" | "Trailer";
    priceFrom: number;
    priceUnit: string;
    sizeM2?: number;
    quantityTotal?: number;
    description?: string;
    vatRate?: number;
    pricesIncludeVat: boolean;
    depositAmount?: number;
    requiresLicenseCategory?: string;
    minBookingMonths?: number;
    // Boolean feature toggles + string-valued vertical attributes (trailerType,
    // crewSize, vanSize) — all stored in the listing Features JSON.
    features?: Record<string, boolean | string>;
  }): Promise<{ id: string }> {
    return apiClient.post<{ id: string }>(`/locations/${locationId}/units`, unit);
  },
};

// ─── Listing Extras Service ─────────────────────────────────────────────────
import type { SupplierListingExtra } from "./types";

export const listingExtrasService = {
  async getForListing(listingId: string): Promise<SupplierListingExtra[]> {
    return apiClient.get<SupplierListingExtra[]>(`/listings/${listingId}/extras`);
  },
  async create(listingId: string, data: {
    key: string; label: string; description?: string;
    publicPrice: number; sortOrder?: number;
    partnerDiscountRate?: number | null;
  }): Promise<SupplierListingExtra> {
    return apiClient.post<SupplierListingExtra>(`/listings/${listingId}/extras`, data);
  },
  async update(extraId: string, data: Partial<{
    label: string; description: string;
    publicPrice: number; isActive: boolean; sortOrder: number;
    partnerDiscountRate: number | null;
    customerPriceOverride: number | null;
  }>): Promise<SupplierListingExtra> {
    return apiClient.patch<SupplierListingExtra>(`/listings/extras/${extraId}`, data);
  },
  async remove(extraId: string): Promise<void> {
    return apiClient.delete(`/listings/extras/${extraId}`);
  },
};

export const paymentService = {
  initiate: (data: {
    invoiceId: string;
    paymentMethod: "bank_transfer" | "card" | "later";
    customerEmail: string;
    locale: string;
  }): Promise<PaymentResult> =>
    apiClient.post("/payments/initiate", data),
};

export const providerPaidFeaturesService = {
  async getMine(supplierId?: string | null): Promise<ProviderPaidFeatures> {
    return apiClient.get<ProviderPaidFeatures>(withSupplier("/supplier/paid-features", supplierId));
  },
  async request(data: {
    paidFeatureId: string;
    listingId?: string | null;
    locationId?: string | null;
    message?: string | null;
  }, supplierId?: string | null): Promise<PaidFeatureRequest> {
    return apiClient.post<PaidFeatureRequest>(
      withSupplier("/supplier/paid-features/requests", supplierId),
      data
    );
  },
  // Ruumly's bank account for paying for a paid feature by transfer (no PSP at launch).
  async paymentInfo(supplierId?: string | null): Promise<PlatformPaymentInfo> {
    return apiClient.get<PlatformPaymentInfo>(withSupplier("/supplier/paid-features/payment-info", supplierId));
  },
};

export interface PlatformPaymentInfo {
  accountName: string;
  iban: string;
  bic: string;
  bankName: string;
}

// ─── Provider Service ────────────────────────────────────────────────────────
export const providerService = {
  async apply(data: SupplierApplication): Promise<void> {
    await apiClient.post("/auth/apply-provider", data);
  },
  async applyPublic(data: SupplierApplication): Promise<{ applicationId: string; message: string }> {
    return apiClient.post("/auth/apply-provider-public", data);
  },
};

export type {
  User, Supplier, Order, Booking, Notification, Invoice, Message,
  AuditLogEntry, OrderStatus, PartnerIntegrationSettings, OrderRoutingRule,
  Listing, ListingFilters, PaginatedResponse, CreateBookingInput,
  SupplierLocation, PaymentResult, SupplierApplication,
  ProviderPaidFeatures, PaidFeatureRequest,
};
