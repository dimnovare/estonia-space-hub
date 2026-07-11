import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminLeadService,
  adminOfferService,
  type AdminLead,
  type AdminLeadStatus,
  type AdminLeadMatch,
  type AdminOffer,
  type OfferOptionInput,
  type OutreachStatus,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { serviceTypeLabel, SERVICE_TYPE_SLUGS } from "@/lib/serviceTypes";
import { toast } from "sonner";
import {
  Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Megaphone,
  TrendingUp, Timer, CalendarCheck, Copy, Mail, Phone, MapPin, Send,
  Plus, ArrowUp, ArrowDown, Trash2, Eye, ExternalLink, Clock, CheckCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// The concierge pipeline order (spec §5 Admin UI): the four happy-path stages,
// then the two terminal outcomes. Clicking a chip moves the lead there.
const PIPELINE: AdminLeadStatus[] = ["new", "contacted", "quoted", "converted"];
const TERMINAL: AdminLeadStatus[] = ["dismissed", "unmatched"];
const STATUS_LABEL_KEYS: Record<AdminLeadStatus, string> = {
  new: "admin.leads.statusNew",
  contacted: "admin.leads.statusContacted",
  quoted: "admin.leads.statusQuoted",
  converted: "admin.leads.statusConverted",
  dismissed: "admin.leads.statusDismissed",
  unmatched: "admin.leads.statusUnmatched",
};

const OUTREACH_STATUSES: OutreachStatus[] = ["sent", "replied", "declined", "noanswer"];

// Category choices for the "Edit request" form: the wildcard plus the 7 canonical
// service slugs the backend accepts (ServiceCategories + "any").
const CATEGORY_OPTIONS = ["any", ...SERVICE_TYPE_SLUGS] as const;

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

/** Small section heading used across the workspace panels. */
function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</span>
  );
}

// ── Offer-builder local editing model ────────────────────────────────────────
interface EditableOption {
  localId: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierLocationId: string | null;
  title: string;
  price: string;    // free text; parsed on save
  priceUnit: string;
  notes: string;
}

let localSeq = 0;
const nextLocalId = () => `opt-local-${++localSeq}`;

function toEditable(o: AdminOffer["options"][number]): EditableOption {
  return {
    localId: o.id || nextLocalId(),
    supplierId: o.supplierId,
    supplierName: o.supplierName,
    supplierLocationId: o.supplierLocationId,
    title: o.title ?? "",
    price: o.priceAmount != null ? String(o.priceAmount) : "",
    priceUnit: o.priceUnit ?? "",
    notes: o.notes ?? "",
  };
}

function matchToEditable(m: AdminLeadMatch): EditableOption {
  return {
    localId: nextLocalId(),
    supplierId: m.supplierId,
    supplierName: m.supplierName,
    supplierLocationId: null,
    title: m.listingTitle ?? m.supplierName,
    price: m.price != null ? String(m.price) : "",
    priceUnit: m.priceUnit ?? "",
    notes: "",
  };
}

function parsePrice(s: string): number | null {
  const v = parseFloat(s.replace(",", ".").trim());
  return Number.isFinite(v) ? v : null;
}

