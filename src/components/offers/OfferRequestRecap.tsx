import { CalendarDays, MapPin, Send } from "lucide-react";
import type { PublicOffer } from "@/services";
import { formatOfferDate } from "./offerDate";

export interface OfferRequestRecapProps {
  offer: PublicOffer;
  /** Page language — drives the date format. */
  language: string;
  translate: (key: string) => string;
}

/**
 * What the customer asked for, read back to them.
 *
 * This page is opened days after the request went in, from an email, usually on
 * a phone. Everything else on it was written by us and by providers; without
 * the original ask in view there is nothing to check the options AGAINST — a
 * customer cannot tell whether "10 m² unit" answers the 20 m² they wrote. The
 * request `details` were already being fetched and thrown away.
 *
 * Kept to a chip row and one line of text rather than a titled card, because
 * every pixel spent here pushes the first option further below the fold and the
 * options are what the customer came for.
 */
// `translate: t` — translationCoverage.test.ts only sees keys called as `t("…")`.
export function OfferRequestRecap({ offer, language, translate: t }: OfferRequestRecapProps) {
  const needDate = formatOfferDate(offer.lead.needDate, language);
  const sentOn = formatOfferDate(offer.sentAt, language);
  const route = offer.lead.toCity ? `${offer.lead.city} → ${offer.lead.toCity}` : offer.lead.city;

  return (
    <div>
      <div className="flex flex-wrap gap-2 text-xs font-medium text-foreground">
        {route && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 ring-1 ring-border">
            <MapPin className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
            {route}
          </span>
        )}
        {needDate && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 ring-1 ring-border">
            <CalendarDays className="h-3.5 w-3.5 text-teal-deep" aria-hidden />
            {needDate}
          </span>
        )}
        {sentOn && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-muted-foreground ring-1 ring-border">
            <Send className="h-3.5 w-3.5" aria-hidden />
            {t("offer.sentOn").replace("{date}", sentOn)}
          </span>
        )}
      </div>

      {offer.lead.details && (
        <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
          {offer.lead.details}
        </p>
      )}
    </div>
  );
}
