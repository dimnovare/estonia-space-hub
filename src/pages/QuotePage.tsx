import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "@/i18n/routing";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CheckCircle, MapPin, ArrowRight, CalendarDays, Loader2, LinkIcon,
  AlertCircle, RotateCcw, Send, Tag, Clock, CircleSlash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { QuoteLeadPhotos } from "@/components/QuoteLeadPhotos";
import { QuoteNeedInfo } from "@/components/QuoteNeedInfo";
import { readQuoteFailure } from "@/components/quoteFailure";
import { quoteService, type PublicQuote, type QuoteSubmitInput, type QuoteSubmitResult } from "@/services";
import { queryKeys } from "@/services/queryKeys";
import { leadCategoryLabel } from "@/lib/serviceTypes";
import { parseMoney } from "@/lib/parseMoney";
import type { BillingPeriod } from "@/lib/priceUnit";

/**
 * /{lang}/quote/{token} — the public provider quote page (Feature B).
 *
 * Anonymous, noindex, minimal chrome (the global Navbar is suppressed for
 * /quote/ routes in AppContent, like /offer/). A provider opens this from the
 * outreach email, sees ONLY what they are quoting (category / city / route /
 * date / size — no customer PII), and submits a price. Submitting marks the
 * outreach Replied and auto-seeds the lead's draft offer server-side.
 *
 * Contract (spec §B): GET /quote/{token} → { provider, lead, currency,
 * alreadySubmitted, existing? }; POST /quote/{token} { priceAmount, priceUnit,
 * availability, note }. The backend 404s unknown/expired tokens → one clean
 * invalid state (mirrors OfferPage).
 */

// The unit options reuse the canonical price-unit periods used elsewhere
// (lib/priceUnit.ts). Order: most-common concierge units first.
const UNIT_PERIODS: BillingPeriod[] = ["month", "onetime", "day", "week", "hour"];

/**
 * What each trade actually sells in — the unit this form starts on.
 *
 * Not cosmetic. Whatever is preselected rides untouched into the customer's
 * offer: a mover who types 350 against a "/mo" they never looked at has just
 * quoted €350 a month for one day's work, and the customer is the one who finds
 * out. Every category defaulted to month, which was right when this page only
 * ever served the storage vertical and has been wrong for every one added since.
 */
const DEFAULT_UNIT_BY_CATEGORY: Record<string, BillingPeriod> = {
  // Storage is the one genuinely recurring vertical: a unit is rented by the
  // month and billed until it is handed back.
  warehouse: "month",
  // A move is one job at one price — a crew, a van, a day. Movers quote the
  // whole thing; there is no second month of it.
  moving: "onetime",
  // A clean is priced per visit for the same reason: one flat, one job.
  cleaning: "onetime",
  // Trailers and vans go out for a Saturday or a weekend, and every provider in
  // both verticals advertises a day rate. Hourly exists but is the exception.
  trailer: "day",
  vanrental: "day",
};

/**
 * The wildcard "any" (a multi-service concierge request) and any slug we don't
 * recognise stay on month: a multi-service ask is most often storage-led, and
 * month is what this page has always done, so an unknown category can only ever
 * be as wrong as it is today — never newly wrong.
 */
function defaultUnitFor(category: string | null | undefined): BillingPeriod {
  return DEFAULT_UNIT_BY_CATEGORY[category?.trim().toLowerCase() ?? ""] ?? "month";
}

