// ─── Frontend Service Layer ───
// Mock async services structured for future backend replacement

import { MOCK_USERS, MOCK_SUPPLIERS, MOCK_INVOICES, MOCK_MESSAGES, MOCK_AUDIT_LOG, MOCK_INTEGRATION_SETTINGS, MOCK_ROUTING_RULES } from "./mockStore";
import { MOCK_BOOKINGS, MOCK_NOTIFICATIONS } from "@/data/mockBookings";
import { MOCK_ORDERS } from "@/data/mockOrders";
import { ALL_LISTINGS } from "@/data/mockData";
import type { User, Supplier, Order, Booking, Notification, Invoice, Message, AuditLogEntry, OrderStatus, PartnerIntegrationSettings, OrderRoutingRule, Listing, ListingFilters, PaginatedResponse, CreateBookingInput, ListingType } from "./types";

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

// ─── User Service ───
export const userService = {
  /** @backend GET /api/users — Auth: Admin JWT required — Returns all platform users */
  async getAll(): Promise<User[]> {
    await delay();
    return [...MOCK_USERS];
  },
  /** @backend GET /api/users/:id — Auth: Admin JWT required — 404 if not found */
  async getById(id: string): Promise<User | undefined> {
    await delay(100);
    return MOCK_USERS.find(u => u.id === id);
  },
  /** @backend PATCH /api/users/:id/status — Auth: Admin JWT required — Toggle active/blocked */
  async updateStatus(id: string, status: "active" | "blocked"): Promise<User> {
    await delay(200);
    const user = MOCK_USERS.find(u => u.id === id);
    if (!user) throw new Error("User not found");
    return { ...user, status };
  },
};

// ─── Supplier Service ───
export const supplierService = {
  /** @backend GET /api/suppliers — Auth: Admin JWT required — Returns all suppliers */
  async getAll(): Promise<Supplier[]> {
    await delay();
    return [...MOCK_SUPPLIERS];
  },
  /** @backend GET /api/suppliers/:id — Auth: Admin/Provider JWT required — 404 if not found */
  async getById(id: string): Promise<Supplier | undefined> {
    await delay(100);
    return MOCK_SUPPLIERS.find(s => s.id === id);
  },
  /** @backend PATCH /api/suppliers/:id/status — Auth: Admin JWT required — Toggle active/inactive */
  async updateStatus(id: string, isActive: boolean): Promise<Supplier> {
    await delay(200);
    const sup = MOCK_SUPPLIERS.find(s => s.id === id);
    if (!sup) throw new Error("Supplier not found");
    return { ...sup, isActive };
  },
  /** @backend POST /api/suppliers/:id/test — Auth: Admin JWT required — Tests API connectivity */
  async testIntegration(id: string): Promise<{ success: boolean; latency: number }> {
    await delay(800);
    const sup = MOCK_SUPPLIERS.find(s => s.id === id);
    if (!sup || sup.integrationType !== "api") return { success: false, latency: 0 };
    return { success: sup.integrationHealth === "healthy", latency: Math.floor(Math.random() * 200) + 50 };
  },
};

