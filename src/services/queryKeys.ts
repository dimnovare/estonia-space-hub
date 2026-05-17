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
  auditLog: {
    all: () => ["audit-log"] as const,
  },
  integrations: {
    all: () => ["integration-settings"] as const,
  },
  routingRules: {
    all: () => ["routing-rules"] as const,
  },
  locations: {
    all: (params?: object) => ["locations", params] as const,
    byId: (id: string) => ["location", id] as const,
  },
  messages: {
    byBooking: (bookingId: string) => ["messages", bookingId] as const,
  },
};