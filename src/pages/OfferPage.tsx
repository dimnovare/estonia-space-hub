import { useState } from "react";
import { useParams, Link } from "@/i18n/routing";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, MapPin, ArrowRight, CalendarDays, Loader2, LinkIcon,
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
  const [justChosen, setJustChosen] = useState(false);

  const { data: offer, isLoading, isError } = useQuery<PublicOffer>({
    queryKey: queryKeys.offers.byToken(token),
    queryFn: () => offerService.get(token),
    enabled: token.length > 0,
    staleTime: 30_000,
    retry: false,
  });

  const chooseMutation = useMutation({
    mutationFn: (optionId: string) => offerService.choose(token, optionId),
    onSuccess: (res) => {
      setJustChosen(true);
      setConfirming(null);
      // Reflect the chosen state locally without waiting for a refetch.
      qc.setQueryData<PublicOffer>(queryKeys.offers.byToken(token), (prev) =>
        prev ? { ...prev, status: "chosen", chosenOptionId: res.chosenOptionId } : prev);
    },
    onError: (err: Error & { status?: number }) => {
      setConfirming(null);
      // 409 = a different option was already chosen (e.g. second device) —
      // refetch so the page shows the real chosen state.
      if (err?.status === 409) {
        qc.invalidateQueries({ queryKey: queryKeys.offers.byToken(token) });
      }
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

  // ── Invalid / expired token ──
  if (isError || !offer) {
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

  const chosen = offer.status === "chosen";
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

        {/* Success banner (just chosen) / already-chosen note */}
        {chosen && (
          <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-success/25 bg-success/5 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                {justChosen ? t("offer.successTitle") : t("offer.alreadyChosen")}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("offer.successBody")}</p>
            </div>
          </div>
        )}

        {/* Concierge note */}
        {offer.customerNote && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.16em] text-teal-deep">{t("offer.noteLabel")}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{offer.customerNote}</p>
          </div>
        )}

        {/* Option cards */}
        <div className="mt-6 space-y-4">
          {offer.options.map((opt) => {
            const isChosenOption = chosen && offer.chosenOptionId === opt.id;
            return (
              <div
                key={opt.id}
                className={`rounded-2xl border bg-card p-5 shadow-card transition-all ${
                  isChosenOption ? "border-success ring-1 ring-success" : chosen ? "border-border opacity-60" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-foreground">{opt.title}</h2>
                    {opt.supplierName && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{opt.supplierName}</p>
                    )}
                  </div>
                  {opt.priceAmount != null && (
                    <p className="shrink-0 font-display text-xl font-extrabold text-navy-ink">
                      €{opt.priceAmount}
                      {opt.priceUnit && <span className="ml-1 text-sm font-medium text-muted-foreground">{opt.priceUnit}</span>}
                    </p>
                  )}
                </div>
                {opt.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{opt.notes}</p>
                )}
                {isChosenOption ? (
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
                    <CheckCircle className="h-4 w-4" aria-hidden />
                    {t("offer.chosenBadge")}
                  </p>
                ) : !chosen && (
                  <Button
                    className="mt-4 h-12 w-full bg-accent font-display text-accent-foreground hover:bg-accent/90 sm:w-auto sm:px-6"
                    disabled={chooseMutation.isPending}
                    onClick={() => setConfirming(opt)}
                  >
                    {chooseMutation.isPending && chooseMutation.variables === opt.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : t("offer.choose")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {helpFooter}
      </div>

      {/* Choose confirmation */}
      <AlertDialog open={confirming != null} onOpenChange={(open) => { if (!open) setConfirming(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("offer.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("offer.confirmBody").replace("{title}", confirming?.title ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("offer.confirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => confirming && chooseMutation.mutate(confirming.id)}
            >
              {t("offer.confirmCta")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
