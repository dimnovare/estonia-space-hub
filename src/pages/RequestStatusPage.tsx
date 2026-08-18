import type { ComponentType, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle, ArrowRight, CalendarDays, Check, CircleDashed, Clock, Images,
  Inbox, LinkIcon, Loader2, MapPin, RotateCcw, SearchX, Send, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatCount } from "@/i18n/plural";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { SEO } from "@/components/SEO";
import { leadCategoryLabel } from "@/lib/serviceTypes";
import { queryKeys } from "@/services/queryKeys";
import {
  requestStatusService, type RequestStatus, type RequestStatusState,
} from "@/services/requestStatus";

/**
 * /{lang}/request-status/{token} — the concierge customer's own view of their
 * request.
 *
 * WHY IT EXISTS. They have no account. Between the receipt email and an offer
 * that may be days away they hear nothing, so a slow success and a total
 * failure look identical: while a city-matching bug was quietly emailing
 * nobody, no waiting customer could have told. Anonymous, token-keyed, noindex,
 * and built for a phone, because that is where the link gets opened.
 *
 * WHAT IT WILL NOT DO. Never names a provider (the platform brokers the
 * introduction), never shows a price before the offer is released, never
 * promises a time — there is deliberately no "within 24 hours" claim left in
 * this funnel because it could not be enforced. The API refuses to send any of
 * that; this page's job is to not invent it either.
 */

/**
 * The in-flight journey, in order.
 *
 * A request that has ENDED renders no journey at all: a progress bar on a dead
 * request implies somebody is still working on it, which is precisely the lie
 * this page exists to stop telling.
 */
const TIMELINE = ["received", "contacted", "collecting", "offer"] as const;
type TimelineStep = (typeof TIMELINE)[number];

/** How far along each live state is (index into TIMELINE); absent = terminal. */
const REACHED: Partial<Record<RequestStatusState, number>> = {
  received: 0,
  contacted: 1,
  collecting: 2,
  offer_sent: 3,
  chosen: 3,
};

type Tone = "live" | "good" | "flat";

/**
 * Every t() key on this page is written as a STATIC literal inside a switch,
 * never assembled as t(`requestStatus.state.${state}.title`).
 *
 * `t` falls back to returning the key, so a missing translation is not a type
 * error, not a lint error and not a test failure — it is the raw string
 * `requestStatus.state.contacted.title` shown to a customer. The only guard
 * against that is src/test/translationCoverage.test.ts, and it scans for
 * literals: a template key is invisible to it. Verbosity here buys real
 * coverage, which a computed key cannot have.
 */
function stateCopy(t: (key: string) => string, state: RequestStatusState): {
  title: string; body: string; tone: Tone; Icon: ComponentType<{ className?: string }>;
} {
  switch (state) {
    case "contacted":
      return { title: t("requestStatus.state.contacted.title"), body: t("requestStatus.state.contacted.body"), tone: "live", Icon: Send };
    case "collecting":
      return { title: t("requestStatus.state.collecting.title"), body: t("requestStatus.state.collecting.body"), tone: "live", Icon: Clock };
    case "offer_sent":
      return { title: t("requestStatus.state.offerSent.title"), body: t("requestStatus.state.offerSent.body"), tone: "good", Icon: Sparkles };
    case "chosen":
      return { title: t("requestStatus.state.chosen.title"), body: t("requestStatus.state.chosen.body"), tone: "good", Icon: Check };
    case "booked":
      return { title: t("requestStatus.state.booked.title"), body: t("requestStatus.state.booked.body"), tone: "good", Icon: Check };
    case "no_match":
      return { title: t("requestStatus.state.noMatch.title"), body: t("requestStatus.state.noMatch.body"), tone: "flat", Icon: SearchX };
    case "closed":
      return { title: t("requestStatus.state.closed.title"), body: t("requestStatus.state.closed.body"), tone: "flat", Icon: CircleDashed };
    // "received" and anything the API grows later. Falling back to "we have it"
    // is the only option that cannot become false: an unknown state might mean
    // progress we don't render yet, but it never means the request vanished.
    case "received":
    default:
      return { title: t("requestStatus.state.received.title"), body: t("requestStatus.state.received.body"), tone: "live", Icon: Inbox };
  }
}

/** Timeline labels — static literals, same reason as above. */
function stepCopy(t: (key: string) => string, step: TimelineStep): { label: string; now: string } {
  switch (step) {
    case "contacted":
      return { label: t("requestStatus.timeline.contacted"), now: t("requestStatus.timeline.contactedNow") };
    case "collecting":
      return { label: t("requestStatus.timeline.collecting"), now: t("requestStatus.timeline.collectingNow") };
    case "offer":
      return { label: t("requestStatus.timeline.offer"), now: t("requestStatus.timeline.offerNow") };
    case "received":
    default:
      return { label: t("requestStatus.timeline.received"), now: t("requestStatus.timeline.receivedNow") };
  }
}

