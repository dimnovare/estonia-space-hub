import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import type { Order, OrderStatus, LeadStatus, LeadSummary } from "@/services/types";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { unwrapPaginated } from "@/services/unwrapPaginated";

export function useOrders(supplierId?: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.all(supplierId ? { supplierId } : undefined),
    queryFn: async () => unwrapPaginated<Order>(
      await orderService.getAll(supplierId ? { supplierId, limit: 200 } : { limit: 200 })
    ),
    enabled: isAuthenticated,
    staleTime: 15_000,
  });
}

// Server-side paginated + status-filtered orders for the admin table. Kept
// separate from useOrders so the six full-list consumers stay untouched.
export function useOrdersPaged(opts: { supplierId?: string; status: string; page: number; limit?: number }) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.paged(opts),
    queryFn: () => orderService.getAllPaged(opts),
    enabled: isAuthenticated,
    staleTime: 15_000,
    placeholderData: (prev) => prev, // keep the current page visible during refetch
  });
}

export function useOrderStatusCounts(supplierId?: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.statusCounts(supplierId),
    queryFn: () => orderService.getStatusCounts(supplierId),
    enabled: isAuthenticated,
    staleTime: 15_000,
  });
}

export function useOrder(id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.byId(id),
    queryFn: () => orderService.getById(id),
    enabled: isAuthenticated && !!id,
  });
}

export function useApproveOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.root() });
    },
  });
}

export function useRejectOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      orderService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.root() });
    },
  });
}

export function useConfirmOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.root() });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRevenue.all() });
    },
  });
}

export function useLeadSummary() {
  const { isAuthenticated, user } = useAuth();
  const supplierId = useImpersonatedSupplierId();
  return useQuery<LeadSummary>({
    queryKey: queryKeys.orders.leadSummary(supplierId ?? undefined),
    queryFn: () => orderService.getLeadSummary(supplierId ?? undefined),
    enabled: isAuthenticated && (user?.role !== "admin" || !!supplierId),
    staleTime: 30_000,
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, providerNotes, lastContactAt }: { id: string; status?: LeadStatus; providerNotes?: string; lastContactAt?: string }) =>
      orderService.updateLead(id, { status, providerNotes, lastContactAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.root() });
    },
  });
}
