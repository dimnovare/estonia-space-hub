import { useEffect } from "react";
import { Link, useSearchParams } from "@/i18n/routing";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/analytics";

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoice");
  const bookingId = searchParams.get("booking") || searchParams.get("id") || invoiceId;
  const { t } = useLanguage();

  useEffect(() => {
    if (bookingId) {
      trackEvent("booking_completed", { bookingId });
    }
  }, [bookingId]);

  return (
    <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
      <SEO
        title={`${t("payment.seoTitle")} — Ruumly`}
        description=""
        noindex={true}
      />
      <div className="mx-auto max-w-md w-full text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">
          {t("payment.returnTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("payment.returnDesc")}
        </p>
        <Link to="/account?tab=bookings">
          <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
            {t("payment.returnCta")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
