// ─── Centralized Mock Data Store ───
import type { User, Supplier, Invoice, Message, AuditLogEntry, PartnerIntegrationSettings, OrderRoutingRule } from "./types";

export const MOCK_USERS: User[] = [
  { id: "u1", name: "Andres Tamm", email: "andres@email.com", role: "customer", phone: "+372 5551 2345", status: "active", registeredAt: "2025-11-05", lastLoginAt: "2026-03-20", bookingsCount: 3 },
  { id: "u2", name: "Kati Mets", email: "kati@email.com", role: "customer", phone: "+372 5123 9876", status: "active", registeredAt: "2025-12-12", lastLoginAt: "2026-03-19", bookingsCount: 1 },
  { id: "u3", name: "Jüri Kask", email: "jyri@email.com", role: "customer", phone: "+372 5234 5678", status: "active", registeredAt: "2026-01-08", lastLoginAt: "2026-03-18", bookingsCount: 5 },
  { id: "u4", name: "Maria Saar", email: "maria@laopind.ee", role: "provider", company: "Laobox OÜ", phone: "+372 5123 4567", status: "active", registeredAt: "2025-10-20", lastLoginAt: "2026-03-21", bookingsCount: 0 },
  { id: "u5", name: "Peeter Kuusk", email: "peeter@ruumly.eu", role: "admin", phone: "+372 5555 1234", status: "active", registeredAt: "2025-09-01", lastLoginAt: "2026-03-21", bookingsCount: 0 },
  { id: "u6", name: "Liina Rebane", email: "liina@email.com", role: "customer", phone: "+372 5345 6789", status: "blocked", registeredAt: "2026-02-14", bookingsCount: 2 },
  { id: "u7", name: "Mart Kivi", email: "mart@laobox.ee", role: "provider", company: "Laobox OÜ", phone: "+372 5123 4567", status: "active", registeredAt: "2025-08-15", lastLoginAt: "2026-03-20", bookingsCount: 0 },
  { id: "u8", name: "Tiina Rebane", email: "tiina@miniladu.ee", role: "provider", company: "MiniLadu AS", phone: "+372 5234 5678", status: "active", registeredAt: "2025-09-01", lastLoginAt: "2026-03-19", bookingsCount: 0 },
  { id: "u9", name: "Kristjan Mägi", email: "kristjan@haagisrent.ee", role: "provider", company: "HaagisRent OÜ", phone: "+372 5567 8901", status: "active", registeredAt: "2025-10-15", lastLoginAt: "2026-03-15", bookingsCount: 0 },
  { id: "u10", name: "Aleksei Ivanov", email: "aleksei@email.com", role: "customer", phone: "+372 5678 9012", status: "active", registeredAt: "2026-03-01", lastLoginAt: "2026-03-21", bookingsCount: 0 },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: "sup-1", name: "Laobox OÜ", registryCode: "14523678", contactName: "Mart Kivi", contactEmail: "mart@laobox.ee", contactPhone: "+372 5123 4567", integrationType: "api", apiEndpoint: "https://api.laobox.ee/v1/orders", isActive: true, listingCount: 3, ordersTotal: 45, revenue: 4250, lastOrderAt: "2026-03-18", integrationHealth: "healthy", createdAt: "2025-08-15" },
  { id: "sup-2", name: "MiniLadu AS", registryCode: "11234567", contactName: "Tiina Rebane", contactEmail: "tiina@miniladu.ee", contactPhone: "+372 5234 5678", integrationType: "email", isActive: true, listingCount: 2, ordersTotal: 28, revenue: 2100, lastOrderAt: "2026-03-19", integrationHealth: "healthy", createdAt: "2025-09-01" },
  { id: "sup-3", name: "SecureStore OÜ", registryCode: "16789012", contactName: "Jaan Tamm", contactEmail: "jaan@securestore.ee", contactPhone: "+372 5345 6789", integrationType: "api", apiEndpoint: "https://api.securestore.ee/bookings", isActive: true, listingCount: 1, ordersTotal: 32, revenue: 3800, lastOrderAt: "2026-03-15", integrationHealth: "healthy", createdAt: "2025-09-20" },
  { id: "sup-4", name: "KoliExpress OÜ", registryCode: "12345678", contactName: "Andres Pärn", contactEmail: "andres@koliexpress.ee", contactPhone: "+372 5456 7890", integrationType: "email", isActive: true, listingCount: 1, ordersTotal: 56, revenue: 5600, lastOrderAt: "2026-03-20", integrationHealth: "healthy", createdAt: "2025-10-05" },
  { id: "sup-5", name: "HaagisRent OÜ", registryCode: "13456789", contactName: "Kristjan Mägi", contactEmail: "kristjan@haagisrent.ee", contactPhone: "+372 5567 8901", integrationType: "manual", isActive: true, listingCount: 1, ordersTotal: 18, revenue: 890, lastOrderAt: "2026-03-08", integrationHealth: "degraded", createdAt: "2025-10-15", notes: "Manuaalne protsess, vajalik operaatori sekkumine" },
  { id: "sup-6", name: "Pärnu Ladu OÜ", registryCode: "15678901", contactName: "Liis Sepp", contactEmail: "liis@parnuladu.ee", contactPhone: "+372 5678 9012", integrationType: "manual", isActive: false, listingCount: 1, ordersTotal: 5, revenue: 180, integrationHealth: "offline", createdAt: "2025-11-01", notes: "Mitteaktiivne partner, lepingu uuendamine ootel" },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: "INV-2026-001", bookingId: "BK-2026-001", amount: 170, status: "paid", issuedAt: "2026-03-18", paidAt: "2026-03-19", description: "Laobox Tallinn Kesklinn — 3 kuud + kindlustus" },
  { id: "INV-2026-002", bookingId: "BK-2026-002", amount: 206, status: "pending", issuedAt: "2026-03-20", description: "KoliExpress — kolimine + lisateenused" },
  { id: "INV-2025-015", bookingId: "BK-2025-015", amount: 83, status: "paid", issuedAt: "2025-11-25", paidAt: "2025-11-26", description: "MiniLadu Tartu — 3 kuud" },
  { id: "INV-2026-003", bookingId: "BK-2026-003", amount: 48, status: "paid", issuedAt: "2026-03-08", paidAt: "2026-03-08", description: "HaagisRent Tallinn — 2 päeva" },
];

