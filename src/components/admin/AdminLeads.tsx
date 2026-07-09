import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminLeadService,
  type AdminLead,
  type AdminLeadStatus,
  type AdminLeadMatch,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { serviceTypeLabel } from "@/lib/serviceTypes";
import { toast } from "sonner";
import {
  Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Megaphone,
  TrendingUp, Timer, CalendarCheck, Users, Copy, Mail, Phone, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS: { value: AdminLeadStatus | "all"; labelKey: string }[] = [
  { value: "all",       labelKey: "admin.leads.statusAll" },
  { value: "new",       labelKey: "admin.leads.statusNew" },
  { value: "contacted", labelKey: "admin.leads.statusContacted" },
  { value: "quoted",    labelKey: "admin.leads.statusQuoted" },
  { value: "converted", labelKey: "admin.leads.statusConverted" },
  { value: "dismissed", labelKey: "admin.leads.statusDismissed" },
  { value: "unmatched", labelKey: "admin.leads.statusUnmatched" },
];

const STATUS_COLORS: Record<AdminLeadStatus, string> = {
  new: "bg-info/10 text-info",
  contacted: "bg-warning/10 text-warning-text",
  quoted: "bg-accent/10 text-accent",
  converted: "bg-success/10 text-success",
  dismissed: "bg-secondary text-muted-foreground",
  unmatched: "bg-destructive/10 text-destructive",
};

const LIMIT = 50;

/* StatCard pattern copied from AdminMetrics — same visual language. */
function StatCard({ label, value, sub, icon: Icon }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-[18px] w-[18px] text-muted-foreground/70" />
      </div>
      <div className="mt-2 font-display text-[30px] font-extrabold leading-none tracking-[-0.02em] text-navy-ink">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12.5px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

const pct = (fraction: number) => `${Math.round((fraction ?? 0) * 100)}%`;

/** Copy-to-clipboard chip used for match contact details. */
function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success(copiedLabel);
        } catch {
          /* clipboard unavailable (e.g. http) — nothing sensible to do */
        }
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

/** Suggested-partner list, fetched on demand via "Find partners". */
function LeadMatches({ leadId }: { leadId: string }) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useQuery<AdminLeadMatch[]>({
    queryKey: queryKeys.adminLeads.matches(leadId),
    queryFn: () => adminLeadService.matches(leadId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("admin.leads.findPartners")}…
      </div>
    );
  }
  if (isError || !data || data.length === 0) {
    return <p className="py-3 text-sm text-muted-foreground">{t("admin.leads.matchesEmpty")}</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {data.map((m) => (
        <li
          key={`${m.supplierId}-${m.listingId ?? "directory"}`}
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-card p-3 text-sm"
        >
          <div className="min-w-[160px]">
            <div className="font-medium text-navy-ink">{m.supplierName}</div>
            {/* Directory suppliers have no listing (listingTitle/price null) —
                show a directory chip + services + city instead of a listing line. */}
            {m.listingTitle == null ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="rounded-full bg-teal/[0.14] px-2 py-0.5 font-semibold text-teal-deep">
                  {t("admin.leads.matchDirectory")}
                </span>
                {(m.serviceTypes ?? []).map((st) => (
                  <span key={st} className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
                    {serviceTypeLabel(t, st)}
                  </span>
                ))}
                {m.listingCity && <span>· {m.listingCity}</span>}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {m.listingTitle}
                {m.listingCity && <span> · {m.listingCity}</span>}
              </div>
            )}
          </div>
          {m.price != null && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground">
              {m.price} {m.priceUnit ?? "€"}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {m.contactEmail && (
              <>
                <a
                  href={`mailto:${m.contactEmail}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" /> {m.contactEmail}
                </a>
                <CopyButton value={m.contactEmail} label={t("admin.leads.copy")} copiedLabel={t("admin.leads.copied")} />
              </>
            )}
            {m.contactPhone && (
              <>
                <a
                  href={`tel:${m.contactPhone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" /> {m.contactPhone}
                </a>
                <CopyButton value={m.contactPhone} label={t("admin.leads.copy")} copiedLabel={t("admin.leads.copied")} />
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Expanded work-panel: admin notes + partner matches + status quick-actions. */
function LeadDetailPanel({ lead }: { lead: AdminLead }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [notes, setNotes] = useState(lead.adminNotes ?? "");
  const [showMatches, setShowMatches] = useState(false);

  const notesMutation = useMutation({
    mutationFn: () => adminLeadService.update(lead.id, { adminNotes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
      toast.success(t("admin.leads.notesSaved"));
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  const statusMutation = useMutation({
    mutationFn: (status: AdminLeadStatus) => adminLeadService.update(lead.id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
      toast.success(t("admin.leads.statusUpdated"));
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  const quickActions: { status: AdminLeadStatus; labelKey: string }[] = [
    { status: "contacted", labelKey: "admin.leads.statusContacted" },
    { status: "quoted",    labelKey: "admin.leads.statusQuoted" },
    { status: "converted", labelKey: "admin.leads.statusConverted" },
    { status: "dismissed", labelKey: "admin.leads.statusDismissed" },
    { status: "unmatched", labelKey: "admin.leads.statusUnmatched" },
  ];

  return (
    <div className="space-y-4 bg-secondary/30 px-5 py-4">
      {/* Extra request context (present for concierge /request leads) */}
      {(lead.toCity || lead.needDate || lead.phone) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {lead.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="hover:text-foreground">{lead.phone}</a>
            </span>
          )}
          {lead.toCity && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {t("admin.leads.toCity")}: {lead.toCity}
            </span>
          )}
          {lead.needDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" /> {t("admin.leads.needDate")}: {new Date(lead.needDate).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Customer's free-text details — the core context for the manual match call */}
      {lead.details && (
        <p className="whitespace-pre-wrap rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground">
          {lead.details}
        </p>
      )}

      {/* Status quick-actions */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.quickStatus")}</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Button
              key={a.status}
              size="sm"
              variant={lead.status === a.status ? "default" : "outline"}
              className="h-9"
              disabled={statusMutation.isPending || lead.status === a.status}
              onClick={() => statusMutation.mutate(a.status)}
            >
              {t(a.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      {/* Admin notes */}
      <div>
        <label htmlFor={`lead-notes-${lead.id}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("admin.leads.notes")}
        </label>
        <textarea
          id={`lead-notes-${lead.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("admin.leads.notesPlaceholder")}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="mt-2 flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={notesMutation.isPending || notes === (lead.adminNotes ?? "")}
            onClick={() => notesMutation.mutate()}
          >
            {notesMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {t("admin.leads.saveNotes")}
          </Button>
          {!showMatches && (
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setShowMatches(true)}
            >
              <Users className="h-3.5 w-3.5" />
              {t("admin.leads.findPartners")}
            </Button>
          )}
        </div>
      </div>

      {/* Partner suggestions */}
      {showMatches && (
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.matchesTitle")}</span>
          <LeadMatches leadId={lead.id} />
        </div>
      )}
    </div>
  );
}

export default function AdminLeads() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AdminLeadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminLeads.list(statusFilter, page),
    queryFn: () => adminLeadService.list(statusFilter, page, LIMIT),
    staleTime: 30_000,
  });

  // Ops funnel metrics — whole-funnel numbers from the API (NOT derived from the
  // current page, which was misleading for anything beyond page 1).
  const { data: metrics } = useQuery({
    queryKey: queryKeys.adminLeads.metrics(),
    queryFn: () => adminLeadService.metrics(),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminLeadStatus }) =>
      adminLeadService.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

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

      {/* Ops metrics (whole funnel, from /admin/leads/metrics) */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("admin.leads.metricRequestsWeek")}
          value={metrics ? metrics.requestsThisWeek : "—"}
          sub={metrics ? t("admin.leads.metricRequests30dSub").replace("{count}", String(metrics.requests30d)) : undefined}
          icon={Megaphone}
        />
        <StatCard
          label={t("admin.leads.metricContactRate")}
          value={metrics ? pct(metrics.contactRate30d) : "—"}
          icon={TrendingUp}
        />
        <StatCard
          label={t("admin.leads.metricQuoteToBooking")}
          value={metrics ? pct(metrics.bookingRate30d) : "—"}
          sub={metrics ? t("admin.leads.metricQuotedSub").replace("{rate}", String(Math.round(metrics.quoteRate30d * 100))) : undefined}
          icon={CalendarCheck}
        />
        <StatCard
          label={t("admin.leads.metricFirstResponse")}
          value={metrics?.medianFirstResponseMinutes != null
            ? t("admin.leads.minutes").replace("{min}", String(Math.round(metrics.medianFirstResponseMinutes)))
            : "—"}
          icon={Timer}
        />
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
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    expanded={expandedId === lead.id}
                    onToggle={() => setExpandedId((cur) => (cur === lead.id ? null : lead.id))}
                    onStatusChange={(status) => updateMutation.mutate({ id: lead.id, status })}
                    statusPending={updateMutation.isPending}
                  />
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

function LeadRow({ lead, expanded, onToggle, onStatusChange, statusPending }: {
  lead: AdminLead;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: AdminLeadStatus) => void;
  statusPending: boolean;
}) {
  const { t } = useLanguage();
  return (
    <>
      <tr className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30">
        <td className="px-5 py-3.5 font-medium text-navy-ink">
          {lead.name ? <span className="block">{lead.name}</span> : null}
          <span className={lead.name ? "block text-xs font-normal text-muted-foreground" : ""}>{lead.email}</span>
          {lead.supplierName && (
            <span className="mt-0.5 block text-[11px] font-normal text-accent">→ {lead.supplierName}</span>
          )}
        </td>
        <td className="px-5 py-3.5 text-muted-foreground">
          {lead.city}
          {lead.toCity && <span className="block text-[11px]">→ {lead.toCity}</span>}
        </td>
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
            disabled={statusPending}
            aria-label={t("admin.leads.colStatus")}
            onChange={(e) => onStatusChange(e.target.value as AdminLeadStatus)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${STATUS_COLORS[lead.status] ?? STATUS_COLORS.new}`}
          >
            <option value="new">{t("admin.leads.statusNew")}</option>
            <option value="contacted">{t("admin.leads.statusContacted")}</option>
            <option value="quoted">{t("admin.leads.statusQuoted")}</option>
            <option value="converted">{t("admin.leads.statusConverted")}</option>
            <option value="dismissed">{t("admin.leads.statusDismissed")}</option>
            <option value="unmatched">{t("admin.leads.statusUnmatched")}</option>
          </select>
        </td>
        <td className="px-5 py-3.5">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              aria-expanded={expanded}
              onClick={onToggle}
            >
              {t("admin.leads.details")}
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={8} className="p-0">
            <LeadDetailPanel lead={lead} />
          </td>
        </tr>
      )}
    </>
  );
}
