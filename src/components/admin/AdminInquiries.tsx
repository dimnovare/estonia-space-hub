import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
    queryKey: ["admin-inquiries"],
    queryFn: () => apiClient.get<Inquiry[]>("/admin/inquiries"),
  });

  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Inquiry | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Inquiry> }) =>
      apiClient.patch<Inquiry>(`/admin/inquiries/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
      toast.success(t("toast.inquiryUpdated") || "Inquiry updated");
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
      <h1 className="font-display text-2xl font-bold">{t("admin.inquiries")}</h1>
      {/* Mobile cards */}
      <div className="mt-4 space-y-2 sm:hidden">
        {inquiries.map(inq => (
          <button key={inq.id} onClick={() => openView(inq)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{inq.customer}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>{statusLabel(inq.status)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{inq.listing} · {inq.date}</p>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <div className="mt-6 hidden rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.client")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.email")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.listing")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.date")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.status")}</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map(inq => (
              <tr key={inq.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{inq.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.listing}</td>
                <td className="px-4 py-3 text-muted-foreground">{inq.date}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-accent/10 text-accent" : inq.status === "answered" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"}`}>{statusLabel(inq.status)}</span></td>
                <td className="px-4 py-3"><Button variant="outline" size="sm" onClick={() => openView(inq)}>{t("admin.view")}</Button></td>
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
