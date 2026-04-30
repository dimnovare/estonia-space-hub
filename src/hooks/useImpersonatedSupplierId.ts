import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the supplierId an admin is impersonating via ?supplierId= URL param.
 * Returns null for non-admin users or when no impersonation is active.
 * Provider role users are always scoped by their JWT; this hook is admin-only.
 */
export function useImpersonatedSupplierId(): string | null {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  if (user?.role !== "admin") return null;
  const id = searchParams.get("supplierId");
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}