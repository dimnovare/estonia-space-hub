import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listingService, bookingService, orderService, supplierService, notificationService, invoiceService, messageService, auditService, integrationSettingsService, routingRuleService, locationService, listingExtrasService } from "@/services";
import type { ListingFilters, CreateBookingInput, Review, CreateReviewInput, Order, Supplier, Notification, Invoice, Message, AuditLogEntry, PartnerIntegrationSettings, OrderRoutingRule, SupplierLocation, TeamMember, SupplierListingExtra } from "@/services/types";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { withSupplier } from "@/lib/withSupplier";
import { queryKeys } from "@/services/queryKeys";
import { unwrapPaginated } from "@/services/unwrapPaginated";

export function useListings(filters?: ListingFilters) {
  return useQuery({
    queryKey: queryKeys.listings.all(filters),
    queryFn: () => listingService.search(filters),
    placeholderData: (prev) => prev,
    retry: (failureCount, error: any) => error?.status !== 429 && failureCount < 2,
  });
}

export function useAllListings() {
  return useQuery({
    queryKey: queryKeys.listings.all({ limit: 200 }),
    queryFn: () => listingService.search({ limit: 200 }),
    staleTime: 5 * 60_000,
  });
}

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: () => apiClient.get<{ city: string; country: string }[]>("/locations/cities"),
    staleTime: 5 * 60_000,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({ queryKey: queryKeys.listings.byId(id ?? ""), queryFn: () => listingService.getById(id!), enabled: !!id });
}

export function useFeaturedListings() {
  return useQuery({ queryKey: queryKeys.listings.featured(), queryFn: () => listingService.getFeatured() });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all() });
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
  return useQuery({ queryKey: queryKeys.orders.all(), queryFn: async () => unwrapPaginated<Order>(await orderService.getAll()), enabled: isAuthenticated, staleTime: 15_000 });
}

export function useSuppliers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: queryKeys.suppliers.all(), queryFn: async () => unwrapPaginated<Supplier>(await supplierService.getAll()), enabled: isAuthenticated && (role === "admin" || role === "provider"), staleTime: 30_000 });
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.notifications.all(), queryFn: async () => unwrapPaginated<Notification>(await notificationService.getAll()), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useInvoices() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.invoices.all(), queryFn: async () => unwrapPaginated<Invoice>(await invoiceService.getAll()), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useMessages(bookingId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: queryKeys.messages.byBooking(bookingId), queryFn: async () => unwrapPaginated<Message>(await messageService.getByBookingId(bookingId)), enabled: isAuthenticated && !!bookingId });
}

export function useAuditLog() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: queryKeys.auditLog.all(), queryFn: async () => unwrapPaginated<AuditLogEntry>(await auditService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useIntegrationSettings() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: queryKeys.integrations.all(), queryFn: async () => unwrapPaginated<PartnerIntegrationSettings>(await integrationSettingsService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useRoutingRules() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: queryKeys.routingRules.all(), queryFn: async () => unwrapPaginated<OrderRoutingRule>(await routingRuleService.getAll()), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useLocations(params?: { city?: string; type?: string; supplierId?: string | null }) {
  return useQuery({
    queryKey: queryKeys.locations.all(params),
    queryFn: async () => unwrapPaginated<SupplierLocation>(
      await locationService.getAll({
        city: params?.city,
        type: params?.type,
        supplierId: params?.supplierId ?? undefined,
      })
    ),
    staleTime: 60_000,
  });
}

export function useLocation(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.locations.byId(id ?? ""),
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
    queryFn: async () => unwrapPaginated<SupplierLocation>(await locationService.getAll()),
    staleTime: 30_000,
  });
}

export function useReviews(listingId: string | undefined) {
  return useQuery<Review[]>({
    queryKey: ["reviews", listingId],
    queryFn: async () => unwrapPaginated<Review>(await apiClient.get(`/reviews?listingId=${listingId}`)),
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
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all() });
    },
  });
}

export function useSupplierTeam(supplierId?: string | null) {
  const { isAuthenticated, role } = useAuth();
  return useQuery<TeamMember[]>({
    queryKey: ["supplier-team", supplierId ?? null],
    queryFn: async () => {
      const res = await apiClient.get(withSupplier("/supplier/team", supplierId ?? null));
      return unwrapPaginated<TeamMember>(res);
    },
    enabled: isAuthenticated && (role === "provider" || role === "admin"),
    staleTime: 30_000,
  });
}

export function useInviteTeamMember(supplierId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name: string }) =>
      apiClient.post(withSupplier("/supplier/team/invite", supplierId ?? null), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-team", supplierId ?? null] });
    },
  });
}

export function useRemoveTeamMember(supplierId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(withSupplier(`/supplier/team/${userId}`, supplierId ?? null)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-team", supplierId ?? null] });
    },
  });
}

export interface TierPricing {
  customerDiscountRate: number;
  monthlyFee: number;
  commissionRate: number;
  maxLocations: number;
}

export interface PlatformPricingConfig {
  defaultPartnerDiscount: number;
  extrasMarginRate: number;
  defaultVatRate: number;
  ruumlyMinMarginRate: number;
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

export function useBookingStats(enabled: boolean = true) {
  return useQuery<BookingStats>({
    queryKey: queryKeys.bookings.stats(),
    queryFn: async () => {
      const res = await apiClient.get("/bookings/stats");
      return res as BookingStats;
    },
    staleTime: 5 * 60 * 1000,
    enabled,
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

