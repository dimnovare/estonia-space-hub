import { Scale } from "lucide-react";
import { translateForLanguage } from "@/i18n/LanguageContext";
import type { PublicOffer, PublicOfferOption } from "@/services";
import { OfferOptionCard } from "./OfferOptionCard";
import { compareOfferOptions } from "./offerPricing";

export interface OfferComparisonProps {
  offer: PublicOffer;
  action?: {
    label: string;
    pendingOptionId: string | null;
    disabled: boolean;
    onRequest(option: PublicOfferOption): void;
  };
  preview?: boolean;
  /**
   * Which language OUR words render in. Defaults to the offer's own language,
   * which is what the admin delivery preview wants ("show me the page as the
   * customer will get it"); the live page passes the reader's `t`.
   */
  translate?: (key: string) => string;
}

/**
 * The set of options, presented as a comparison rather than a stack.
 *
 * Props are a superset of the older `OfferPresentation`, which this replaces on
 * the customer page. `components/admin/leads/LeadDeliveryReview.tsx` still
 * renders `OfferPresentation`, so the admin's "customer page" preview now shows
 * something the customer does not see — swapping that import is a one-line
 * change owned by whoever owns the admin tree.
 */
export function OfferComparison({ offer, action, preview = false, translate }: OfferComparisonProps) {
  const t = translate ?? ((key: string) => translateForLanguage(offer.language, key));
  const settled = offer.status === "chosen";
  const comparison = compareOfferOptions(offer.options, t);

  return (
    <div data-testid={preview ? "offer-preview" : "offer-presentation"} className="space-y-4">
      {offer.customerNote && (
        <div className="rounded-2xl border border-teal-deep/25 bg-card p-4">
          <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.16em] text-teal-text">
            {t("offer.noteLabel")}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {offer.customerNote}
          </p>
        </div>
      )}

      {/* The one thing a price comparison must never do is let two numbers on
          different billing periods look like a €10 gap. When we cannot prove
          the options sit on the same footing we say so, and suppress the
          "lowest price" marker rather than compute a meaningless winner. */}
      {comparison.mixedTerms && !settled && (
        <p
          data-testid="offer-mixed-terms"
          className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground"
        >
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
          {t("offer.unitsDiffer")}
        </p>
      )}

      <div className={`grid items-stretch gap-4 ${offer.options.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {offer.options.map((option, i) => (
          <OfferOptionCard
            key={option.id}
            option={option}
            index={i + 1}
            translate={t}
            isChosen={offer.chosenOptionId === option.id}
            offerSettled={settled}
            isLowest={
              comparison.lowestAmount != null
              && option.priceAmount === comparison.lowestAmount
            }
            action={action && {
              label: action.label,
              pending: action.pendingOptionId === option.id,
              disabled: action.disabled,
              onRequest: action.onRequest,
            }}
          />
        ))}
      </div>
    </div>
  );
}