// ─── Listing Service ───
export const listingService = {
  /** @backend GET /api/listings?type=&city=&priceMax=&sort=&page=&limit= — Auth: none — Public search */
  async search(filters?: ListingFilters): Promise<PaginatedResponse<Listing>> {
    await delay();
    let results: Listing[] = [...ALL_LISTINGS];
    if (filters?.type) results = results.filter(l => l.type === filters.type);
    if (filters?.city) {
      const c = filters.city.toLowerCase();
      results = results.filter(l => l.city.toLowerCase().includes(c));
    }
    if (filters?.priceMax) results = results.filter(l => l.priceFrom <= filters.priceMax!);
    if (filters?.availableNow) results = results.filter(l => l.availableNow);
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(l => l.title.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.address.toLowerCase().includes(q));
    }
    if (filters?.features?.length) {
      results = results.filter(l => {
        if (l.type !== "warehouse") return true;
        return filters.features!.every(f => {
          if (f === "heated") return (l as any).heated;
          if (f === "access24") return (l as any).access24_7;
          if (f === "indoor") return (l as any).indoor;
          if (f === "security") return (l as any).security;
          if (f === "loadingDock") return (l as any).loadingDock;
          if (f === "forklift") return (l as any).forklift;
          if (f === "shortTerm") return (l as any).shortTerm;
          if (f === "longTerm") return (l as any).longTerm;
          return true;
        });
      });
    }
    if (filters?.sort === "cheapest") results.sort((a, b) => a.priceFrom - b.priceFrom);
    if (filters?.sort === "rating") results.sort((a, b) => b.rating - a.rating);
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const start = (page - 1) * limit;
    return { data: results.slice(start, start + limit), total: results.length, page, limit, hasMore: start + limit < results.length };
  },
  /** @backend GET /api/listings/:id — Auth: none — Public listing detail, 404 if not found */
  async getById(id: string): Promise<Listing | undefined> {
    await delay(100);
    return ALL_LISTINGS.find(l => l.id === id) as Listing | undefined;
  },
  /** @backend GET /api/listings/featured — Auth: none — Returns up to 4 featured listings */
  async getFeatured(): Promise<Listing[]> {
    await delay();
    return ALL_LISTINGS.filter(l => l.badge).slice(0, 4) as Listing[];
  },
};

// ─── Order Service ───
export const orderService = {
  /** @backend GET /api/orders — Auth: Admin/Provider JWT required — Returns orders for role */
  async getAll(): Promise<Order[]> {
    await delay();
    return [...MOCK_ORDERS];
  },
  /** @backend GET /api/orders?bookingId=:id — Auth: JWT required — Returns order for booking */
  async getByBookingId(bookingId: string): Promise<Order | undefined> {
    await delay(100);
    return MOCK_ORDERS.find(o => o.bookingId === bookingId);
  },
  /** @backend PATCH /api/orders/:id/status — Auth: Admin/Provider JWT required — Update order status */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await delay(200);
    const order = MOCK_ORDERS.find(o => o.id === id);
    if (!order) throw new Error("Order not found");
    return { ...order, status };
  },
};

// ─── Booking Service ───
export const bookingService = {
  /** @backend GET /api/bookings — Auth: JWT required — Returns current user's bookings */
  async getAll(): Promise<Booking[]> {
    await delay();
    return [...MOCK_BOOKINGS];
  },
  /** @backend GET /api/bookings/:id — Auth: JWT required — 404 if not found or not owned */
  async getById(id: string): Promise<Booking | undefined> {
    await delay(100);
    return MOCK_BOOKINGS.find(b => b.id === id);
  },
  /** @backend POST /api/bookings — Auth: JWT required — Creates a new booking */
  async create(input: CreateBookingInput): Promise<Booking> {
    await delay(500);
    const listing = ALL_LISTINGS.find(l => l.id === input.listingId);
    return {
      id: `BK-${Date.now()}`,
      listingId: input.listingId,
      listingTitle: listing?.title || "",
      listingType: (listing?.type || "warehouse") as ListingType,
      provider: listing?.provider || "",
      city: listing?.city || "",
      startDate: input.startDate,
      endDate: input.endDate,
      duration: input.duration,
      status: "pending",
      basePrice: listing?.priceFrom || 0,
      platformPrice: Math.round((listing?.priceFrom || 0) * 0.95),
      extras: input.extras,
      extrasTotal: input.extras.length * 15,
      total: (listing?.priceFrom || 0) + input.extras.length * 15,
      createdAt: new Date().toISOString().slice(0, 10),
      timeline: [{ date: new Date().toISOString().slice(0, 10), event: "Broneering loodud", status: "pending" as const }],
    };
  },
};

