import { useId } from "react";
import { CheckCircle, Loader2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicOfferOption } from "@/services";
import { formatOfferPrice, resolveOfferUnit } from "./offerPricing";

export interface OfferOptionCardProps {
  option: PublicOfferOption;
  /** 1-based, so the customer and the ops inbox can name the same row. */
  index: number;
  translate: (key: string) => string;
  /** This is the option the customer already asked for. */
  isChosen: boolean;
  /** A choice has been made on this offer — for this option or another one. */
  offerSettled: boolean;
  /** Cheapest of a set that is genuinely comparable (see compareOfferOptions). */
  isLowest: boolean;
  action?: {
    label: string;
    pending: boolean;
    disabled: boolean;
    onRequest(option: PublicOfferOption): void;
  };
}

/**
 * One option, in the fixed anatomy every other option on the page repeats:
 * number → name → who → price → what's included → the ask.
 *
 * The order is load-bearing rather than decorative. This page is read on a
 * phone, one card per screen, so nothing is side by side and the eye cannot
 * compare — the only thing that makes two prices comparable is finding them at
 * the same place in each card, in the same units, set in the same figures.
 * That is why the price gets its own row (it used to share a wrapping flex row
 * with the title, so a long name pushed it anywhere) and `tabular-nums` (so
 * €89 and €129 line up digit for digit).
 */
export function OfferOptionCard({
  // Bound to the name `t` on purpose: translationCoverage.test.ts scans source
  // for `t("…")` literals, and a key called through any other identifier is
  // invisible to it — which is how raw keys reached production once already.
  option, index, translate: t, isChosen, offerSettled, isLowest, action,
}: OfferOptionCardProps) {
  const headingId = useId();
  const unit = resolveOfferUnit(option.priceUnit, t);
  const priceText = option.priceAmount != null
    ? formatOfferPrice(option.priceAmount, unit)
    : t("offer.priceTbc");

  // Every request button on the page carries the same visible words, so on its
  // own a screen reader announces "Request this offer" two or three times with
  // nothing to tell them apart. The accessible name has to name the option.
  //
  // Composed from the button's own label plus data rather than from a template
  // key, on purpose: a key would need five translations to exist before the
  // label works at all, and a missing one degrades to announcing the literal
  // string "offer.requestAria" — worse than the ambiguity it set out to fix.
  const optionSummary = [option.title, option.supplierName, priceText].filter(Boolean).join(", ");

  return (
    <article
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col rounded-2xl border bg-card p-5 transition-shadow ${
        isChosen
          ? "border-success ring-2 ring-success/30 shadow-card"
          : offerSettled
            // Deliberately NOT dimmed with opacity: the old card faded the
            // options not taken to 60%, which drops muted body text under the
            // 4.5:1 floor. The chosen card is emphasised instead of the rest
            // being made unreadable.
            ? "border-border/70"
            : "border-border shadow-card"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {t("offer.optionNumber").replace("{n}", String(index))}
        </p>
        {isLowest && !offerSettled && (
          <p data-testid="offer-lowest" className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
            <TrendingDown className="h-3 w-3" aria-hidden />
            {t("offer.lowestPrice")}
          </p>
        )}
      </div>

      <h2 id={headingId} className="mt-2 break-words font-display text-lg font-semibold leading-snug text-foreground">
        {option.title}
      </h2>
      {option.supplierName && (
        <p className="mt-1 break-words text-sm text-muted-foreground">{option.supplierName}</p>
      )}

      {/* Silence used to be the answer for an option with no price — the card
          simply had no figure, which reads as "free" rather than "not priced
          yet". A price is optional in the admin editor and most requests never
          get a provider quote at all, so the gap is the common case. */}
      {option.priceAmount != null ? (
        <p data-testid="offer-price" className="mt-3 break-words font-display text-2xl font-extrabold tabular-nums text-navy-ink">
          €{option.priceAmount}
          {unit.label && (
            <span className="text-sm font-medium text-muted-foreground">
              {unit.rate ? ` / ${unit.label}` : ` ${unit.label}`}
            </span>
          )}
        </p>
      ) : (
        <p data-testid="offer-price-tbc" className="mt-3 text-base font-semibold text-muted-foreground">
          {t("offer.priceTbc")}
        </p>
      )}

      {option.notes && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">
          {option.notes}
        </p>
      )}

      {isChosen && (
        <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success-text">
          <CheckCircle className="h-4 w-4" aria-hidden />
          {t("offer.yourRequest")}
        </p>
      )}

      {/* `mt-auto` so the buttons line up across a row of unequal cards — the
          one control the customer has to hit should not move between options. */}
      {!offerSettled && action && (
        <div className="mt-auto pt-5">
          <Button
            className="min-h-12 w-full bg-accent font-display text-base text-accent-foreground hover:bg-accent/90"
            disabled={action.disabled}
            aria-busy={action.pending}
            aria-label={`${action.label}: ${optionSummary}`}
            onClick={() => action.onRequest(option)}
          >
            {action.pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {action.label}
          </Button>
        </div>
      )}
    </article>
  );
}
