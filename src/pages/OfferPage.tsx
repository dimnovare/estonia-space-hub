import { useState } from "react";
import { useParams, Link } from "@/i18n/routing";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, MapPin, ArrowRight, CalendarDays, Loader2, LinkIcon,
  AlertCircle, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { translateForLanguage, useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { OfferPresentation } from "@/components/offers/OfferPresentation";
import { offerService, type PublicOffer, type PublicOfferOption } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { serviceTypeLabel } from "@/lib/serviceTypes";

/**
 * /offer/{token} — the public concierge offer page (overhaul spec §5).
 * Anonymous + noindex; "Your options for {category} in {city}" with option
 * cards and a confirmed "Choose this option" flow. The backend 404s unknown,
 * draft and expired tokens identically → one invalid/expired state.
 * Contract: spec §5.1 (GET /offers/{token}, POST /offers/{token}/choose).
 */
export default function OfferPage() {
  const { token = "" } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const settings = usePlatformSettings();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<PublicOfferOption | null>(null);
  // Inline banner for choose failures (the confirm dialog closes on error, so
  // the message must live on the page itself).
  const [chooseError, setChooseError] = useState<string | null>(null);

  const { data: offer, isLoading, isError, error, refetch, isFetching } = useQuery<PublicOffer>({
    queryKey: queryKeys.offers.byToken(token),
    queryFn: () => offerService.get(token),
    enabled: token.length > 0,
    staleTime: 30_000,
    // 4xx never succeeds on retry (404/expired/draft/malformed token); a
    // transient 5xx / network blip on a VALID offer should retry so a real
    // offer isn't shown a dead-end. Rate-limit (429) is transient too.
    retry: (failureCount, err: Error & { status?: number }) => {
      const s = err?.status;
      if (typeof s === "number" && s >= 400 && s < 500 && s !== 429) return false;
      return failureCount < 2;
    },
  });
  const getErrorStatus = (error as (Error & { status?: number }) | null)?.status;
  // Only a real 404 (backend 404s unknown/draft/expired identically) is the
  // terminal "invalid link" dead-end; anything else is retryable.
  const isNotFound = isError && getErrorStatus === 404;

  const chooseMutation = useMutation({
    mutationFn: (optionId: string) => offerService.choose(token, optionId),
    onSuccess: (res) => {
      setConfirming(null);
      setChooseError(null);
      // Reflect the chosen state locally without waiting for a refetch.
      qc.setQueryData<PublicOffer>(queryKeys.offers.byToken(token), (prev) =>
        prev ? { ...prev, status: "chosen", chosenOptionId: res.chosenOptionId } : prev);
    },
    onError: (err: Error & { status?: number }) => {
      setConfirming(null);
      const s = err?.status;
      // 409 = a different option was already chosen (e.g. a second device) —
      // refetch so the page shows the real chosen state.
      if (s === 409) {
        qc.invalidateQueries({ queryKey: queryKeys.offers.byToken(token) });
        setChooseError(null);
        return;
      }
      // 400 "Unknown option" — the backend regenerates option ids on every
      // replace-set PATCH, so an offer the customer opened before an admin
      // re-saved posts a stale optionId. Refetch to load fresh ids and tell
      // the customer the offer changed.
      if (s === 400) {
        qc.invalidateQueries({ queryKey: queryKeys.offers.byToken(token) });
        setChooseError(t("offer.staleOption"));
        return;
      }
      // Everything else (429 / 5xx / network) — visible, retryable feedback.
      setChooseError(t("offer.chooseError"));
    },
  });

  const supportEmail = settings.siteEmail || "info@ruumly.eu";

  // Minimal chrome: the global Navbar is suppressed for /offer/ routes
  // (AppContent), so the page carries its own slim logo header.
  const header = (
    <header className="border-b border-border bg-card">
      <div className="container-wide flex h-14 items-center">
        <Link to="/" aria-label="Ruumly" className="flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <img src="/ruumly-mark.png" alt="" aria-hidden="true" width={30} height={30} decoding="async" className="h-[30px] w-[30px] object-contain" />
          <span className="brand-word text-[20px]">Ruumly</span>
        </Link>
      </div>
    </header>
  );

  const helpFooter = (
    <p className="mt-10 text-center text-sm text-muted-foreground">
      {t("offer.help").replace("{email}", "")}
      <a href={`mailto:${supportEmail}`} className="font-medium text-accent hover:underline">{supportEmail}</a>
    </p>
  );

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("offer.seo.title")} description={t("offer.subtitle")} path={`/offer/${token}`} noindex />
        {header}
        <div className="container-wide mx-auto max-w-2xl py-10">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/3" />
                <Skeleton className="mt-4 h-11 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Invalid / expired token — ONLY a real 404 is this dead-end. ──
  if (isNotFound) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("offer.invalidTitle")} description={t("offer.invalidBody")} path={`/offer/${token}`} noindex />
        {header}
        <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <LinkIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-navy-ink">{t("offer.invalidTitle")}</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{t("offer.invalidBody")}</p>
            <Button asChild className="mt-6 h-12 bg-accent px-6 font-display text-accent-foreground hover:bg-accent/90">
              <Link to="/request">
                {t("nav.getOffers")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {helpFooter}
          </div>
        </div>
      </div>
    );
  }

  // ── Retryable error (429 / 5xx / network) — a VALID offer must not be shown
  //    the "invalid link" dead-end. Offer a Retry instead of forcing a re-submit.
  if (isError || !offer) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("offer.errorTitle")} description={t("offer.errorBody")} path={`/offer/${token}`} noindex />
        {header}
        <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-navy-ink">{t("offer.errorTitle")}</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{t("offer.errorBody")}</p>
            <Button
              className="mt-6 h-12 gap-2 bg-accent px-6 font-display text-accent-foreground hover:bg-accent/90"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {t("offer.retry")}
            </Button>
            {helpFooter}
          </div>
        </div>
      </div>
    );
  }

  const chosen = offer.status === "chosen";
  const offerT = (key: string) => translateForLanguage(offer.language, key);
  const categoryLabel = serviceTypeLabel(t, offer.lead.category?.toLowerCase?.() ?? offer.lead.category);
  const title = t("offer.title")
    .replace("{category}", categoryLabel)
    .replace("{city}", offer.lead.city ?? "");

  return (
    <div className="min-h-screen surface-sunken">
      <SEO title={t("offer.seo.title")} description={t("offer.subtitle")} path={`/offer/${token}`} noindex />
      {header}
      <div className="container-wide mx-auto max-w-2xl py-8 md:py-12">
        <h1 className="font-display text-2xl font-bold leading-tight text-navy-ink md:text-3xl">{title}</h1>
        {!chosen && <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{t("offer.subtitle")}</p>}

        {/* Lead summary chips — the customer's own request context */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 ring-1 ring-border">
            <MapPin className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
            {offer.lead.city}{offer.lead.toCity ? ` → ${offer.lead.toCity}` : ""}
          </span>
          {offer.lead.needDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 ring-1 ring-border">
              <CalendarDays className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
              {new Date(offer.lead.needDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Pending request confirmation */}
        {chosen && (
          <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-success/25 bg-success/5 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                {offerT("offer.requestSent")}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{offerT("offer.requestSentBody")}</p>
            </div>
          </div>
        )}

        {/* Choose failure banner — the confirm dialog closes on error, so the
            feedback (stale-option / rate-limit / server / network) lives here. */}
        {chooseError && !chosen && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm font-medium text-destructive">{chooseError}</p>
          </div>
        )}

        <div className="mt-6">
          <OfferPresentation
            offer={offer}
            action={{
              label: offerT("offer.requestThis"),
              pendingOptionId: chooseMutation.isPending ? chooseMutation.variables ?? null : null,
              disabled: chooseMutation.isPending,
              onRequest: setConfirming,
            }}
          />
        </div>

        {helpFooter}
      </div>

      {/* Request confirmation */}
      <AlertDialog open={confirming != null} onOpenChange={(open) => { if (!open) setConfirming(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{offerT("offer.requestConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {offerT("offer.requestConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{offerT("offer.confirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => confirming && chooseMutation.mutate(confirming.id)}
            >
              {offerT("offer.requestConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
