import { useState } from "react";
import { Link } from "@/i18n/routing";
import {
  Ruler,
  Boxes,
  DoorClosed,
  Home,
  Building,
  Building2,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Storage size guide — a visual m² reference that maps a storage size band to a
 * real-world comparison ("5 m² ≈ a studio's worth"). Helps a customer who has no
 * intuition for square metres pick the right unit. Localized; on-brand styling
 * (navy/green/teal); lucide icons only (no emoji).
 *
 * Presented as a button/link that opens a shadcn Dialog (reused project-wide).
 * Each tier links to a pre-filtered storage search (minSize/maxSize) so the guide
 * is actionable, not just informational.
 */

interface SizeTier {
  icon: LucideIcon;
  // i18n keys
  bandKey: string;       // e.g. "1–3 m²"
  titleKey: string;      // short comparison title
  descKey: string;       // one-line description of what fits
  // Pre-filtered search range (m²) the "see options" link routes to.
  minSize: number;
  maxSize: number;
  // Relative fill of the proportional bar (0–100), scaled so 30 m²+ ≈ full.
  fill: number;
}

const SIZE_TIERS: SizeTier[] = [
  { icon: Boxes,       bandKey: "sizeGuide.tier.xs.band", titleKey: "sizeGuide.tier.xs.title", descKey: "sizeGuide.tier.xs.desc", minSize: 1,  maxSize: 3,   fill: 12 },
  { icon: DoorClosed,  bandKey: "sizeGuide.tier.s.band",  titleKey: "sizeGuide.tier.s.title",  descKey: "sizeGuide.tier.s.desc",  minSize: 4,  maxSize: 6,   fill: 26 },
  { icon: Home,        bandKey: "sizeGuide.tier.m.band",  titleKey: "sizeGuide.tier.m.title",  descKey: "sizeGuide.tier.m.desc",  minSize: 8,  maxSize: 12,  fill: 45 },
  { icon: Building,    bandKey: "sizeGuide.tier.l.band",  titleKey: "sizeGuide.tier.l.title",  descKey: "sizeGuide.tier.l.desc",  minSize: 15, maxSize: 20,  fill: 70 },
  { icon: Building2,   bandKey: "sizeGuide.tier.xl.band", titleKey: "sizeGuide.tier.xl.title", descKey: "sizeGuide.tier.xl.desc", minSize: 30, maxSize: 999, fill: 100 },
];

export default function SizeGuide({ variant = "button" }: { variant?: "button" | "link" }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const trigger =
    variant === "link" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-teal-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Ruler className="h-3.5 w-3.5" />
        {t("sizeGuide.trigger")}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-[10px] border border-input bg-card px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <Ruler className="h-4 w-4" />
        {t("sizeGuide.trigger")}
      </button>
    );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-[14px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-navy-ink">
              {t("sizeGuide.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("sizeGuide.intro")}
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-1 space-y-2.5">
            {SIZE_TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <li key={tier.bandKey}>
                  <Link
                    to={`/search?type=warehouse&minSize=${tier.minSize}&maxSize=${tier.maxSize}`}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 rounded-[12px] border border-line bg-card p-3 transition-colors hover:border-primary/40 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-teal/15 text-teal-deep">
                      <Icon className="h-[22px] w-[22px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-sm font-bold tabular-nums text-foreground">
                          {t(tier.bandKey)}
                        </span>
                        <span className="text-[13px] font-semibold text-teal-text">
                          {t(tier.titleKey)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t(tier.descKey)}
                      </p>
                      {/* Proportional fill bar — a quick at-a-glance sense of scale. */}
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#0A9881] to-[#51CDD4]"
                          style={{ width: `${tier.fill}%` }}
                        />
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mt-1 text-xs text-muted-foreground">{t("sizeGuide.footnote")}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
