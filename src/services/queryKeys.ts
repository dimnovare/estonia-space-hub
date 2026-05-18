export const queryKeys = {
  bookings: {
    all: (params?: object) => ["bookings", params] as const,
    byId: (id: string) => ["bookings", id] as const,
    stats: () => ["bookings", "stats"] as const,
  },
  orders: {
    all: (params?: object) => ["orders", params] as const,
    byId: (id: string) => ["orders", id] as const,
    leadSummary: (supplierId?: string) =>
      ["orders", "lead-summary", supplierId] as const,
  },
  listings: {
    all: (params?: object) => ["listings", params] as const,
    byId: (id: string) => ["listings", id] as const,
    featured: (lang?: string) => ["listings", "featured", lang] as const,
  },
  suppliers: {
    all: () => ["suppliers"] as const,
    byId: (id: string) => ["suppliers", id] as const,
    team: (supplierId?: string | null) => ["supplier-team", supplierId ?? null] as const,
  },
  users: {
    all: () => ["users"] as const,
    me: () => ["users", "me"] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
  },
  invoices: {
    all: () => ["invoices"] as const,
  },
  locations: {
    all: (params?: object) => ["locations", params] as const,
    byId: (id: string) => ["location", id] as const,
  },
  messages: {
    byBooking: (bookingId: string) => ["messages", bookingId] as const,
  },
  integrations: {
    all: () => ["integration-settings"] as const,
  },
  routingRules: {
    all: () => ["routing-rules"] as const,
  },
  auditLog: {
    all: () => ["audit-log"] as const,
  },
  adminListings: {
    all: () => ["admin-listings"] as const,
  },
  adminLocations: {
    all: (supplierId?: string) => ["admin-locations", supplierId ?? null] as const,
  },
  adminInquiries: {
    all: () => ["admin-inquiries"] as const,
  },
  adminStats: {
    all: () => ["admin-stats"] as const,
  },
  adminRevenue: {
    all: () => ["admin-revenue"] as const,
  },
  platformSettings: {
    public: () => ["platform-settings-public"] as const,
  },
  rebateInvoices: {
    byPeriod: (period: string) => ["rebate-invoices", period] as const,
    all: () => ["rebate-invoices"] as const,
  },
  blockedDates: {
    byLocation: (locationId: string) => ["blocked-dates", locationId] as const,
  },
  supplierProfile: {
    byId: (supplierId: string | null) => ["supplier-profile", supplierId] as const,
  },
  bankDetails: {
    bySupplierId: (id: string | null) => ["bank-details", id] as const,
  },
};
