import { Star, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiClient } from "@/services/apiClient";
import { withSupplier } from "@/lib/withSupplier";
import { useImpersonatedSupplierId } from "@/hooks/useImpersonatedSupplierId";
import { unwrapPaginated } from "@/services/unwrapPaginated";
import type { Review } from "@/services/types";

const localeMap: Record<string, string> = {
  et: "et-EE", en: "en-GB", ru: "ru-RU", lv: "lv-LV", lt: "lt-LT",
};

function StarRow({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(rating) ? "fill-[#F2A900] text-[#F2A900]" : "text-line-2"}`}
        />
      ))}
    </div>
  );
}

export default function ProviderReviews() {
  const { t, language } = useLanguage();
  const locale = localeMap[language] || "en-GB";
  const supplierId = useImpersonatedSupplierId();

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["supplier-reviews", supplierId],
    queryFn: async () => unwrapPaginated<Review>(await apiClient.get(withSupplier("/supplier/reviews", supplierId))),
    staleTime: 60_000,
    retry: false,
  });

  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return t("provider.reviews.today");
    if (days < 7) return t("provider.reviews.daysAgo").replace("{n}", String(days));
    if (days < 30) return t("provider.reviews.weeksAgo").replace("{n}", String(Math.floor(days / 7)));
    return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-ink md:text-[28px]">{t("provider.reviews.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("provider.reviews.subtitle")}</p>
        </div>
        {reviews.length > 0 && (
          <div className="text-right">
            <div className="font-display text-[28px] font-extrabold leading-none text-navy-ink">{avg.toFixed(1)}</div>
            <div className="mt-1.5 flex justify-end">
              <StarRow rating={avg} />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[14px] bg-secondary/50" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-10 flex flex-col items-center py-12 text-center">
          <StarRow rating={0} size="h-6 w-6" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">{t("provider.reviews.empty")}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground">
                    {(r.userName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong className="font-display text-sm font-semibold text-navy-ink">{r.userName}</strong>
                    <div className="mt-0.5">
                      <StarRow rating={r.rating} />
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(r.createdAt)}</span>
              </div>
              {r.comment && <p className="mt-3 text-sm text-muted-foreground">{r.comment}</p>}
              <button
                onClick={() => toast.success(t("provider.reviews.replySent"))}
                className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-secondary px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-secondary/70"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {t("provider.reviews.reply")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
