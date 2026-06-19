import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { queryKeys } from "@/services/queryKeys";

interface Inquiry {
  id: number;
  customer: string;
  email: string;
  listing: string;
  type: string;
  date: string;
  status: string;
  notes: string;
}

export default function AdminInquiries() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: queryKeys.adminInquiries.all(),
    queryFn: () => apiClient.get<Inquiry[]>("/admin/inquiries"),
  });

  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Inquiry | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Inquiry> }) =>
      apiClient.patch<Inquiry>(`/admin/inquiries/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInquiries.all() });
      toast.success(t("toast.inquiryUpdated"));
    },
    onError: (err: any) => toast.error(err.message || t("toast.updateFailed")),
  });

  const openView = (inq: Inquiry) => { setViewItem({ ...inq }); setViewOpen(true); };
  const updateStatus = (id: number, status: string) => {
    updateMutation.mutate({ id, updates: { status } });
    if (viewItem?.id === id) setViewItem(prev => prev ? { ...prev, status } : prev);
  };
  const statusLabel = (s: string) => s === "new" ? t("admin.new") : s === "answered" ? t("admin.answered") : t("admin.closed");

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div>
      {/* Page head — design-system header, consistent with Leads/Requests/Routing */}
      <div>
        <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
          {t("admin.inquiries.eyebrow")}
        </span>
        <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("admin.inquiries")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("admin.inquiries.subtitle")}</p>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-2 sm:hidden">
        {inquiries.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground shadow-card">
            {t("admin.inquiries.empty")}
          </div>
        ) : inquiries.map(inq => (
          <button key={inq.id} onClick={() => openView(inq)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-navy-ink">{inq.customer}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>{statusLabel(inq.status)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{inq.listing} · {inq.date}</p>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-[14px] border border-border bg-card shadow-card sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/40">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.client")}</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.email")}</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.listing")}</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.date")}</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {t("admin.inquiries.empty")}
                </td>
              </tr>
            ) : inquiries.map(inq => (
              <tr key={inq.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30">
                <td className="px-5 py-3.5 font-medium text-navy-ink">{inq.customer}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{inq.email}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{inq.listing}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{inq.date}</td>
                <td className="px-5 py-3.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>{statusLabel(inq.status)}</span></td>
                <td className="px-5 py-3.5 text-right"><Button variant="outline" size="sm" onClick={() => openView(inq)}>{t("admin.view")}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("admin.inquiryDetails")}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs text-muted-foreground">{t("admin.client")}</span><p className="font-medium">{viewItem.customer}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.email")}</span><p className="font-medium">{viewItem.email}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.listing")}</span><p className="font-medium">{viewItem.listing}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("admin.date")}</span><p className="font-medium">{viewItem.date}</p></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("admin.status")}</span>
                <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={viewItem.status} onChange={e => updateStatus(viewItem.id, e.target.value)}>
                  <option value="new">{t("admin.new")}</option><option value="answered">{t("admin.answered")}</option><option value="closed">{t("admin.closed")}</option>
                </select>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("admin.notesField")}</span>
                <textarea className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" rows={3} value={viewItem.notes} onChange={e => setViewItem({ ...viewItem, notes: e.target.value })} />
              </div>
              <div className="flex justify-end"><Button onClick={() => setViewOpen(false)} className="bg-accent text-accent-foreground hover:bg-accent/90">{t("admin.close")}</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
