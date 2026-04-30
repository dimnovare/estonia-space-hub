import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";
import type { Order, OrderStatus, LeadStatus, LeadSummary } from "@/services/types";
import { useAuth } from "@/contexts/AuthContext";

function unwrap<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as any).data)) return (res as any).data;
  return [];
}

export function useOrders(supplierId?: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: supplierId ? [...queryKeys.orders.all, supplierId] : queryKeys.orders.all,
    queryFn: async () => unwrap<Order>(await orderService.getAll(supplierId ? { supplierId } : undefined)),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useRejectOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      orderService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useConfirmOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orderService.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-revenue"] });
    },
  });
}

export function useLeadSummary() {
  const { isAuthenticated } = useAuth();
  return useQuery<LeadSummary>({
    queryKey: [...queryKeys.orders.all, "lead-summary"],
    queryFn: () => orderService.getLeadSummary(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, providerNotes, lastContactAt }: { id: string; status?: LeadStatus; providerNotes?: string; lastContactAt?: string }) =>
      orderService.updateLead(id, { status, providerNotes, lastContactAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
