import { useState, useEffect } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { userService } from "@/services";
import type { User as ServiceUser } from "@/services/types";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AdminUsers() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ServiceUser | null>(null);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { userService.getAll().then(data => { setUsers(data); setLoading(false); }); }, []);

  const filtered = users.filter(u => {
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "blocked" as const : "active" as const } : u));
    if (selectedUser?.id === id) setSelectedUser(prev => prev ? { ...prev, status: prev.status === "active" ? "blocked" as const : "active" as const } : prev);
  };

  const roleLabel = (r: string) => r === "customer" ? t("admin.customer") : r === "provider" ? t("admin.provider") : r === "admin" ? t("admin.title") : t("admin.guest");

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("admin.users")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{users.length} {t("admin.usersTotal")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("admin.searchUsers")} className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm" />
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

      <Dialog open={!!selectedUser} onOpenChange={(o) => { if (!o) setSelectedUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedUser?.name}</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.email")}</p><p className="text-sm font-medium">{selectedUser.email}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.phone")}</p><p className="text-sm font-medium">{selectedUser.phone || "—"}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.role")}</p><p className="text-sm font-medium">{roleLabel(selectedUser.role)}</p></div>
                <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{t("admin.registered")}</p><p className="text-sm font-medium">{selectedUser.registeredAt}</p></div>
              </div>
              {selectedUser.company && <p className="text-sm"><span className="text-muted-foreground">{t("admin.company")}:</span> {selectedUser.company}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleStatus(selectedUser.id)}>
                  {selectedUser.status === "active" ? t("admin.block") : t("admin.activate")}
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedUser(null)}>{t("admin.close")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
