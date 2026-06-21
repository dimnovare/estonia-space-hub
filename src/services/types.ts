// ─── Centralized Domain Types ───

export type UserRole = "guest" | "customer" | "provider" | "admin";

export interface SupplierApplication {
  companyName: string;
  registryCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessType: string;
  serviceTypes: string[];
  serviceAreas: string[];
  notes?: string;
}
export type IntegrationType = "api" | "email" | "manual";
export type OrderStatus = "created" | "sending" | "sent" | "confirmed" | "rejected" | "active" | "completed" | "cancelled" | "failed";
export type LeadStatus = "new" | "contacted" | "won" | "lost";

export interface LeadSummary {
  newCount: number;
  contactedCount: number;
  wonThisWeek: number;
  lostThisWeek: number;
}

export type BookingStatus = "pending" | "confirmed" | "awaitingconfirmation" | "active" | "completed" | "cancelled";
export type ListingType = "warehouse" | "moving" | "trailer";
export type ApprovalMode = "auto" | "admin" | "provider";
export type PostingMode = "api" | "email" | "manual";
export type FulfillmentStatus = "awaiting_approval" | "approved" | "rejected" | "posting" | "posted" | "confirmed" | "failed" | "completed";

export interface BankTransferInstructions {
  available: boolean;       // false when the platform IBAN isn't configured yet
  amount: number;
  currency: string;
  reference: string;
  accountName: string;
  iban: string;
  bic: string;
  bankName: string;
}

export interface PaymentResult {
  paymentUrl: string | null;        // null for bank transfer / pay-later (no redirect)
  bankTransfer?: BankTransferInstructions;
}

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
  partnerDiscountRate: number;
  clientDiscountRate: number;
  tier: "starter" | "standard" | "premium";
  billingModel: "marketplace" | "rebate";
  bookingEnabled?: boolean;
  contractSigningEnabled?: boolean;
  directPaymentEnabled?: boolean;
  ruumlyPaymentEnabled?: boolean;
  isVerified?: boolean;
  isFoundingPartner?: boolean;
  priority?: "standard" | "high" | "critical";
  onboardingStartedAt?: string | null;
  onboardingDaysRemaining?: number | null;
  isInOnboarding?: boolean;
  effectivePricing?: {
    effectiveCommissionRate?: number;
    effectiveMonthlyFee?: number;
  };
  pollingEnabled?: boolean;
  pollingIntervalMinutes?: number;
  lastPolledAt?: string | null;
  lastPollStatus?: "ok" | "error" | "skipped" | null;
  nextPollAt?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
  rating?: number | null;
  isPartnerPagePublished?: boolean;
  country?: string;                    // "EE" | "LV" | "LT" — default "EE"
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
  leadStatus?: LeadStatus;
  lastContactAt?: string | null;
  providerNotes?: string | null;
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
  userId?: string;
  supplierId?: string;
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
  isReservation?: boolean;
  reservedUntil?: string;
  hasReview?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  locationId?: string | null;
}

