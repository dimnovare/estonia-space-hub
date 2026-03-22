import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";

export function useOrders() {
  return useQuery({ queryKey: queryKeys.orders.all, queryFn: orderService.getAll, staleTime: 30_000 });
}
