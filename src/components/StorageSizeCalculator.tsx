import { useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

type Group = "furniture" | "appliances" | "sport" | "boxes";

export const STORAGE_ITEMS: { id: string; group: Group; label: string; emoji: string; m3: number }[] = [
  { id: "sofa2",      group: "furniture",  label: "calc.items.sofa2",      emoji: "🛋️", m3: 1.2 },
  { id: "sofa3",      group: "furniture",  label: "calc.items.sofa3",      emoji: "🛋️", m3: 1.8 },
  { id: "armchair",   group: "furniture",  label: "calc.items.armchair",   emoji: "🪑", m3: 0.6 },
  { id: "bed_s",      group: "furniture",  label: "calc.items.bed_s",      emoji: "🛏️", m3: 1.1 },
  { id: "bed_d",      group: "furniture",  label: "calc.items.bed_d",      emoji: "🛏️", m3: 1.7 },
  { id: "wardrobe_s", group: "furniture",  label: "calc.items.wardrobe_s", emoji: "🪞", m3: 0.8 },
  { id: "wardrobe_l", group: "furniture",  label: "calc.items.wardrobe_l", emoji: "🪞", m3: 1.5 },
  { id: "dresser",    group: "furniture",  label: "calc.items.dresser",    emoji: "🗄️", m3: 0.4 },
  { id: "dining_t",   group: "furniture",  label: "calc.items.dining_t",   emoji: "🪑", m3: 0.8 },
  { id: "chair",      group: "furniture",  label: "calc.items.chair",      emoji: "🪑", m3: 0.1 },
  { id: "bookcase",   group: "furniture",  label: "calc.items.bookcase",   emoji: "📚", m3: 0.4 },
  { id: "desk",       group: "furniture",  label: "calc.items.desk",       emoji: "🖥️", m3: 0.5 },
  { id: "tv",         group: "appliances", label: "calc.items.tv",         emoji: "📺", m3: 0.2 },
  { id: "washer",     group: "appliances", label: "calc.items.washer",     emoji: "🫧", m3: 0.1 },
  { id: "fridge",     group: "appliances", label: "calc.items.fridge",     emoji: "🧊", m3: 0.2 },
  { id: "microwave",  group: "appliances", label: "calc.items.microwave",  emoji: "🍽️", m3: 0.05 },
  { id: "bike",       group: "sport",      label: "calc.items.bike",       emoji: "🚲", m3: 0.4 },
  { id: "scooter",    group: "sport",      label: "calc.items.scooter",    emoji: "🛴", m3: 0.2 },
  { id: "skis",       group: "sport",      label: "calc.items.skis",       emoji: "⛷️", m3: 0.3 },
  { id: "kayak",      group: "sport",      label: "calc.items.kayak",      emoji: "🛶", m3: 1.0 },
  { id: "box_s",      group: "boxes",      label: "calc.items.box_s",      emoji: "📦", m3: 0.05 },
  { id: "box_m",      group: "boxes",      label: "calc.items.box_m",      emoji: "📦", m3: 0.1 },
  { id: "box_l",      group: "boxes",      label: "calc.items.box_l",      emoji: "📦", m3: 0.2 },
  { id: "bag_l",      group: "boxes",      label: "calc.items.bag_l",      emoji: "🎒", m3: 0.2 },
];

export const SIZE_TIERS = [
  { code: "XS", label: "calc.tiers.xs", maxM3: 2.5,     sizeM2: 1.5,  minSize: 1,  maxSize: 2 },
  { code: "S",  label: "calc.tiers.s",  maxM3: 8.0,     sizeM2: 3,    minSize: 2,  maxSize: 4 },
  { code: "M",  label: "calc.tiers.m",  maxM3: 16.0,    sizeM2: 6,    minSize: 4,  maxSize: 8 },
  { code: "L",  label: "calc.tiers.l",  maxM3: 30.0,    sizeM2: 11.5, minSize: 8,  maxSize: 15 },
  { code: "XL", label: "calc.tiers.xl", maxM3: Infinity, sizeM2: 20,  minSize: 15, maxSize: 999 },
];

const GROUPS: Group[] = ["furniture", "appliances", "sport", "boxes"];

export default function StorageSizeCalculator() {
  const { t } = useLanguage();
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [activeGroup, setActiveGroup] = useState<Group>("furniture");

  const totalM3 = Object.entries(selection).reduce((sum, [id, qty]) => {
    const item = STORAGE_ITEMS.find((i) => i.id === id);
    return sum + (item?.m3 ?? 0) * qty;
  }, 0);
  const adjustedM3 = totalM3 * 1.3;
  const recommendedTier =
    SIZE_TIERS.find((tier) => adjustedM3 <= tier.maxM3) ?? SIZE_TIERS[SIZE_TIERS.length - 1];
  const isEmpty = totalM3 === 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeGroup === g
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`calculator.group.${g}`)}
          </button>
        ))}
      </div>

      <div className="flex min-h-[72px] flex-wrap gap-2">
        {STORAGE_ITEMS.filter((i) => i.group === activeGroup).map((item) => {
          const qty = selection[item.id] ?? 0;
          return (
            <button
              key={item.id}
              onClick={() =>
                setSelection((p) => ({ ...p, [item.id]: (p[item.id] ?? 0) + 1 }))
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 ${
                qty > 0
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground"
              }`}
            >
              {/* The emoji is decoration sitting next to its own translated label,
                  so without aria-hidden a screen reader says the item twice — and
                  the first time in the reader's own language, not the page's. */}
              <span aria-hidden>{item.emoji}</span>
              <span>{t(item.label)}</span>
              {qty > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {qty}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!isEmpty && (
        <div className="mt-4 rounded-xl bg-secondary/50 p-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {Object.entries(selection)
              .filter(([, q]) => q > 0)
              .map(([id, qty]) => {
                const item = STORAGE_ITEMS.find((i) => i.id === id)!;
                return (
                  <span key={id} className="flex items-center gap-1">
                    <span className="text-muted-foreground">
                      <span aria-hidden>{item.emoji}</span> {t(item.label)} ×{qty}
                    </span>
                    <button
                      onClick={() =>
                        setSelection((p) => {
                          const n = { ...p };
                          if (n[id] > 1) n[id]--;
                          else delete n[id];
                          return n;
                        })
                      }
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={t("calculator.removeOne")}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {t("calculator.totalVolume")}: <b>{totalM3.toFixed(1)} m³</b>{" "}
            ({t("calculator.withBuffer")}: {adjustedM3.toFixed(1)} m³)
          </div>
        </div>
      )}

      <div
        className={`mt-4 rounded-xl p-4 text-center transition-all ${
          isEmpty ? "bg-secondary/30" : "border border-accent/20 bg-accent/10"
        }`}
      >
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{t("calculator.addItems")}</p>
        ) : (
          <>
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">
              {t("calculator.recommendation")}
            </div>
            <div className="mt-1 font-display text-3xl font-bold text-foreground">
              {recommendedTier.code}
            </div>
            <div className="text-sm text-muted-foreground">{t(recommendedTier.label)}</div>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("calculator.bufferNote")}</p>
            <Link
              to={`/search?type=warehouse&minSize=${recommendedTier.minSize}&maxSize=${recommendedTier.maxSize}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
            >
              {t("calculator.searchCta").replace("{size}", recommendedTier.code)}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setSelection({})}
              className="mt-2 block w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {t("calculator.reset")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}