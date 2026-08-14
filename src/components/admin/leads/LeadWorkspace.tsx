import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck, ChevronRight, Clock, Loader2, Mail, MapPin, Pencil, Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminLeadService,
  adminOfferService,
  type AdminLead,
  type AdminLeadStatus,
  type ProviderCandidate,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { serviceTypeLabel, SERVICE_TYPE_SLUGS, leadRequestedServices } from "@/lib/serviceTypes";
import { Button } from "@/components/ui/button";
import { LEAD_STATUS_STYLE } from "./leadStatusStyles";
import { LeadProviderStage } from "./LeadProviderStage";
import { LeadOfferStage } from "./LeadOfferStage";
import { LeadDeliveryReview } from "./LeadDeliveryReview";
import { LeadActivityTimeline } from "./LeadActivityTimeline";

// The concierge happy-path pipeline is now three clickable stages: converted is
// removed as a manual jump — only booking confirmation (LeadDeliveryReview) may
// move a lead to Converted (design §3 / §6). Converted is a read-only badge.
const PIPELINE: AdminLeadStatus[] = ["new", "contacted", "quoted"];
const TERMINAL: AdminLeadStatus[] = ["dismissed", "unmatched"];
const STATUS_LABEL_KEYS: Record<AdminLeadStatus, string> = {
  new: "admin.leads.statusNew",
  contacted: "admin.leads.statusContacted",
  quoted: "admin.leads.statusQuoted",
  converted: "admin.leads.statusConverted",
  dismissed: "admin.leads.statusDismissed",
  unmatched: "admin.leads.statusUnmatched",
};
// Category choices for the "Edit request" form: the wildcard plus the 7 canonical
// service slugs the backend accepts (ServiceCategories + "any").
const CATEGORY_OPTIONS = ["any", ...SERVICE_TYPE_SLUGS] as const;

