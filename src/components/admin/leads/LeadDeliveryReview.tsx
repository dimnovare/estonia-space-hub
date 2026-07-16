import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  adminOfferService,
  type AdminLead,
  type AdminOffer,
  type OfferOptionInput,
} from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { OfferPresentation } from "@/components/offers/OfferPresentation";

interface LeadDeliveryReviewProps {
  lead: AdminLead;
  offers: AdminOffer[];
  onOffersChanged(): void;
}

type ApiFailure = Error & { status?: number };

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const toInputs = (offer: AdminOffer): OfferOptionInput[] =>
  offer.options.map((option, index) => ({
    title: option.title,
    supplierId: option.supplierId ?? undefined,
    supplierLocationId: option.supplierLocationId ?? undefined,
    priceAmount: option.priceAmount,
    priceUnit: option.priceUnit,
    notes: option.notes,
    sortOrder: option.sortOrder ?? index,
  }));

/**
 * Stage 3 — Review and send (design §3 / §6). Fetches the exact admin delivery
 * preview only when the review dialog opens, renders the exact email and the
 * same sanitized public page component with NO action. Previewing never marks
 * the offer Viewed and never navigates to the token URL — it reads the
 * side-effect-free preview endpoint. Only the final `Send to customer` action
 * persists the draft and calls send. A Chosen offer is a pending customer
 * preference; only `Confirm with provider and mark booked` converts the lead.
 */
