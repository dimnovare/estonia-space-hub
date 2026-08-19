import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "@/i18n/routing";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, ArrowRight, Loader2, LinkIcon, AlertCircle, RotateCcw, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { OfferComparison } from "@/components/offers/OfferComparison";
import { OfferRequestRecap } from "@/components/offers/OfferRequestRecap";
import { OfferHelpPanel } from "@/components/offers/OfferHelpPanel";
import { offerService, type PublicOffer, type PublicOfferOption } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { leadCategoryLabel } from "@/lib/serviceTypes";

/**
 * /offer/{token} — the public concierge offer page (overhaul spec §5).
 * Anonymous + noindex; "Your options for {category} in {city}" with option
 * cards and a confirmed "Request this offer" flow. The backend 404s unknown,
 * draft and expired tokens identically → one invalid/expired state.
 * Contract: spec §5.1 (GET /offers/{token}, POST /offers/{token}/choose).
 *
 * What the button actually does, because every word on this page has to match
 * it: POST /choose flips the OFFER to Chosen and emails the ops inbox. It does
 * NOT move the lead, does not contact the provider, does not take payment, and
 * sends the customer no email of any kind — this page is their only receipt.
 * An admin then confirms availability by hand and marks the lead Booked. So
 * the customer's action is a stated preference, and nothing here may read as a
 * booking.
 */
export default function OfferPage() {
  const { token = "" } = useParams<{ token: string }>();
  // ONE language for the whole page. It used to run on two: the headline,
  // subtitle and error states came from the URL segment, while the request
  // button, the confirm dialog and the confirmation banner came from
  // `offer.language` (whatever the admin composed in). Those agree on the link
  // in the offer email — /{offer.language}/offer/{token} — but diverge the
  // moment the customer arrives from the status page, whose "View your offers"
  // link is built in the language they are BROWSING in. The result was an
  // English page with an Estonian button, and an Estonian "this is not a
  // confirmed booking" for a reader who chose Russian.
  //
  // The URL segment wins, on the grounds that the sentence which must be
  // understood is the one about it not being a booking. Judgment call: the
  // human-written parts of the offer (option titles, notes, our note) stay in
  // whatever language they were written in and we cannot translate them, so a
  // reader who switches language still sees mixed content — just not mixed
  // CHROME. If the founder wants the page pinned to the offer's language
  // instead, this is the one line to change.
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<PublicOfferOption | null>(null);
  // Inline banner for choose failures (the confirm dialog closes on error, so
  // the message must live on the page itself).
  const [chooseError, setChooseError] = useState<string | null>(null);
  // Only true for the transition that happens in THIS session. Re-opening an
  // already-chosen offer must not yank focus away from the top of the page.
  const [justRequested, setJustRequested] = useState(false);
  const confirmationRef = useRef<HTMLDivElement>(null);

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
      setJustRequested(true);
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

  // The button the customer pressed vanishes when the confirmation replaces it,
  // which drops keyboard and screen-reader focus onto <body> at the top of the
  // document — the one moment they most need to be told what just happened.
  useEffect(() => {
    if (!justRequested) return;
    confirmationRef.current?.focus();
    setJustRequested(false);
  }, [justRequested]);

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
      <div className="min-h-dvh surface-sunken">
        <SEO title={t("offer.seo.title")} description={t("offer.subtitle")} path={`/offer/${token}`} noindex />
        {header}
        <div className="container-wide mx-auto max-w-3xl py-10">
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
      <div className="min-h-dvh surface-sunken">
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
      <div className="min-h-dvh surface-sunken">
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

  const settled = offer.status === "chosen";
  // The API composes `lead` from a nullable navigation property and really does
  // emit null when it is missing; the generated type says otherwise. Dereferencing
  // it blind white-screens the last page before revenue, so narrow it here.
  const lead = offer.lead as PublicOffer["lead"] | null | undefined;
  // `category` is the lead's, not a directory tag, so it may be the wildcard
  // "any" — a request that named several services. Left to serviceTypeLabel that
  // echoed the raw slug into the headline the customer opens.
  const categoryLabel = leadCategoryLabel(t, lead?.category ?? "", t("offer.categoryAny"));
  // The title template glues category and city together with a connector
  // ("… for {category} in {city}"), so an empty city leaves a dangling
  // preposition. Fall back to the plain title rather than ship "… in ".
  const title = lead?.city
    ? t("offer.title").replace("{category}", categoryLabel).replace("{city}", lead.city)
    : t("offer.seo.title");

  return (
    <div className="min-h-dvh surface-sunken">
      <SEO title={t("offer.seo.title")} description={t("offer.subtitle")} path={`/offer/${token}`} noindex />
      {header}
      <div className="container-wide mx-auto max-w-3xl py-8 md:py-12">
        <h1 className="font-display text-2xl font-bold leading-tight text-navy-ink md:text-3xl">{title}</h1>
        {!settled && <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{t("offer.subtitle")}</p>}

        {/* The "this is not a booking" sentence used to exist only INSIDE the
            confirm dialog — i.e. only after the customer had already decided.
            It belongs where they are still deciding. */}
        {!settled && (
          <p className="mt-4 flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
            {t("offer.noBookingNote")}
          </p>
        )}

        {/* Pending request confirmation, directly under the heading: on a
            settled offer this is the answer the customer came back for, and it
            has to be the first thing on the page rather than something below
            a recap of what they asked for weeks ago. `tabIndex={-1}` is here
            only so focus can be moved to it (see the effect above). */}
        {settled && (
          <div
            ref={confirmationRef}
            tabIndex={-1}
            role="status"
            data-testid="offer-requested-banner"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40"
          >
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success-text" aria-hidden />
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                {t("offer.requestSent")}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("offer.requestSentBody")}</p>
            </div>
          </div>
        )}

        {/* Choose failure banner — the confirm dialog closes on error, so the
            feedback (stale-option / rate-limit / server / network) lives here. */}
        {chooseError && !settled && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm font-medium text-destructive">{chooseError}</p>
          </div>
        )}

        {lead && (
          <div className="mt-6">
            <OfferRequestRecap offer={offer} language={language} translate={t} />
          </div>
        )}

        <div className="mt-6">
          <OfferComparison
            offer={offer}
            translate={t}
            action={{
              label: t("offer.requestThis"),
              pendingOptionId: chooseMutation.isPending ? chooseMutation.variables ?? null : null,
              disabled: chooseMutation.isPending,
              onRequest: setConfirming,
            }}
          />
        </div>

        <OfferHelpPanel offer={offer} supportEmail={supportEmail} translate={t} settled={settled} />
      </div>

      {/* Request confirmation */}
      <AlertDialog open={confirming != null} onOpenChange={(open) => { if (!open) setConfirming(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("offer.requestConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("offer.requestConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("offer.confirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => confirming && chooseMutation.mutate(confirming.id)}
            >
              {t("offer.requestConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
