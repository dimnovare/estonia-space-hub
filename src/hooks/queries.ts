import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listingService, bookingService, orderService, supplierService, userService, notificationService, invoiceService, messageService, auditService, integrationSettingsService, routingRuleService, locationService, listingExtrasService } from "@/services";
import type { ListingFilters, CreateBookingInput, Review, CreateReviewInput, Booking, Order, Supplier, User, Notification, Invoice, Message, AuditLogEntry, PartnerIntegrationSettings, OrderRoutingRule, SupplierLocation, Listing, TeamMember, SupplierListingExtra } from "@/services/types";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";

/** Safely unwrap paginated { data: T[] } or plain T[] responses */
function unwrapArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
}

export function useListings(filters?: ListingFilters) {
  return useQuery({
    queryKey: ["listings", filters],
    queryFn: () => listingService.search(filters),
    placeholderData: (prev) => prev,
    retry: (failureCount, error: any) => error?.status !== 429 && failureCount < 2,
  });
}

export function useAllListings() {
  return useQuery({
    queryKey: ["listings", "all"],
    queryFn: () => listingService.search({ limit: 200 }),
    staleTime: 5 * 60_000,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({ queryKey: ["listing", id], queryFn: () => listingService.getById(id!), enabled: !!id });
}

export function useFeaturedListings() {
  return useQuery({ queryKey: ["listings", "featured"], queryFn: async () => unwrapArray<Listing>(await listingService.getFeatured()) });
}

export function useBookings() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["bookings"], queryFn: async () => unwrapArray<Booking>(await bookingService.getAll()), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      // Toast handled by BookingPage success state
    },
    onError: (err: any) => {
      const msg = err?.message?.toLowerCase() || "";
      if (err?.status === 403 && msg.includes("email") && msg.includes("verif")) return;
      toast.error(err?.message || "Something went wrong. Please try again.");
    },
  });
}

export function useOrders() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["orders"], queryFn: async () => unwrapArray<Order>(await orderService.getAll()), enabled: isAuthenticated, staleTime: 15_000 });
}

export function useSuppliers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["suppliers"], queryFn: async () => unwrapArray<Supplier>(await supplierService.getAll()), enabled: isAuthenticated && (role === "admin" || role === "provider"), staleTime: 30_000 });
}

export function useUsers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["users"], queryFn: async () => unwrapArray<User>(await userService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["notifications"], queryFn: async () => unwrapArray<Notification>(await notificationService.getAll()), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useInvoices() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["invoices"], queryFn: async () => unwrapArray<Invoice>(await invoiceService.getAll()), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useMessages(bookingId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["messages", bookingId], queryFn: async () => unwrapArray<Message>(await messageService.getByBookingId(bookingId)), enabled: isAuthenticated && !!bookingId });
}

export function useAuditLog() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["audit-log"], queryFn: async () => unwrapArray<AuditLogEntry>(await auditService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useIntegrationSettings() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["integration-settings"], queryFn: async () => unwrapArray<PartnerIntegrationSettings>(await integrationSettingsService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useRoutingRules() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["routing-rules"], queryFn: async () => unwrapArray<OrderRoutingRule>(await routingRuleService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useLocations(params?: { city?: string; type?: string }) {
  return useQuery({
    queryKey: ["locations", params],
    queryFn: async () => unwrapArray<SupplierLocation>(await locationService.getAll(params)),
    staleTime: 60_000,
  });
}

export function useLocation(id: string | undefined) {
  return useQuery({
    queryKey: ["location", id],
    queryFn: () => locationService.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof locationService.create>[0]) =>
      locationService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
    },
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof locationService.update>[1] }) =>
      locationService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
    },
  });
}

export function useAddUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ locationId, unit }: { locationId: string; unit: Parameters<typeof locationService.addUnit>[1] }) =>
      locationService.addUnit(locationId, unit),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["admin-locations"] });
    },
  });
}

export function useAdminLocations() {
  return useQuery({
    queryKey: ["admin-locations"],
    queryFn: async () => unwrapArray<SupplierLocation>(await locationService.getAll()),
    staleTime: 30_000,
  });
}

export function useReviews(listingId: string | undefined) {
  return useQuery<Review[]>({
    queryKey: ["reviews", listingId],
    queryFn: async () => unwrapArray<Review>(await apiClient.get(`/reviews?listingId=${listingId}`)),
    enabled: !!listingId,
    staleTime: 60_000,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => apiClient.post("/reviews", input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reviews", variables.listingId] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useSupplierTeam() {
  const { isAuthenticated, role } = useAuth();
  return useQuery<TeamMember[]>({
    queryKey: ["supplier-team"],
    queryFn: async () => {
      const res = await apiClient.get("/supplier/team");
      return unwrapArray<TeamMember>(res);
    },
    enabled: isAuthenticated && (role === "provider" || role === "admin"),
    staleTime: 30_000,
  });
}

export function useInviteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name: string }) =>
      apiClient.post("/supplier/team/invite", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-team"] });
    },
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/supplier/team/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-team"] });
    },
  });
}

export interface TierPricing {
  customerDiscountRate: number;
  monthlyFee: number;
  maxLocations: number;
}

export interface PlatformPricingConfig {
  defaultPartnerDiscount: number;
  extrasMarginRate: number;
  defaultVatRate: number;
  tiers: {
    starter: TierPricing;
    standard: TierPricing;
    premium: TierPricing;
  };
}

export function usePricingConfig() {
  return useQuery<PlatformPricingConfig>({
    queryKey: ["pricing-config"],
    queryFn: () => apiClient.get("/settings/pricing") as Promise<PlatformPricingConfig>,
    staleTime: 5 * 60 * 1000,
  });
}

export interface ListingExtra {
  key: string;
  label: string;
  description?: string;
  price: number;
  publicPrice: number;
  savings: number;
}

export function useListingExtras(listingId: string) {
  return useQuery<ListingExtra[]>({
    queryKey: ["listing-extras", listingId],
    queryFn: () => apiClient.get(`/listings/${listingId}/extras`) as Promise<ListingExtra[]>,
    enabled: !!listingId,
  });
}

export interface BookingStats {
  totalBookings: number;
  averageRating: number;
}

export function useBookingStats() {
  return useQuery<BookingStats>({
    queryKey: ["bookings", "stats"],
    queryFn: async () => {
      const res = await apiClient.get("/bookings/stats");
      return res as BookingStats;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSupplierListingExtras(listingId: string) {
  const { isAuthenticated, role } = useAuth();
  return useQuery<SupplierListingExtra[]>({
    queryKey: ["supplier-listing-extras", listingId],
    queryFn: () => listingExtrasService.getForListing(listingId),
    enabled: !!listingId && isAuthenticated && (role === "provider" || role === "admin"),
  });
}

export function useCreateListingExtra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, data }: { listingId: string; data: Parameters<typeof listingExtrasService.create>[1] }) =>
      listingExtrasService.create(listingId, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["supplier-listing-extras", vars.listingId] });
      qc.invalidateQueries({ queryKey: ["listing-extras", vars.listingId] });
    },
  });
}

export function useUpdateListingExtra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ extraId, data }: { extraId: string; data: Parameters<typeof listingExtrasService.update>[1] }) =>
      listingExtrasService.update(extraId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-listing-extras"] });
      qc.invalidateQueries({ queryKey: ["listing-extras"] });
    },
  });
}

export function useRemoveListingExtra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (extraId: string) => listingExtrasService.remove(extraId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-listing-extras"] });
      qc.invalidateQueries({ queryKey: ["listing-extras"] });
    },
  });
}

