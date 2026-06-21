import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import {
  Loader2, ChevronLeft, ChevronRight, Megaphone, Inbox, CheckCircle2, MapPin, Send, Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

type LeadStatus = "new" | "contacted" | "quoted" | "converted" | "dismissed";

interface Lead {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  city: string;
  category: string;
  query?: string;
  language: string;
  createdAt: string;
  status: LeadStatus;
  adminNotes?: string;
  supplierName?: string | null;
  quotedPrice?: number | null;
}

interface LeadsResponse {
  total: number;
  page: number;
  limit: number;
  items: Lead[];
}

const STATUS_OPTIONS: { value: LeadStatus | "all"; labelKey: string }[] = [
  { value: "all",       labelKey: "admin.leads.statusAll" },
  { value: "new",       labelKey: "admin.leads.statusNew" },
  { value: "contacted", labelKey: "admin.leads.statusContacted" },
  { value: "quoted",    labelKey: "admin.leads.statusQuoted" },
  { value: "converted", labelKey: "admin.leads.statusConverted" },
  { value: "dismissed", labelKey: "admin.leads.statusDismissed" },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-info/10 text-info",
  contacted: "bg-warning/10 text-warning-text",
  quoted: "bg-accent/10 text-accent",
  converted: "bg-success/10 text-success",
  dismissed: "bg-secondary text-muted-foreground",
};

const LIMIT = 50;

export default function AdminLeads() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);

  const queryKey = ["admin", "leads", statusFilter, page];

  const { data, isLoading } = useQuery<LeadsResponse>({
    queryKey,
    queryFn: () =>
      apiClient.get<LeadsResponse>(
        `/admin/leads?${statusFilter !== "all" ? `status=${statusFilter}&` : ""}page=${page}&limit=${LIMIT}`
      ),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      apiClient.patch(`/admin/leads/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
    onError: (err: any) => toast.error(err?.message || t("toast.error")),
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  // Demand stats derived from the current page (acquisition loop framing).
  const stats = useMemo(() => {
    const newCount = items.filter((l) => l.status === "new").length;
    const converted = items.filter((l) => l.status === "converted").length;
    const cities = new Set(items.map((l) => l.city).filter(Boolean));
    return { newCount, converted, areas: cities.size };
  }, [items]);

  const Stat = ({ label, value, icon: Icon, hint }: { label: string; value: number | string; icon: typeof Inbox; hint?: string }) => (
    <div className="rounded-[14px] border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <Icon className="h-[18px] w-[18px] text-muted-foreground/70" />
      </div>
      <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-navy-ink">{value}</div>
      {hint && <div className="mt-1 text-[12.5px] text-muted-foreground">{hint}</div>}
    </div>
  );

  const exportCsv = () => {
    const header = ["email", "city", "category", "query", "language", "created", "status"];
    const rows = items.map((l) => [
      l.email, l.city, l.category, l.query ?? "", l.language,
      new Date(l.createdAt).toISOString().slice(0, 10), l.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruumly-demand-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("admin.leads.exported"));
  };

  return (
    <div>
      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono-label text-[11.5px] uppercase tracking-[0.2em] text-teal-deep">
            {t("admin.leads.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("admin.leads")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("admin.leads.subtitle")}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-11"
          onClick={exportCsv}
          disabled={items.length === 0}
        >
          {t("admin.leads.export")}
        </Button>
      </div>

      {/* Demand stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("admin.leads.statTotal")} value={data?.total ?? 0} icon={Megaphone} />
        <Stat label={t("admin.leads.statNew")} value={stats.newCount} icon={Inbox} />
        <Stat label={t("admin.leads.statConverted")} value={stats.converted} icon={CheckCircle2} />
        <Link
          to="/admin/partners"
          className="block rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Stat label={t("admin.leads.statAreas")} value={stats.areas} icon={MapPin} hint={t("admin.leads.statAreasHint")} />
        </Link>
      </div>

      {/* Status filter buttons */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            aria-pressed={statusFilter === opt.value}
            className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              statusFilter === opt.value
                ? "bg-navy-ink text-white"
                : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[14px] border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colEmail")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCity")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCategory")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colQuery")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colLanguage")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCreated")}</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colStatus")}</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">{t("admin.leads.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {t("admin.leads.empty")}
                  </td>
                </tr>
              ) : (
                items.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30">
                    <td className="px-5 py-3.5 font-medium text-navy-ink">
                      {lead.name ? <span className="block">{lead.name}</span> : null}
                      <span className={lead.name ? "block text-xs font-normal text-muted-foreground" : ""}>{lead.email}</span>
                      {lead.supplierName && (
                        <span className="mt-0.5 block text-[11px] font-normal text-accent">→ {lead.supplierName}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{lead.city}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {lead.category}
                      {lead.quotedPrice != null && (
                        <span className="mt-0.5 block text-[11px] font-medium text-foreground">{lead.quotedPrice.toFixed(2)} €</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 max-w-[180px] truncate text-muted-foreground" title={lead.query}>
                      {lead.query || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                        {lead.language}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={lead.status}
                        disabled={updateMutation.isPending}
                        aria-label={t("admin.leads.colStatus")}
                        onChange={(e) =>
                          updateMutation.mutate({ id: lead.id, status: e.target.value as LeadStatus })
                        }
                        className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${STATUS_COLORS[lead.status]}`}
                      >
                        <option value="new">{t("admin.leads.statusNew")}</option>
                        <option value="contacted">{t("admin.leads.statusContacted")}</option>
                        <option value="quoted">{t("admin.leads.statusQuoted")}</option>
                        <option value="converted">{t("admin.leads.statusConverted")}</option>
                        <option value="dismissed">{t("admin.leads.statusDismissed")}</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
                          disabled={updateMutation.isPending || lead.status === "converted"}
                          onClick={() => {
                            updateMutation.mutate({ id: lead.id, status: "contacted" });
                            toast.success(t("admin.leads.routing"));
                          }}
                        >
                          <Send className="h-3.5 w-3.5" />
                          {t("admin.leads.route")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5"
                          disabled={updateMutation.isPending || lead.status === "dismissed"}
                          onClick={() => {
                            updateMutation.mutate({ id: lead.id, status: "dismissed" });
                            toast.success(t("admin.leads.flaggedUnmatched"));
                          }}
                        >
                          <Flag className="h-3.5 w-3.5" />
                          {t("admin.leads.flagUnmatched")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("admin.leads.pagination")
              .replace("{page}", String(page))
              .replace("{total}", String(totalPages))}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label={t("common.previous")}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={t("common.next")}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
