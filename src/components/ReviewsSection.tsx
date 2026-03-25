import { Star } from "lucide-react";
import { useReviews } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Review } from "@/services/types";

function StarRating({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-${size} w-${size} ${i <= rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.createdAt).toLocaleDateString("et-EE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
            {review.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{review.userName}</p>
            <p className="text-[11px] text-muted-foreground">{date}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      {review.comment && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
}

export default function ReviewsSection({ listingId }: { listingId: string }) {
  const { t } = useLanguage();
  const { data: reviews = [] } = useReviews(listingId);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold">{t("reviews.title")}</h2>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-accent text-accent" />
            {avgRating} ({t("reviews.count").replace("{count}", String(reviews.length))})
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("reviews.empty")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export { StarRating };