export interface Notification {
  id: string;
  type: "booking" | "alert" | "system";
  title: string;
  desc: string;
  time: string;
  read: boolean;
  actionUrl?: string | null;
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

// ─── Listing Types ───

export interface ListingBase {
  id: string;
  type: ListingType;
  supplierId: string;
  supplierSlug?: string | null;
  title: string;
  provider: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  priceFrom: number;
  priceUnit: string;
  image: string;
  images: string[];
  availableNow: boolean;
  rating: number;
  reviewCount: number;
  badge?: "cheapest" | "closest" | "best-value" | "promoted";
  description: string;
  sizeM2?: number;
  quantityTotal?: number;
  locationId?: string | null;
  clientDiscountRateOverride?: number | null;
  clientDiscountRate?: number | null;
  partnerDiscountRateOverride?: number | null;
  vatRate?: number | null;
  pricesIncludeVat?: boolean;
  depositAmount?: number | null;
  requiresLicenseCategory?: string | null;
  minBookingMonths?: number | null;
  isVerified?: boolean;
  isFoundingPartner?: boolean;
  bookingEnabled?: boolean;
  contractSigningEnabled?: boolean;
  directPaymentEnabled?: boolean;
  ruumlyPaymentEnabled?: boolean;
}

export interface PaidFeature {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: "visibility" | "trust" | "operations" | "commerce";
  scope: "supplier" | "location" | "listing" | "platform";
  priceAmount: number;
  priceCurrency: string;
  billingInterval: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SupplierPaidFeature {
  id: string;
  supplierId: string;
  paidFeature: PaidFeature;
  listingId?: string | null;
  locationId?: string | null;
  isActive: boolean;
  startsAt: string;
  endsAt?: string | null;
  adminNotes?: string | null;
}

export interface PaidFeatureRequest {
  id: string;
  supplierId: string;
  supplierName?: string | null;
  paidFeature: PaidFeature;
  listingId?: string | null;
  locationId?: string | null;
  requestedByUserId?: string | null;
  reviewedByUserId?: string | null;
  status: "new" | "approved" | "activated" | "dismissed";
  message?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderPaidFeatures {
  catalog: PaidFeature[];
  activeFeatures: SupplierPaidFeature[];
  requests: PaidFeatureRequest[];
}

export interface SupplierListingExtra {
  id: string;
  listingId: string;
  key: string;
  label: string;
  description?: string;
  publicPrice: number;
  price: number; // customer-facing price (with discount)
  savings?: number;
  isActive: boolean;
  sortOrder: number;
  partnerDiscountRate?: number | null; // null = use supplier base rate; 0 = no discount
  customerPriceOverride?: number | null; // null = auto-calculate
}

export interface SupplierLocation {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  notes?: string;
  images: string[];
  description: string;
  openingHours?: string;
  isActive: boolean;
  unitCount: number;
  availableUnits: number;
  fullyBooked: boolean;
  priceFrom?: number;
  createdAt?: string;
  units?: Listing[];
  availableUnitCount?: number | null;
  totalUnitCount?: number | null;
  rating?: number;
  reviewCount?: number;
  bestCustomerDiscount?: number | null;
  externalId?: string | null;           // vendor-side ID used for stock polling
}

export interface WarehouseListing extends ListingBase {
  type: "warehouse";
  size: number;
  sizeUnit: string;
  heated: boolean;
  indoor: boolean;
  access24_7: boolean;
  security: boolean;
  loadingDock: boolean;
  forklift: boolean;
  shortTerm: boolean;
  longTerm: boolean;
  features: Record<string, unknown>;    // backend: Dictionary<string, object>
}

export interface MovingListing extends ListingBase {
  type: "moving";
  serviceArea: string[];
  withVan: boolean;
  packingHelp: boolean;
  loadingHelp: boolean;
  pricingModel: "fixed" | "hourly";
  services: string[];
}

export interface TrailerListing extends ListingBase {
  type: "trailer";
  trailerType: string;
  weightClass: string;
  requirements: string[];
}

export type Listing = WarehouseListing | MovingListing | TrailerListing;

export interface ListingFilters {
  type?: ListingType;
  city?: string;
  priceMax?: number;
  features?: string[];
  availableNow?: boolean;
  availableFrom?: string; // yyyy-MM-dd — date-window availability (trailer/moving)
  availableTo?: string;   // yyyy-MM-dd
  query?: string;
  sort?: "best" | "cheapest" | "rating" | "newest";
  page?: number;
  limit?: number;
  minSize?: number;
  maxSize?: number;
  sizeCategory?: "XS" | "S" | "M" | "L" | "XL";
  supplierId?: string;
  locationId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  listingId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface CreateReviewInput {
  bookingId: string;
  listingId: string;
  rating: number;
  comment?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isOwner: boolean;
  lastLoginAt?: string;
  registeredAt: string;
}

export interface CreateBookingInput {
  idempotencyKey?: string;
  listingId: string;
  startDate: string;
  endDate?: string;
  duration: string;
  extras: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  paymentMethod: "bank_transfer" | "card" | "later";
  notes?: string;
}

export interface RebateInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  period: string;          // "YYYY-MM"
  amount: number;
  status: "pending" | "sent" | "paid";
  issuedAt: string;
  sentAt: string | null;
  paidAt: string | null;
  paymentReference: string | null;
}
