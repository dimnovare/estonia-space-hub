// ─── Centralized Domain Types ───

export type UserRole = "guest" | "customer" | "provider" | "admin";
export type IntegrationType = "api" | "email" | "manual";
export type OrderStatus = "created" | "sending" | "sent" | "confirmed" | "rejected" | "active" | "completed" | "cancelled";
export type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";
export type ListingType = "warehouse" | "moving" | "trailer";
export type ApprovalMode = "auto" | "admin" | "provider";
export type PostingMode = "api" | "email" | "manual";
export type FulfillmentStatus = "awaiting_approval" | "approved" | "rejected" | "posting" | "posted" | "confirmed" | "failed" | "completed";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  company?: string;
  phone?: string;
  status: "active" | "blocked";
  registeredAt: string;
  lastLoginAt?: string;
  bookingsCount: number;
}

export interface Supplier {
  id: string;
  name: string;
  registryCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  integrationType: IntegrationType;
  apiEndpoint?: string;
  isActive: boolean;
  listingCount: number;
  ordersTotal: number;
  revenue: number;
  lastOrderAt?: string;
  integrationHealth: "healthy" | "degraded" | "offline";
  createdAt: string;
  notes?: string;
}

export interface PartnerIntegrationSettings {
  id: string;
  supplierId: string;
  supplierName: string;
  approvalMode: ApprovalMode;
  postingMode: PostingMode;
  fallbackPostingMode: PostingMode;
  apiEndpoint?: string;
  apiAuthType?: "bearer" | "basic" | "apikey";
  apiAuthPlaceholder?: string;
  recipientEmail?: string;
  mappingProfile?: string;
  isActive: boolean;
  lastTestedAt?: string;
  lastTestResult?: "success" | "failure";
}

export interface OrderRoutingRule {
  id: string;
  name: string;
  partnerId?: string;
  partnerName?: string;
  serviceType?: ListingType;
  orderType?: "standard" | "express" | "business";
  priceThreshold?: number;
  customerType?: "private" | "business";
  requiresApproval: boolean;
  approverRole: "admin" | "provider";
  postingChannel: PostingMode;
  priority: number;
  isActive: boolean;
}

export interface FulfillmentEvent {
  id: string;
  orderId: string;
  status: FulfillmentStatus;
  actor: string;
  actorRole: UserRole;
  channel?: PostingMode;
  detail?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  bookingId: string;
  listingId: string;
  listingTitle: string;
  listingType: ListingType;
  supplierId: string;
  supplierName: string;
  integrationType: IntegrationType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city: string;
  startDate: string;
  endDate?: string;
  duration: string;
  extras: string[];
  basePrice: number;
  platformPrice: number;
  supplierPrice: number;
  extrasTotal: number;
  total: number;
  margin: number;
  status: OrderStatus;
  approvalMode?: ApprovalMode;
  approvedBy?: string;
  approvedAt?: string;
  postingChannel?: PostingMode;
  fulfillmentEvents?: FulfillmentEvent[];
  createdAt: string;
  sentAt?: string;
  confirmedAt?: string;
  timeline: OrderTimeline[];
  notes: string;
}

export interface OrderTimeline {
  date: string;
  time: string;
  event: string;
  status: OrderStatus;
  detail?: string;
}

export interface Booking {
  id: string;
  listingId: string;
  listingTitle: string;
  listingType: ListingType;
  provider: string;
  city: string;
  startDate: string;
  endDate?: string;
  duration: string;
  status: BookingStatus;
  basePrice: number;
  platformPrice: number;
  extras: string[];
  extrasTotal: number;
  total: number;
  createdAt: string;
  timeline: { date: string; event: string; status: BookingStatus }[];
}

export interface Notification {
  id: string;
  type: "booking" | "alert" | "system";
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

export interface Invoice {
  id: string;
  bookingId: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  issuedAt: string;
  paidAt?: string;
  description: string;
}

export interface Message {
  id: string;
  bookingId: string;
  from: "customer" | "provider" | "admin";
  senderName: string;
  text: string;
  createdAt: string;
  read: boolean;
  attachments?: string[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  detail?: string;
  createdAt: string;
}
