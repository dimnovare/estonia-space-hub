import { Star } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ProviderReviews() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{t("provider.reviews.title")}</h1>
      <div className="mt-8 flex flex-col items-center py-12 text-center">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className="h-6 w-6 text-muted-foreground/20" />
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {t("provider.reviews.empty")}
        </p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {t("provider.reviews.emptyDesc")}
        </p>
      </div>
    </div>
  );
}
