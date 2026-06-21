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
export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const res = await apiClient.get<any>("/admin/suppliers");
    return unwrapPaginated<Supplier>(res);
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
}

export const contactService = {
  async send(input: ContactInput): Promise<void> {
    await apiClient.post("/contact", { ...input, language: input.language ?? "et" });
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
    features?: Record<string, boolean>;
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
};

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
