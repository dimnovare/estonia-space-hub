import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, Mail, MapPin, Phone, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import {
  adminLeadService,
  adminOfferService,
  type AdminLead,
  type OutreachPreviewItem,
  type ProviderCandidate,
  type ProviderOutreachRow,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { serviceTypeLabel } from "@/lib/serviceTypes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LeadProviderStageProps {
  lead: AdminLead;
  outreachRows: ProviderOutreachRow[];
  onAddCandidate(candidate: ProviderCandidate): void;
  onOutreachComplete(): void;
}

const RADIUS_KM = 25;
const LIMIT = 50;

function formatDistance(value: number | null, t: (key: string) => string) {
  return value == null
    ? t("admin.leads.distanceUnavailable")
    : t("admin.leads.radiusKm").replace("{count}", String(value));
}

function skipReason(item: OutreachPreviewItem) {
  return item.skipReason ?? "";
}

export function LeadProviderStage({ lead, outreachRows, onAddCandidate, onOutreachComplete }: LeadProviderStageProps) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [scope, setScope] = useState<"nearby" | "all">("nearby");
  const [category, setCategory] = useState<"lead" | "any">("lead");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<OutreachPreviewItem[] | null>(null);
  const [resendConfirmOpen, setResendConfirmOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const filters = useMemo(() => ({ q: debouncedQ, scope, category, radiusKm: RADIUS_KM, limit: LIMIT }), [category, debouncedQ, scope]);
  const candidatesQuery = useQuery({
    queryKey: queryKeys.adminLeads.candidates(lead.id, filters),
    queryFn: () => adminLeadService.candidates(lead.id, filters),
    retry: false,
  });
  const previewMutation = useMutation({
    mutationFn: () => adminOfferService.previewOutreach(lead.id, [...selected]),
    onSuccess: ({ recipients }) => setPreview(recipients),
    onError: (error: Error) => toast.error(error.message || t("toast.error")),
  });
  const sendMutation = useMutation({
    mutationFn: (resend: boolean) => adminOfferService.outreach(lead.id, [...selected], resend),
    onSuccess: (result) => {
      toast.success(
        t("admin.leads.outreachSentToast")
          .replace("{sent}", String(result.sent.length))
          .replace("{skipped}", String(result.skipped.length)),
      );
      setSelected(new Set());
      setPreview(null);
      setResendConfirmOpen(false);
      candidatesQuery.refetch();
      onOutreachComplete();
    },
    onError: (error: Error) => toast.error(error.message || t("toast.error")),
  });

  const candidates = candidatesQuery.data?.items ?? [];
  const hasAlreadyContacted = preview?.some((item) => item.skipReason === "already_contacted") ?? false;
  const toggleSelected = (supplierId: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(supplierId)) next.delete(supplierId); else next.add(supplierId);
    return next;
  });
  const toggleLocations = (supplierId: string) => setExpandedLocations((current) => {
    const next = new Set(current);
    if (next.has(supplierId)) next.delete(supplierId); else next.add(supplierId);
    return next;
  });
  const setAllEstonia = () => setScope("all");
  const setNearby = () => {
    setScope("nearby");
    setCategory("lead");
  };

  return (
    <section aria-labelledby={`provider-stage-${lead.id}`} className="w-full max-w-[calc(100vw-3rem)] border-b border-border pb-5 xl:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`provider-stage-${lead.id}`} className="font-display text-base font-semibold text-navy-ink">
          {t("admin.leads.stageProviders")}
        </h3>
        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1" role="group" aria-label={t("admin.leads.stageProviders")}>
          <Button type="button" size="sm" variant={scope === "nearby" ? "default" : "ghost"} className="h-8" onClick={setNearby}>
            {t("admin.leads.scopeNearby")}
          </Button>
          <Button type="button" size="sm" variant={scope === "all" ? "default" : "ghost"} className="h-8" onClick={setAllEstonia}>
            {t("admin.leads.scopeAll")}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="sr-only" htmlFor={`provider-search-${lead.id}`}>{t("admin.leads.searchProviders")}</label>
        <input
          id={`provider-search-${lead.id}`}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t("admin.leads.searchProviders")}
          className="h-10 min-w-0 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="button"
          size="sm"
          variant={category === "any" ? "default" : "outline"}
          className="h-10"
          disabled={scope !== "all"}
          onClick={() => setCategory("any")}
        >
          {t("admin.leads.allServices")}
        </Button>
      </div>

      {candidatesQuery.isLoading ? (
        <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("admin.leads.findPartners")}</div>
      ) : candidatesQuery.isError ? (
        <div className="flex flex-wrap items-center gap-3 py-5 text-sm text-muted-foreground">
          <span>{t("toast.error")}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => candidatesQuery.refetch()}>{t("common.retry")}</Button>
        </div>
      ) : candidates.length === 0 ? (
        <p className="py-5 text-sm text-muted-foreground">{t("admin.leads.matchesEmpty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {candidates.map((candidate) => {
            const selectedCandidate = selected.has(candidate.supplierId);
            const hasEmail = !!candidate.contactEmail;
            const locationsExpanded = expandedLocations.has(candidate.supplierId);
            return (
              <li key={candidate.supplierId} className="py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-wrap items-start gap-3">
                  <Checkbox
                    id={`provider-${candidate.supplierId}`}
                    checked={selectedCandidate}
                    disabled={!hasEmail}
                    onCheckedChange={() => toggleSelected(candidate.supplierId)}
                    aria-label={candidate.supplierName}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <label htmlFor={`provider-${candidate.supplierId}`} className="font-medium text-navy-ink">{candidate.supplierName}</label>
                      <span className="text-xs text-muted-foreground">{formatDistance(candidate.distanceKm, t)}</span>
                      {candidate.alreadyContacted && <span className="text-xs font-medium text-warning-text">{t("admin.leads.alreadyContacted")}</span>}
                      {!hasEmail && <span className="text-xs font-medium text-muted-foreground">{t("admin.leads.noEmail")}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {(candidate.locationName || candidate.city || candidate.address) && <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{[candidate.locationName, candidate.city, candidate.address].filter(Boolean).join(" · ")}</span>}
                      {candidate.listingTitle && <span>{candidate.listingTitle}{candidate.price != null ? ` · ${candidate.price} ${candidate.priceUnit ?? "€"}` : ""}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {candidate.serviceTypes.map((serviceType) => <span key={serviceType} className="rounded-full bg-secondary px-2 py-0.5 text-foreground">{serviceTypeLabel(t, serviceType)}</span>)}
                      {candidate.contactEmail && <a href={`mailto:${candidate.contactEmail}`} className="inline-flex items-center gap-1 font-medium text-accent hover:underline"><Mail className="h-3 w-3" />{candidate.contactEmail}</a>}
                      {candidate.contactPhone && <a href={`tel:${candidate.contactPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 font-medium text-accent hover:underline"><Phone className="h-3 w-3" />{candidate.contactPhone}</a>}
                    </div>
                    {candidate.otherLocations.length > 0 && (
                      <div className="mt-2">
                        <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline" onClick={() => toggleLocations(candidate.supplierId)} aria-expanded={locationsExpanded}>
                          {locationsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {t("admin.leads.otherLocations")}
                        </button>
                        {locationsExpanded && <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">{candidate.otherLocations.map((location) => <li key={location.locationId}>{[location.locationName, location.city, location.address].filter(Boolean).join(" · ")} · {formatDistance(location.distanceKm, t)}</li>)}</ul>}
                      </div>
                    )}
                  </div>
                  <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 gap-1 px-2.5 text-xs" onClick={() => onAddCandidate(candidate)}>
                    <Plus className="h-3.5 w-3.5" />{t("admin.leads.offerAddFromMatch")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        className="mt-4 h-10 w-full justify-center gap-2"
        disabled={selected.size === 0 || previewMutation.isPending}
        onClick={() => previewMutation.mutate()}
      >
        {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {t("admin.leads.reviewProviders").replace("{count}", String(selected.size))}
      </Button>

      <div className="mt-4 border-t border-border pt-3">
        {outreachRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.leads.outreachEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {outreachRows.map((row) => (
              <li key={row.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="font-medium text-navy-ink">{row.supplierName ?? row.sentTo}</div>
                  <div className="break-words text-xs text-muted-foreground">{row.sentTo}</div>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{t(`admin.leads.outreachStatus.${row.status}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open && !sendMutation.isPending) setPreview(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.leads.reviewMessageTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {preview?.map((item) => (
              <article key={item.supplierId} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="font-medium text-navy-ink">{item.supplierName ?? item.supplierId}</div>
                {item.skipReason ? (
                  <p className="mt-1 text-sm text-muted-foreground">{skipReason(item)}</p>
                ) : (
                  <>
                    <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[88px_minmax(0,1fr)]">
                      <dt className="font-medium text-muted-foreground">{t("admin.leads.recipient")}</dt><dd className="break-words">{item.email}</dd>
                      <dt className="font-medium text-muted-foreground">{t("admin.leads.subject")}</dt><dd className="break-words">{item.subject}</dd>
                    </dl>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.message")}</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm text-foreground">{item.textBody}</pre>
                  </>
                )}
              </article>
            ))}
          </div>
          {hasAlreadyContacted && <p className="text-sm text-muted-foreground">{t("admin.leads.skipAlreadyContacted")}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPreview(null)} disabled={sendMutation.isPending}>{t("common.cancel")}</Button>
            <Button type="button" className="w-full gap-2 sm:w-auto" disabled={sendMutation.isPending} onClick={() => hasAlreadyContacted ? setResendConfirmOpen(true) : sendMutation.mutate(false)}>
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t(hasAlreadyContacted ? "admin.leads.resendOutreach" : "admin.leads.sendOutreach")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resendConfirmOpen} onOpenChange={setResendConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.leads.resendOutreach")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.leads.skipAlreadyContacted")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={sendMutation.isPending} onClick={(event) => { event.preventDefault(); sendMutation.mutate(true); }}>
              {t("admin.leads.resendOutreach")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
