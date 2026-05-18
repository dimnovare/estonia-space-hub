import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "@/i18n/routing";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/services/queryKeys";

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoice");
  const bookingId = searchParams.get("booking") || searchParams.get("id") || invoiceId;
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const pollCount = useRef(0);
  const [isPollTimeout, setIsPollTimeout] = useState(false);

  const { data: invoice } = useQuery({
    queryKey: queryKeys.invoiceStatus.byId(bookingId ?? ""),
    queryFn: () => apiClient.get<{ status: string }>(`/invoices/by-booking/${bookingId}`),
    enabled: !!bookingId && isAuthenticated,
    refetchInterval: (query) => {
      const s = (query.state.data as { status: string } | undefined)?.status;
      if (s === "pending" || s === "awaitingpayment") {
        pollCount.current += 1;
        if (pollCount.current > 40) {
          setIsPollTimeout(true);
          return false;
        }
        return 3000;
      }
      return false;
    },
  });

  const status = invoice?.status;
  const isFailed = status === "failed" || status === "cancelled";
  const isPending = !invoice || status === "pending" || status === "awaitingpayment";
  const isPaid = !!invoice && status === "paid";

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
            {isPollTimeout && (
              <div className="mt-6 rounded-md border border-border bg-secondary/30 p-4 text-left">
                <p className="text-sm font-semibold">{t("payment.delayedTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("payment.delayedDesc")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/account?tab=bookings">
                    <Button size="sm" variant="outline">{t("payment.checkAccount")}</Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="sm" variant="outline">{t("payment.contactSupport")}</Button>
                  </Link>
                </div>
              </div>
            )}
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
