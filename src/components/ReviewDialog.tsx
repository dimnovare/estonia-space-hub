import { useId, useState } from "react";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReview } from "@/hooks/queries";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  listingId: string;
}

export default function ReviewDialog({ open, onOpenChange, bookingId, listingId }: ReviewDialogProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const createReview = useCreateReview();
  const ratingLabelId = useId();
  const commentId = useId();

  const handleSubmit = () => {
    if (rating === 0) return;
    createReview.mutate(
      { bookingId, listingId, rating, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t("reviews.success"));
          onOpenChange(false);
          setRating(0);
          setComment("");
        },
        onError: (err: any) => {
          toast.error(err?.message || t("error.generic"));
        },
      }
    );
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reviews.leave")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p id={ratingLabelId} className="text-sm font-medium mb-2">{t("reviews.rating")}</p>
            {/* The five stars were unlabelled buttons inside an unlabelled div —
                a screen reader announced "button" five times with no way to tell
                which score each one set. The group borrows the visible "Rating"
                text as its name; each star states its own value and whether it is
                part of the current score. Padding is p-2 rather than p-0.5 so the
                primary input of this dialog is a 44px thumb target. */}
            <div className="flex gap-1" role="group" aria-labelledby={ratingLabelId}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={t("reviews.rateStars").replace("{count}", String(i))}
                  aria-pressed={i <= rating}
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoveredRating(i)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="rounded-md p-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  <Star
                    aria-hidden
                    className={`h-7 w-7 ${i <= displayRating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            {/* A real <label>, not a <p>: the textarea had no accessible name at
                all, so it was announced as an unlabelled edit field. */}
            <label htmlFor={commentId} className="mb-2 block text-sm font-medium">{t("reviews.comment")}</label>
            <Textarea
              id={commentId}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              placeholder={t("reviews.commentPlaceholder")}
              rows={4}
              maxLength={1000}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{comment.length}/1000</p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || createReview.isPending}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {createReview.isPending ? "..." : t("reviews.submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