export const MOCK_MESSAGES: Message[] = [
  { id: "msg-1", bookingId: "BK-2026-001", from: "provider", senderName: "Laobox OÜ", text: "Tere! Teie laoruum on valmis. Juurdepääsukood saadetud e-postile.", createdAt: "2026-03-19 10:00", read: true },
  { id: "msg-2", bookingId: "BK-2026-001", from: "customer", senderName: "Andres Tamm", text: "Aitäh! Kas laadimisplatvorm on ka saadaval?", createdAt: "2026-03-19 11:30", read: true },
  { id: "msg-3", bookingId: "BK-2026-001", from: "provider", senderName: "Laobox OÜ", text: "Jah, laadimisplatvorm on saadaval iga päev kl 8-20.", createdAt: "2026-03-19 12:15", read: false },
  { id: "msg-4", bookingId: "BK-2026-002", from: "admin", senderName: "Ruumly tugi", text: "Teie kolimise broneering on edastatud partnerile. Kinnitame peagi.", createdAt: "2026-03-20 10:50", read: false },
];

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: "log-1", action: "order.created", actor: "System", target: "ORD-2026-001", detail: "Tellimus loodud broneeringu BK-2026-001 põhjal", createdAt: "2026-03-18 14:23" },
  { id: "log-2", action: "order.sent", actor: "System", target: "ORD-2026-001", detail: "Saadetud API kaudu → 201 Created", createdAt: "2026-03-18 14:23" },
  { id: "log-3", action: "order.confirmed", actor: "Laobox OÜ", target: "ORD-2026-001", detail: "Automaatne API kinnitus", createdAt: "2026-03-19 09:15" },
  { id: "log-4", action: "order.created", actor: "System", target: "ORD-2026-002", detail: "Tellimus loodud broneeringu BK-2026-002 põhjal", createdAt: "2026-03-20 10:45" },
  { id: "log-5", action: "order.sent", actor: "System", target: "ORD-2026-002", detail: "E-kiri saadetud: andres@koliexpress.ee", createdAt: "2026-03-20 10:46" },
  { id: "log-6", action: "user.blocked", actor: "Peeter Kuusk", target: "Liina Rebane", detail: "Kasutaja blokeeritud kahtlase tegevuse tõttu", createdAt: "2026-03-15 16:00" },
  { id: "log-7", action: "listing.updated", actor: "Maria Saar", target: "Laobox Tallinn Kesklinn", detail: "Hind muudetud: 45€ → 49€", createdAt: "2026-03-14 09:30" },
  { id: "log-8", action: "supplier.deactivated", actor: "Peeter Kuusk", target: "Pärnu Ladu OÜ", detail: "Partner deaktiveeritud — leping lõppenud", createdAt: "2026-03-10 14:00" },
];