// ─── Notification Service ───
export const notificationService = {
  /** @backend GET /api/notifications — Auth: JWT required — Returns user's notifications */
  async getAll(): Promise<Notification[]> {
    await delay(100);
    return [...MOCK_NOTIFICATIONS];
  },
  /** @backend PATCH /api/notifications/:id/read — Auth: JWT required — Mark single as read */
  async markRead(id: string): Promise<void> {
    await delay(100);
  },
  /** @backend POST /api/notifications/read-all — Auth: JWT required — Mark all as read */
  async markAllRead(): Promise<void> {
    await delay(100);
  },
};

// ─── Invoice Service ───
export const invoiceService = {
  /** @backend GET /api/invoices — Auth: JWT required — Returns user's invoices */
  async getAll(): Promise<Invoice[]> {
    await delay();
    return [...MOCK_INVOICES];
  },
  /** @backend GET /api/invoices?bookingId=:id — Auth: JWT required — Invoice for booking */
  async getByBookingId(bookingId: string): Promise<Invoice | undefined> {
    await delay(100);
    return MOCK_INVOICES.find(i => i.bookingId === bookingId);
  },
};

// ─── Message Service ───
export const messageService = {
  /** @backend GET /api/messages?bookingId=:id — Auth: JWT required — Messages for booking thread */
  async getByBookingId(bookingId: string): Promise<Message[]> {
    await delay(200);
    return MOCK_MESSAGES.filter(m => m.bookingId === bookingId);
  },
  /** @backend POST /api/messages — Auth: JWT required — Send message in booking thread */
  async send(bookingId: string, text: string): Promise<Message> {
    await delay(300);
    return {
      id: `msg-${Date.now()}`,
      bookingId,
      from: "customer",
      senderName: "Teie",
      text,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      read: true,
    };
  },
};

// ─── Audit Service ───
export const auditService = {
  /** @backend GET /api/audit-log — Auth: Admin JWT required — Returns system audit log */
  async getAll(): Promise<AuditLogEntry[]> {
    await delay();
    return [...MOCK_AUDIT_LOG];
  },
};

// ─── Integration Settings Service ───
export const integrationSettingsService = {
  /** @backend GET /api/integration-settings — Auth: Admin JWT required — All partner integrations */
  async getAll(): Promise<PartnerIntegrationSettings[]> {
    await delay();
    return [...MOCK_INTEGRATION_SETTINGS];
  },
  /** @backend PATCH /api/integration-settings/:id — Auth: Admin JWT required — Update integration */
  async update(id: string, updates: Partial<PartnerIntegrationSettings>): Promise<PartnerIntegrationSettings> {
    await delay(200);
    const item = MOCK_INTEGRATION_SETTINGS.find(s => s.id === id);
    return { ...item, ...updates } as PartnerIntegrationSettings;
  },
};

// ─── Routing Rule Service ───
export const routingRuleService = {
  /** @backend GET /api/routing-rules — Auth: Admin JWT required — All order routing rules */
  async getAll(): Promise<OrderRoutingRule[]> {
    await delay();
    return [...MOCK_ROUTING_RULES];
  },
  /** @backend POST /api/routing-rules — Auth: Admin JWT required — Create new routing rule */
  async create(rule: OrderRoutingRule): Promise<OrderRoutingRule> {
    await delay(200);
    return rule;
  },
  /** @backend PATCH /api/routing-rules/:id — Auth: Admin JWT required — Update routing rule */
  async update(id: string, updates: Partial<OrderRoutingRule>): Promise<OrderRoutingRule> {
    await delay(200);
    const item = MOCK_ROUTING_RULES.find(r => r.id === id);
    return { ...item, ...updates } as OrderRoutingRule;
  },
};

export type { User, Supplier, Order, Booking, Notification, Invoice, Message, AuditLogEntry, OrderStatus, PartnerIntegrationSettings, OrderRoutingRule, Listing, ListingFilters, PaginatedResponse, CreateBookingInput };
