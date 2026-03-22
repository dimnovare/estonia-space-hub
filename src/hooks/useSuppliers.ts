import { useQuery } from "@tanstack/react-query";
import { supplierService } from "@/services";
import { queryKeys } from "@/lib/queryKeys";

export function useSuppliers() {
  return useQuery({ queryKey: queryKeys.suppliers.all, queryFn: supplierService.getAll, staleTime: 30_000 });
}
