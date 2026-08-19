import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MailCheck, MailX, PhoneOff, VolumeX } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  fetchProviderSilence, providerSilenceKey,
  type OutreachDeliveryMetrics,
} from "./leadOpsApi";
import { daysSince } from "./LeadOutreachSummary";

/**
 * The two facts the concierge funnel actually turns on, side by side: did our
 * mail arrive, and who never answers it.
 *
 * WHY THESE ARE ONE PANEL. On its own, "9% of requests produce a quote" is a
 * number with three incompatible explanations — the mail never landed, it landed
 * and was ignored, or we asked the wrong companies. Delivery answers the first;
 * the never-answered roll-call answers the third. Read together they leave one
 * explanation standing, which is the only way this screen helps decide anything.
 *
 * WHY NOT KPI TILES. A tile is a single number, and every number here is
 * meaningless without its denominator and its unknowns. "86% delivered" over 14
 * measured messages, with 6 more we know nothing about, is an honest sentence;
 * "86%" in a box is not.
 *
 * THE HONESTY RULES, all of which have a branch below:
 *   • no telemetry yet → say so; never render 0%.
 *   • rows sent before receipts existed → counted separately as unknown, never
 *     as undelivered.
 *   • opens are OFF at the Resend account level, so a zero is not evidence. The
 *     open line only ever appears when somebody demonstrably opened something.
 */
export function LeadDeliveryPanel({ delivery }: { delivery: OutreachDeliveryMetrics | undefined }) {
  const { t, language } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const silence = useQuery({
    queryKey: providerSilenceKey(20),
    queryFn: () => fetchProviderSilence(20),
    staleTime: 60_000,
    // A roll-call is context, not a blocker: if the endpoint is missing (an API
    // older than this build) the delivery half must still render.
    retry: false,
  });

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleDateString();
    }
  };

  const measured = delivery?.sent ?? 0;
  const hasMeasurement = !!delivery && measured > 0 && delivery.deliveredRate != null;
  const deliveredPct = hasMeasurement ? Math.round(delivery!.deliveredRate! * 100) : null;
  const roll = silence.data;
  const visible = roll ? (showAll ? roll.items : roll.items.slice(0, 5)) : [];

  return (
    <div className="mt-4 grid gap-px overflow-hidden rounded-[14px] border border-border bg-border shadow-card lg:grid-cols-2">
      {/* ── Did the ask arrive? ── */}
      <section aria-labelledby="lead-delivery-heading" className="bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <span id="lead-delivery-heading" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("admin.leads.deliveryPanelTitle")}
          </span>
          <MailCheck className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70" aria-hidden />
        </div>

        {!delivery ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("admin.leads.deliveryUnavailable")}</p>
        ) : !hasMeasurement ? (
          /* The critical branch. Before the first receipt ever arrives there is
             nothing to divide by, and "0% delivered" would be a false alarm
             about the mail rather than a true statement about the telemetry. */
          <>
            <p className="font-data mt-2 text-[26px] font-semibold leading-none text-navy-ink">—</p>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              {t("admin.leads.deliveryNoMeasurement")}
            </p>
            {delivery.unknownSent > 0 && (
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {t("admin.leads.deliveryUntrackedCount").replace("{count}", String(delivery.unknownSent))}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-data mt-2 text-[26px] font-semibold leading-none text-navy-ink">
              {deliveredPct}%
            </p>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              {t("admin.leads.deliveryDeliveredOf")
                .replace("{delivered}", String(delivery.delivered))
                .replace("{sent}", String(measured))}
              {delivery.measuredFrom && (
                <> · {t("admin.leads.deliveryMeasuredSince").replace("{date}", formatDate(delivery.measuredFrom))}</>
              )}
            </p>

            {/* Two segments, never three: delivered and not-yet-accounted-for.
                There is no "undelivered" segment, because a missing receipt is
                not one. */}
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-secondary" role="presentation">
              <div className="bg-success" style={{ width: `${deliveredPct}%` }} />
            </div>

            <dl className="mt-3 space-y-1 text-[12.5px]">
              {measured > delivery.delivered && (
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">{t("admin.leads.deliveryNoReceipt")}</dt>
                  <dd className="font-data text-foreground">{measured - delivery.delivered}</dd>
                </div>
              )}
              {delivery.unknownSent > 0 && (
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">{t("admin.leads.deliveryUntracked")}</dt>
                  <dd className="font-data text-foreground">{delivery.unknownSent}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">{t("admin.leads.deliveryOpens")}</dt>
                {/* Opens are only ever reported upward. Tracking is off at the
                    account level, so an absence proves nothing and is labelled
                    as an absence of measurement, not of interest. */}
                <dd className={delivery.opened > 0 ? "font-data text-foreground" : "text-muted-foreground"}>
                  {delivery.opened > 0 ? delivery.opened : t("admin.leads.deliveryOpensUnavailable")}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      {/* ── Who never answers ── */}
      <section aria-labelledby="lead-silence-heading" className="bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <span id="lead-silence-heading" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("admin.leads.silenceTitle")}
          </span>
          <VolumeX className="h-[18px] w-[18px] shrink-0 text-muted-foreground/70" aria-hidden />
        </div>

        {!roll || roll.providersContacted === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("admin.leads.silenceEmpty")}</p>
        ) : (
          <>
            <p className="font-data mt-2 text-[26px] font-semibold leading-none text-navy-ink">
              {roll.providersSilent}<span className="text-muted-foreground">/{roll.providersContacted}</span>
            </p>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              {t("admin.leads.silenceSummary").replace("{asks}", String(roll.asksUnanswered))}
            </p>

            <ul className="mt-3 divide-y divide-border text-[12.5px]">
              {visible.map((provider) => (
                <li key={provider.supplierId} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5 first:pt-0">
                  <span className="min-w-0 font-medium text-navy-ink">
                    {provider.supplierName ?? provider.supplierId}
                    {provider.city && <span className="ml-1.5 font-normal text-muted-foreground">{provider.city}</span>}
                  </span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span className="font-data">
                      {t("admin.leads.silenceAsks")
                        .replace("{count}", String(provider.asked))
                        .replace("{days}", String(daysSince(provider.lastAskedAt)))}
                    </span>
                    {/* The verdict-changing detail: a dead address never had the
                        chance to answer, and a delivered ask that got nothing is
                        a rejection of the ask itself. */}
                    {provider.contactEmailUnusable || provider.deliveryFailed > 0 ? (
                      <span className="inline-flex items-center gap-1 text-destructive-text" title={t("admin.leads.silenceUnreachableHint")}>
                        <MailX className="h-3 w-3" aria-hidden />{t("admin.leads.silenceUnreachable")}
                      </span>
                    ) : provider.delivered > 0 ? (
                      <span className="inline-flex items-center gap-1" title={t("admin.leads.silenceIgnoredHint")}>
                        <PhoneOff className="h-3 w-3" aria-hidden />{t("admin.leads.silenceIgnored")}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>

            {roll.items.length > 5 && (
              <button
                type="button"
                className="mt-2 min-h-[36px] text-xs font-medium text-teal-text hover:underline"
                onClick={() => setShowAll((open) => !open)}
              >
                {/* Two literal calls rather than t(cond ? a : b): the coverage
                    scan only sees a key that sits directly inside t(). */}
                {(showAll ? t("admin.leads.silenceShowLess") : t("admin.leads.silenceShowAll"))
                  .replace("{count}", String(roll.items.length))}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
