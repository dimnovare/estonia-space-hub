import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminOfferService,
  type AdminLead,
  type AdminOffer,
  type ProviderCandidate,
  type ProviderOutreachRow,
  type OutreachStatus,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { serviceTypeLabel } from "@/lib/serviceTypes";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { candidateToEditable, nextLocalId, parsePrice, toEditable, toInput, type EditableOption } from "./leadWorkspaceModels";

interface LeadOfferStageProps {
  lead: AdminLead;
  offers: AdminOffer[];
  outreachRows: ProviderOutreachRow[];
  candidateToAdd: ProviderCandidate | null;
  onCandidateConsumed(): void;
  onOffersChanged(): void;
}

type ApiFailure = Error & { status?: number };

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const statusClass = (status: AdminOffer["status"]) =>
  status === "chosen" ? "bg-success/10 text-success"
    : status === "sent" || status === "viewed" ? "bg-accent/10 text-accent"
      : "bg-secondary text-muted-foreground";

export function LeadOfferStage({
  lead, offers, outreachRows, candidateToAdd, onCandidateConsumed, onOffersChanged,
}: LeadOfferStageProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const activeDraft = offers.find((offer) => offer.status === "draft");
  const history = useMemo(
    () => offers
      .filter((offer) => offer.status !== "draft")
      .sort((left, right) => (right.sentAt ?? right.createdAt).localeCompare(left.sentAt ?? left.createdAt)),
    [offers],
  );
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [options, setOptions] = useState<EditableOption[]>([]);
  const [customerNote, setCustomerNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [outreachNotes, setOutreachNotes] = useState<Record<string, string>>({});
  const dismissedDraftId = useRef<string | null>(null);

  useEffect(() => {
    if (activeDraft && activeDraft.id !== editingDraftId && activeDraft.id !== dismissedDraftId.current) {
      setEditingDraftId(activeDraft.id);
      setOptions(activeDraft.options.map(toEditable));
      setCustomerNote(activeDraft.customerNote ?? "");
      setDirty(false);
    }
  }, [activeDraft, editingDraftId]);

  const refreshOffers = () => {
    onOffersChanged();
    queryClient.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
  };

  const refreshOnConflict = (error: ApiFailure) => {
    if (error.status === 409) refreshOffers();
  };

  const removeDraftFromCache = () => {
    queryClient.setQueryData(queryKeys.adminLeads.offers(lead.id), (previous: AdminOffer[] | undefined) =>
      (previous ?? []).filter((offer) => offer.id !== activeDraft?.id));
  };

  const clearDeletedDraft = () => {
    dismissedDraftId.current = activeDraft?.id ?? editingDraftId;
    setEditingDraftId(null);
    setOptions([]);
    setCustomerNote("");
    setDirty(false);
    removeDraftFromCache();
  };

  const createMutation = useMutation({
    mutationFn: (candidate?: ProviderCandidate) => {
      const seed = candidate ? [toInput(candidateToEditable(candidate), 0)] : undefined;
      return adminOfferService.create(lead.id, seed?.length ? { options: seed } : {});
    },
    onSuccess: (draft, candidate) => {
      setEditingDraftId(draft.id);
      setOptions(draft.options.map(toEditable));
      setCustomerNote(draft.customerNote ?? "");
      setDirty(false);
      queryClient.setQueryData(queryKeys.adminLeads.offers(lead.id), (previous: AdminOffer[] | undefined) => {
        const withoutDraft = (previous ?? []).filter((offer) => offer.status !== "draft" || offer.id === draft.id);
        return [...withoutDraft.filter((offer) => offer.id !== draft.id), draft];
      });
      if (candidate) onCandidateConsumed();
      refreshOffers();
    },
    onError: (error: Error) => toast.error(error.message || t("toast.error")),
  });

  useEffect(() => {
    if (!candidateToAdd || createMutation.isPending) return;
    if (!editingDraftId) {
      createMutation.mutate(candidateToAdd);
      return;
    }
    setOptions((previous) => [...previous, candidateToEditable(candidateToAdd)]);
    setDirty(true);
    onCandidateConsumed();
  }, [candidateToAdd, createMutation, editingDraftId, onCandidateConsumed]);

  const offerPatchBody = () => ({
    customerNote: customerNote.trim(),
    options: options.filter((option) => option.title.trim()).map(toInput),
  });

  const saveMutation = useMutation({
    mutationFn: () => adminOfferService.update(editingDraftId!, offerPatchBody()),
    onSuccess: (updated) => {
      setOptions(updated.options.map(toEditable));
      setCustomerNote(updated.customerNote ?? "");
      setDirty(false);
      toast.success(t("admin.leads.offerSaved"));
      refreshOffers();
    },
    onError: (error: ApiFailure) => {
      refreshOnConflict(error);
      toast.error(error.message || t("toast.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminOfferService.remove(activeDraft!.id),
    onSuccess: () => {
      setConfirmDelete(false);
      clearDeletedDraft();
      toast.success(t("admin.leads.draftDeleted"));
      refreshOffers();
    },
    onError: (error: ApiFailure) => {
      if (error.status === 404) {
        setConfirmDelete(false);
        clearDeletedDraft();
        refreshOffers();
        toast.success(t("admin.leads.draftDeleted"));
        return;
      }
      if (error.status === 409) {
        setConfirmDelete(false);
        refreshOffers();
      }
      toast.error(error.message || t("toast.error"));
    },
  });

  const outreachMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status?: OutreachStatus; note?: string } }) =>
      adminOfferService.updateOutreach(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminLeads.outreach(lead.id) }),
    onError: (error: Error) => toast.error(error.message || t("toast.error")),
  });

  const mutateOptions = (updater: (previous: EditableOption[]) => EditableOption[]) => {
    setOptions(updater);
    setDirty(true);
  };
  const updateOption = (localId: string, patch: Partial<EditableOption>) =>
    mutateOptions((previous) => previous.map((option) => option.localId === localId ? { ...option, ...patch } : option));
  const moveOption = (index: number, direction: -1 | 1) =>
    mutateOptions((previous) => {
      const next = [...previous];
      const target = index + direction;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const hasEditor = editingDraftId !== null;

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label={t("admin.leads.stageOffer")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.stageOffer")}</span>
          {activeDraft && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("admin.leads.activeDraft")}</span>}
        </div>
        {activeDraft ? (
          <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" disabled={createMutation.isPending} onClick={() => createMutation.mutate(undefined)}>
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t("admin.leads.offerCreate")}
          </Button>
        ) : (
          <Button type="button" size="sm" className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" disabled={createMutation.isPending} onClick={() => createMutation.mutate(undefined)}>
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {history.length ? t("admin.leads.newDraft") : t("admin.leads.offerCreate")}
          </Button>
        )}
      </div>

      {activeDraft && <p className="mt-2 text-sm text-muted-foreground">{t("admin.leads.oneActiveDraft")}</p>}

      {history.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.previousOffers")}</p>
          <ul className="mt-2 divide-y divide-border">
            {history.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(offer.status)}`}>{t(`admin.leads.offerStatus.${offer.status}`)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(offer.sentAt ?? offer.createdAt)}</span>
                </div>
                <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/${offer.language || lead.language || "et"}/offer/${offer.token}`);
                    toast.success(t("admin.leads.copied"));
                  } catch { /* Clipboard may be unavailable over HTTP. */ }
                }}>
                  <Copy className="h-3.5 w-3.5" />{t("admin.leads.offerCopyLink")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-3">
        {outreachRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin.leads.outreachEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {outreachRows.map((row) => (
              <li key={row.id} className="grid gap-2 rounded-md border border-border bg-background p-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="font-medium text-navy-ink">{row.supplierName ?? row.sentTo}</p>
                  <p className="break-words text-xs text-muted-foreground">{row.sentTo}</p>
                </div>
                <select aria-label={`${row.supplierName ?? row.sentTo} ${t("admin.leads.outreachStatus.sent")}`} value={row.status} onChange={(event) => outreachMutation.mutate({ id: row.id, body: { status: event.target.value as OutreachStatus } })} className="h-9 rounded-md border border-border bg-card px-2 text-sm">
                  {(["sent", "replied", "declined", "noanswer"] as const).map((status) => <option key={status} value={status}>{t(`admin.leads.outreachStatus.${status}`)}</option>)}
                </select>
                <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row">
                  <input aria-label={`${row.supplierName ?? row.sentTo} ${t("admin.leads.outreachNotePlaceholder")}`} value={outreachNotes[row.id] ?? row.note ?? ""} placeholder={t("admin.leads.outreachNotePlaceholder")} onChange={(event) => setOutreachNotes((previous) => ({ ...previous, [row.id]: event.target.value }))} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-sm" />
                  <Button type="button" size="sm" variant="outline" className="h-9" disabled={outreachMutation.isPending} onClick={() => outreachMutation.mutate({ id: row.id, body: { note: outreachNotes[row.id] ?? row.note ?? "" } })}>{t("admin.leads.save")}</Button>
                </div>
                {row.status === "replied" && <Button type="button" size="sm" className="h-9 gap-1.5 sm:col-span-2 sm:justify-self-start" onClick={() => {
                  const candidate: ProviderCandidate = { supplierId: row.supplierId, supplierName: row.supplierName ?? row.sentTo, contactEmail: row.sentTo, contactPhone: null, serviceTypes: [], locationId: null, locationName: null, city: null, address: null, lat: null, lng: null, distanceKm: null, isExactCity: false, listingId: null, listingTitle: null, price: null, priceUnit: null, alreadyContacted: true, lastOutreachAt: row.sentAt, otherLocations: [] };
                  if (hasEditor) {
                    mutateOptions((previous) => [...previous, candidateToEditable(candidate)]);
                  } else {
                    createMutation.mutate(candidate);
                  }
                }}><Plus className="h-3.5 w-3.5" />{t("admin.leads.addToOffer")}</Button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!hasEditor ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("admin.leads.offerEmpty")}</p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {options.map((option, index) => (
              <div key={option.localId} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <input type="text" aria-label={t("admin.leads.offerOptionTitle")} placeholder={t("admin.leads.offerOptionTitle")} value={option.title} onChange={(event) => updateOption(option.localId, { title: event.target.value })} className="h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm font-medium" />
                    <div className="flex flex-wrap gap-2">
                      <input type="text" inputMode="decimal" aria-label={t("admin.leads.offerPrice")} placeholder={t("admin.leads.offerPrice")} value={option.price} onChange={(event) => updateOption(option.localId, { price: event.target.value })} className="h-9 w-[110px] rounded-md border border-border bg-card px-2.5 text-sm" />
                      <input type="text" aria-label={t("admin.leads.offerPriceUnit")} placeholder={t("admin.leads.offerPriceUnit")} value={option.priceUnit} onChange={(event) => updateOption(option.localId, { priceUnit: event.target.value })} className="h-9 w-[140px] rounded-md border border-border bg-card px-2.5 text-sm" />
                      {option.supplierName && <span className="inline-flex h-9 items-center rounded-md bg-secondary px-2.5 text-xs font-medium text-muted-foreground">{option.supplierName}</span>}
                    </div>
                    <textarea aria-label={t("admin.leads.offerNotes")} placeholder={t("admin.leads.offerNotes")} value={option.notes} rows={2} onChange={(event) => updateOption(option.localId, { notes: event.target.value })} className="w-full rounded-md border border-border bg-card px-2.5 py-2 text-sm" />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" aria-label={t("admin.leads.offerMoveUp")} disabled={index === 0} onClick={() => moveOption(index, -1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={t("admin.leads.offerMoveDown")} disabled={index === options.length - 1} onClick={() => moveOption(index, 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={t("admin.leads.offerRemoveOption")} onClick={() => mutateOptions((previous) => previous.filter((item) => item.localId !== option.localId))} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" size="sm" variant="outline" className="mt-3 h-9 gap-1.5" onClick={() => mutateOptions((previous) => [...previous, { localId: nextLocalId(), supplierId: null, supplierName: null, supplierLocationId: null, title: "", price: "", priceUnit: "", notes: "" }])}><Plus className="h-3.5 w-3.5" />{t("admin.leads.offerAddOption")}</Button>
          <div className="mt-3"><label htmlFor={`offer-note-${lead.id}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.offerCustomerNote")}</label><textarea id={`offer-note-${lead.id}`} value={customerNote} rows={2} onChange={(event) => { setCustomerNote(event.target.value); setDirty(true); }} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="h-9" disabled={saveMutation.isPending || !dirty} onClick={() => saveMutation.mutate()}>{saveMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{t("admin.leads.offerSave")}</Button>
            <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" aria-pressed={showPreview} onClick={() => setShowPreview((visible) => !visible)}><Eye className="h-3.5 w-3.5" />{t("admin.leads.offerPreview")}</Button>
            {activeDraft && <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5 text-destructive hover:text-destructive" disabled={deleteMutation.isPending} onClick={() => setConfirmDelete(true)}><Trash2 className="h-3.5 w-3.5" />{t("admin.leads.deleteDraft")}</Button>}
          </div>

          {showPreview && <div className="mt-4 rounded-lg border border-dashed border-border bg-background p-4"><p className="font-display text-base font-bold text-navy-ink">{t("offer.title").replace("{category}", serviceTypeLabel(t, lead.category)).replace("{city}", lead.city)}</p>{customerNote.trim() && <p className="mt-2 whitespace-pre-wrap rounded-md bg-secondary/60 px-3 py-2 text-xs text-foreground">{customerNote}</p>}<div className="mt-3 space-y-2">{options.filter((option) => option.title.trim()).map((option) => <div key={option.localId} className="rounded-lg border border-border bg-card p-3"><div className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-foreground">{option.title}</span>{parsePrice(option.price) != null && <span className="shrink-0 font-display text-sm font-extrabold text-navy-ink">€{parsePrice(option.price)}{option.priceUnit && <span className="ml-1 text-xs font-medium text-muted-foreground">{option.priceUnit}</span>}</span>}</div>{option.supplierName && <p className="mt-0.5 text-xs text-muted-foreground">{option.supplierName}</p>}{option.notes.trim() && <p className="mt-1 text-xs text-muted-foreground">{option.notes}</p>}<span className="mt-2 inline-flex rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">{t("offer.choose")}</span></div>)}</div></div>}
        </>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("admin.leads.deleteDraftTitle")}</AlertDialogTitle><AlertDialogDescription>{t("admin.leads.deleteDraftBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteMutation.isPending}>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); deleteMutation.mutate(); }}>{t("admin.leads.deleteDraft")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
  );
}