export function LeadDeliveryReview({ lead, offers, onOffersChanged }: LeadDeliveryReviewProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // The offer this stage operates on: a pending customer preference first
  // (needs confirmation), then the active draft (review + send), then the most
  // recent live offer (read-only status).
  const deliveryOffer = useMemo(() => {
    return offers.find((offer) => offer.status === "chosen")
      ?? offers.find((offer) => offer.status === "draft")
      ?? [...offers]
        .filter((offer) => offer.status === "sent" || offer.status === "viewed")
        .sort((left, right) => (right.sentAt ?? right.createdAt).localeCompare(left.sentAt ?? left.createdAt))[0];
  }, [offers]);

  const isDraft = deliveryOffer?.status === "draft";
  const isChosen = deliveryOffer?.status === "chosen";
  const isLive = deliveryOffer?.status === "sent" || deliveryOffer?.status === "viewed";
  const hasSendableOptions = (deliveryOffer?.options ?? []).some((option) => option.title.trim());

  const previewQuery = useQuery({
    queryKey: queryKeys.adminLeads.deliveryPreview(deliveryOffer?.id ?? "none"),
    queryFn: () => adminOfferService.deliveryPreview(deliveryOffer!.id),
    enabled: reviewOpen && !!deliveryOffer,
    retry: false,
    gcTime: 0,
  });
  const preview = previewQuery.data;
  const recipientEmail = preview?.recipient.email ?? lead.email;

  const invalidateWorkspace = () => {
    onOffersChanged();
    queryClient.invalidateQueries({ queryKey: queryKeys.adminLeads.offers(lead.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminLeads.root() });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminLeads.metrics() });
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      await adminOfferService.update(deliveryOffer!.id, {
        customerNote: deliveryOffer!.customerNote ?? undefined,
        options: toInputs(deliveryOffer!),
      });
      return adminOfferService.send(deliveryOffer!.id);
    },
    onSuccess: () => {
      setReviewOpen(false);
      setSendError(null);
      toast.success(t("admin.leads.offerSentToast"));
      invalidateWorkspace();
    },
    onError: (error: ApiFailure) => {
      // 400: the backend rejected the payload — keep the dialog open and show
      // the exact requirement beside the final action.
      if (error.status === 400) {
        setSendError(error.message || t("toast.error"));
        return;
      }
      // 409: the draft is no longer sendable (chosen/closed elsewhere). Reload
      // the offer so the chosen/closed state replaces the send affordance.
      if (error.status === 409) {
        setReviewOpen(false);
        invalidateWorkspace();
      }
      toast.error(error.message || t("toast.error"));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => adminOfferService.confirmBooking(deliveryOffer!.id),
    onSuccess: () => {
      setConfirmOpen(false);
      toast.success(t("admin.leads.bookingConfirmed"));
      invalidateWorkspace();
    },
    onError: (error: ApiFailure) => {
      setConfirmOpen(false);
      // 409: the chosen option no longer exists. The lead stays Quoted; refresh
      // the chosen option instead of celebrating a booking that did not happen.
      if (error.status === 409) invalidateWorkspace();
      toast.error(error.message || t("toast.error"));
    },
  });

  const chosenOption = isChosen
    ? deliveryOffer!.options.find((option) => option.id === deliveryOffer!.chosenOptionId) ?? null
    : null;

  const openReview = () => {
    setSendError(null);
    setReviewOpen(true);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label={t("admin.leads.stageDelivery")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.stageDelivery")}</span>
        {isChosen && (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">{t("admin.leads.offerStatus.chosen")}</span>
        )}
      </div>

      {!deliveryOffer && <p className="mt-3 text-sm text-muted-foreground">{t("admin.leads.offerEmpty")}</p>}

      {isDraft && (
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!hasSendableOptions}
            onClick={openReview}
          >
            <Send className="h-3.5 w-3.5" />
            {t("admin.leads.reviewDelivery")}
          </Button>
        </div>
      )}

      {isLive && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t(`admin.leads.offerStatus.${deliveryOffer!.status}`)} · {formatDateTime(deliveryOffer!.sentAt ?? deliveryOffer!.createdAt)}
        </p>
      )}

      {isChosen && (
        <div className="mt-3 space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
            <CheckCircle className="h-4 w-4" aria-hidden />
            {t("admin.leads.customerRequested")}
          </p>
          {chosenOption && (
            <div className="rounded-lg border border-success bg-background p-3 ring-1 ring-success">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="min-w-0 break-words text-sm font-semibold text-foreground">{chosenOption.title}</span>
                {chosenOption.priceAmount != null && (
                  <span className="shrink-0 font-display text-sm font-extrabold text-navy-ink">
                    €{chosenOption.priceAmount}
                    {chosenOption.priceUnit && <span className="ml-1 text-xs font-medium text-muted-foreground">{chosenOption.priceUnit}</span>}
                  </span>
                )}
              </div>
              {chosenOption.supplierName && <p className="mt-0.5 break-words text-xs text-muted-foreground">{chosenOption.supplierName}</p>}
              {chosenOption.notes && <p className="mt-1 break-words text-xs text-muted-foreground">{chosenOption.notes}</p>}
            </div>
          )}
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={confirmMutation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {confirmMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            {t("admin.leads.confirmBooking")}
          </Button>
        </div>
      )}

      <Dialog open={reviewOpen} onOpenChange={(open) => { if (!open && !sendMutation.isPending) setReviewOpen(false); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("admin.leads.reviewDelivery")}</DialogTitle></DialogHeader>

          {previewQuery.isLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : previewQuery.isError ? (
            <div className="flex flex-wrap items-center gap-3 py-6 text-sm text-muted-foreground">
              <span>{t("toast.error")}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => previewQuery.refetch()}>{t("common.retry")}</Button>
            </div>
          ) : preview ? (
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">{t("admin.leads.emailPreview")}</TabsTrigger>
                <TabsTrigger value="page">{t("admin.leads.pagePreview")}</TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="mt-3">
                <dl className="grid gap-1 text-sm sm:grid-cols-[88px_minmax(0,1fr)]">
                  <dt className="font-medium text-muted-foreground">{t("admin.leads.recipient")}</dt>
                  <dd className="break-words">{preview.recipient.name ? `${preview.recipient.name} · ${preview.recipient.email}` : preview.recipient.email}</dd>
                  <dt className="font-medium text-muted-foreground">{t("admin.leads.subject")}</dt>
                  <dd className="break-words">{preview.email.subject}</dd>
                </dl>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("admin.leads.message")}</p>
                <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm text-foreground">{preview.email.textBody}</pre>
              </TabsContent>
              <TabsContent value="page" className="mt-3">
                <OfferPresentation offer={preview.page} preview />
              </TabsContent>
            </Tabs>
          ) : null}

          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.leads.sendEffectsTitle")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
              <li className="break-words">{t("admin.leads.effectEmail").replace("{email}", recipientEmail)}</li>
              <li>{t("admin.leads.effectLive")}</li>
              <li>{t("admin.leads.effectQuoted")}</li>
              <li>{t("admin.leads.effectViewed")}</li>
              <li>{t("admin.leads.effectRequested")}</li>
              <li>{t("admin.leads.effectNoBooking")}</li>
            </ul>
          </div>

          {sendError && <p className="text-sm font-medium text-destructive" role="alert">{sendError}</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)} disabled={sendMutation.isPending}>{t("common.cancel")}</Button>
            <Button
              type="button"
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
              disabled={sendMutation.isPending || !preview}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("admin.leads.offerSend")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.leads.confirmBookingTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.leads.confirmBookingBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={confirmMutation.isPending}
              onClick={(event) => { event.preventDefault(); confirmMutation.mutate(); }}
            >
              {t("admin.leads.markBooked")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
