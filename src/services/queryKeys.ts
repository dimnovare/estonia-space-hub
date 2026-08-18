export const queryKeys = {
  bookings: {
    all: (params?: object) => ["bookings", params] as const,
    byId: (id: string) => ["bookings", id] as const,
    stats: () => ["bookings", "stats"] as const,
  },
  orders: {
    root: () => ["orders"] as const,
    all: (params?: object) => ["orders", params] as const,
    byId: (id: string) => ["orders", id] as const,
    paged: (params?: object) => ["orders", "paged", params] as const,
    statusCounts: (supplierId?: string) =>
      ["orders", "status-counts", supplierId ?? null] as const,
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
    all: (params?: object) => params
      ? ["locations", params] as const
      : ["locations"] as const,
    byId: (id: string) => ["location", id] as const,
  },
  messages: {
    byBooking: (bookingId: string) => ["messages", bookingId] as const,
    unread: () => ["messages-unread"] as const,
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
  adminSupplier: {
    byId: (id: string) => ["admin-supplier", id] as const,
  },
  adminSupplierIntegration: {
    byId: (id: string) => ["admin-supplier-integration", id] as const,
  },
  adminSupplierPoll: {
    byId: (id: string | undefined) => ["admin-supplier-poll", id ?? null] as const,
  },
  adminContractTemplates: {
    bySupplierId: (id: string) => ["admin-contract-templates", id] as const,
  },
  cities: {
    /** scope = service slug the dropdown is filtered to ("all" = every service). */
    available: (scope = "all") => ["available-cities", scope] as const,
  },
  directoryCities: {
    all: () => ["directory-cities"] as const,
  },
  supplierStats: {
    byId: (id: string | null) => ["supplier-stats", id] as const,
  },
  supplierAnalytics: {
    byId: (id: string | null) => ["supplier-analytics", id] as const,
  },
  providerPartnerPage: {
    byId: (id: string | null) => ["provider", "partner-page", id] as const,
  },
  contractTemplates: {
    byId: (id: string) => ["contract-templates", id] as const,
  },
  listingAvailability: {
    byId: (id: string) => ["listing-availability", id] as const,
  },
  listingBlockedDates: {
    byId: (id: string) => ["listing-blocked-dates", id] as const,
  },
  featuredPartners: {
    all: () => ["featured-partners"] as const,
  },
  featureDefinitions: {
    all: () => ["feature-definitions"] as const,
  },
  sizeBuckets: {
    all: () => ["size-buckets"] as const,
  },
  partner: {
    bySlug: (slug: string) => ["partner", slug] as const,
    googleReviews: (placeId: string) => ["partner-google-reviews", placeId] as const,
  },
  platformSettingsPublic: {
    all: () => ["platform-settings-public"] as const,
  },
  cityLocations: {
    bySlug: (slug: string) => ["city-locations", slug] as const,
  },
  invoiceStatus: {
    byId: (id: string) => ["invoice-status", id] as const,
  },
  adminMetrics: {
    all: () => ["admin-metrics"] as const,
  },
  adminLeads: {
    root:    () => ["admin-leads"] as const,
    list:    (status: string, page: number, filters = "") => ["admin-leads", "list", status, page, filters] as const,
    metrics: () => ["admin-leads", "metrics"] as const,
    matches: (id: string) => ["admin-leads", "matches", id] as const,
    candidates: (
      id: string,
      filters: { q?: string; scope: "nearby" | "all"; category: "lead" | "any"; radiusKm: number; limit: number },
    ) => ["admin-leads", "provider-candidates", id, filters.q ?? "", filters.scope, filters.category, filters.radiusKm, filters.limit] as const,
    outreach: (id: string) => ["admin-leads", "outreach", id] as const,
    offers:   (id: string) => ["admin-leads", "offers", id] as const,
    deliveryPreview: (id: string) => ["admin-leads", "delivery-preview", id] as const,
  },
  // Public offer page (/offer/{token}) — anonymous, token-keyed.
  offers: {
    byToken: (token: string) => ["offers", token] as const,
  },
  // Public provider quote page (/quote/{token}) — anonymous, token-keyed.
  quotes: {
    byToken: (token: string) => ["quote", token] as const,
  },
  // Public "claim your profile" page (/claim/{slug}) — anonymous, slug-keyed.
  claims: {
    bySlug: (slug: string) => ["claim", slug] as const,
  },
  // Public concierge request-status page (/request-status/{token}) — anonymous,
  // token-keyed. The customer's own view of where their request has got to.
  requestStatus: {
    byToken: (token: string) => ["request-status", token] as const,
  },
  supplierTeam: {
    byId: (id: string | null) => ["supplier-team", id] as const,
  },
};