function toInput(o: EditableOption, index: number): OfferOptionInput {
  return {
    title: o.title.trim(),
    supplierId: o.supplierId ?? undefined,
    supplierLocationId: o.supplierLocationId ?? undefined,
    priceAmount: parsePrice(o.price),
    priceUnit: o.priceUnit.trim() || null,
    notes: o.notes.trim() || null,
    sortOrder: index,
  };
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Lead workspace (overhaul spec §5 Admin UI) — the expanded detail row is the
 * concierge cockpit: status pipeline chips, lead facts + contact shortcuts,
 * outreach panel (matches with checkboxes → "Ask availability" + sent rows
 * with status dropdowns), offer builder (options → save → preview → send →
 * Sent/Viewed/Chosen timestamps) and the derived activity timeline.
 * Endpoint contract: overhaul spec §5.1 (as built).
 */
function LeadWorkspace({ lead }: { lead: AdminLead }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [notes, setNotes] = useState(lead.adminNotes ?? "");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  // ── Edit-request form (correct the customer's submission) ──
  // The date <input> wants "yyyy-MM-dd"; the API returns an ISO instant. toISOString
  // reads the UTC calendar date the backend stored (it normalizes to UTC midnight).
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
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState(leadEditSeed);

  // ── Offer builder state (edit buffer over the latest server offer) ──
  const [options, setOptions] = useState<EditableOption[]>([]);
  const [customerNote, setCustomerNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  // ── Queries ──
  const matchesQuery = useQuery<AdminLeadMatch[]>({
    queryKey: queryKeys.adminLeads.matches(lead.id),
    queryFn: () => adminLeadService.matches(lead.id),
    staleTime: 60_000,
  });
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
  const offer = useMemo(() => {
    const list = offersQuery.data ?? [];
    return [...list].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
  }, [offersQuery.data]);
  // A chosen offer is immutable (PATCH → 409) — lock the editor.
  const locked = offer?.status === "chosen";

  // Reset the edit buffer when a different offer arrives (create/refresh);
  // refetches of the SAME offer never clobber in-progress edits.
  useEffect(() => {
    if (!offer) { setOptions([]); setCustomerNote(""); setDirty(false); return; }
    setOptions(offer.options.map(toEditable));
    setCustomerNote(offer.customerNote ?? "");
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer?.id]);

  // ── Mutations ──
  const notesMutation = useMutation({
    mutationFn: () => adminLeadService.update(lead.id, { adminNotes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
      toast.success(t("admin.leads.notesSaved"));
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  // Request-field corrections. Invalidating the adminLeads root refetches the list
  // (the workspace re-renders from the fresh lead) AND the per-lead detail queries
  // (matches/outreach/offers) whose keys share the "admin-leads" prefix — a fixed
  // category re-runs the match suggestions.
  const editMutation = useMutation({
    mutationFn: (body: Record<string, string>) => adminLeadService.update(lead.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
      setEditing(false);
      toast.success(t("admin.leads.editSaved"));
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  // PATCH only the fields the admin actually changed (partial update; the backend
  // treats an omitted field as unchanged). needDate/email/category are validated
  // server-side. No-op edits just close the form.
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

  const statusMutation = useMutation({
    mutationFn: (status: AdminLeadStatus) => adminLeadService.update(lead.id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
      toast.success(t("admin.leads.statusUpdated"));
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  const outreachMutation = useMutation({
    mutationFn: (supplierIds: string[]) => adminOfferService.outreach(lead.id, supplierIds),
    onSuccess: (res) => {
      toast.success(
        t("admin.leads.outreachSentToast")
          .replace("{sent}", String(res.sent?.length ?? 0))
          .replace("{skipped}", String(res.skipped?.length ?? 0)),
      );
      setSelectedSuppliers(new Set());
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.outreach(lead.id) });
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() }); // lead auto → contacted
    },
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  const outreachUpdateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status?: OutreachStatus; note?: string }) =>
      adminOfferService.updateOutreach(id, { status, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminLeads.outreach(lead.id) }),
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  const createOfferMutation = useMutation({
    mutationFn: (seed?: OfferOptionInput[]) =>
      adminOfferService.create(lead.id, seed?.length ? { options: seed } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminLeads.offers(lead.id) }),
    onError: (err: Error) => toast.error(err?.message || t("toast.error")),
  });

  // The customer left our workspace open and chose an option → the offer is now
  // immutable server-side (PATCH/send → 409). Re-sync the cached offer so the
  // editor locks and the Chosen badge/timestamps appear instead of silently
  // failing on every retry. Used by both save and send onError.
  const refreshOnConflict = (err: Error & { status?: number }) => {
    if (err?.status === 409) {
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.offers(lead.id) });
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
    }
  };

  // customerNote is sent as a trimmed string (NOT `|| null`): the backend
  // treats null as "unchanged" but Clamp("") → null, so an empty string is the
  // ONLY way to clear a previously-saved note. `|| null` made deletion
  // impossible (the old note resurrected from the response).
  const offerPatchBody = () => ({
    customerNote: customerNote.trim(),
    options: options.filter((o) => o.title.trim()).map(toInput),
  });

  const saveOfferMutation = useMutation({
    mutationFn: () => adminOfferService.update(offer!.id, offerPatchBody()),
    onSuccess: (updated) => {
      toast.success(t("admin.leads.offerSaved"));
      setDirty(false);
      setOptions(updated.options.map(toEditable));
      setCustomerNote(updated.customerNote ?? "");
      qc.setQueryData(queryKeys.adminLeads.offers(lead.id), (prev: AdminOffer[] | undefined) =>
        (prev ?? []).map((o) => (o.id === updated.id ? updated : o)));
    },
    onError: (err: Error & { status?: number }) => {
      refreshOnConflict(err);
      toast.error(err?.message || t("toast.error"));
    },
  });

  const sendOfferMutation = useMutation({
    mutationFn: async () => {
      // Always persist the current buffer first (replace-set), then send.
      await adminOfferService.update(offer!.id, offerPatchBody());
      return adminOfferService.send(offer!.id);
    },
    onSuccess: (sent) => {
      toast.success(t("admin.leads.offerSentToast"));
      setConfirmSend(false);
      setDirty(false);
      qc.setQueryData(queryKeys.adminLeads.offers(lead.id), (prev: AdminOffer[] | undefined) =>
        (prev ?? []).map((o) => (o.id === sent.id ? sent : o)));
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.offers(lead.id) });
      qc.invalidateQueries({ queryKey: queryKeys.adminLeads.root() }); // lead auto → quoted
    },
    onError: (err: Error & { status?: number }) => {
      setConfirmSend(false);
      refreshOnConflict(err);
      toast.error(err?.message || t("toast.error"));
    },
  });

  // ── Helpers ──
  const matches = matchesQuery.data ?? [];
  const outreachRows = outreachQuery.data ?? [];
  const validOptionCount = options.filter((o) => o.title.trim()).length;

  const toggleSupplier = (id: string) =>
    setSelectedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const mutateOptions = (updater: (prev: EditableOption[]) => EditableOption[]) => {
    setOptions(updater);
    setDirty(true);
  };

  const addFromMatch = (m: AdminLeadMatch) => {
    if (!offer) {
      // No draft yet — create one seeded with this match (create accepts options).
      createOfferMutation.mutate([toInput(matchToEditable(m), 0)]);
    } else if (!locked) {
      mutateOptions((prev) => [...prev, matchToEditable(m)]);
    }
  };

  const moveOption = (index: number, dir: -1 | 1) =>
    mutateOptions((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const updateOption = (localId: string, patch: Partial<EditableOption>) =>
    mutateOptions((prev) => prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p)));

  // ── Activity timeline (derived from timestamps; spec §5 Admin UI) ──
  const timeline = useMemo(() => {
    const events: { at: string; label: string }[] = [
      { at: lead.createdAt, label: t("admin.leads.timeline.created") },
      ...outreachRows.map((r) => ({
        at: r.sentAt,
        label: t("admin.leads.timeline.outreach").replace("{name}", r.supplierName ?? r.sentTo),
      })),
    ];
    if (offer) {
      events.push({ at: offer.createdAt, label: t("admin.leads.timeline.offerCreated") });
      if (offer.sentAt)   events.push({ at: offer.sentAt,   label: t("admin.leads.timeline.offerSent") });
      if (offer.viewedAt) events.push({ at: offer.viewedAt, label: t("admin.leads.timeline.offerViewed") });
      if (offer.chosenAt) events.push({ at: offer.chosenAt, label: t("admin.leads.timeline.offerChosen") });
    }
    return events.filter((e) => !!e.at).sort((a, b) => a.at.localeCompare(b.at));
  }, [lead.createdAt, outreachRows, offer, t]);

  const offerPagePath = offer ? `/${offer.language || lead.language || "et"}/offer/${offer.token}` : null;
  // Absolute URL to copy/share (the public offer page lives on the prod site).
  const offerFullUrl = offerPagePath
    ? `${typeof window !== "undefined" ? window.location.origin : "https://ruumly.eu"}${offerPagePath}`
    : null;

  return (
    <div className="space-y-5 bg-secondary/30 px-5 py-4">
      {/* ── Status pipeline chips ── */}
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
          <span className="mx-2 h-5 w-px bg-border" aria-hidden />
          {TERMINAL.map((s) => (
            <button
              key={s}
              type="button"
              disabled={statusMutation.isPending || lead.status === s}
              aria-pressed={lead.status === s}
              onClick={() => statusMutation.mutate(s)}
              className={`mr-1.5 min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                lead.status === s
                  ? `${STATUS_COLORS[s]} ring-1 ring-border`
                  : "border border-border bg-card text-muted-foreground hover:border-destructive/50 hover:text-destructive"
              }`}
            >
              {t(STATUS_LABEL_KEYS[s])}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lead facts + contact shortcuts (tel:/mailto:) ── */}
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          <a href={`mailto:${lead.email}`} className="hover:text-foreground">{lead.email}</a>
        </span>
        {lead.phone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="hover:text-foreground">{lead.phone}</a>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {lead.city}{lead.toCity ? ` → ${lead.toCity}` : ""}
        </span>
        {lead.needDate && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" /> {t("admin.leads.needDate")}: {new Date(lead.needDate).toLocaleDateString()}
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

      {/* ── Edit-request form (correct what the customer submitted) ── */}
      {editing && (
        <div className="rounded-xl border border-border bg-card p-4">
          <PanelHeading>{t("admin.leads.editRequest")}</PanelHeading>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editName")}
              <input
                type="text"
                value={edit.name}
                onChange={(e) => setEditField("name", e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editEmail")}
              <input
                type="email"
                value={edit.email}
                onChange={(e) => setEditField("email", e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editPhone")}
              <input
                type="text"
                value={edit.phone}
                onChange={(e) => setEditField("phone", e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editCategory")}
              <select
                value={edit.category}
                onChange={(e) => setEditField("category", e.target.value)}
                className="mt-1 h-9 w-full cursor-pointer rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === "any" ? t("admin.leads.editCategoryAny") : serviceTypeLabel(t, c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.editCity")}
              <input
                type="text"
                value={edit.city}
                onChange={(e) => setEditField("city", e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.toCity")}
              <input
                type="text"
                value={edit.toCity}
                onChange={(e) => setEditField("toCity", e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("admin.leads.needDate")}
              <input
                type="date"
                value={edit.needDate}
                onChange={(e) => setEditField("needDate", e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs font-medium text-muted-foreground">
            {t("admin.leads.editDetails")}
            <textarea
              value={edit.details}
              rows={3}
              onChange={(e) => setEditField("details", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              className="h-9 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={editMutation.isPending}
              onClick={submitEdit}
            >
              {editMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("admin.leads.editSave")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              disabled={editMutation.isPending}
              onClick={() => setEditing(false)}
            >
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

      {/* ── Two-column work area: outreach (left) + offer builder (right) ── */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Outreach panel */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PanelHeading>{t("admin.leads.outreachTitle")}</PanelHeading>
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={selectedSuppliers.size === 0 || outreachMutation.isPending}
              onClick={() => outreachMutation.mutate([...selectedSuppliers])}
            >
              {outreachMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />}
              {t("admin.leads.askAvailability")}
              {selectedSuppliers.size > 0 && ` (${selectedSuppliers.size})`}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("admin.leads.askAvailabilityHint")}</p>

          {/* Suggested partners with selection checkboxes */}
          {matchesQuery.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("admin.leads.findPartners")}…
            </div>
          ) : matches.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">{t("admin.leads.matchesEmpty")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {matches.map((m) => {
                const hasEmail = !!m.contactEmail;
                return (
                  <li
                    key={`${m.supplierId}-${m.listingId ?? "directory"}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-background p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      aria-label={m.supplierName}
                      className="h-4 w-4 shrink-0 accent-[hsl(var(--accent))]"
                      disabled={!hasEmail}
                      checked={selectedSuppliers.has(m.supplierId)}
                      onChange={() => toggleSupplier(m.supplierId)}
                    />
                    <div className="min-w-[140px] flex-1">
                      <div className="font-medium text-navy-ink">{m.supplierName}</div>
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
                          {m.price != null && <span> · {m.price} {m.priceUnit ?? "€"}</span>}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        {hasEmail ? (
                          <>
                            <a href={`mailto:${m.contactEmail}`} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
                              <Mail className="h-3 w-3" /> {m.contactEmail}
                            </a>
                            <CopyButton value={m.contactEmail} label={t("admin.leads.copy")} copiedLabel={t("admin.leads.copied")} />
                          </>
                        ) : (
                          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                            {t("admin.leads.noEmail")}
                          </span>
                        )}
                        {m.contactPhone && (
                          <a href={`tel:${m.contactPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
                            <Phone className="h-3 w-3" /> {m.contactPhone}
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 px-2.5 text-xs"
                      disabled={createOfferMutation.isPending || locked}
                      onClick={() => addFromMatch(m)}
                    >
                      <Plus className="h-3 w-3" />
                      {t("admin.leads.offerAddFromMatch")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Sent outreach rows with manual status dropdowns */}
          <div className="mt-4 border-t border-border pt-3">
            {outreachRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("admin.leads.outreachEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {outreachRows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="min-w-[140px] flex-1">
                      <div className="font-medium text-navy-ink">{r.supplierName ?? r.sentTo}</div>
                      <div className="text-xs text-muted-foreground">{r.sentTo} · {fmtDateTime(r.sentAt)}</div>
                    </div>
                    <select
                      value={r.status}
                      aria-label={t("admin.leads.colStatus")}
                      disabled={outreachUpdateMutation.isPending}
                      onChange={(e) => outreachUpdateMutation.mutate({ id: r.id, status: e.target.value as OutreachStatus })}
                      className="cursor-pointer rounded-full border-0 bg-secondary px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {OUTREACH_STATUSES.map((s) => (
                        <option key={s} value={s}>{t(`admin.leads.outreachStatus.${s}`)}</option>
                      ))}
                    </select>
                    <div className="flex w-full items-center gap-1.5 sm:w-auto">
                      <input
                        type="text"
                        placeholder={t("admin.leads.outreachNotePlaceholder")}
                        value={noteDrafts[r.id] ?? r.note ?? ""}
                        onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        className="h-8 w-full min-w-[120px] rounded-md border border-border bg-card px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent sm:w-[160px]"
                      />
                      {noteDrafts[r.id] != null && noteDrafts[r.id] !== (r.note ?? "") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs"
                          disabled={outreachUpdateMutation.isPending}
                          onClick={() => outreachUpdateMutation.mutate({ id: r.id, note: noteDrafts[r.id] })}
                        >
                          {t("admin.leads.save")}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Offer builder */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PanelHeading>{t("admin.leads.offerTitle")}</PanelHeading>
              {offer && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  offer.status === "chosen" ? "bg-success/10 text-success"
                  : offer.status === "sent" || offer.status === "viewed" ? "bg-accent/10 text-accent"
                  : "bg-secondary text-muted-foreground"
                }`}>
                  {t(`admin.leads.offerStatus.${offer.status}`)}
                </span>
              )}
            </div>
            {/* Draft → a real preview link is safe (public GET 404s a draft, so
                it can't flip Viewed). Once SENT, the first public GET stamps
                Viewed/ViewedAt with no admin distinction — an admin opening it
                would fabricate the customer read-receipt the ops loop trusts.
                So for sent/viewed/chosen, copy the URL instead of navigating.
                Content can still be checked via the inline preview below. */}
            {offer && offerFullUrl && (
              offer.status === "draft" ? (
                <a
                  href={offerPagePath!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("admin.leads.offerOpenPage")}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(offerFullUrl);
                      toast.success(t("admin.leads.copied"));
                    } catch { /* clipboard unavailable (e.g. http) */ }
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <Copy className="h-3 w-3" />
                  {t("admin.leads.offerCopyLink")}
                </button>
              )
            )}
          </div>

          {!offer ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">{t("admin.leads.offerEmpty")}</p>
              <Button
                size="sm"
                className="mt-3 h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={createOfferMutation.isPending}
                onClick={() => createOfferMutation.mutate(undefined)}
              >
                {createOfferMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Plus className="h-3.5 w-3.5" />}
                {t("admin.leads.offerCreate")}
              </Button>
            </div>
          ) : (
            <>
              {/* Sent / Viewed / Chosen timestamps after send */}
              {(offer.sentAt || offer.viewedAt || offer.chosenAt) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {offer.sentAt && (
                    <span className="inline-flex items-center gap-1">
                      <Send className="h-3 w-3" /> {t("admin.leads.offerStatus.sent")}: {fmtDateTime(offer.sentAt)}
                    </span>
                  )}
                  {offer.viewedAt && (
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {t("admin.leads.offerStatus.viewed")}: {fmtDateTime(offer.viewedAt)}
                    </span>
                  )}
                  {offer.chosenAt && (
                    <span className="inline-flex items-center gap-1 font-medium text-success">
                      <CheckCircle className="h-3 w-3" /> {t("admin.leads.offerStatus.chosen")}: {fmtDateTime(offer.chosenAt)}
                    </span>
                  )}
                </div>
              )}

              {/* Option editors */}
              <div className="mt-3 space-y-3">
                {options.map((o, i) => (
                  <div key={o.localId} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          aria-label={t("admin.leads.offerOptionTitle")}
                          placeholder={t("admin.leads.offerOptionTitle")}
                          value={o.title}
                          disabled={locked}
                          onChange={(e) => updateOption(o.localId, { title: e.target.value })}
                          className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                        />
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={t("admin.leads.offerPrice")}
                            placeholder={t("admin.leads.offerPrice")}
                            value={o.price}
                            disabled={locked}
                            onChange={(e) => updateOption(o.localId, { price: e.target.value })}
                            className="h-9 w-[110px] rounded-md border border-border bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                          />
                          <input
                            type="text"
                            aria-label={t("admin.leads.offerPriceUnit")}
                            placeholder={t("admin.leads.offerPriceUnit")}
                            value={o.priceUnit}
                            disabled={locked}
                            onChange={(e) => updateOption(o.localId, { priceUnit: e.target.value })}
                            className="h-9 w-[140px] rounded-md border border-border bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                          />
                          {o.supplierName && (
                            <span className="inline-flex h-9 items-center rounded-md bg-secondary px-2.5 text-xs font-medium text-muted-foreground">
                              {o.supplierName}
                            </span>
                          )}
                        </div>
                        <textarea
                          aria-label={t("admin.leads.offerNotes")}
                          placeholder={t("admin.leads.offerNotes")}
                          value={o.notes}
                          rows={2}
                          disabled={locked}
                          onChange={(e) => updateOption(o.localId, { notes: e.target.value })}
                          className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                        />
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          aria-label={t("admin.leads.offerMoveUp")}
                          disabled={i === 0 || locked}
                          onClick={() => moveOption(i, -1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("admin.leads.offerMoveDown")}
                          disabled={i === options.length - 1 || locked}
                          onClick={() => moveOption(i, 1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("admin.leads.offerRemoveOption")}
                          disabled={locked}
                          onClick={() => mutateOptions((prev) => prev.filter((p) => p.localId !== o.localId))}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-9 gap-1.5"
                disabled={locked}
                onClick={() => mutateOptions((prev) => [...prev, {
                  localId: nextLocalId(), supplierId: null, supplierName: null,
                  supplierLocationId: null, title: "", price: "", priceUnit: "", notes: "",
                }])}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("admin.leads.offerAddOption")}
              </Button>

              {/* Customer note */}
              <div className="mt-3">
                <label htmlFor={`offer-note-${lead.id}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("admin.leads.offerCustomerNote")}
                </label>
                <textarea
                  id={`offer-note-${lead.id}`}
                  value={customerNote}
                  rows={2}
                  disabled={locked}
                  onChange={(e) => { setCustomerNote(e.target.value); setDirty(true); }}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                />
              </div>

              {/* Actions: save / preview / send (with confirm) */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={saveOfferMutation.isPending || !dirty || locked}
                  onClick={() => saveOfferMutation.mutate()}
                >
                  {saveOfferMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {t("admin.leads.offerSave")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5"
                  aria-pressed={showPreview}
                  onClick={() => setShowPreview((v) => !v)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t("admin.leads.offerPreview")}
                </Button>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={sendOfferMutation.isPending || locked}
                  onClick={() => {
                    if (validOptionCount === 0) { toast.error(t("admin.leads.offerNoOptions")); return; }
                    setConfirmSend(true);
                  }}
                >
                  {sendOfferMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                  {t("admin.leads.offerSend")}
                </Button>
              </div>

              {/* Live customer-facing preview — reuses the public page copy. */}
              {showPreview && (
                <div className="mt-4 rounded-lg border border-dashed border-border bg-background p-4">
                  <p className="font-display text-base font-bold text-navy-ink">
                    {t("offer.title")
                      .replace("{category}", serviceTypeLabel(t, lead.category))
                      .replace("{city}", lead.city)}
                  </p>
                  {customerNote.trim() && (
                    <p className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/60 px-3 py-2 text-xs text-foreground">{customerNote}</p>
                  )}
                  <div className="mt-3 space-y-2">
                    {options.filter((o) => o.title.trim()).map((o) => (
                      <div key={o.localId} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold text-foreground">{o.title}</span>
                          {parsePrice(o.price) != null && (
                            <span className="shrink-0 font-display text-sm font-extrabold text-navy-ink">
                              €{parsePrice(o.price)}{o.priceUnit && <span className="ml-1 text-xs font-medium text-muted-foreground">{o.priceUnit}</span>}
                            </span>
                          )}
                        </div>
                        {o.supplierName && <p className="mt-0.5 text-xs text-muted-foreground">{o.supplierName}</p>}
                        {o.notes.trim() && <p className="mt-1 text-xs text-muted-foreground">{o.notes}</p>}
                        <span className="mt-2 inline-flex rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                          {t("offer.choose")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Admin notes (existing) ── */}
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
      <div>
        <PanelHeading>{t("admin.leads.timelineTitle")}</PanelHeading>
        <ol className="ml-1 mt-2 space-y-1.5 border-l-2 border-border pl-4">
          {timeline.map((e, i) => (
            <li key={`${e.at}-${i}`} className="relative text-sm text-foreground">
              <span aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-teal-deep ring-2 ring-card" />
              <span className="mr-2 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden />
                {fmtDateTime(e.at)}
              </span>
              {e.label}
            </li>
          ))}
        </ol>
      </div>

      {/* Send confirmation */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.leads.offerSendConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.leads.offerSendConfirmBody").replace("{count}", String(validOptionCount))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("offer.confirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => sendOfferMutation.mutate()}
            >
              {t("admin.leads.offerSend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminLeads() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AdminLeadStatus | "all">("all");
  const [conciergeOnly, setConciergeOnly] = useState(false);
  const [needsResponse, setNeedsResponse] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("any");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Optional GetLeads filters (source/category/city/needsResponse). Guarded so
  // nothing breaks if the backend ignores a param it doesn't support yet.
  const listOpts = {
    source: conciergeOnly ? "concierge" : undefined,
    category: categoryFilter !== "any" ? categoryFilter : undefined,
    city: cityFilter.trim() || undefined,
    needsResponse: needsResponse || undefined,
  };
  const filterKey = JSON.stringify(listOpts);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminLeads.list(statusFilter, page, filterKey),
    queryFn: () => adminLeadService.list(statusFilter, page, LIMIT, listOpts),
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

      {/* Ops metrics (whole funnel, from /admin/leads/metrics). The 4 named
          north-stars come first; contact rate is a secondary 5th card. */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label={t("admin.leads.metricRequestsWeek")}
          value={metrics ? metrics.requestsThisWeek : "—"}
          sub={metrics ? t("admin.leads.metricRequests30dSub").replace("{count}", String(metrics.requests30d)) : undefined}
          icon={Megaphone}
        />
        <StatCard
          label={t("admin.leads.metricMatchRate")}
          value={metrics?.matchRate30d?.rate != null ? pct(metrics.matchRate30d.rate) : "—"}
          sub={metrics?.matchRate30d
            ? t("admin.leads.matchRateSub")
                .replace("{matched}", String(metrics.matchRate30d.matched ?? 0))
                .replace("{total}", String(metrics.matchRate30d.total ?? 0))
            : undefined}
          icon={CheckCircle}
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
        <StatCard
          label={t("admin.leads.metricContactRate")}
          value={metrics ? pct(metrics.contactRate30d) : "—"}
          icon={TrendingUp}
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

      {/* Extra filters: concierge channel, SLA "needs response" view, category + city */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => { setConciergeOnly((v) => !v); setPage(1); }}
          aria-pressed={conciergeOnly}
          className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            conciergeOnly
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {t("admin.leads.filterConcierge")}
        </button>
        <button
          onClick={() => { setNeedsResponse((v) => !v); setPage(1); }}
          aria-pressed={needsResponse}
          className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            needsResponse
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {t("admin.leads.filterNeedsResponse")}
        </button>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          aria-label={t("admin.leads.filterAllCategories")}
          className="min-h-[36px] rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="any">{t("admin.leads.filterAllCategories")}</option>
          {SERVICE_TYPE_SLUGS.map((s) => (
            <option key={s} value={s}>{serviceTypeLabel(t, s)}</option>
          ))}
        </select>
        <input
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          placeholder={t("admin.leads.filterCityPlaceholder")}
          aria-label={t("admin.leads.filterCityPlaceholder")}
          className="min-h-[36px] rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
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
            <LeadWorkspace lead={lead} />
          </td>
        </tr>
      )}
    </>
  );
}
