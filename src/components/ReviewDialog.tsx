import { useState } from "react";
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
        onError: () => {
          toast.error("Something went wrong");
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
            <p className="text-sm font-medium mb-2">{t("reviews.rating")}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoveredRating(i)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 ${i <= displayRating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">{t("reviews.comment")}</p>
            <Textarea
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
