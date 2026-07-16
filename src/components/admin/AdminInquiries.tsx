import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { queryKeys } from "@/services/queryKeys";
import {
  AdminPageHeader, DataTable, DataTableHead, Th, Tr, Td, DataTableEmptyRow, StatusBadge,
} from "@/components/admin/kit";
import { INQUIRY_STATUS_BADGE, FALLBACK_STATUS_BADGE } from "@/components/admin/kit/statusMaps";

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

  const inquiryBadge = (status: string) => {
    const badge = INQUIRY_STATUS_BADGE[status] ?? FALLBACK_STATUS_BADGE;
    return <StatusBadge tone={badge.tone} icon={badge.icon} label={statusLabel(status)} />;
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow={t("admin.nav.groupOperate")}
        title={t("admin.inquiries")}
        subtitle={t("admin.inquiries.subtitle")}
        count={inquiries.length || undefined}
      />

      {/* Mobile cards */}
      <div className="mt-6 space-y-2 sm:hidden">
        {inquiries.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground shadow-card">
            {t("admin.inquiries.empty")}
          </div>
        ) : inquiries.map(inq => (
          <button key={inq.id} onClick={() => openView(inq)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-navy-ink">{inq.customer}</span>
              {inquiryBadge(inq.status)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{inq.listing} · <span className="font-data">{inq.date}</span></p>
          </button>
        ))}
      </div>
      {/* Desktop table */}
      <DataTable className="mt-6 hidden sm:block">
        <DataTableHead>
          <tr>
            <Th>{t("admin.client")}</Th>
            <Th>{t("admin.email")}</Th>
            <Th>{t("admin.listing")}</Th>
            <Th>{t("admin.date")}</Th>
            <Th>{t("admin.status")}</Th>
            <Th align="right">{t("admin.actions")}</Th>
          </tr>
        </DataTableHead>
        {inquiries.length === 0 ? (
          <DataTableEmptyRow cols={6}>{t("admin.inquiries.empty")}</DataTableEmptyRow>
        ) : (
          <tbody>
            {inquiries.map(inq => (
              <Tr key={inq.id}>
                <Td className="font-medium text-navy-ink">{inq.customer}</Td>
                <Td className="text-muted-foreground">{inq.email}</Td>
                <Td className="text-muted-foreground">{inq.listing}</Td>
                <Td data className="text-muted-foreground">{inq.date}</Td>
                <Td>{inquiryBadge(inq.status)}</Td>
                <Td align="right"><Button variant="outline" size="sm" onClick={() => openView(inq)}>{t("admin.view")}</Button></Td>
              </Tr>
            ))}
          </tbody>
        )}
      </DataTable>
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
