import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translateForLanguage } from "@/i18n/LanguageContext";
import type { PublicOffer, PublicOfferOption } from "@/services";

export interface OfferPresentationProps {
  offer: PublicOffer;
  action?: {
    label: string;
    pendingOptionId: string | null;
    disabled: boolean;
    onRequest(option: PublicOfferOption): void;
  };
  preview?: boolean;
}

function displayPriceUnit(priceUnit: string | null): string | null {
  const unit = priceUnit?.trim().replace(/^€\s*\/?\s*/, "").replace(/^\/\s*/, "");
  return unit || null;
}

export function OfferPresentation({ offer, action, preview = false }: OfferPresentationProps) {
  const t = (key: string) => translateForLanguage(offer.language, key);
  const chosen = offer.status === "chosen";

  return (
    <div data-testid={preview ? "offer-preview" : "offer-presentation"} className="space-y-5">
      {offer.customerNote && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.16em] text-teal-deep">{t("offer.noteLabel")}</p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{offer.customerNote}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {offer.options.map((option) => {
          const isChosenOption = offer.chosenOptionId === option.id;
          const priceUnit = displayPriceUnit(option.priceUnit);

          return (
            <article
              key={option.id}
              className={`min-w-0 rounded-xl border bg-card p-4 shadow-card ${
                isChosenOption ? "border-success ring-1 ring-success" : chosen ? "border-border opacity-60" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0 break-words">
                  <h2 className="font-display text-lg font-semibold text-foreground">{option.title}</h2>
                  {option.supplierName && <p className="mt-0.5 break-words text-sm text-muted-foreground">{option.supplierName}</p>}
                </div>
                {option.priceAmount != null && (
                  <p className="min-w-0 break-words font-display text-xl font-extrabold text-navy-ink">
                    €{option.priceAmount}
                    {priceUnit && <span className="text-sm font-medium text-muted-foreground">{" / "}{priceUnit}</span>}
                  </p>
                )}
              </div>

              {option.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{option.notes}</p>}

              {isChosenOption && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
                  <CheckCircle className="h-4 w-4" aria-hidden />
                  {t("offer.yourRequest")}
                </p>
              )}

              {!chosen && action && (
                <Button
                  className="mt-4 min-h-11 w-full bg-accent font-display text-accent-foreground hover:bg-accent/90"
                  disabled={action.disabled}
                  onClick={() => action.onRequest(option)}
                >
                  {action.pendingOptionId === option.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {action.label}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
