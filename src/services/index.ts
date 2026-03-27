// ─── Frontend Service Layer — wired to real backend ───

import { apiClient } from "./apiClient";
import type {
  User, Supplier, Order, Booking, Notification, Invoice, Message,
  AuditLogEntry, OrderStatus, PartnerIntegrationSettings, OrderRoutingRule,
  Listing, ListingBase, ListingType, ListingFilters, PaginatedResponse, CreateBookingInput,
  SupplierLocation, PaymentResult, SupplierApplication,
  WarehouseListing, MovingListing, TrailerListing,
} from "./types";

// ─── Listing helpers ───────────────────────────────────────────────────────────

interface ApiListing {
  id: string;
  type: string;
  title: string;
  supplierName: string;
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
}

function mapListing(api: ApiListing): Listing {
  const base: Omit<Listing, keyof (WarehouseListing | MovingListing | TrailerListing)> & Record<string, unknown> = {
    id: api.id,
    type: (api.type?.toLowerCase() || "warehouse") as ListingType,
    supplierId: (api as unknown as Record<string, unknown>).supplierId as string || "",
    title: api.title || "",
    provider: api.supplierName || "",
    address: api.address || "",
    city: api.city || "",
    lat: api.lat ?? 0,
    lng: api.lng ?? 0,
    priceFrom: api.priceFrom ?? 0,
    priceUnit: api.priceUnit || "€/kuu",
    image: api.images?.[0] || "",
    images: api.images || [],
    availableNow: api.availableNow ?? false,
    rating: api.rating ?? 0,
    reviewCount: api.reviewCount ?? 0,
    badge: api.badge as ListingBase["badge"],
    description: api.description || "",
    sizeM2: (api.features?.sizeM2 as number) ?? undefined,
    quantityTotal: (api.features?.quantityTotal as number) ?? undefined,
    locationId: (api as unknown as Record<string, unknown>).locationId as string | undefined,
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
      features: (f.features as string[]) ?? [],
    } as WarehouseListing;
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

function normalizeUser(u: User): User {
  return { ...u, role: lc(u.role), status: lc(u.status) as "active" | "blocked" };
}

// ─── User Service ───────────────────────────────────────────────────────────────
export const userService = {
  async getAll(): Promise<User[]> {
    const res = await apiClient.get<any>("/admin/users");
    const users = Array.isArray(res) ? res : res?.data ?? [];
    return users.map(normalizeUser);
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
    return Array.isArray(res) ? res : res?.data ?? [];
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
  async getAll(): Promise<Order[]> {
    return apiClient.get<Order[]>("/orders");
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
};

// ─── Booking Service ────────────────────────────────────────────────────────────
export const bookingService = {
  async getAll(): Promise<Booking[]> {
    const bookings = await apiClient.get<Booking[]>("/bookings");
    return bookings.map(normalizeBooking);
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
    return apiClient.get<Invoice[]>("/invoices");
  },
  async getByBookingId(bookingId: string): Promise<Invoice | undefined> {
    return apiClient.get<Invoice>(`/invoices/by-booking/${bookingId}`);
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
export const auditService = {
  async getAll(): Promise<AuditLogEntry[]> {
    const res = await apiClient.get<{ data: AuditLogEntry[]; total: number }>("/admin/audit-log");
    return res.data;
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
};

// ─── Bank Service ───────────────────────────────────────────────────────────────
export interface BankDetails {
  iban?: string;
  bankAccountName?: string;
  bankName?: string;
}

export const bankService = {
  async getBankDetails(): Promise<BankDetails> {
    return apiClient.get<BankDetails>("/admin/my-bank-details");
  },
  async updateBankDetails(data: BankDetails): Promise<void> {
    await apiClient.patch("/admin/my-bank-details", data);
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

// ─── Public Settings Service ────────────────────────────────────────────────
export const publicSettingsService = {
  async getPublic(): Promise<{
    siteName: string;
    siteEmail: string;
    sitePhone: string;
    openHours: string;
    openHoursSat: string;
  }> {
    return apiClient.get("/settings/public");
  },
};

// ─── Location Service ────────────────────────────────────────────────────────
export const locationService = {
  async getAll(params?: { city?: string; type?: string }): Promise<SupplierLocation[]> {
    const qs = new URLSearchParams();
    if (params?.city) qs.set("city", params.city);
    if (params?.type) qs.set("type", params.type);
    const query = qs.toString();
    return apiClient.get<SupplierLocation[]>(`/locations${query ? `?${query}` : ""}`);
  },
  async getById(id: string): Promise<SupplierLocation> {
    return apiClient.get<SupplierLocation>(`/locations/${id}`);
  },
  async create(data: {
    supplierId: string;
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
    return apiClient.post<SupplierLocation>("/locations", data);
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
    supplierPrice: number; sortOrder?: number;
  }): Promise<SupplierListingExtra> {
    return apiClient.post<SupplierListingExtra>(`/listings/${listingId}/extras`, data);
  },
  async update(extraId: string, data: Partial<{
    label: string; description: string;
    supplierPrice: number; isActive: boolean; sortOrder: number;
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
    paymentMethod: string;
    customerEmail: string;
    locale: string;
  }): Promise<PaymentResult> =>
    apiClient.post("/payments/initiate", data),
};

// ─── Provider Service ────────────────────────────────────────────────────────
export const providerService = {
  async apply(data: SupplierApplication): Promise<void> {
    await apiClient.post("/auth/apply-provider", data);
  },
};

export type {
  User, Supplier, Order, Booking, Notification, Invoice, Message,
  AuditLogEntry, OrderStatus, PartnerIntegrationSettings, OrderRoutingRule,
  Listing, ListingFilters, PaginatedResponse, CreateBookingInput,
  SupplierLocation, PaymentResult, SupplierApplication,
};
