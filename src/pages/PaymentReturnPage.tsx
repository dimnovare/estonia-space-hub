import { useEffect } from "react";
import { Link, useSearchParams } from "@/i18n/routing";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoice");
  const bookingId = searchParams.get("booking") || searchParams.get("id") || invoiceId;
  const { t } = useLanguage();

  const { data: invoice } = useQuery({
    queryKey: ["invoice", bookingId],
    queryFn: () => apiClient.get<{ status: string }>(`/invoices/by-booking/${bookingId}`),
    enabled: !!bookingId,
    refetchInterval: (query) =>
      (query.state.data as { status: string } | undefined)?.status === "pending" ? 3000 : false,
  });

  const status = invoice?.status;
  const isPending = !invoice || status === "pending";
  const isFailed = status === "failed" || status === "cancelled";
  const isPaid = status === "confirmed" || status === "paid";

  useEffect(() => {
    if (bookingId && isPaid) {
      trackEvent("booking_completed", { bookingId });
    }
  }, [bookingId, isPaid]);

  return (
    <div className="container-wide flex min-h-[60vh] items-center justify-center py-16">
      <SEO
        title={`${t("payment.seoTitle")} — Ruumly`}
        description=""
        noindex={true}
      />
      <div className="mx-auto max-w-md w-full text-center">
        {isFailed ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold">
              {t("payment.failedTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("payment.failed")}
            </p>
            <Link to={bookingId ? `/booking/${bookingId}` : "/account?tab=bookings"}>
              <Button className="mt-6" variant="outline">
                {t("payment.backToBooking")}
              </Button>
            </Link>
          </>
        ) : isPending ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold">
              {t("payment.pending")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("payment.checkingStatus")}
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