function PanelHeading({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</span>;
}

/**
 * Lead workspace (design §3 / §7) — the expanded lead is a guided three-stage
 * cockpit: a header (age / service / route / date / SLA), the status pipeline
 * (converted excluded — booking confirmation owns that transition), lead facts
 * with contact shortcuts and inline request editing, then the three numbered
 * stages (find & contact providers → build customer options → review & send)
 * and the derived activity timeline. Orchestration and shared query
 * invalidation live here; AdminLeads keeps metrics/filters/pagination/expansion.
 */
export function LeadWorkspace({ lead }: { lead: AdminLead }) {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const [notes, setNotes] = useState(lead.adminNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [candidateToAdd, setCandidateToAdd] = useState<ProviderCandidate | null>(null);

  // The date <input> wants "yyyy-MM-dd"; the API returns an ISO instant.
  const leadEditSeed = () => ({
    name:     lead.name ?? "",
    email:    lead.email ?? "",
    phone:    lead.phone ?? "",
    category: lead.category ?? "any",
    city:     lead.city ?? "",
    toCity:   lead.toCity ?? "",
    needDate: lead.needDate ? new Date(lead.needDate).toISOString().slice(0, 10) : "",
    details:  lead.details ?? "",
  });
  const [edit, setEdit] = useState(leadEditSeed);

  const outreachQuery = useQuery({
    queryKey: queryKeys.adminLeads.outreach(lead.id),
    queryFn: () => adminOfferService.listOutreach(lead.id),
    staleTime: 30_000,
  });
  const offersQuery = useQuery({
    queryKey: queryKeys.adminLeads.offers(lead.id),
    queryFn: () => adminOfferService.listForLead(lead.id),
    staleTime: 30_000,
  });
  const outreachRows = outreachQuery.data ?? [];
  const offers = offersQuery.data ?? [];
  // Timeline lifecycle follows the newest offer for this lead.
  const primaryOffer = useMemo(
    () => [...offers].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0],
    [offers],
  );

  /** What this request is actually FOR.
   *
   *  `lead.category` is the wildcard "any" whenever the visitor picked more than
   *  one service — which the intake copy explicitly invites — so the header used
   *  to read "Service" for exactly the requests that need the most thought. The
   *  real pick survives in the query machine summary; the provider email already
   *  reads it back, and now so does the operator. */
  const serviceHeading = useMemo(() => {
    const requested = leadRequestedServices(lead.query);
    return requested.length > 0
      ? requested.map((slug) => serviceTypeLabel(t, slug)).join(" + ")
      : serviceTypeLabel(t, lead.category);
  }, [lead.query, lead.category, t]);

  const ageLabel = useMemo(() => {
    const days = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000);
    try {
      return new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(-days, "day");
    } catch {
      return new Date(lead.createdAt).toLocaleDateString();
    }
  }, [lead.createdAt, language]);

  // ── Mutations ──
  const notesMutation = useMutation({
    mutationFn: () => adminLeadService.update(lead.id, { adminNotes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
      toast.success(t("admin.leads.notesSaved"));
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  const editMutation = useMutation({
    mutationFn: (body: Record<string, string>) => adminLeadService.update(lead.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
      setEditing(false);
      toast.success(t("admin.leads.editSaved"));
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

  // PATCH only the fields the admin actually changed (partial update).
  const submitEdit = () => {
    const seed = leadEditSeed();
    const body: Record<string, string> = {};
    (Object.keys(seed) as (keyof typeof seed)[]).forEach((k) => {
      const value = edit[k].trim();
      if (value !== seed[k]) body[k] = value;
    });
    if (Object.keys(body).length === 0) { setEditing(false); return; }
    editMutation.mutate(body);
  };
  const openEdit = () => { setEdit(leadEditSeed()); setEditing(true); };
  const setEditField = (k: keyof ReturnType<typeof leadEditSeed>, v: string) =>
    setEdit((prev) => ({ ...prev, [k]: v }));

  const invalidateOffers = () => qc.invalidateQueries({ queryKey: queryKeys.adminLeads.offers(lead.id) });

  return (
    <div className="space-y-5 bg-secondary/30 px-5 py-4">
      {/* ── Header: lead age / service / route / date / SLA ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <span className="font-display font-semibold text-navy-ink">{serviceHeading}</span>
        <span className="inline-flex min-w-0 items-center gap-1.5 break-words text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />{lead.city}{lead.toCity ? ` → ${lead.toCity}` : ""}
        </span>
        {lead.needDate ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CalendarCheck className="h-3.5 w-3.5" />{new Date(lead.needDate).toLocaleDateString()}
          </span>
        ) : (
          /* A dateless request used to render NOTHING here, so it looked exactly
             like a dated one — and a missing date is the single most common
             reason a provider cannot quote. Name the gap where the operator
             decides what to do next. */
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-warning-text">
            <CalendarCheck className="h-3.5 w-3.5" />{t("admin.leads.noDate")}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />{ageLabel}
        </span>
        {lead.status === "new" && (
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-warning-text">
            {t("admin.leads.filterNeedsResponse")}
          </span>
        )}
      </div>

      {/* ── Status pipeline chips (converted is read-only) ── */}
      <div>
        <PanelHeading>{t("admin.leads.quickStatus")}</PanelHeading>
        <div className="mt-1.5 flex flex-wrap items-center gap-y-2">
          {PIPELINE.map((s, i) => (
            <span key={s} className="flex items-center">
              {i > 0 && <ChevronRight className="mx-0.5 h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />}
              <button
                type="button"
                disabled={statusMutation.isPending || lead.status === s}
                aria-pressed={lead.status === s}
                onClick={() => statusMutation.mutate(s)}
                className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  lead.status === s
                    ? "bg-navy-ink text-white"
                    : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {t(STATUS_LABEL_KEYS[s])}
              </button>
            </span>
          ))}
          <ChevronRight className="mx-0.5 h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
          {/* Converted: read-only outcome — only booking confirmation sets it. */}
          <span
            title={t("admin.leads.confirmBookingBody")}
            className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
              lead.status === "converted"
                ? `${LEAD_STATUS_STYLE.converted.badge} ring-1 ring-border`
                : "border border-dashed border-border bg-card text-muted-foreground/60"
            }`}
          >
            {(() => { const Icon = LEAD_STATUS_STYLE.converted.icon; return <Icon className="h-3.5 w-3.5" aria-hidden />; })()}
            {t(STATUS_LABEL_KEYS.converted)}
          </span>
          <span className="mx-2 h-5 w-px bg-border" aria-hidden />
          {TERMINAL.map((s) => {
            const Icon = LEAD_STATUS_STYLE[s].icon;
            return (
              <button
                key={s}
                type="button"
                disabled={statusMutation.isPending || lead.status === s}
                aria-pressed={lead.status === s}
                onClick={() => statusMutation.mutate(s)}
                className={`mr-1.5 min-h-[36px] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  lead.status === s
                    ? `${LEAD_STATUS_STYLE[s].badge} ring-1 ring-border`
                    : "border border-border bg-card text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t(STATUS_LABEL_KEYS[s])}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lead facts + contact shortcuts (tel:/mailto:) ── */}
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <a href={`mailto:${lead.email}`} className="break-all hover:text-foreground">{lead.email}</a>
        </span>
        {lead.phone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="hover:text-foreground">{lead.phone}</a>
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium uppercase">
          {lead.language}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto h-8 gap-1.5 px-2.5 text-xs"
          aria-expanded={editing}
          onClick={() => (editing ? setEditing(false) : openEdit())}
        >
          <Pencil className="h-3 w-3" />
          {t("admin.leads.editRequest")}
        </Button>
      </div>

      {/* ── Edit-request form ── */}
      {editing && (
        <div className="rounded-xl border border-border bg-card p-4">
          <PanelHeading>{t("admin.leads.editRequest")}</PanelHeading>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editName")}
              <input type="text" value={edit.name} onChange={(e) => setEditField("name", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editEmail")}
              <input type="email" value={edit.email} onChange={(e) => setEditField("email", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editPhone")}
              <input type="text" value={edit.phone} onChange={(e) => setEditField("phone", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editCategory")}
              <select value={edit.category} onChange={(e) => setEditField("category", e.target.value)} className="mt-1 h-9 w-full cursor-pointer rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent">
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c === "any" ? t("admin.leads.editCategoryAny") : serviceTypeLabel(t, c)}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editCity")}
              <input type="text" value={edit.city} onChange={(e) => setEditField("city", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.toCity")}
              <input type="text" value={edit.toCity} onChange={(e) => setEditField("toCity", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.needDate")}
              <input type="date" value={edit.needDate} onChange={(e) => setEditField("needDate", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </label>
          </div>
          <label className="mt-3 block text-xs font-medium text-muted-foreground">
            {t("admin.leads.editDetails")}
            <textarea value={edit.details} rows={3} onChange={(e) => setEditField("details", e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
          </label>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90" disabled={editMutation.isPending} onClick={submitEdit}>
              {editMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("admin.leads.editSave")}
            </Button>
            <Button size="sm" variant="outline" className="h-9" disabled={editMutation.isPending} onClick={() => setEditing(false)}>
              {t("admin.leads.editCancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Customer's free-text details — the core context for the manual match call */}
      {lead.details && (
        <p className="whitespace-pre-wrap rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground">
          {lead.details}
        </p>
      )}

      {/* ── Offer panel — the three numbered stages read top-to-bottom as
             full-width bands separated by dividers (design §C). Each stage owns
             its band; only leaf rows (options, outreach) are cards, so nothing
             is a card nested inside another card. ── */}
      <div>
        <PanelHeading>{t("admin.leads.offerTitle")}</PanelHeading>
        <div className="mt-2 space-y-5">
          <LeadProviderStage
            lead={lead}
            onAddCandidate={(candidate) => setCandidateToAdd(candidate)}
            onOutreachComplete={() => {
              qc.invalidateQueries({ queryKey: queryKeys.adminLeads.outreach(lead.id) });
              qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
            }}
          />
          <LeadOfferStage
            lead={lead}
            offers={offers}
            outreachRows={outreachRows}
            candidateToAdd={candidateToAdd}
            onCandidateConsumed={() => setCandidateToAdd(null)}
            onOffersChanged={invalidateOffers}
          />
          <LeadDeliveryReview
            lead={lead}
            offers={offers}
            onOffersChanged={invalidateOffers}
          />
        </div>
      </div>

      {/* ── Admin notes ── */}
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
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-9"
          disabled={notesMutation.isPending || notes === (lead.adminNotes ?? "")}
          onClick={() => notesMutation.mutate()}
        >
          {notesMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t("admin.leads.saveNotes")}
        </Button>
      </div>

      {/* ── Activity timeline (derived from timestamps) ── */}
      <LeadActivityTimeline lead={lead} outreachRows={outreachRows} offer={primaryOffer} />
    </div>
  );
}
