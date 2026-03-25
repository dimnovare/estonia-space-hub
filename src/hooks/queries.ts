import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listingService, bookingService, orderService, supplierService, userService, notificationService, invoiceService, messageService, auditService, integrationSettingsService, routingRuleService, locationService } from "@/services";
import type { ListingFilters, CreateBookingInput } from "@/services/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useListings(filters?: ListingFilters) {
  return useQuery({ queryKey: ["listings", filters], queryFn: () => listingService.search(filters) });
}

export function useAllListings() {
  return useQuery({ queryKey: ["listings", "all"], queryFn: () => listingService.search() });
}

export function useListing(id: string | undefined) {
  return useQuery({ queryKey: ["listing", id], queryFn: () => listingService.getById(id!), enabled: !!id });
}

export function useFeaturedListings() {
  return useQuery({ queryKey: ["listings", "featured"], queryFn: () => listingService.getFeatured() });
}

export function useBookings() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["bookings"], queryFn: () => bookingService.getAll(), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Broneering loodud!");
    },
    onError: () => {
      toast.error("Midagi läks valesti. Palun proovige uuesti.");
    },
  });
}

export function useOrders() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["orders"], queryFn: () => orderService.getAll(), enabled: isAuthenticated, staleTime: 15_000 });
}

export function useSuppliers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["suppliers"], queryFn: () => supplierService.getAll(), enabled: isAuthenticated && (role === "admin" || role === "provider"), staleTime: 30_000 });
}

export function useUsers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["users"], queryFn: () => userService.getAll(), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["notifications"], queryFn: () => notificationService.getAll(), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useInvoices() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["invoices"], queryFn: () => invoiceService.getAll(), enabled: isAuthenticated, staleTime: 30_000 });
}

export function useMessages(bookingId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ["messages", bookingId], queryFn: () => messageService.getByBookingId(bookingId), enabled: isAuthenticated && !!bookingId });
}

export function useAuditLog() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["audit-log"], queryFn: () => auditService.getAll(), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useIntegrationSettings() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["integration-settings"], queryFn: () => integrationSettingsService.getAll(), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useRoutingRules() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: ["routing-rules"], queryFn: () => routingRuleService.getAll(), enabled: isAuthenticated && role === "admin", staleTime: 30_000 });
}

export function useLocations(params?: { city?: string; type?: string }) {
  return useQuery({
    queryKey: ["locations", params],
    queryFn: () => locationService.getAll(params),
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

export function useAdminLocations() {
  return useQuery({
    queryKey: ["admin-locations"],
    queryFn: () => locationService.getAll(),
    staleTime: 30_000,
  });
}