export default function RequestStatusPage() {
  const { token = "" } = useParams<{ token: string }>();
  const { t, language } = useLanguage();
  const settings = usePlatformSettings();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<RequestStatus>({
    queryKey: queryKeys.requestStatus.byToken(token),
    queryFn: () => requestStatusService.get(token),
    enabled: token.length > 0,
    // Short, because the entire promise of this page is "this is current". A
    // person who opens it twice in a morning should not be served a stale answer.
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    // Same split as the offer page: a 4xx is terminal (unknown/expired token),
    // while a 429/5xx/network blip on a REAL request must not be shown a dead
    // end — being told your request does not exist is the worst possible lie here.
    retry: (failureCount, err: Error & { status?: number }) => {
      const s = err?.status;
      if (typeof s === "number" && s >= 400 && s < 500 && s !== 429) return false;
      return failureCount < 2;
    },
  });

  const errorStatus = (error as (Error & { status?: number }) | null)?.status;
  const isNotFound = isError && errorStatus === 404;

  const supportEmail = settings.siteEmail || "info@ruumly.eu";
  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null;

  // Minimal chrome: the global Navbar is suppressed for this route in
  // AppContent, exactly as for /offer and /quote, so the page carries its own
  // slim header. Someone who arrived from an email is here for one answer.
  const header = (
    <header className="border-b border-border bg-card">
      <div className="container-wide flex h-14 items-center">
        <Link
          to="/"
          aria-label="Ruumly"
          className="flex items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <img
            src="/ruumly-mark.png" alt="" aria-hidden="true" width={30} height={30}
            decoding="async" className="h-[30px] w-[30px] object-contain"
          />
          <span className="brand-word text-[20px]">Ruumly</span>
        </Link>
      </div>
    </header>
  );

  const helpFooter = (
    <p className="mt-10 text-center text-sm text-muted-foreground">
      {t("requestStatus.help").replace("{email}", "")}
      <a href={`mailto:${supportEmail}`} className="font-medium text-accent hover:underline">
        {supportEmail}
      </a>
    </p>
  );

  const shell = (seo: ReactNode, children: ReactNode) => (
    <div className="min-h-screen surface-sunken">
      {seo}
      {header}
      {children}
    </div>
  );

  /** Shared dead-end / retry layout — three states differ only in icon, copy and action. */
  const centered = (Icon: ComponentType<{ className?: string }>, title: string, body: string, action: ReactNode) => (
    <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-navy-ink">{title}</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
        {action}
        {helpFooter}
      </div>
    </div>
  );

  // ── Loading ──
  if (isLoading) {
    return shell(
      <SEO title={t("requestStatus.seo.title")} description={t("requestStatus.seo.description")}
        path={`/request-status/${token}`} noindex />,
      <div className="container-wide mx-auto max-w-2xl py-8 md:py-12">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-6 h-24 w-full rounded-xl" />
        <div className="mt-8 space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <Skeleton className="h-6 flex-1" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-40 w-full rounded-2xl" />
      </div>,
    );
  }

  // ── Unknown / expired token. ONLY a real 404: the backend 404s an unknown
  //    token identically to a missing one, so this is all we can honestly say. ──
  if (isNotFound) {
    return shell(
      <SEO title={t("requestStatus.invalidTitle")} description={t("requestStatus.invalidBody")}
        path={`/request-status/${token}`} noindex />,
      centered(LinkIcon, t("requestStatus.invalidTitle"), t("requestStatus.invalidBody"),
        <Button asChild className="mt-6 h-12 bg-accent px-6 font-display text-accent-foreground hover:bg-accent/90">
          <Link to="/request">
            {t("nav.getOffers")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>),
    );
  }

  // ── Retryable failure (429 / 5xx / offline). A real request must never be
  //    shown the dead end above just because the network hiccuped. ──
  if (isError || !data) {
    return shell(
      <SEO title={t("requestStatus.errorTitle")} description={t("requestStatus.errorBody")}
        path={`/request-status/${token}`} noindex />,
      centered(AlertCircle, t("requestStatus.errorTitle"), t("requestStatus.errorBody"),
        <Button
          className="mt-6 h-12 gap-2 bg-accent px-6 font-display text-accent-foreground hover:bg-accent/90"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {t("requestStatus.retry")}
        </Button>),
    );
  }

  const { state, request } = data;
  const { title, body, tone, Icon } = stateCopy(t, state);
  const reached = REACHED[state];
  const serviceLabel = leadCategoryLabel(t, request.service, t("requestStatus.categoryAny"));
  const route = request.toCity ? `${request.city} → ${request.toCity}` : request.city;

  const toneBox =
    tone === "good" ? "border-success/25 bg-success/5"
      : tone === "flat" ? "border-border bg-card"
        : "border-teal-deep/25 bg-teal-deep/5";
  const toneIcon =
    tone === "good" ? "text-success"
      : tone === "flat" ? "text-muted-foreground"
        : "text-teal-deep";

  return shell(
    <SEO title={t("requestStatus.seo.title")} description={t("requestStatus.seo.description")}
      path={`/request-status/${token}`} noindex />,
    <div className="container-wide mx-auto max-w-2xl py-8 md:py-12">
      <h1 className="font-display text-2xl font-bold leading-tight text-navy-ink md:text-3xl">
        {t("requestStatus.title").replace("{service}", serviceLabel).replace("{city}", request.city)}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("requestStatus.submittedOn").replace("{date}", fmtDate(request.submittedAt) ?? "")}
      </p>

      {/* Where it actually is. role="status" so a screen reader is given the one
          thing the visitor came for, rather than made to hunt for it. */}
      <div role="status" className={`mt-6 flex items-start gap-3 rounded-xl border p-4 ${toneBox}`}>
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${toneIcon}`} />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-navy-ink">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>

      {/* Journey — live requests only. Vertical, because a four-label horizontal
          stepper is unreadable at 375px, which is most of this page's traffic. */}
      {reached !== undefined && (
        <ol className="mt-8" aria-label={t("requestStatus.timelineLabel")}>
          {TIMELINE.map((step, i) => {
            const { label, now } = stepCopy(t, step);
            const done = i < reached;
            const current = i === reached;
            const last = i === TIMELINE.length - 1;
            return (
              <li key={step} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? "step" : undefined}>
                {/* Connector, drawn behind the dot and stopped before the last one. */}
                {!last && (
                  <span
                    aria-hidden
                    className={`absolute left-[15px] top-8 h-full w-0.5 ${done ? "bg-success/40" : "bg-border"}`}
                  />
                )}
                <span
                  aria-hidden
                  className={[
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                    done ? "border-success bg-success text-white"
                      : current ? "border-teal-deep bg-card text-teal-deep"
                        : "border-border bg-card text-muted-foreground",
                  ].join(" ")}
                >
                  {done
                    ? <Check className="h-4 w-4" strokeWidth={3} />
                    : <span className={`h-2 w-2 rounded-full ${current ? "bg-teal-deep" : "bg-border"}`} />}
                </span>
                <div className="min-w-0 pt-1">
                  <p className={`text-sm font-medium ${current || done ? "text-navy-ink" : "text-muted-foreground"}`}>
                    {label}
                  </p>
                  {current && <p className="mt-0.5 text-sm text-muted-foreground">{now}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* The honest number — shown at zero, and shown on a request that ended
          without a match. "18 providers, no replies" is exactly the fact five
          Viljandi customers were never told, and it is what makes this page
          worth opening instead of reassuring noise. */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-3xl font-bold tabular-nums text-navy-ink">
            {data.providersContacted}
          </span>
          <span className="text-sm font-medium text-foreground">
            {formatCount(language, data.providersContacted, t("requestStatus.providersContacted"))}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {data.providersContacted === 0
            ? t("requestStatus.providersNoneYet")
            : t("requestStatus.providersSince").replace("{date}", fmtDate(data.providersContactedAt) ?? "")}
        </p>
      </div>

      {/* The offer, if there is one. The API returns a token, not a URL, so the
          language prefix stays ours to add — a Russian speaker reaches the
          Russian copy of their own offer. */}
      {data.offerToken && (
        <Button
          asChild
          className="mt-6 h-12 w-full bg-accent font-display text-base text-accent-foreground hover:bg-accent/90"
        >
          <Link to={`/offer/${data.offerToken}`}>
            {t("requestStatus.viewOffer")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}

      {/* What they asked for, read back, so they can catch their OWN mistake
          while it is still cheap to fix. The street address is deliberately
          absent (here and in the API): this link travels by email, and email
          gets forwarded. */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-navy-ink">
          {t("requestStatus.yourRequest")}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <dt className="text-muted-foreground">{t("requestStatus.service")}</dt>
            <dd className="font-medium text-foreground">{serviceLabel}</dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
              {request.toCity ? t("requestStatus.route") : t("requestStatus.city")}
            </dt>
            <dd className="font-medium text-foreground">{route}</dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
              {t("requestStatus.date")}
            </dt>
            <dd className="font-medium text-foreground">
              {fmtDate(request.needDate) ?? t("requestStatus.dateFlexible")}
            </dd>
          </div>
          {request.photoCount > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Images className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
                {t("requestStatus.photos")}
              </dt>
              <dd className="font-medium tabular-nums text-foreground">
                {formatCount(language, request.photoCount, t("requestStatus.photoCount"))}
              </dd>
            </div>
          )}
          {request.details && (
            <div className="pt-1">
              <dt className="text-muted-foreground">{t("requestStatus.details")}</dt>
              <dd className="mt-1 whitespace-pre-line leading-relaxed text-foreground">{request.details}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
          {t("requestStatus.somethingWrong").replace("{email}", "")}
          <a href={`mailto:${supportEmail}`} className="font-medium text-accent hover:underline">
            {supportEmail}
          </a>
        </p>
      </section>

      {/* A request that ended without a match is a dead end unless we offer the
          way forward right here. Reuses the funnel's own CTA label. */}
      {state === "no_match" && (
        <Button asChild variant="outline" className="mt-6 h-12 w-full font-display text-base">
          <Link to="/request">
            {t("nav.getOffers")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}

      {helpFooter}
    </div>,
  );
}
