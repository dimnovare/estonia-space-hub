import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicOffer } from "@/services";

export interface OfferHelpPanelProps {
  offer: PublicOffer;
  supportEmail: string;
  translate: (key: string) => string;
  /** After a choice the panel leads with "changed your mind", before it with
   *  "not sure which to pick" — same channel, different question. */
  settled: boolean;
}

/**
 * The third door.
 *
 * Until now the page offered exactly two: take an option, or close the tab. A
 * customer who wants to ask whether the 10 m² unit has a lift, or who picked
 * the wrong card, had a bare `mailto:` in grey 12px at the bottom of the page
 * and nothing telling them it was for them.
 *
 * The subject and body are pre-filled with enough for ops to find the lead —
 * and deliberately with NOTHING else. The offer token in the URL is a bearer
 * credential (it is the only thing standing between a stranger and choosing on
 * this customer's behalf, which is why `redactAnalyticsPath` strips it before
 * GA sees it); putting it in an email body would scatter it through mail
 * archives and forwarded threads.
 */
// `translate: t` — translationCoverage.test.ts only sees keys called as `t("…")`.
export function OfferHelpPanel({ offer, supportEmail, translate: t, settled }: OfferHelpPanelProps) {
  const subject = t("offer.askSubject");
  // `lead` is nullable in the API's own composer even though the generated type
  // says otherwise, and this panel renders in the 404-adjacent states too.
  const lead = offer.lead as PublicOffer["lead"] | null | undefined;
  const route = lead?.city ? `${lead.city}${lead.toCity ? ` → ${lead.toCity}` : ""}` : "";
  // Two blank lines after the route: the customer's cursor lands under it with
  // the context already typed, rather than on an empty message they have to
  // explain from scratch.
  const href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`
    + (route ? `&body=${encodeURIComponent(`${route}\n\n`)}` : "");

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 text-center">
      <p className="font-display text-base font-semibold text-navy-ink">
        {/* Two static calls rather than t(cond ? a : b): the coverage scanner
            only resolves literal keys, and a computed one goes unchecked. */}
        {settled ? t("offer.changeRequest") : t("offer.askTitle")}
      </p>
      <Button
        asChild
        variant="outline"
        className="mt-3 min-h-12 w-full gap-2 border-accent/40 text-accent hover:bg-accent/5 hover:text-accent sm:w-auto sm:px-6"
      >
        <a href={href}>
          <Mail className="h-4 w-4" aria-hidden />
          {t("offer.askCta")}
        </a>
      </Button>
      <p className="mt-2.5 text-sm text-muted-foreground">
        <a href={`mailto:${supportEmail}`} className="font-medium text-accent underline underline-offset-2">
          {supportEmail}
        </a>
      </p>
    </section>
  );
}