// ─── Integration Settings ───
export const MOCK_INTEGRATION_SETTINGS: PartnerIntegrationSettings[] = [
  { id: "int-1", supplierId: "sup-1", supplierName: "Laobox OÜ", approvalMode: "auto", postingMode: "api", fallbackPostingMode: "email", apiEndpoint: "https://api.laobox.ee/v1/orders", apiAuthType: "bearer", apiAuthPlaceholder: "Bearer sk_live_***", recipientEmail: "orders@laobox.ee", mappingProfile: "laobox_v2", isActive: true, lastTestedAt: "2026-03-20 14:30", lastTestResult: "success" },
  { id: "int-2", supplierId: "sup-2", supplierName: "MiniLadu AS", approvalMode: "admin", postingMode: "email", fallbackPostingMode: "manual", recipientEmail: "tiina@miniladu.ee", mappingProfile: "default", isActive: true },
  { id: "int-3", supplierId: "sup-3", supplierName: "SecureStore OÜ", approvalMode: "auto", postingMode: "api", fallbackPostingMode: "email", apiEndpoint: "https://api.securestore.ee/bookings", apiAuthType: "apikey", apiAuthPlaceholder: "X-Api-Key: ***", recipientEmail: "bookings@securestore.ee", mappingProfile: "securestore_v1", isActive: true, lastTestedAt: "2026-03-19 09:15", lastTestResult: "success" },
  { id: "int-4", supplierId: "sup-4", supplierName: "KoliExpress OÜ", approvalMode: "provider", postingMode: "email", fallbackPostingMode: "manual", recipientEmail: "andres@koliexpress.ee", mappingProfile: "default", isActive: true },
  { id: "int-5", supplierId: "sup-5", supplierName: "HaagisRent OÜ", approvalMode: "admin", postingMode: "manual", fallbackPostingMode: "email", recipientEmail: "kristjan@haagisrent.ee", isActive: false },
];

// ─── Routing Rules ───
export const MOCK_ROUTING_RULES: OrderRoutingRule[] = [
  { id: "rule-1", name: "API partnerid — automaatne", serviceType: "warehouse", requiresApproval: false, approverRole: "admin", postingChannel: "api", priority: 1, isActive: true },
  { id: "rule-2", name: "Ärikliendid — admin kinnitab", customerType: "business", requiresApproval: true, approverRole: "admin", postingChannel: "email", priority: 2, isActive: true },
  { id: "rule-3", name: "Kõrge hinnaga tellimused", priceThreshold: 500, requiresApproval: true, approverRole: "admin", postingChannel: "email", priority: 3, isActive: true },
  { id: "rule-4", name: "Kolimine — partner kinnitab", serviceType: "moving", requiresApproval: true, approverRole: "provider", postingChannel: "email", priority: 4, isActive: true },
  { id: "rule-5", name: "Haagise rent — manuaalne", serviceType: "trailer", requiresApproval: true, approverRole: "admin", postingChannel: "manual", priority: 5, isActive: false },
];
