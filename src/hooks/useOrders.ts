import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";
import type { OrderStatus } from "@/services/types";

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: orderService.getAll,
    staleTime: 15_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.byId(id),
    queryFn: () => orderService.getById(id),
    enabled: !!id,
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
    },
  });
}
