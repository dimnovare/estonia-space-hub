import { useState, useEffect } from "react";
import { Search, RefreshCw, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supplierService } from "@/services";
import { apiClient } from "@/services/apiClient";
import type { User as ServiceUser } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { queryKeys } from "@/services/queryKeys";

export default function AdminUsers() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const limit = 50;
  const [selectedUser, setSelectedUser] = useState<ServiceUser | null>(null);
  const [editUser, setEditUser] = useState<(ServiceUser & { emailVerified?: boolean; supplierId?: string }) | null>(null);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const debouncedQ = useDebounce(searchInput, 350);

  const { data: usersPage, isLoading: loading, refetch } = useAdminUsers(
    debouncedQ || undefined, page, limit,
    filterRole !== "all" ? filterRole : undefined,
    filterStatus !== "all" ? filterStatus : undefined,
  );
  const users: ServiceUser[] = usersPage?.data ?? [];
  const total = usersPage?.total ?? 0;
  const hasMore = usersPage?.hasMore ?? false;

  const { data: suppliers = [] } = useQuery({
    queryKey: queryKeys.suppliers.all(),
    queryFn: () => supplierService.getAll(),
  });

  useEffect(() => {
    if (selectedUser) setEditUser({ ...selectedUser });
    else setEditUser(null);
  }, [selectedUser]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, filterRole, filterStatus]);

  const filtered = users;

  const inp = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  const roleLabel = (r: string) => r === "customer" ? t("admin.customer") : r === "provider" ? t("admin.provider") : r === "admin" ? t("admin.title") : t("admin.guest");

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.users")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{total} {t("admin.usersTotal")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("admin.searchUsers")} className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option value="all">{t("admin.allRoles")}</option><option value="customer">{t("admin.customer")}</option><option value="provider">{t("admin.provider")}</option><option value="admin">{t("admin.title")}</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option value="all">{t("admin.allStatuses")}</option><option value="active">{t("admin.active")}</option><option value="blocked">{t("admin.blocked")}</option>
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} {t("admin.usersFound")}</span>
      </div>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 md:hidden">
        {filtered.map(u => (
          <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{u.name.split(" ").map(n => n[0]).join("")}</div>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{u.name}</p><p className="text-[10px] text-muted-foreground truncate">{u.email}</p></div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{u.status === "active" ? t("admin.active") : t("admin.blocked")}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : u.role === "provider" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>{roleLabel(u.role)}</span>
              <span className="text-[10px] text-muted-foreground">{u.bookingsCount} bron.</span>
            </div>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <div className="mt-4 hidden rounded-xl border border-border md:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.name")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.email")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.role")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.registered")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.lastLogin")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.bookings")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{u.name.split(" ").map(n => n[0]).join("")}</div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : u.role === "provider" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>{roleLabel(u.role)}</span></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.registeredAt}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.lastLoginAt || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.bookingsCount}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{u.status === "active" ? t("admin.active") : t("admin.blocked")}</span></td>
                <td className="px-4 py-3"><Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedUser(u)}>{t("admin.view")}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {t("admin.page") || "Page"} {page}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" aria-label={t("admin.prev")} disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" aria-label={t("admin.next")} disabled={!hasMore || loading} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(o) => { if (!o) setSelectedUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editUser?.name || selectedUser?.name}</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.name")}</label>
                  <input className={inp} value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.email")}</label>
                  <p className="mt-1 text-sm font-medium">{editUser.email}</p>
                  <p className="text-[10px] text-muted-foreground">{t("admin.emailNotEditable") || "Email cannot be changed by admin"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.phone")}</label>
                  <input className={inp} value={editUser.phone || ""} onChange={e => setEditUser({ ...editUser, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.company")}</label>
                  <input className={inp} value={editUser.company || ""} onChange={e => setEditUser({ ...editUser, company: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.role")}</label>
                  <select className={inp} value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value as any })}>
                    <option value="customer">{t("admin.customer")}</option>
                    <option value="provider">{t("admin.provider")}</option>
                    <option value="admin">{t("admin.title")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("admin.status")}</label>
                  <select className={inp} value={editUser.status} onChange={e => setEditUser({ ...editUser, status: e.target.value as any })}>
                    <option value="active">{t("admin.active")}</option>
                    <option value="blocked">{t("admin.blocked")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("admin.linkToSupplier")}</label>
                <select className={inp} value={editUser.supplierId || ""} onChange={e => setEditUser({ ...editUser, supplierId: e.target.value || undefined })}>
                  <option value="">{t("admin.noSupplier") || "— No supplier linked —"}</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editUser.emailVerified || false}
                  onCheckedChange={(checked) => setEditUser({ ...editUser, emailVerified: !!checked })}
                />
                <label className="text-sm font-medium">
                  {t("admin.emailVerified") || "Email verified"}
                </label>
              </div>

              <p className="text-[10px] text-muted-foreground">
                {t("admin.registered")}: {editUser.registeredAt}
                {" · "}
                {t("admin.bookings")}: {editUser.bookingsCount}
              </p>

              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={async () => {
                  try {
                    await apiClient.patch(`/admin/users/${editUser.id}`, {
                      name: editUser.name,
                      phone: editUser.phone,
                      company: editUser.company,
                      role: editUser.role,
                      status: editUser.status,
                      emailVerified: editUser.emailVerified,
                      supplierId: editUser.supplierId || null,
                    });
                    refetch();
                    toast.success(t("admin.userUpdated") || "User updated");
                    setSelectedUser(null);
                  } catch (err: any) {
                    toast.error(err?.message || t("toast.saveFailed"));
                  }
                }}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {t("admin.save")}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedUser(null)}>
                  {t("admin.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
