import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type LeadStatus = "new" | "contacted" | "converted" | "dismissed";

interface Lead {
  id: string;
  email: string;
  city: string;
  category: string;
  query?: string;
  language: string;
  createdAt: string;
  status: LeadStatus;
  adminNotes?: string;
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
  { value: "converted", labelKey: "admin.leads.statusConverted" },
  { value: "dismissed", labelKey: "admin.leads.statusDismissed" },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
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

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("admin.leads")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? t("admin.leads.totalCount").replace("{count}", String(data.total)) : ""}
          </p>
        </div>
      </div>

      {/* Status filter buttons */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
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
        <div className="mt-4 rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colEmail")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCity")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCategory")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colQuery")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colLanguage")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colCreated")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("admin.leads.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("admin.leads.empty")}
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{lead.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.city}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.category}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground" title={lead.query}>
                      {lead.query || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.language}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        disabled={updateMutation.isPending}
                        onChange={(e) =>
                          updateMutation.mutate({ id: lead.id, status: e.target.value as LeadStatus })
                        }
                        className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${STATUS_COLORS[lead.status]}`}
                      >
                        <option value="new">{t("admin.leads.statusNew")}</option>
                        <option value="contacted">{t("admin.leads.statusContacted")}</option>
                        <option value="converted">{t("admin.leads.statusConverted")}</option>
                        <option value="dismissed">{t("admin.leads.statusDismissed")}</option>
                      </select>
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
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