export default function QuotePage() {
  const { token = "" } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const settings = usePlatformSettings();

  // ── Form state ──
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<string>("");
  const [availability, setAvailability] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuoteSubmitResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // The lead closed while this page was open: the GET said it was quotable but
  // the POST came back 409 lead_closed. Same destination as quote.closed.
  const [closedOnSubmit, setClosedOnSubmit] = useState(false);
  const seededRef = useRef(false);

  // Mirrors provider/ProviderListings.priceUnitOptionsFor: keep the stored value
  // as a fallback option when it isn't one of the canonical choices. The backend
  // stores `unit` as an unconstrained (clamped) string, so a value we didn't mint
  // must never blank the select and silently submit an empty unit on re-save.
  const unitOptions = useMemo(() => {
    const base = UNIT_PERIODS.map((period) => ({ value: t(`priceUnit.${period}`).trim(), label: t(`quote.unit.${period}`) }));
    return unit && !base.some((o) => o.value === unit) ? [...base, { value: unit, label: unit }] : base;
  }, [t, unit]);

  const { data: quote, isLoading, isError, error, refetch, isFetching } = useQuery<PublicQuote>({
    queryKey: queryKeys.quotes.byToken(token),
    queryFn: () => quoteService.get(token),
    enabled: token.length > 0,
    staleTime: 30_000,
    // No 4xx is retried. 404/expired/malformed never succeeds on retry, and the
    // endpoint is rate-limited to 5 requests / 10 min per IP — auto-retrying a
    // 429 would burn the provider's remaining budget, so it gets its own state
    // with a manual retry. Only a transient 5xx / network blip is retried.
    retry: (failureCount, err: Error & { status?: number }) => {
      const s = err?.status;
      if (typeof s === "number" && s >= 400 && s < 500) return false;
      return failureCount < 2;
    },
  });
  const getErrorStatus = (error as (Error & { status?: number }) | null)?.status;
  // Branch the three failure modes apart: 404 = dead link (terminal), 429 =
  // rate limited (wait and retry), anything else = retryable.
  const isNotFound = isError && getErrorStatus === 404;
  const isRateLimited = isError && getErrorStatus === 429;

  // Prefill the form once from an already-submitted quote (spec: "update your
  // quote"); otherwise start on the unit this trade sells in. Seeds a single
  // time per token.
  useEffect(() => {
    if (!quote || seededRef.current) return;
    seededRef.current = true;
    const existing = quote.alreadySubmitted ? quote.existing : null;
    if (existing) {
      setPrice(existing.amount != null ? String(existing.amount) : "");
      setAvailability(existing.availability ?? "");
      setNote(existing.note ?? "");
    }
    // A unit the provider already chose always wins — our idea of their trade
    // must never silently rewrite their own answer on an update. Only a stored
    // value that says nothing at all (absent, or blank after the clamp) falls
    // through to the category default, because a blank would otherwise show a
    // unit in the select while submitting none.
    const storedUnit = existing?.unit?.trim();
    setUnit(storedUnit || t(`priceUnit.${defaultUnitFor(quote.lead.category)}`).trim());
  }, [quote, t]);

  const submitMutation = useMutation({
    mutationFn: (body: QuoteSubmitInput) => quoteService.submit(token, body),
    onSuccess: (res) => {
      setFormError(null);
      // Keep the server's echo: the thank-you screen shows the amount that was
      // actually STORED, so a provider can spot a mis-read price themselves
      // instead of finding out when the customer is quoted the wrong number.
      setResult(res ?? null);
      setSubmitted(true);
    },
    onError: (err: Error & { status?: number; body?: unknown; retryAfter?: number }) => {
      // The form state is never cleared on failure — the provider must not have
      // to retype their price because of a transient/validation error.
      //
      // The branch itself moved to components/quoteFailure, because the second
      // form on this page needs the same one: both POST this token through the
      // same rate limiter, so 404 / 409 lead_closed / 429 / 400 mean the same
      // thing to each, and one copy is what stops the two drifting apart.
      // Behaviour here is unchanged — `quote.submitError` is still the fallback,
      // and 409 lead_closed is still the page-level dead end rather than a
      // message beside the price field.
      const failure = readQuoteFailure(err, t, t("quote.submitError"));
      if (failure.kind === "closed") { setClosedOnSubmit(true); return; }
      setFormError(failure.message);
    },
  });

  const supportEmail = settings.siteEmail || "info@ruumly.eu";

  // Minimal chrome: the global Navbar is suppressed for /quote/ routes
  // (AppContent), so the page carries its own slim logo header.
  const header = (
    <header className="border-b border-border bg-card">
      <div className="container-wide flex h-14 items-center">
        <Link to="/" aria-label="Ruumly" className="flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/ruumly-mark.png" alt="" aria-hidden="true" width={30} height={30} decoding="async" className="h-[30px] w-[30px] object-contain" />
          <span className="brand-word text-[20px]">Ruumly</span>
        </Link>
      </div>
    </header>
  );

  const helpFooter = (
    <p className="mt-10 text-center text-sm text-muted-foreground">
      {t("quote.help").replace("{email}", "")}
      <a href={`mailto:${supportEmail}`} className="font-medium text-teal-deep hover:underline">{supportEmail}</a>
    </p>
  );

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("quote.seo.title")} description={t("quote.subtitle")} path={`/quote/${token}`} noindex />
        {header}
        <div className="container-wide mx-auto max-w-xl py-10">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-4 h-11 w-full rounded-md" />
            <Skeleton className="mt-3 h-11 w-full rounded-md" />
            <Skeleton className="mt-3 h-24 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  // ── Invalid / expired token — ONLY a real 404 is this dead-end. ──
  if (isNotFound) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("quote.invalidTitle")} description={t("quote.invalidBody")} path={`/quote/${token}`} noindex />
        {header}
        <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <LinkIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-navy-ink">{t("quote.invalidTitle")}</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{t("quote.invalidBody")}</p>
            <Button asChild className="mt-6 h-12 bg-primary px-6 font-display text-primary-foreground hover:bg-primary/90">
              <Link to="/">
                {t("quote.backHome")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {helpFooter}
          </div>
        </div>
      </div>
    );
  }

  // ── Rate limited (429) — the endpoint allows 5 requests / 10 min per IP. This
  //    is NOT a dead link: say so plainly and let them retry when ready. ──
  if (isRateLimited) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("quote.rateLimitTitle")} description={t("quote.rateLimitBody")} path={`/quote/${token}`} noindex />
        {header}
        <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-7 w-7 text-warning-text" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-navy-ink">{t("quote.rateLimitTitle")}</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{t("quote.rateLimitBody")}</p>
            <Button
              className="mt-6 h-12 gap-2 bg-primary px-6 font-display text-primary-foreground hover:bg-primary/90"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {t("quote.retry")}
            </Button>
            {helpFooter}
          </div>
        </div>
      </div>
    );
  }

  // ── Retryable error (5xx / network) — a VALID token must not be shown the
  //    "invalid link" dead-end. Offer a Retry instead. ──
  if (isError || !quote) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("quote.errorTitle")} description={t("quote.errorBody")} path={`/quote/${token}`} noindex />
        {header}
        <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-navy-ink">{t("quote.errorTitle")}</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{t("quote.errorBody")}</p>
            <Button
              className="mt-6 h-12 gap-2 bg-primary px-6 font-display text-primary-foreground hover:bg-primary/90"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {t("quote.retry")}
            </Button>
            {helpFooter}
          </div>
        </div>
      </div>
    );
  }

  // `category` is a ServiceCategories slug and may legitimately be the wildcard
  // "any" (a multi-category concierge request) — serviceTypeLabel would echo the
  // raw slug, so give the provider a readable label instead. Shared with the
  // customer-facing offer page, which was still echoing it.
  const categoryLabel = leadCategoryLabel(t, quote.lead.category, t("quote.categoryAny"));

  // ── Closed lead — quoting is over (spec Fix 7). Reached either upfront from
  //    the GET (`closed`), or from a 409 lead_closed if it closed mid-visit.
  //    Deliberately NOT the invalid-link state: the link is fine, the job is
  //    gone, and telling a provider their link is broken would be a lie. ──
  if (quote.closed || closedOnSubmit) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("quote.closedTitle")} description={t("quote.closedBody")} path={`/quote/${token}`} noindex />
        {header}
        <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <CircleSlash className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-navy-ink">{t("quote.closedTitle")}</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{t("quote.closedBody")}</p>
            {helpFooter}
          </div>
        </div>
      </div>
    );
  }

  // ── Thank-you state ──
  if (submitted) {
    return (
      <div className="min-h-screen surface-sunken">
        <SEO title={t("quote.seo.title")} description={t("quote.subtitle")} path={`/quote/${token}`} noindex />
        {header}
        <div className="container-wide mx-auto max-w-xl py-10 md:py-14">
          <div role="status" className="rounded-xl border border-success/25 bg-success/5 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
              <div>
                <h1 className="font-display text-xl font-bold text-navy-ink">{t("quote.thanksTitle")}</h1>
                {/* Echo what the server STORED, not what was typed — the only
                    way a provider can catch a mis-read price themselves. */}
                {result?.amount != null && (
                  <p className="mt-2 font-display text-base font-bold text-navy-ink">
                    {t("quote.thanksAmount").replace(
                      "{price}",
                      `€${result.amount}${result.unit ? ` ${result.unit.replace(/^€\s*\/?\s*/, "/ ").replace(/^\/\s*/, "/ ")}` : ""}`,
                    )}
                  </p>
                )}
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("quote.thanksBody")}</p>
              </div>
            </div>
          </div>
          {helpFooter}
        </div>
      </div>
    );
  }

  const submit = () => {
    // Strict: parseFloat prefix-parsed "1 200,50" to 1 and every guard passed it,
    // so the provider got a success screen while €1 went to the customer. Bad
    // input must be a visible error, never a quietly different number.
    const amount = parseMoney(price);
    if (amount === null) { setFormError(t("quote.priceRequired")); return; }
    setFormError(null);
    submitMutation.mutate({
      priceAmount: amount,
      priceUnit: unit.trim() || null,
      availability: availability.trim() || null,
      note: note.trim() || null,
    });
  };

  const alreadySubmitted = quote.alreadySubmitted;

  // ── Main form ──
  return (
    <div className="min-h-screen surface-sunken">
      <SEO title={t("quote.seo.title")} description={t("quote.subtitle")} path={`/quote/${token}`} noindex />
      {header}
      <div className="container-wide mx-auto max-w-xl py-8 md:py-12">
        <span className="font-mono-label text-[11px] font-medium uppercase tracking-[0.16em] text-teal-deep">
          {t("quote.eyebrow").replace("{provider}", quote.provider.name)}
        </span>
        <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight text-navy-ink md:text-3xl">{t("quote.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("quote.subtitle")}</p>

        {/* The lead ask — what they are quoting. NO customer PII. */}
        <div className="mt-5 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("quote.askTitle")}</p>
          <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-medium text-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <Tag className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
              {categoryLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
              {quote.lead.city}{quote.lead.toCity ? ` → ${quote.lead.toCity}` : ""}
            </span>
            {quote.lead.needDate && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
                {new Date(quote.lead.needDate).toLocaleDateString()}
              </span>
            )}
          </div>
          {quote.lead.details && (
            <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {quote.lead.details}
            </p>
          )}
          {/* Part of the ask, not an extra: for a bulky or awkward load the
              photos ARE the brief, and the outreach email already told this
              provider they exist. Renders nothing when there are none. */}
          <QuoteLeadPhotos token={token} count={quote.lead.photoCount ?? 0} />
        </div>

        {/* Quote form */}
        <form
          className="mt-5 rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          {alreadySubmitted && (
            <p className="mb-4 flex items-start gap-2 rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-xs font-medium text-info">
              <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("quote.updateHint")}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted-foreground">
              {t("quote.priceLabel")}
              <div className="mt-1 flex items-center rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
                <span className="pl-3 text-sm text-muted-foreground" aria-hidden>€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t("quote.pricePlaceholder")}
                  className="h-11 w-full min-w-0 rounded-md bg-transparent px-2 text-sm text-foreground focus:outline-none"
                />
              </div>
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              {t("quote.unitLabel")}
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 h-11 w-full cursor-pointer rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {unitOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block text-xs font-medium text-muted-foreground">
            {t("quote.availabilityLabel")}
            <input
              type="text"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder={t("quote.availabilityPlaceholder")}
              className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="mt-4 block text-xs font-medium text-muted-foreground">
            {t("quote.noteLabel")}
            <textarea
              value={note}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("quote.notePlaceholder")}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          {formError && (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {formError}
            </p>
          )}

          <Button
            type="submit"
            className="mt-5 h-12 w-full justify-center gap-2 bg-primary font-display text-primary-foreground hover:bg-primary/90"
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {alreadySubmitted ? t("quote.updateCta") : t("quote.submitCta")}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">{t("quote.noPii")}</p>
        </form>

        {/* The provider's other honest answer: "I can't price this from what
            you sent." It sits BELOW the price form and is quieter than it on
            purpose — a price is still what we are asking for — and pressing it
            withdraws nobody from the job: the form above stays live and
            submittable while Ruumly chases the missing detail. */}
        <QuoteNeedInfo
          token={token}
          // `infoRequested` is exactly `infoRequest != null` on the wire, but
          // the two are read separately so a payload carrying only the flag
          // still shows the provider that their question is on the record,
          // instead of inviting them to ask the same thing a second time.
          asked={quote.infoRequested === true || quote.infoRequest != null}
          initial={quote.infoRequest ?? null}
          // A request that closes mid-visit is the PAGE's state, not the
          // panel's: the whole page becomes the closed dead-end, exactly as it
          // does when the price submit meets the same 409.
          onLeadClosed={() => setClosedOnSubmit(true)}
        />

        {helpFooter}
      </div>
    </div>
  );
}
