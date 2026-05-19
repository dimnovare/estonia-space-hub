import { SEO } from "@/components/SEO";
import { Navigate } from "@/i18n/routing";
import { useLanguage } from "@/i18n/LanguageContext";

export default function BookingRedirect() {
  const { t } = useLanguage();
  return (
    <>
      <SEO title={t("common.redirecting")} description={t("common.pleaseWait")} noindex />
      <Navigate to="/account?tab=bookings" replace />
    </>
  );
}
