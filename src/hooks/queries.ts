import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listingService, bookingService, orderService, supplierService, userService, notificationService, invoiceService, messageService, auditService, integrationSettingsService, routingRuleService } from "@/services";
import type { ListingFilters, CreateBookingInput } from "@/services/types";
import { toast } from "sonner";

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
  return useQuery({ queryKey: ["bookings"], queryFn: () => bookingService.getAll() });
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
  return useQuery({ queryKey: ["orders"], queryFn: () => orderService.getAll() });
}

export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers"], queryFn: () => supplierService.getAll() });
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => userService.getAll() });
}

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => notificationService.getAll() });
}

export function useInvoices() {
  return useQuery({ queryKey: ["invoices"], queryFn: () => invoiceService.getAll() });
}

export function useMessages(bookingId: string) {
  return useQuery({ queryKey: ["messages", bookingId], queryFn: () => messageService.getByBookingId(bookingId), enabled: !!bookingId });
}

export function useAuditLog() {
  return useQuery({ queryKey: ["audit-log"], queryFn: () => auditService.getAll() });
}

export function useIntegrationSettings() {
  return useQuery({ queryKey: ["integration-settings"], queryFn: () => integrationSettingsService.getAll() });
}

export function useRoutingRules() {
  return useQuery({ queryKey: ["routing-rules"], queryFn: () => routingRuleService.getAll() });
}
