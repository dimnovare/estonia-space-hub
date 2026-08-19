import { Star, ExternalLink } from "lucide-react";
import { useReviews } from "@/hooks/queries";
import { usePartnerGoogleReviews, type GoogleReview } from "@/hooks/usePartnerGoogleReviews";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Review } from "@/services/types";

function StarRating({ rating, size = 4 }: { rating: number; size?: number }) {
  const { t } = useLanguage();
  // role="img" + one label, rather than five unlabelled glyphs: the score is the
  // only thing this widget says, and without a name a screen reader reads the
  // review card with no rating in it at all. The stars are then aria-hidden so
  // the label is not read once per star.
  return (
    <div
      role="img"
      aria-label={t("reviews.starsOutOfFive").replace("{rating}", String(Math.round(rating * 10) / 10))}
      className="flex gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={`h-${size} w-${size} ${i <= Math.round(rating) ? "fill-[#F2A900] text-[#F2A900]" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

/**
 * Small inline Google wordmark badge so Google-sourced ratings/reviews are
 * clearly attributed (no merging into a fake platform average).
 */
function GoogleBadge() {
  return (
    <span
      aria-hidden
      className="inline-flex select-none items-center font-bold leading-none tracking-tight"
      style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <span style={{ color: "#4285F4" }}>G</span>
      <span style={{ color: "#EA4335" }}>o</span>
      <span style={{ color: "#FBBC05" }}>o</span>
      <span style={{ color: "#4285F4" }}>g</span>
      <span style={{ color: "#34A853" }}>l</span>
      <span style={{ color: "#EA4335" }}>e</span>
    </span>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const { language } = useLanguage();
  const locale = language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-GB";
  const date = new Date(review.createdAt).toLocaleDateString(locale, {
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

function GoogleReviewCard({ review }: { review: GoogleReview }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {review.authorPhotoUrl ? (
            <img
              src={review.authorPhotoUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
              {(review.authorName || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{review.authorName}</p>
            <p className="text-[11px] text-muted-foreground">{review.relativeTimeDesc}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      {review.text && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{review.text}</p>
      )}
    </div>
  );
}

export default function ReviewsSection({
  listingId,
  supplierSlug,
  hasGoogleReviews,
}: {
  listingId: string;
  /** Supplier slug — required to surface Google reviews as a fallback. */
  supplierSlug?: string | null;
  /** Hint from the listing/partner that a Google place is linked. */
  hasGoogleReviews?: boolean;
}) {
  const { t } = useLanguage();
  const { data: reviews = [] } = useReviews(listingId);

  // Only reach for Google when there's little/no platform review signal and we
  // actually have a slug to query by. Honest fallback — never merged silently.
  const wantGoogle = reviews.length === 0 && !!supplierSlug;
  const { data: google } = usePartnerGoogleReviews(
    supplierSlug ?? undefined,
    wantGoogle && (hasGoogleReviews ?? true),
  );

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const googleReviews = google?.reviews?.slice(0, 3) ?? [];
  const showGoogle = reviews.length === 0 && !!google && googleReviews.length > 0;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold">{t("reviews.title")}</h2>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" />
            {avgRating} ({t("reviews.count").replace("{count}", String(reviews.length))})
          </span>
        )}
        {showGoogle && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-[#F2A900] text-[#F2A900]" />
            {google!.rating.toFixed(1)} ({t("reviews.count").replace("{count}", String(google!.totalRatings))})
            <span className="inline-flex items-center gap-1 text-[11px]">
              · {t("reviews.fromGoogle")} <GoogleBadge />
            </span>
          </span>
        )}
      </div>

      {reviews.length > 0 ? (
        <div className="mt-4 space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      ) : showGoogle ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">{t("reviews.noPlatformYet")}</p>
          {googleReviews.map((r, i) => (
            <GoogleReviewCard key={`${r.authorName}-${r.time}-${i}`} review={r} />
          ))}
          {google!.mapsUrl && (
            <a
              href={google!.mapsUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t("reviews.viewOnGoogle")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{t("reviews.empty")}</p>
      )}
    </div>
  );
}

export { StarRating };
