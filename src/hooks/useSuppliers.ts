import { useQuery } from "@tanstack/react-query";
import { supplierService } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useAuth } from "@/contexts/AuthContext";

export function useSuppliers() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({ queryKey: queryKeys.suppliers.all(), queryFn: supplierService.getAll, enabled: isAuthenticated && (role === "admin" || role === "provider"), staleTime: 30_000 });
}
