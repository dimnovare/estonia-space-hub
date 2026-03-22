export const queryKeys = {
  bookings: {
    all: ["bookings"] as const,
    byUser: (userId: string) => ["bookings", "user", userId] as const,
    byId: (id: string) => ["bookings", id] as const,
  },
  orders: {
    all: ["orders"] as const,
    bySupplier: (supplierId: string) => ["orders", "supplier", supplierId] as const,
    byId: (id: string) => ["orders", id] as const,
  },
  listings: {
    all: ["listings"] as const,
    byType: (type: string) => ["listings", type] as const,
  },
  users: { all: ["users"] as const, me: ["users", "me"] as const },
  suppliers: { all: ["suppliers"] as const },
  notifications: { byUser: (userId: string) => ["notifications", userId] as const },
} as const;
